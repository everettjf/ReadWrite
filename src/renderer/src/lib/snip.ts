import { useTabsStore } from '@/stores/tabs';
import { useEditorStore } from '@/stores/editor';

export interface PaneSnapshot {
  dataUrl: string;
  /** Native pixel width of the captured image. */
  width: number;
  height: number;
  /** CSS-pixel rect (in window coordinates) where the live snip area was. */
  rect: { left: number; top: number; width: number; height: number };
  /** If a native WebContentsView was hidden so the snapshot could be shown,
   *  call this when done so it gets restored. */
  restore: () => Promise<void>;
}

/**
 * Capture a still image of the reader's content area (excluding the
 * tab bar). For web tabs (WebContentsView) this also temporarily hides
 * the native view so the snapshot we render in the renderer is visible
 * — the caller MUST invoke `restore()` afterwards.
 *
 * For DOM-rendered readers (PDF / EPUB / code) we ask Electron to
 * capture the main window's renderer at the snip area's bounds. This
 * is much faster and more reliable than html-to-image (which used to
 * stall + visually jump on PDF.js's many-canvas layout).
 */
export async function captureReaderPaneSnapshot(): Promise<PaneSnapshot | null> {
  const snipEl = document.querySelector<HTMLElement>('[data-rw-snip-area]');
  if (!snipEl) return null;

  const rect = snipEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const tabs = useTabsStore.getState();
  const active = tabs.tabs.find((t) => t.id === tabs.activeTabId) ?? null;

  // Web / GitHub tabs live in a native WebContentsView outside the renderer DOM.
  if (active && (active.kind === 'web' || active.kind === 'github')) {
    const result = await window.api.screenshot.captureTab({
      tabId: active.id,
      format: 'png',
      markdownPath: useEditorStore.getState().path,
    });
    if (!result) return null;
    await window.api.tabs.setVisibility(active.id, false).catch(() => null);
    return {
      dataUrl: result.dataUrl,
      width: result.width,
      height: result.height,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      restore: async () => {
        await window.api.tabs.setVisibility(active.id, true).catch(() => null);
      },
    };
  }

  // Renderer-DOM-based readers (PDF / EPUB / code) — capture the main
  // window's pixels at the snip area's rect. Electron handles DPR
  // internally, so the returned image's pixel size is the proper
  // backing-store size.
  const result = await window.api.screenshot.captureMainWindow({
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  });
  if (!result) return null;

  return {
    dataUrl: result.dataUrl,
    width: result.width,
    height: result.height,
    rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    restore: async () => {
      /* nothing to restore */
    },
  };
}

/** Crop a sub-rectangle (in source-image pixels) of `dataUrl` to a PNG Blob. */
export async function cropDataUrlToPngBlob(
  dataUrl: string,
  source: { x: number; y: number; w: number; h: number },
): Promise<Blob> {
  const img = await loadImage(dataUrl);
  const w = Math.max(1, Math.round(source.w));
  const h = Math.max(1, Math.round(source.h));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2D context unavailable');
  ctx.drawImage(img, source.x, source.y, source.w, source.h, 0, 0, w, h);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let s = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

export async function writeImageBlobToClipboard(blob: Blob): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('Clipboard image write is not supported in this environment.');
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}
