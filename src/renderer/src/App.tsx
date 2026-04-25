import { useCallback, useEffect, useState } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { SplitView } from './components/layout/SplitView';
import { ReaderPane } from './components/reader/ReaderPane';
import { EditorPane } from './components/editor/EditorPane';
import { SnipOverlay } from './components/snip/SnipOverlay';
import { RenameDocDialog } from './components/dialogs/RenameDocDialog';
import { DocsSidebar } from './components/sidebar/DocsSidebar';
import { WorkspacePicker } from './WorkspacePicker';
import { useSettingsStore } from './stores/settings';
import { useEditorStore } from './stores/editor';
import { useWorkspaceStore } from './stores/workspace';
import type { DocSummary } from '@shared/types';
import { startSnip, finalizeSnip } from './lib/snip-runner';
import {
  saveMarkdown,
  createNewDocument,
  openMarkdownFromDialog,
  renameDocFolder,
  openMarkdownAtPath,
  suggestDocNameFromContent,
  docBasename,
  docFolder,
} from './lib/doc-io';
import type { PaneSnapshot } from './lib/snip';

const WELCOME_CONTENT = `# Welcome to ReadWrite

Start typing — your document will be saved automatically into a new folder under this workspace.

- Open a URL, GitHub repo, PDF, EPUB, or local code folder from the **+** button on the left.
- Press **⇧⌘S** (or the ✂️ button) to snip a region from the reader and drop the image into your notes.
- Toggle WYSIWYG / Source from the editor toolbar.
`;

