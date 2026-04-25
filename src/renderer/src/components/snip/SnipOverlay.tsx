import { useEffect, useState } from 'react';
import type { PaneSnapshot } from '@/lib/snip';

interface SnipOverlayProps {
  snapshot: PaneSnapshot;
  onComplete: (rectInImagePx: { x: number; y: number; w: number; h: number }) => void;
  onCancel: () => void;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Full-window overlay for region-snipping. Renders the captured pane snapshot
 * at the live pane's previous bounds (so it looks like the pane "froze"),
 * dims everything, then lets the user drag a rectangle. Outside the rectangle
 * stays dimmed; the rectangle "punches through" the dim by re-rendering the
 * snapshot at the same offset via background-image.
 */
export function SnipOverlay({ snapshot, onComplete, onCancel }: SnipOverlayProps): JSX.Element {
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const clamp = (p: Point): Point => {
    const r = snapshot.rect;
    return {
      x: Math.min(r.left + r.width, Math.max(r.left, p.x)),
      y: Math.min(r.top + r.height, Math.max(r.top, p.y)),
    };
  };

  const onMouseDown = (e: React.MouseEvent): void => {
    const p = clamp({ x: e.clientX, y: e.clientY });
    setStart(p);
    setEnd(p);
    setDragging(true);
  };
  const onMouseMove = (e: React.MouseEvent): void => {
    if (!dragging) return;
    setEnd(clamp({ x: e.clientX, y: e.clientY }));
  };
  const onMouseUp = (): void => {
    if (!dragging || !start || !end) {
      setDragging(false);
      return;
    }
    setDragging(false);
    const fx = Math.min(start.x, end.x);
    const fy = Math.min(start.y, end.y);
    const fw = Math.abs(end.x - start.x);
    const fh = Math.abs(end.y - start.y);
    if (fw < 6 || fh < 6) {
      // Treated as a tap; cancel.
      setStart(null);
      setEnd(null);
      onCancel();
      return;
    }
    const sx = snapshot.width / snapshot.rect.width;
    const sy = snapshot.height / snapshot.rect.height;
    onComplete({
      x: (fx - snapshot.rect.left) * sx,
      y: (fy - snapshot.rect.top) * sy,
      w: fw * sx,
      h: fh * sy,
    });
  };

  const sel =
    start && end
      ? {
          left: Math.min(start.x, end.x),
          top: Math.min(start.y, end.y),
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
        }
      : null;

  return (
    <div
      className="fixed inset-0 z-[9999] cursor-crosshair select-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onContextMenu={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <img
        src={snapshot.dataUrl}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          left: snapshot.rect.left,
          top: snapshot.rect.top,
          width: snapshot.rect.width,
          height: snapshot.rect.height,
          pointerEvents: 'none',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-black/45" />
      {sel && sel.width > 0 && sel.height > 0 && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: sel.left,
            top: sel.top,
            width: sel.width,
            height: sel.height,
            backgroundImage: `url(${snapshot.dataUrl})`,
            backgroundPosition: `-${sel.left - snapshot.rect.left}px -${sel.top - snapshot.rect.top}px`,
            backgroundSize: `${snapshot.rect.width}px ${snapshot.rect.height}px`,
            backgroundRepeat: 'no-repeat',
            outline: '2px solid #2563eb',
            boxShadow: '0 0 0 1px rgba(37,99,235,0.35)',
          }}
        >
          <div
            className="absolute -bottom-6 left-0 rounded bg-blue-600 px-1.5 py-0.5 font-mono text-[10px] text-white"
            style={{ pointerEvents: 'none' }}
          >
            {Math.round(sel.width)} × {Math.round(sel.height)}
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-md bg-black/80 px-3 py-1.5 text-xs text-white">
        Drag to snip · Esc to cancel
      </div>
    </div>
  );
}
