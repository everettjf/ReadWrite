import { create } from 'zustand';
import type { KnownWorkspace } from '@shared/types';

interface WorkspaceState {
  active: string | null;
  known: KnownWorkspace[];
  loaded: boolean;
  load: () => Promise<void>;
  setActive: (path: string) => Promise<KnownWorkspace>;
  create: (parent: string, name: string) => Promise<KnownWorkspace>;
  forget: (path: string) => Promise<void>;
  rename: (path: string, newName: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  active: null,
  known: [],
  loaded: false,

  load: async () => {
    const [active, known] = await Promise.all([
      window.api.workspace.getActive(),
      window.api.workspace.listKnown(),
    ]);
    set({ active, known, loaded: true });
  },

  setActive: async (path: string): Promise<KnownWorkspace> => {
    const entry = await window.api.workspace.setActive(path);
    const known = await window.api.workspace.listKnown();
    set({ active: path, known });
    return entry;
  },

  create: async (parent: string, name: string): Promise<KnownWorkspace> => {
    const entry = await window.api.workspace.create({ parent, name, activate: true });
    const known = await window.api.workspace.listKnown();
    set({ active: entry.path, known });
    return entry;
  },

  forget: async (path: string): Promise<void> => {
    const known = await window.api.workspace.forget(path);
    const active = await window.api.workspace.getActive();
    set({ active, known });
  },

  rename: async (path: string, newName: string): Promise<void> => {
    const known = await window.api.workspace.renameKnown({ path, newName });
    set({ known });
  },
}));

if (typeof window !== 'undefined' && window.api?.workspace?.onActiveChanged) {
  // Cross-window sync: when any window switches the active workspace, update here.
  window.api.workspace.onActiveChanged(async (active) => {
    const known = await window.api.workspace.listKnown();
    useWorkspaceStore.setState({ active, known, loaded: true });
  });
}
