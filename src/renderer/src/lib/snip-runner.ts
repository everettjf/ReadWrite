import {
  captureReaderPaneSnapshot,
  cropDataUrlToPngBlob,
  blobToBase64,
  writeImageBlobToClipboard,
  type PaneSnapshot,
} from './snip';
import { useEditorStore } from '@/stores/editor';

export interface SnipRunResult {
  blob: Blob;
  base64: string;
  savedPath?: string;
  relativePath?: string;
  width: number;
  height: number;
}

/**
 * Drives the full snip flow:
 *  1) Capture the reader pane (and hide the native WebContentsView if needed).
 *  2) Hand off to the React overlay (caller renders SnipOverlay using the
 *     returned snapshot, then calls `finalizeSnip` with the user's drag rect).
 *
 * This module is just helpers — the App composes them.
 */
export async function startSnip(): Promise<PaneSnapshot | null> {
  return await captureReaderPaneSnapshot();
}

export async function finalizeSnip(
  snapshot: PaneSnapshot,
  rect: { x: number; y: number; w: number; h: number },
  options: { alsoSaveToImagesDir: boolean },
): Promise<SnipRunResult> {
  const blob = await cropDataUrlToPngBlob(snapshot.dataUrl, rect);
  let savedPath: string | undefined;
  let relativePath: string | undefined;
  if (options.alsoSaveToImagesDir) {
    try {
      const base64 = await blobToBase64(blob);
      const result = await window.api.image.save({
        markdownPath: useEditorStore.getState().path,
        base64,
        mime: 'image/png',
        suggestedName: `snip-${Date.now()}`,
      });
      savedPath = result.savedPath;
      relativePath = result.relativePath;
    } catch (err) {
      console.warn('[snip] save-to-disk failed:', err);
    }
  }
  // Always also write to clipboard (the user's primary expectation)
  await writeImageBlobToClipboard(blob).catch((err) => {
    console.warn('[snip] clipboard write failed:', err);
  });
  return {
    blob,
    base64: await blobToBase64(blob),
    savedPath,
    relativePath,
    width: Math.round(rect.w),
    height: Math.round(rect.h),
  };
}
