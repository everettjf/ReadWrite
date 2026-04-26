import { useCallback, useEffect, useRef, useState } from 'react';
import type { PdfTab } from '@shared/types';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ZoomIn, ZoomOut } from 'lucide-react';
import { useTabsStore } from '@/stores/tabs';

// pdfjs worker — set up globally
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

interface PdfReaderProps {
  tab: PdfTab;
}

/**
 * Continuous-scroll PDF reader.
 *
 * All pages live in one scroll container, stacked vertically. Scrolling
 * the wheel walks the whole document; the toolbar's prev/next buttons
 * `scrollIntoView` the adjacent page (smooth). Zoom +/- re-renders all
 * pages at the new scale. The current page indicator updates from the
 * scroll position, so opening the toolbar's < or > always reflects what
 * the reader is actually looking at.
 */
export function PdfReader({ tab }: PdfReaderProps): JSX.Element {
  const stageRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rafRef = useRef<number | null>(null);
  const restoredInitialPageRef = useRef(false);

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
      setDoc(pdf);
      setNumPages(pdf.numPages);
      restoredInitialPageRef.current = false;
    };
    load().catch((e) => console.error('[pdf] load failed:', e));
    return () => {
      cancelled = true;
    };
  }, [tab.path]);

  // Render every page sequentially on doc / scale change.
  // Sequential (vs parallel) keeps pdfjs's worker happy and avoids
  // a render burst spike when zooming a long PDF.
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    (async (): Promise<void> => {
      for (let p = 1; p <= numPages; p += 1) {
        if (cancelled) return;
        const wrap = pageRefs.current[p - 1];
        if (!wrap) continue;
        const canvas = wrap.querySelector('canvas');
        if (!canvas) continue;
        try {
          const page = await doc.getPage(p);
          const viewport = page.getViewport({ scale });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          // Pin the wrapper size so the layout doesn't reflow as later
          // pages render in (avoids snapping the user's scroll position).
          wrap.style.width = `${viewport.width}px`;
          wrap.style.height = `${viewport.height}px`;
          if (cancelled) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
        } catch (err) {
          console.warn(`[pdf] render page ${p} failed:`, err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, numPages, scale]);

  // After the first render pass completes, jump to the remembered page.
  useEffect(() => {
    if (!doc || numPages === 0) return;
    if (restoredInitialPageRef.current) return;
    const target = Math.min(Math.max(tab.page ?? 1, 1), numPages);
    if (target === 1) {
      // Page 1 is the natural top — no scroll needed.
      restoredInitialPageRef.current = true;
      return;
    }
    requestAnimationFrame(() => {
      const wrap = pageRefs.current[target - 1];
      wrap?.scrollIntoView({ block: 'start' });
      restoredInitialPageRef.current = true;
    });
  }, [doc, numPages, tab.page]);

  // Track current page from scroll position (rAF-throttled so very
  // long PDFs don't block scrolling).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || numPages === 0) return;

    const sample = (): void => {
      const offset = stage.scrollTop + stage.clientHeight * 0.25; // bias to ~quarter screen
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

  // Persist the current page back into the tab metadata so reopening
  // the tab puts the user back where they were.
  useEffect(() => {
    if (!doc) return;
    updateTab(tab.id, { page: currentPage } as Partial<PdfTab>);
  }, [currentPage, doc, tab.id, updateTab]);

  const scrollToPage = useCallback((p: number): void => {
    const wrap = pageRefs.current[p - 1];
    wrap?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
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
              className="bg-white shadow-md"
            >
              <canvas />
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

async function readPdfBytes(path: string): Promise<Uint8Array> {
  const url = `file://${encodeURI(path)}`;
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}
