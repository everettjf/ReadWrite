import { useCallback, useEffect, useState } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { SplitView } from './components/layout/SplitView';
import { ReaderPane } from './components/reader/ReaderPane';
import { EditorPane } from './components/editor/EditorPane';
import { SnipOverlay } from './components/snip/SnipOverlay';
import { useSettingsStore } from './stores/settings';
import { useEditorStore } from './stores/editor';
import { startSnip, finalizeSnip } from './lib/snip-runner';
import type { PaneSnapshot } from './lib/snip';

export function App(): JSX.Element {
  const load = useSettingsStore((s) => s.load);
  const loaded = useSettingsStore((s) => s.loaded);
  const [snipSnap, setSnipSnap] = useState<PaneSnapshot | null>(null);
  const [snipToast, setSnipToast] = useState<string | null>(null);

  useEffect(() => {
    load().catch((e) => console.error('[settings] load failed:', e));
  }, [load]);

  // Unsaved-changes guard
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (useEditorStore.getState().dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Auto-clear snip toast
  useEffect(() => {
    if (!snipToast) return;
    const t = setTimeout(() => setSnipToast(null), 4000);
    return () => clearTimeout(t);
  }, [snipToast]);

  const onStartSnip = useCallback(async () => {
    if (snipSnap) return;
    try {
      const snap = await startSnip();
      if (!snap) {
        setSnipToast('Nothing to snip — open a tab first.');
        return;
      }
      setSnipSnap(snap);
    } catch (err) {
      setSnipToast(`Snip capture failed: ${(err as Error).message}`);
    }
  }, [snipSnap]);

  const onSnipComplete = useCallback(
    async (rect: { x: number; y: number; w: number; h: number }) => {
      if (!snipSnap) return;
      try {
        const result = await finalizeSnip(snipSnap, rect, { alsoSaveToImagesDir: true });
        const where = result.relativePath ?? result.savedPath;
        setSnipToast(
          where
            ? `Snipped ${result.width}×${result.height} → clipboard, saved as ${where}. Paste anywhere with Cmd/Ctrl+V.`
            : `Snipped ${result.width}×${result.height} → clipboard. Paste anywhere with Cmd/Ctrl+V.`,
        );
      } catch (err) {
        setSnipToast(`Snip failed: ${(err as Error).message}`);
      } finally {
        await snipSnap.restore();
        setSnipSnap(null);
      }
    },
    [snipSnap],
  );

  const onSnipCancel = useCallback(async () => {
    if (!snipSnap) return;
    await snipSnap.restore();
    setSnipSnap(null);
  }, [snipSnap]);

  // Global keyboard shortcut: Cmd+Shift+S (mac) / Ctrl+Shift+S (win/linux)
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const accel = (e.metaKey || e.ctrlKey) && e.shiftKey;
      if (accel && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        onStartSnip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStartSnip]);

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <TitleBar onStartSnip={onStartSnip} />
      <div className="flex-1 overflow-hidden">
        <SplitView left={<ReaderPane />} right={<EditorPane />} />
      </div>

      {snipSnap && (
        <SnipOverlay snapshot={snipSnap} onComplete={onSnipComplete} onCancel={onSnipCancel} />
      )}
      {snipToast && (
        <div className="fixed bottom-6 left-1/2 z-[9998] -translate-x-1/2 rounded-md bg-foreground/90 px-3 py-2 text-xs text-background shadow-lg">
          {snipToast}
        </div>
      )}
    </div>
  );
}
