import { toPng } from 'html-to-image';
import { useEditorStore } from '@/stores/editor';

function insertMarkdownImage(args: {
  dataUrl: string;
  savedPath?: string;
  relativePath?: string;
}): void {
  let src: string;
  if (args.relativePath) {
    src = args.relativePath;
  } else if (args.savedPath) {
    src = `file://${encodeURI(args.savedPath)}`;
  } else {
    src = args.dataUrl;
  }
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
  const markdownPath = useEditorStore.getState().path;
  const result = await window.api.screenshot.captureTab({
    tabId,
    format: 'png',
    markdownPath,
  });
  if (!result) return;
  insertMarkdownImage({
    dataUrl: result.dataUrl,
    savedPath: result.savedPath,
    relativePath: result.relativePath,
  });
}

/**
 * Capture a renderer-side DOM element (used for PDF / EPUB / Code panes
 * where the content lives inside the webContents itself).
 */
export async function captureElementAndInsert(el: HTMLElement): Promise<void> {
  const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 });
  insertMarkdownImage({ dataUrl });
}
