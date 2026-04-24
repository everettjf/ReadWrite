import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Tab, TabKind } from '@shared/types';

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (tab: Tab) => void;
  removeTab: (id: string) => void;
  setActive: (id: string | null) => void;
  updateTab: (id: string, patch: Partial<Tab>) => void;
  makeLocalTab: (kind: TabKind, partial: Partial<Tab>) => Tab;
}

export const useTabsStore = create<TabsState>((set) => ({
  tabs: [],
  activeTabId: null,
  addTab: (tab) =>
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: tab.id,
    })),
  removeTab: (id) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeTabId =
        s.activeTabId === id
          ? tabs.length > 0
            ? (tabs[tabs.length - 1]?.id ?? null)
            : null
          : s.activeTabId;
      return { tabs, activeTabId };
    }),
  setActive: (id) => set({ activeTabId: id }),
  updateTab: (id, patch) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? ({ ...t, ...patch } as Tab) : t)),
    })),
  makeLocalTab: (kind, partial) => {
    const id = nanoid(10);
    return {
      id,
      kind,
      title: 'Untitled',
      createdAt: Date.now(),
      ...partial,
    } as Tab;
  },
}));
