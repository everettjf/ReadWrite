import {
  captureReaderPaneSnapshot,
  cropDataUrlToPngBlob,
  blobToBase64,
  writeImageBlobToClipboard,
  type PaneSnapshot,
} from './snip';
import { useEditorStore } from '@/stores/editor';
import { createNewDocument, suggestDocNameFromContent } from './doc-io';
import { pathToFileUrl } from './path-transform';

export interface SnipRunResult {
  blob: Blob;
  base64: string;
  savedPath?: string;
  relativePath?: string;
  width: number;
  height: number;
}

/**
 * Ensure the editor has an on-disk document folder before saving a screenshot
 * into it. If we're starting from the in-memory welcome doc, this creates a
 * new doc folder under the workspace root and persists the current content.
 */
async function ensureEditorPath(): Promise<string> {
  const editor = useEditorStore.getState();
  if (editor.path) return editor.path;
  const newDoc = await createNewDocument({
    initialContent: editor.content,
    suggestedName: suggestDocNameFromContent(editor.content),
  });
  editor.setPath(newDoc.path);
  editor.setDirty(false);
  return newDoc.path;
}

export async function startSnip(): Promise<PaneSnapshot | null> {
  await ensureEditorPath();
  return await captureReaderPaneSnapshot();
}

export async function finalizeSnip(
  snapshot: PaneSnapshot,
  rect: { x: number; y: number; w: number; h: number },
  options: { autoInsertIntoEditor: boolean },
): Promise<SnipRunResult> {
  const blob = await cropDataUrlToPngBlob(snapshot.dataUrl, rect);
  const base64 = await blobToBase64(blob);

  // Always save to disk: every snip belongs to a doc folder by construction.
  const path = await ensureEditorPath();
  let savedPath: string | undefined;
  let relativePath: string | undefined;
  try {
    const result = await window.api.image.save({
      markdownPath: path,
      base64,
      mime: 'image/png',
      suggestedName: `snip-${Date.now()}`,
    });
    savedPath = result.savedPath;
    relativePath = result.relativePath;
  } catch (err) {
    console.warn('[snip] save-to-disk failed:', err);
  }

  // Best-effort clipboard write so the user can paste anywhere too.
  await writeImageBlobToClipboard(blob).catch((err) => {
    console.warn('[snip] clipboard write failed:', err);
  });

  // Auto-insert into editor when requested. We prefer the relative path so
  // the markdown source stays clean and portable; the Milkdown image node
  // view resolves it back to file:// for live rendering. Falls back to
  // file:// only when the doc isn't anchored under the workspace yet.
  if (options.autoInsertIntoEditor && (relativePath || savedPath)) {
    const editor = useEditorStore.getState();
    const src = relativePath ?? pathToFileUrl(savedPath!);
    const altText = relativePath ? relativePath.split('/').pop()! : 'screenshot';
    const snippet = `\n![${altText}](${src})\n`;
    editor.setContent(editor.content + snippet, { markDirty: true });
  }

  return {
    blob,
    base64,
    savedPath,
    relativePath,
    width: Math.round(rect.w),
    height: Math.round(rect.h),
  };
}
