import { useTabsStore } from '@/stores/tabs';
import { toGithubWebUrl, basename } from './utils';
import { pushRecentReader } from './recent-reader';
import type { Tab } from '@shared/types';

/**
 * Shared "open a new reader tab" helpers. Used by both the TabBar's `+`
 * dialog and the ReaderPane empty state. Each successful open also
 * pushes the item to the active workspace's recent-reader list (best
 * effort — the open succeeds even if recent-reader persistence fails).
 */

export async function openWebOrGithubTab(rawInput: string): Promise<boolean> {
  const url = toGithubWebUrl(rawInput);
  if (!url) return false;
  const kind: 'web' | 'github' = /github\.com/i.test(url) ? 'github' : 'web';
  const tab = await window.api.tabs.create({ url, kind });
  useTabsStore.getState().addTab({ ...(tab as Tab), kind } as Tab);
  void pushRecentReader({ kind, url, title: tab.title || url, ts: Date.now() });
  return true;
}

export async function openPdfFromDialog(): Promise<boolean> {
  const paths = await window.api.fs.openDialog({
    title: 'Open PDF',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (!paths || paths.length === 0) return false;
  const path = paths[0]!;
  return openPdfAtPath(path);
}

export async function openEpubFromDialog(): Promise<boolean> {
  const paths = await window.api.fs.openDialog({
    title: 'Open EPUB',
    filters: [{ name: 'EPUB', extensions: ['epub'] }],
  });
  if (!paths || paths.length === 0) return false;
  const path = paths[0]!;
  return openEpubAtPath(path);
}

export async function openCodeFolderFromDialog(): Promise<boolean> {
  const paths = await window.api.fs.openDialog({
    directory: true,
    title: 'Open code folder',
  });
  if (!paths || paths.length === 0) return false;
  const rootPath = paths[0]!;
  return openCodeFolderAtPath(rootPath);
}

export function openPdfAtPath(path: string): boolean {
  const { makeLocalTab, addTab } = useTabsStore.getState();
  const title = basename(path);
  addTab(makeLocalTab('pdf', { title, path }));
  void pushRecentReader({ kind: 'pdf', path, title, ts: Date.now() });
  return true;
}

export function openEpubAtPath(path: string): boolean {
  const { makeLocalTab, addTab } = useTabsStore.getState();
  const title = basename(path);
  addTab(makeLocalTab('epub', { title, path }));
  void pushRecentReader({ kind: 'epub', path, title, ts: Date.now() });
  return true;
}

export function openCodeFolderAtPath(rootPath: string): boolean {
  const { makeLocalTab, addTab } = useTabsStore.getState();
  const title = basename(rootPath);
  addTab(makeLocalTab('code', { title, rootPath }));
  void pushRecentReader({ kind: 'code', rootPath, title, ts: Date.now() });
  return true;
}
