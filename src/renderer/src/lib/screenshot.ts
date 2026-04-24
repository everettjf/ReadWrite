import { toPng } from 'html-to-image';
import { useEditorStore } from '@/stores/editor';

function insertMarkdownImage(dataUrl: string, savedPath?: string): void {
  const src = savedPath ? `file://${encodeURI(savedPath)}` : dataUrl;
  const snippet = `\n![screenshot](${src})\n`;
  const cur = useEditorStore.getState().content;
  useEditorStore.getState().setContent(cur + snippet, { markDirty: true });
}

/**
 * Capture the native WebContentsView behind a reader tab by round-tripping
 * through the main process. This works even though the view is not part of
 * the renderer's DOM tree.
 */
export async function captureAndInsertScreenshot(tabId: string): Promise<void> {
  const result = await window.api.screenshot.captureTab({ tabId, format: 'png' });
  if (!result) return;
  insertMarkdownImage(result.dataUrl, result.savedPath);
}

/**
 * Capture a renderer-side DOM element (used for PDF / EPUB / Code panes
 * where the content lives inside the webContents itself).
 */
export async function captureElementAndInsert(el: HTMLElement): Promise<void> {
  const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 });
  insertMarkdownImage(dataUrl);
}
