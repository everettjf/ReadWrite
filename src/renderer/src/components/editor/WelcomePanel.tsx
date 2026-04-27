import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspace';
import { useEditorStore } from '@/stores/editor';
import { Button } from '@/components/ui/button';
import { FilePlus, FileText, Globe, Github, Book, Code2, X } from 'lucide-react';
import { relativeTime } from '@/lib/utils';
import {
  openPdfFromDialog,
  openEpubFromDialog,
  openCodeFolderFromDialog,
  openWebOrGithubTab,
  openPdfAtPath,
  openEpubAtPath,
  openCodeFolderAtPath,
} from '@/lib/open-tab';
import { createNewDocument, openMarkdownFromDialog, openMarkdownAtPath } from '@/lib/doc-io';
import { loadRecentReader, removeRecentReader } from '@/lib/recent-reader';
import { cn } from '@/lib/utils';
import type { DocSummary, RecentReaderItem } from '@shared/types';

const MAX_DOCS_SHOWN = 8;
const MAX_READER_SHOWN = 12;

/**
 * Replaces the editor with a "Welcome / Recent" view when no document
 * is open. Lists recent docs from the active workspace plus recent
 * reader items (web / github / pdf / epub / code). Click to reopen.
 */
export function WelcomePanel(): JSX.Element {
  const activeWorkspace = useWorkspaceStore((s) => s.active);
  const known = useWorkspaceStore((s) => s.known);
  const docs = useWorkspaceStore((s) => s.docs);
  const refreshDocs = useWorkspaceStore((s) => s.refreshDocs);
  const editor = useEditorStore;

  const [recents, setRecents] = useState<RecentReaderItem[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const wsName = known.find((w) => w.path === activeWorkspace)?.name ?? '—';

  useEffect(() => {
    if (!activeWorkspace) return;
    let cancelled = false;
    loadRecentReader(activeWorkspace)
      .then((list) => {
        if (cancelled) return;
        setRecents(list);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace, reloadKey]);

  const onNewDoc = async (): Promise<void> => {
    const created = await createNewDocument({ initialContent: '# Untitled\n\n' });
    editor.getState().setPath(created.path);
    editor.getState().setContent(created.content, { markDirty: false });
    await refreshDocs();
  };

  const onOpenMarkdown = async (): Promise<void> => {
    const opened = await openMarkdownFromDialog();
    if (!opened) return;
    editor.getState().setPath(opened.path);
    editor.getState().setContent(opened.content, { markDirty: false });
  };

  const onOpenDoc = async (doc: DocSummary): Promise<void> => {
    const opened = await openMarkdownAtPath(doc.path);
    editor.getState().setPath(opened.path);
    editor.getState().setContent(opened.content, { markDirty: false });
  };

  const onOpenRecent = async (item: RecentReaderItem): Promise<void> => {
    try {
      if (item.kind === 'web' || item.kind === 'github') {
        await openWebOrGithubTab(item.url);
      } else if (item.kind === 'pdf') {
        // pathExists check — file may have been moved/deleted since.
        const exists = await window.api.fs.pathExists(item.path).catch(() => false);
        if (!exists) {
          alert(`The file no longer exists:\n${item.path}`);
          await removeRecentReader(item);
          setReloadKey((k) => k + 1);
          return;
        }
        openPdfAtPath(item.path);
      } else if (item.kind === 'epub') {
        const exists = await window.api.fs.pathExists(item.path).catch(() => false);
        if (!exists) {
          alert(`The file no longer exists:\n${item.path}`);
          await removeRecentReader(item);
          setReloadKey((k) => k + 1);
          return;
        }
        openEpubAtPath(item.path);
      } else if (item.kind === 'code') {
        const exists = await window.api.fs.pathExists(item.rootPath).catch(() => false);
        if (!exists) {
          alert(`The folder no longer exists:\n${item.rootPath}`);
          await removeRecentReader(item);
          setReloadKey((k) => k + 1);
          return;
        }
        openCodeFolderAtPath(item.rootPath);
      }
    } catch (err) {
      alert(`Open failed: ${(err as Error).message}`);
    }
  };

  const onForgetRecent = async (e: React.MouseEvent, item: RecentReaderItem): Promise<void> => {
    e.stopPropagation();
    await removeRecentReader(item);
    setReloadKey((k) => k + 1);
  };

  const recentDocs = [...docs].sort((a, b) => b.mtime - a.mtime).slice(0, MAX_DOCS_SHOWN);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-8 px-8 py-12">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">ReadWrite</h1>
          <p className="text-sm text-muted-foreground">
            Workspace: <span className="font-medium text-foreground">{wsName}</span>
          </p>
        </header>

        <section className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button onClick={onNewDoc}>
              <FilePlus className="mr-2 h-4 w-4" /> New document
            </Button>
            <Button variant="outline" onClick={onOpenMarkdown}>
              <FileText className="mr-2 h-4 w-4" /> Open Markdown…
            </Button>
            <Button variant="outline" onClick={() => openPdfFromDialog()}>
              <Book className="mr-2 h-4 w-4" /> Open PDF…
            </Button>
            <Button variant="outline" onClick={() => openEpubFromDialog()}>
              <Book className="mr-2 h-4 w-4" /> Open EPUB…
            </Button>
            <Button variant="outline" onClick={() => openCodeFolderFromDialog()}>
              <Code2 className="mr-2 h-4 w-4" /> Open code folder…
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            For URL / GitHub repos, use the <span className="font-mono">+</span> button at the right
            of the reader tab bar.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent documents
          </h2>
          {recentDocs.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
              No documents yet. Click <span className="font-mono">New document</span> above.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {recentDocs.map((doc) => (
                <li key={doc.path}>
                  <button
                    type="button"
                    onClick={() => onOpenDoc(doc)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent/40"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm">{doc.name}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {relativeTime(doc.mtime)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent reader items
          </h2>
          {recents.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
              Nothing here yet. Open a URL / PDF / EPUB / code folder from the reader and it will
              appear here.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {recents.slice(0, MAX_READER_SHOWN).map((item) => (
                <li key={identityOf(item) + item.ts}>
                  <RecentRow item={item} onOpen={onOpenRecent} onForget={onForgetRecent} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function identityOf(item: RecentReaderItem): string {
  return `${item.kind}:${refOf(item)}`;
}

function refOf(item: RecentReaderItem): string {
  switch (item.kind) {
    case 'web':
    case 'github':
      return item.url;
    case 'pdf':
    case 'epub':
      return item.path;
    case 'code':
      return item.rootPath;
  }
}

function RecentRow({
  item,
  onOpen,
  onForget,
}: {
  item: RecentReaderItem;
  onOpen: (item: RecentReaderItem) => void;
  onForget: (e: React.MouseEvent, item: RecentReaderItem) => void;
}): JSX.Element {
  const Icon =
    item.kind === 'github'
      ? Github
      : item.kind === 'web'
        ? Globe
        : item.kind === 'pdf'
          ? FileText
          : item.kind === 'epub'
            ? Book
            : Code2;

  const ref = refOf(item);
  const title = item.title || ref;

  return (
    <div className="group flex items-center gap-3 px-3 py-2">
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:text-foreground"
      >
        <span
          className={cn(
            'rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
            'bg-muted text-muted-foreground',
          )}
        >
          {item.kind}
        </span>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
        <span className="hidden shrink-0 truncate font-mono text-[10px] text-muted-foreground sm:inline-block sm:max-w-[16rem]">
          {ref}
        </span>
      </button>
      <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(item.ts)}</span>
      <button
        type="button"
        onClick={(e) => onForget(e, item)}
        className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
        title="Forget this item"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
