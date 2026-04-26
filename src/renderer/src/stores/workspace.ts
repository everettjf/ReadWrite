import { create } from 'zustand';
import type { KnownWorkspace, DocSummary } from '@shared/types';

interface WorkspaceState {
  active: string | null;
  known: KnownWorkspace[];
  docs: DocSummary[];
  loaded: boolean;
  load: () => Promise<void>;
  setActive: (path: string) => Promise<KnownWorkspace>;
  create: (parent: string, name: string) => Promise<KnownWorkspace>;
  forget: (path: string) => Promise<void>;
  trash: (path: string) => Promise<void>;
  rename: (path: string, newName: string) => Promise<void>;
  refreshDocs: () => Promise<void>;
}

async function loadDocs(active: string | null): Promise<DocSummary[]> {
  if (!active) return [];
  return await window.api.workspace.listDocs(active);
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  active: null,
  known: [],
  docs: [],
  loaded: false,

  load: async () => {
    const [active, known] = await Promise.all([
      window.api.workspace.getActive(),
      window.api.workspace.listKnown(),
    ]);
    const docs = await loadDocs(active);
    set({ active, known, docs, loaded: true });
  },

  setActive: async (path: string): Promise<KnownWorkspace> => {
    const entry = await window.api.workspace.setActive(path);
    const known = await window.api.workspace.listKnown();
    const docs = await loadDocs(path);
    set({ active: path, known, docs });
    return entry;
  },

  create: async (parent: string, name: string): Promise<KnownWorkspace> => {
    const entry = await window.api.workspace.create({ parent, name, activate: true });
    const known = await window.api.workspace.listKnown();
    const docs = await loadDocs(entry.path);
    set({ active: entry.path, known, docs });
    return entry;
  },

  forget: async (path: string): Promise<void> => {
    const known = await window.api.workspace.forget(path);
    const active = await window.api.workspace.getActive();
    const docs = await loadDocs(active);
    set({ active, known, docs });
  },

  trash: async (path: string): Promise<void> => {
    const known = await window.api.workspace.trash(path);
    const active = await window.api.workspace.getActive();
    const docs = await loadDocs(active);
    set({ active, known, docs });
  },

  rename: async (path: string, newName: string): Promise<void> => {
    const known = await window.api.workspace.renameKnown({ path, newName });
    set({ known });
  },

  refreshDocs: async (): Promise<void> => {
    const docs = await loadDocs(get().active);
    set({ docs });
  },
}));

if (typeof window !== 'undefined' && window.api?.workspace?.onActiveChanged) {
  // Cross-window sync: when any window switches the active workspace, update here.
  window.api.workspace.onActiveChanged(async (active) => {
    const [known, docs] = await Promise.all([window.api.workspace.listKnown(), loadDocs(active)]);
    useWorkspaceStore.setState({ active, known, docs, loaded: true });
  });
}
