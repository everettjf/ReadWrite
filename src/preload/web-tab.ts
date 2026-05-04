/**
 * Preload script attached to every WebContentsView (web/github reader
 * tab). Watches the loaded page for text selection and ships
 * `{ text, rect }` to the main process, which translates the rect from
 * the WebContentsView's local coords into main-window viewport coords
 * and rebroadcasts to the renderer — where the floating reader-selection
 * toolbar picks it up.
 *
 * Runs sandboxed (createWebTab forces `sandbox: true`). Only
 * `ipcRenderer.send` is used, which works under sandbox.
 *
 * DOM globals are declared narrowly here instead of pulling in
 * `lib: "dom"` for the whole node tsconfig — that would break Buffer
 * vs Blob typing in src/main/ipc/wechat.ts.
 */
import { ipcRenderer } from 'electron';

interface SelRange {
  getBoundingClientRect(): { top: number; left: number; width: number; height: number };
}
interface PageSelection {
  toString(): string;
  rangeCount: number;
  getRangeAt(idx: number): SelRange;
}
interface PageWindow {
  getSelection(): PageSelection | null;
}
interface PageDocument {
  addEventListener(event: 'selectionchange', cb: () => void): void;
}
declare const window: PageWindow;
declare const document: PageDocument;

const SELECTION_CHANNEL = 'web-tab:selection';
const DEBOUNCE_MS = 80;

let timer: ReturnType<typeof setTimeout> | null = null;
let lastText = '';

function publish(): void {
  const sel = window.getSelection();
  const text = sel?.toString() ?? '';
  if (!text.trim()) {
    if (lastText !== '') {
      lastText = '';
      ipcRenderer.send(SELECTION_CHANNEL, { text: '', rect: null });
    }
    return;
  }
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const r = range.getBoundingClientRect();
  // Skip zero-area rects (cursor placement masquerading as selection).
  if (r.width === 0 && r.height === 0) return;
  lastText = text;
  ipcRenderer.send(SELECTION_CHANNEL, {
    text,
    rect: { top: r.top, left: r.left, width: r.width, height: r.height },
  });
}

document.addEventListener('selectionchange', () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(publish, DEBOUNCE_MS);
});
