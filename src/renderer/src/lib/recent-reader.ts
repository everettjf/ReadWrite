import type { RecentReaderItem } from '@shared/types';
import { useWorkspaceStore } from '@/stores/workspace';

const MAX_PER_WORKSPACE = 30;

/**
 * Identity for dedup. Same kind + same primary ref → same item.
 */
function identityOf(item: RecentReaderItem): string {
  switch (item.kind) {
    case 'web':
    case 'github':
      return `${item.kind}:${item.url}`;
    case 'pdf':
    case 'epub':
      return `${item.kind}:${item.path}`;
    case 'code':
      return `${item.kind}:${item.rootPath}`;
  }
}

export async function loadRecentReader(workspacePath: string): Promise<RecentReaderItem[]> {
  try {
    const map = await window.api.session.loadRecentReader();
    return map[workspacePath] ?? [];
  } catch {
    return [];
  }
}

/**
 * Push an item to the active workspace's recent list. Dedupes (newer
 * timestamp wins), trims to MAX_PER_WORKSPACE, then persists.
 */
export async function pushRecentReader(item: RecentReaderItem): Promise<void> {
  const ws = useWorkspaceStore.getState().active;
  if (!ws) return;
  try {
    const map = await window.api.session.loadRecentReader();
    const existing = map[ws] ?? [];
    const id = identityOf(item);
    const filtered = existing.filter((e) => identityOf(e) !== id);
    const next = [item, ...filtered].slice(0, MAX_PER_WORKSPACE);
    map[ws] = next;
    await window.api.session.saveRecentReader(map);
  } catch (err) {
    console.warn('[recent-reader] save failed:', err);
  }
}

export async function removeRecentReader(item: RecentReaderItem): Promise<void> {
  const ws = useWorkspaceStore.getState().active;
  if (!ws) return;
  try {
    const map = await window.api.session.loadRecentReader();
    const existing = map[ws] ?? [];
    const id = identityOf(item);
    map[ws] = existing.filter((e) => identityOf(e) !== id);
    await window.api.session.saveRecentReader(map);
  } catch (err) {
    console.warn('[recent-reader] remove failed:', err);
  }
}