export function App(): JSX.Element {
  const loadSettings = useSettingsStore((s) => s.load);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const autosaveDebounceMs = useSettingsStore((s) => s.autosaveDebounceMs);
  const sidebarVisible = useSettingsStore((s) => s.sidebarVisible);

  const loadWorkspace = useWorkspaceStore((s) => s.load);
  const workspaceLoaded = useWorkspaceStore((s) => s.loaded);
  const activeWorkspace = useWorkspaceStore((s) => s.active);
  const refreshDocs = useWorkspaceStore((s) => s.refreshDocs);

  const [snipSnap, setSnipSnap] = useState<PaneSnapshot | null>(null);
  const [snipToast, setSnipToast] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);

  useEffect(() => {
    loadSettings().catch((e) => console.error('[settings] load failed:', e));
    loadWorkspace().catch((e) => console.error('[workspace] load failed:', e));
  }, [loadSettings, loadWorkspace]);

  // When the active workspace changes (e.g. switch from the title bar dropdown),
  // reset the editor so the next user action creates a doc inside the new one.
  useEffect(() => {
    if (!activeWorkspace) return;
    const editor = useEditorStore.getState();
    // If the current doc lives outside the new active workspace, clear it.
    if (editor.path && !editor.path.startsWith(`${activeWorkspace}/`)) {
      editor.setPath(null);
      editor.setContent(WELCOME_CONTENT, { markDirty: false });
    } else if (!editor.path) {
      editor.setContent(WELCOME_CONTENT, { markDirty: false });
    }
  }, [activeWorkspace]);

  // Auto-refresh the docs list when the workspace folder changes on disk
  // (Finder, Git pulls, iCloud sync, etc.). We filter out images/ subfolders
  // so saving a screenshot doesn't trigger a refresh, and debounce so a burst
  // of FS events coalesces into one refetch.
  useEffect(() => {
    if (!activeWorkspace) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    window.api.fs.watchDir(activeWorkspace).catch(() => null);

    const off = window.api.fs.onWatchEvent((evt) => {
      if (cancelled) return;
      if (evt.root !== activeWorkspace) return;
      // Ignore events that happen inside any doc's images/ folder.
      if (/[\\/]images[\\/]/.test(evt.path)) return;
      // Ignore hidden files (.DS_Store etc).
      if (/[\\/]\.[^\\/]+(?:[\\/]|$)/.test(evt.path)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (!cancelled) refreshDocs().catch(() => null);
      }, 400);
    });

    return () => {
      cancelled = true;
      off();
      if (timer) clearTimeout(timer);
      window.api.fs.unwatchDir(activeWorkspace).catch(() => null);
    };
  }, [activeWorkspace, refreshDocs]);

  // Autosave / lazy doc-folder creation
  useEffect(() => {
    if (autosaveDebounceMs <= 0) return;
    if (!activeWorkspace) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useEditorStore.subscribe((state) => {
      if (timer) clearTimeout(timer);
      if (!state.dirty) return;
      timer = setTimeout(async () => {
        const snap = useEditorStore.getState();
        if (!snap.dirty) return;
        try {
          let path = snap.path;
          let createdNew = false;
          if (!path) {
            const created = await createNewDocument({
              initialContent: snap.content,
              suggestedName: suggestDocNameFromContent(snap.content),
            });
            path = created.path;
            useEditorStore.getState().setPath(path);
            createdNew = true;
          } else {
            await saveMarkdown(snap.content, path);
          }
          useEditorStore.getState().setDirty(false);
          if (createdNew) {
            await refreshDocs();
          }
        } catch (err) {
          console.error('[autosave] failed:', err);
        }
      }, autosaveDebounceMs);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [autosaveDebounceMs, activeWorkspace, refreshDocs]);

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
        setSnipToast('Nothing to snip — open a tab in the reader first.');
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
        const result = await finalizeSnip(snipSnap, rect, { autoInsertIntoEditor: true });
        const where = result.relativePath ?? result.savedPath ?? '(in clipboard)';
        setSnipToast(`Snipped ${result.width}×${result.height} → inserted as ${where}.`);
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

  const onNewDoc = useCallback(async () => {
    const editor = useEditorStore.getState();
    if (editor.dirty && !confirm('Discard unsaved changes in the current document?')) return;
    const created = await createNewDocument({ initialContent: '# Untitled\n\n' });
    editor.setPath(created.path);
    editor.setContent(created.content, { markDirty: false });
    await refreshDocs();
  }, [refreshDocs]);

  const onOpenDoc = useCallback(async () => {
    const editor = useEditorStore.getState();
    if (editor.dirty && !confirm('Discard unsaved changes?')) return;
    const opened = await openMarkdownFromDialog();
    if (!opened) return;
    editor.setPath(opened.path);
    editor.setContent(opened.content, { markDirty: false });
  }, []);

  const onSwitchDoc = useCallback(async (doc: DocSummary): Promise<void> => {
    const editor = useEditorStore.getState();
    if (editor.dirty && !confirm('Discard unsaved changes?')) return;
    const opened = await openMarkdownAtPath(doc.path);
    editor.setPath(opened.path);
    editor.setContent(opened.content, { markDirty: false });
  }, []);

  const onRenameConfirm = useCallback(
    async (newName: string): Promise<void> => {
      const editor = useEditorStore.getState();
      if (!editor.path) return;
      const newPath = await renameDocFolder(editor.path, newName);
      const reopened = await openMarkdownAtPath(newPath);
      editor.setPath(reopened.path);
      editor.setContent(reopened.content, { markDirty: false });
      setRenameOpen(false);
      await refreshDocs();
    },
    [refreshDocs],
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const accel = e.metaKey || e.ctrlKey;
      const shifted = accel && e.shiftKey;
      if (shifted && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        onStartSnip();
      } else if (accel && !e.shiftKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        onNewDoc();
      } else if (accel && !e.shiftKey && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        onOpenDoc();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStartSnip, onNewDoc, onOpenDoc]);

  if (!settingsLoaded || !workspaceLoaded) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!activeWorkspace) {
    return <WorkspacePicker />;
  }

  const editorPath = useEditorStore.getState().path;
  const renameInitial = editorPath ? docBasename(docFolder(editorPath)) : 'Untitled';

  return (
    <div className="flex h-full w-full flex-col">
      <TitleBar
        onStartSnip={onStartSnip}
        onNewDoc={onNewDoc}
        onOpenDoc={onOpenDoc}
        onRenameDoc={() => setRenameOpen(true)}
      />
      <div className="flex-1 overflow-hidden">
        <SplitView
          sidebar={<DocsSidebar onSwitchDoc={onSwitchDoc} />}
          sidebarVisible={sidebarVisible}
          left={<ReaderPane />}
          right={<EditorPane />}
        />
      </div>

      {snipSnap && (
        <SnipOverlay snapshot={snipSnap} onComplete={onSnipComplete} onCancel={onSnipCancel} />
      )}
      {snipToast && (
        <div className="fixed bottom-6 left-1/2 z-[9998] -translate-x-1/2 rounded-md bg-foreground/90 px-3 py-2 text-xs text-background shadow-lg">
          {snipToast}
        </div>
      )}

      <RenameDocDialog
        open={renameOpen}
        initialName={renameInitial}
        onCancel={() => setRenameOpen(false)}
        onConfirm={onRenameConfirm}
      />
    </div>
  );
}
