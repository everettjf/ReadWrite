import { toPng } from 'html-to-image';
import { useTabsStore } from '@/stores/tabs';
import { useEditorStore } from '@/stores/editor';

export interface PaneSnapshot {
  dataUrl: string;
  /** Native pixel width of the captured image. */
  width: number;
  height: number;
  /** CSS-pixel rect (in window coordinates) where the live pane was. */
  rect: { left: number; top: number; width: number; height: number };
  /** If a native WebContentsView was hidden so the snapshot could be shown,
   *  call this when done so it gets restored. */
  restore: () => Promise<void>;
}

/**
 * Capture a still image of the reader pane. For web tabs (WebContentsView)
 * this also temporarily hides the native view so the snapshot we render in
 * the renderer is visible — the caller MUST invoke `restore()` afterwards.
 */
export async function captureReaderPaneSnapshot(): Promise<PaneSnapshot | null> {
  const readerEl = document.querySelector<HTMLElement>('[data-rw-pane="reader"]');
  if (!readerEl) return null;

  const rect = readerEl.getBoundingClientRect();
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

  // Renderer-DOM-based readers (PDF / EPUB / code) — html-to-image of the pane.
  const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
  const dataUrl = await toPng(readerEl, { cacheBust: true, pixelRatio: dpr });
  const dims = await measureImage(dataUrl);

  return {
    dataUrl,
    width: dims.width,
    height: dims.height,
    rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    restore: async () => {
      /* nothing to restore */
    },
  };
}

function measureImage(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = (e) => reject(e);
    img.src = dataUrl;
  });
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
