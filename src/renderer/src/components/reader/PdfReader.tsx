import { useEffect, useRef, useState } from 'react';
import type { PdfTab } from '@shared/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Camera, ZoomIn, ZoomOut } from 'lucide-react';
import { useTabsStore } from '@/stores/tabs';
import { captureElementAndInsert } from '@/lib/screenshot';

// pdfjs worker — set up globally
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

interface PdfReaderProps {
  tab: PdfTab;
}

export function PdfReader({ tab }: PdfReaderProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(tab.page ?? 1);
  const [scale, setScale] = useState(1.2);
  const [numPages, setNumPages] = useState(0);
  const updateTab = useTabsStore((s) => s.updateTab);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const bytes = await readPdfBytes(tab.path);
      if (cancelled) return;
      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      if (cancelled) return;
      setDoc(pdf);
      setNumPages(pdf.numPages);
    };
    load().catch((e) => console.error('[pdf] load failed:', e));
    return () => {
      cancelled = true;
    };
  }, [tab.path]);

  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    let cancelled = false;
    const render = async (): Promise<void> => {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      if (cancelled) return;
      await page.render({ canvasContext: ctx, viewport }).promise;
      updateTab(tab.id, { page: pageNum } as Partial<PdfTab>);
    };
    render().catch((e) => console.error('[pdf] render failed:', e));
    return () => {
      cancelled = true;
    };
  }, [doc, pageNum, scale, tab.id, updateTab]);

  const onCapture = async (): Promise<void> => {
    if (stageRef.current) await captureElementAndInsert(stageRef.current);
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-background px-2">
        <Button
          variant="ghost"
          size="icon"
          disabled={pageNum <= 1}
          onClick={() => setPageNum((p) => Math.max(1, p - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-20 text-center text-xs text-muted-foreground">
          {pageNum} / {numPages || '…'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          disabled={pageNum >= numPages}
          onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
        >
          <ChevronRight className="h-4 w-4" />
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
        <Button variant="ghost" size="icon" onClick={onCapture}>
          <Camera className="h-4 w-4" />
        </Button>
      </div>
      <div ref={stageRef} className="flex-1 overflow-auto bg-muted/30 p-4">
        <div className="mx-auto w-max shadow-md">
          <canvas ref={canvasRef} className="bg-white" />
        </div>
      </div>
    </div>
  );
}

async function readPdfBytes(path: string): Promise<Uint8Array> {
  // For Electron renderer we can't use Node fs directly — route through preload file read,
  // but PDF bytes are binary. We expose a base64-ish path via readFile with utf8; for robustness
  // we fetch via file:// URL which Electron allows from renderer.
  const url = `file://${encodeURI(path)}`;
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}
