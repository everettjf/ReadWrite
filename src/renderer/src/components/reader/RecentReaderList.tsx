import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspace';
import { FileText, Globe, Github, Book, Code2, X } from 'lucide-react';
import { relativeTime, cn } from '@/lib/utils';
import {
  openWebOrGithubTab,
  openPdfAtPath,
  openEpubAtPath,
  openCodeFolderAtPath,
} from '@/lib/open-tab';
import { loadRecentReader, removeRecentReader } from '@/lib/recent-reader';
import type { RecentReaderItem } from '@shared/types';

interface RecentReaderListProps {
  /** Max number of items to render. Defaults to 12. */
  limit?: number;
}

/**
 * Reads the active workspace's recent reader items and renders them
 * as a clickable list. Hovering a row reveals an X to forget the
 * single entry. Clicking a missing-on-disk file removes it from
 * recents and shows a one-shot alert.
 */
export function RecentReaderList({ limit = 12 }: RecentReaderListProps): JSX.Element {
  const activeWorkspace = useWorkspaceStore((s) => s.active);
  const [items, setItems] = useState<RecentReaderItem[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!activeWorkspace) return;
    let cancelled = false;
    loadRecentReader(activeWorkspace)
      .then((list) => {
        if (cancelled) return;
        setItems(list);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace, reloadKey]);

  const onOpen = async (item: RecentReaderItem): Promise<void> => {
    try {
      switch (item.kind) {
        case 'web':
        case 'github':
          await openWebOrGithubTab(item.url);
          return;
        case 'pdf': {
          const exists = await window.api.fs.pathExists(item.path).catch(() => false);
          if (!exists) {
            alert(`The file no longer exists:\n${item.path}`);
            await removeRecentReader(item);
            setReloadKey((k) => k + 1);
            return;
          }
          openPdfAtPath(item.path);
          return;
        }
        case 'epub': {
          const exists = await window.api.fs.pathExists(item.path).catch(() => false);
          if (!exists) {
            alert(`The file no longer exists:\n${item.path}`);
            await removeRecentReader(item);
            setReloadKey((k) => k + 1);
            return;
          }
          openEpubAtPath(item.path);
          return;
        }
        case 'code': {
          const exists = await window.api.fs.pathExists(item.rootPath).catch(() => false);
          if (!exists) {
            alert(`The folder no longer exists:\n${item.rootPath}`);
            await removeRecentReader(item);
            setReloadKey((k) => k + 1);
            return;
          }
          openCodeFolderAtPath(item.rootPath);
          return;
        }
      }
    } catch (err) {
      alert(`Open failed: ${(err as Error).message}`);
    }
  };

  const onForget = async (e: React.MouseEvent, item: RecentReaderItem): Promise<void> => {
    e.stopPropagation();
    await removeRecentReader(item);
    setReloadKey((k) => k + 1);
  };

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
        Nothing here yet. Open a URL / PDF / EPUB / code folder above and it will appear here.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {items.slice(0, limit).map((item) => (
        <li key={`${item.kind}:${refOf(item)}`}>
          <Row item={item} onOpen={onOpen} onForget={onForget} />
        </li>
      ))}
    </ul>
  );
}

function Row({
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
