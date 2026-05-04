import { useCallback, useEffect, useRef, useState } from 'react';
import type { PdfTab } from '@shared/types';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ZoomIn, ZoomOut } from 'lucide-react';
import { useTabsStore } from '@/stores/tabs';
import { useReaderSelectionStore } from '@/stores/reader-selection';

// pdfjs worker — set up globally
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

interface PdfReaderProps {
  tab: PdfTab;
}

interface RenderedTextLayer {
  cancel(): void;
}

/**
 * Continuous-scroll PDF reader.
 *
 * All pages live in one scroll container, stacked vertically. Each page is
 * a <canvas> with rendered glyphs **plus** a transparent text layer that
 * mirrors those glyphs as positioned <span>s — without it, the canvas is
 * unselectable. The text layer is what powers "select a passage → AI →
 * insert into note".
 */
export function PdfReader({ tab }: PdfReaderProps): JSX.Element {
  const stageRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const textLayerRefs = useRef<Array<RenderedTextLayer | null>>([]);
  const rafRef = useRef<number | null>(null);
  const restoredInitialPageRef = useRef(false);

  const setReaderSelection = useReaderSelectionStore((s) => s.set);
  const clearReaderSelection = useReaderSelectionStore((s) => s.clear);

  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1.2);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(tab.page ?? 1);
  const updateTab = useTabsStore((s) => s.updateTab);

  // Load the document once per file path.
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const bytes = await readPdfBytes(tab.path);
      if (cancelled) return;
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      if (cancelled) return;
      pageRefs.current = new Array(pdf.numPages).fill(null);
      textLayerRefs.current = new Array(pdf.numPages).fill(null);
      setDoc(pdf);
      setNumPages(pdf.numPages);
      restoredInitialPageRef.current = false;
    };
    load().catch((e) => console.error('[pdf] load failed:', e));
    return () => {
      cancelled = true;
    };
  }, [tab.path]);

  // Drop pending selection on unmount so the toolbar doesn't linger over
  // the next reader.
  useEffect(() => {
    return () => clearReaderSelection();
  }, [clearReaderSelection]);

  // Render every page sequentially on doc / scale change. Sequential (vs
  // parallel) keeps pdfjs's worker happy and avoids a render burst spike
  // when zooming a long PDF.
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    (async (): Promise<void> => {
      for (let p = 1; p <= numPages; p += 1) {
        if (cancelled) return;
        const wrap = pageRefs.current[p - 1];
        if (!wrap) continue;
        const canvas = wrap.querySelector('canvas');
        const textLayerDiv = wrap.querySelector(
          'div[data-pdf-text-layer]',
        ) as HTMLDivElement | null;
        if (!canvas || !textLayerDiv) continue;
        try {
          const page = await doc.getPage(p);
          const viewport = page.getViewport({ scale });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          // Pin wrapper size so layout doesn't reflow as later pages
          // render in (avoids snapping the user's scroll position).
          wrap.style.width = `${viewport.width}px`;
          wrap.style.height = `${viewport.height}px`;
          textLayerDiv.style.width = `${viewport.width}px`;
          textLayerDiv.style.height = `${viewport.height}px`;
          if (cancelled) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          // Cancel any prior text layer for this page (zoom triggers a
          // full re-render).
          textLayerRefs.current[p - 1]?.cancel();
          textLayerDiv.replaceChildren();
          const textContent = await page.getTextContent();
          if (cancelled) return;
          const layer = new pdfjsLib.TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
          });
          textLayerRefs.current[p - 1] = layer;
          await layer.render();
        } catch (err) {
          // RenderingCancelledException is a normal part of the lifecycle
          // (zoom while rendering); only surface real failures.
          const msg = (err as Error)?.message ?? '';
          if (!msg.includes('cancelled')) {
            console.warn(`[pdf] render page ${p} failed:`, err);
          }
        }
      }
    })();
    return () => {
      cancelled = true;
      // Cancel any in-flight text layer renders so they don't try to
      // mutate divs that the next render pass has just cleared.
      for (const layer of textLayerRefs.current) {
        layer?.cancel();
      }
    };
  }, [doc, numPages, scale]);

  // After the first render pass completes, jump to the remembered page.
  useEffect(() => {
    if (!doc || numPages === 0) return;
    if (restoredInitialPageRef.current) return;
    const target = Math.min(Math.max(tab.page ?? 1, 1), numPages);
    if (target === 1) {
      restoredInitialPageRef.current = true;
      return;
    }
    requestAnimationFrame(() => {
      const wrap = pageRefs.current[target - 1];
      wrap?.scrollIntoView({ block: 'start' });
      restoredInitialPageRef.current = true;
    });
  }, [doc, numPages, tab.page]);

  // Track current page from scroll position (rAF-throttled so very long
  // PDFs don't block scrolling).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || numPages === 0) return;

    const sample = (): void => {
      const offset = stage.scrollTop + stage.clientHeight * 0.25;
      let p = 1;
      for (let i = 0; i < numPages; i += 1) {
        const wrap = pageRefs.current[i];
        if (!wrap) continue;
        if (wrap.offsetTop <= offset) {
          p = i + 1;
        } else {
          break;
        }
      }
      setCurrentPage(p);
    };

    const onScroll = (): void => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(sample);
    };

    stage.addEventListener('scroll', onScroll, { passive: true });
    sample();
    return () => {
      stage.removeEventListener('scroll', onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [numPages]);

  // Persist current page back into tab metadata.
  useEffect(() => {
    if (!doc) return;
    updateTab(tab.id, { page: currentPage } as Partial<PdfTab>);
  }, [currentPage, doc, tab.id, updateTab]);

  // Selection capture. Listen for selection changes on the stage's
  // document and only react when the selection is inside our stage. We
  // debounce because selectionchange fires on every keystroke.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onSelChange = (): void => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString() ?? '';
        if (!text.trim() || !sel || sel.rangeCount === 0) {
          // Only clear if we previously held the selection — otherwise
          // we'd thrash the store every time the editor's selection
          // changes too.
          if (
            sel &&
            sel.anchorNode &&
            stage.contains(sel.anchorNode) === false &&
            useReaderSelectionStore.getState().source !== 'pdf'
          ) {
            return;
          }
          clearReaderSelection();
          return;
        }
        const anchor = sel.anchorNode;
        if (!anchor || !stage.contains(anchor)) return;
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setReaderSelection({
          text,
          source: 'pdf',
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        });
      }, 80);
    };
    document.addEventListener('selectionchange', onSelChange);
    return () => {
      document.removeEventListener('selectionchange', onSelChange);
      if (timer) clearTimeout(timer);
    };
  }, [setReaderSelection, clearReaderSelection]);

  const scrollToPage = useCallback((p: number): void => {
    const wrap = pageRefs.current[p - 1];
    wrap?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
      <PdfTextLayerStyle />
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-background px-2">
        <Button
          variant="ghost"
          size="icon"
          disabled={currentPage <= 1}
          onClick={() => scrollToPage(currentPage - 1)}
          title="Previous page"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <span className="min-w-20 text-center text-xs text-muted-foreground">
          {currentPage} / {numPages || '…'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          disabled={currentPage >= numPages}
          onClick={() => scrollToPage(currentPage + 1)}
          title="Next page"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <div className="mx-2 h-4 w-px bg-border" />
        <Button variant="ghost" size="icon" onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="min-w-12 text-center text-xs text-muted-foreground">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="ghost" size="icon" onClick={() => setScale((s) => Math.min(3, s + 0.1))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
      </div>

      <div ref={stageRef} className="flex-1 overflow-auto bg-muted/30 p-4">
        <div className="mx-auto flex w-max flex-col items-center gap-3 pb-6">
          {Array.from({ length: numPages }, (_, i) => (
            <div
              key={i}
              ref={(el) => {
                pageRefs.current[i] = el;
              }}
              className="relative bg-white shadow-md"
            >
              <canvas />
              <div data-pdf-text-layer className="pdfTextLayer" />
            </div>
          ))}
          {numPages === 0 && (
            <div className="py-20 text-sm text-muted-foreground">Loading PDF…</div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline pdfjs text-layer styles. Keeps glyphs invisible but selectable,
 * stacked exactly over the canvas. Same shape as the upstream
 * text_layer_builder.css but pruned to what we actually use.
 */
function PdfTextLayerStyle(): JSX.Element {
  return (
    <style>{`
      .pdfTextLayer {
        position: absolute;
        inset: 0;
        overflow: hidden;
        opacity: 1;
        line-height: 1;
        text-align: initial;
        text-size-adjust: none;
        forced-color-adjust: none;
        transform-origin: 0 0;
        z-index: 2;
        --scale-factor: 1;
      }
      .pdfTextLayer :is(span, br) {
        color: transparent;
        position: absolute;
        white-space: pre;
        cursor: text;
        transform-origin: 0% 0%;
      }
      .pdfTextLayer ::selection {
        background: rgba(0, 100, 255, 0.3);
      }
    `}</style>
  );
}

async function readPdfBytes(path: string): Promise<Uint8Array> {
  const url = `file://${encodeURI(path)}`;
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}
