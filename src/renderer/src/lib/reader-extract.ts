import * as pdfjsLib from 'pdfjs-dist';
import type { TabKind, Tab } from '@shared/types';
import { useTabsStore } from '@/stores/tabs';

export interface ExtractedSource {
  kind: TabKind;
  /** Best-effort title (page title, file basename, …). */
  title: string;
  /** URL or absolute file path. */
  source: string;
  /** Extracted plain text. May be long; caller decides how to clip. */
  text: string;
}

/**
 * Extract plain text from the currently active reader tab. Web/github
 * tabs go through the main process (their content lives inside a
 * WebContentsView, not the renderer DOM). PDFs are extracted inline
 * via pdfjs-dist. EPUB / code support to follow.
 */
export async function extractActiveReader(): Promise<ExtractedSource> {
  const { tabs, activeTabId } = useTabsStore.getState();
  const tab = tabs.find((t) => t.id === activeTabId);
  if (!tab) {
    throw new Error('No active reader tab. Open a URL, PDF, or EPUB first.');
  }
  switch (tab.kind) {
    case 'web':
    case 'github':
      return extractFromWebTab(tab);
    case 'pdf':
      return extractFromPdfTab(tab);
    case 'epub':
      throw new Error('EPUB extraction is not implemented yet.');
    case 'code':
      throw new Error('Code-folder extraction is not implemented yet.');
    default:
      throw new Error(`Unknown tab kind: ${(tab as { kind?: string }).kind}`);
  }
}

async function extractFromWebTab(tab: Tab & { kind: 'web' | 'github' }): Promise<ExtractedSource> {
  const result = await window.api.tabs.extractWebText(tab.id);
  if (!result) throw new Error('Reader extraction returned no result.');
  return {
    kind: tab.kind,
    title: result.title || tab.title || tab.url,
    source: result.source || tab.url,
    text: result.text,
  };
}

async function extractFromPdfTab(tab: Tab & { kind: 'pdf' }): Promise<ExtractedSource> {
  const url = `file://${encodeURI(tab.path)}`;
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .filter(Boolean)
      .join(' ');
    if (pageText.trim()) parts.push(pageText);
  }
  return {
    kind: 'pdf',
    title: tab.title || tab.path.split(/[\\/]/).pop() || 'PDF',
    source: tab.path,
    text: parts.join('\n\n').trim(),
  };
}
