import { useTabsStore } from '@/stores/tabs';
import { toGithubWebUrl, basename } from './utils';
import type { Tab } from '@shared/types';

/**
 * Shared "open a new reader tab" helpers. Used by both the TabBar's `+`
 * dialog and the ReaderPane empty state.
 */

export async function openWebOrGithubTab(rawInput: string): Promise<boolean> {
  const url = toGithubWebUrl(rawInput);
  if (!url) return false;
  const kind: 'web' | 'github' = /github\.com/i.test(url) ? 'github' : 'web';
  const tab = await window.api.tabs.create({ url, kind });
  useTabsStore.getState().addTab({ ...(tab as Tab), kind } as Tab);
  return true;
}

export async function openPdfFromDialog(): Promise<boolean> {
  const paths = await window.api.fs.openDialog({
    title: 'Open PDF',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (!paths || paths.length === 0) return false;
  const path = paths[0]!;
  const { makeLocalTab, addTab } = useTabsStore.getState();
  addTab(makeLocalTab('pdf', { title: basename(path), path }));
  return true;
}

export async function openEpubFromDialog(): Promise<boolean> {
  const paths = await window.api.fs.openDialog({
    title: 'Open EPUB',
    filters: [{ name: 'EPUB', extensions: ['epub'] }],
  });
  if (!paths || paths.length === 0) return false;
  const path = paths[0]!;
  const { makeLocalTab, addTab } = useTabsStore.getState();
  addTab(makeLocalTab('epub', { title: basename(path), path }));
  return true;
}

export async function openCodeFolderFromDialog(): Promise<boolean> {
  const paths = await window.api.fs.openDialog({
    directory: true,
    title: 'Open code folder',
  });
  if (!paths || paths.length === 0) return false;
  const rootPath = paths[0]!;
  const { makeLocalTab, addTab } = useTabsStore.getState();
  addTab(makeLocalTab('code', { title: basename(rootPath), rootPath }));
  return true;
}
