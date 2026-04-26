import type { Tab, SavedTab, SavedTabSession } from '@shared/types';
import { useTabsStore } from '@/stores/tabs';
import { basename } from '@/lib/utils';

/**
 * Persist / restore reader-tab state per workspace.
 *
 * Web tabs always recreate fresh WebContentsViews on restore (Electron can't
 * hibernate them). Local-DOM tabs (PDF / EPUB / code) just remember their
 * addressable resource — the renderer reconstructs the React component on
 * demand.
 */

export function tabsToSession(tabs: Tab[], activeTabId: string | null): SavedTabSession {
  const saved: SavedTab[] = [];
  for (const t of tabs) {
    if (t.kind === 'web' || t.kind === 'github') {
      saved.push({ kind: t.kind, url: t.url, title: t.title });
    } else if (t.kind === 'pdf') {
      saved.push({ kind: 'pdf', path: t.path, title: t.title, page: t.page });
    } else if (t.kind === 'epub') {
      saved.push({ kind: 'epub', path: t.path, title: t.title, location: t.location });
    } else if (t.kind === 'code') {
      saved.push({
        kind: 'code',
        rootPath: t.rootPath,
        title: t.title,
        activeFile: t.activeFile,
      });
    }
  }
  const activeIndex = activeTabId ? tabs.findIndex((t) => t.id === activeTabId) : -1;
  return { tabs: saved, activeIndex: activeIndex >= 0 ? activeIndex : undefined };
}

export async function restoreTabSession(session: SavedTabSession | undefined): Promise<void> {
  const store = useTabsStore.getState();
  // Reset any existing tabs from a previous workspace first.
  for (const t of [...store.tabs]) {
    await window.api.tabs.close(t.id).catch(() => null);
  }
  // Wipe the store independently of close round-trips.
  useTabsStore.setState({ tabs: [], activeTabId: null });

  if (!session?.tabs?.length) return;

  const restored: Tab[] = [];
  for (const s of session.tabs) {
    if (s.kind === 'web' || s.kind === 'github') {
      try {
        const created = await window.api.tabs.create({ url: s.url, kind: s.kind });
        // Force the kind back onto the WebTab shape; the IPC return type is
        // a Tab union and we know which variant we want here.
        restored.push({ ...created, kind: s.kind, url: s.url } as Tab);
      } catch (err) {
        console.warn('[tab-session] failed to restore web tab:', err);
      }
    } else if (s.kind === 'pdf') {
      restored.push(
        useTabsStore.getState().makeLocalTab('pdf', {
          title: s.title ?? basename(s.path),
          path: s.path,
          page: s.page,
        }),
      );
    } else if (s.kind === 'epub') {
      restored.push(
        useTabsStore.getState().makeLocalTab('epub', {
          title: s.title ?? basename(s.path),
          path: s.path,
          // EpubTab.location is `string` in the live shape; coerce numbers to strings.
          location: typeof s.location === 'number' ? String(s.location) : s.location,
        }),
      );
    } else if (s.kind === 'code') {
      restored.push(
        useTabsStore.getState().makeLocalTab('code', {
          title: s.title ?? basename(s.rootPath),
          rootPath: s.rootPath,
          activeFile: s.activeFile,
        }),
      );
    }
  }

  if (restored.length === 0) return;

  // Bulk insert the restored tabs into the store.
  const activeIdx = Math.min(session.activeIndex ?? restored.length - 1, restored.length - 1);
  const activeTab = restored[activeIdx >= 0 ? activeIdx : restored.length - 1] ?? null;
  useTabsStore.setState({
    tabs: restored,
    activeTabId: activeTab?.id ?? null,
  });

  // Make sure the native view of the active tab is what's visible.
  if (activeTab && (activeTab.kind === 'web' || activeTab.kind === 'github')) {
    await window.api.tabs.focus(activeTab.id).catch(() => null);
  }
}
