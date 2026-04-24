import { create } from 'zustand';
import type { AppSettings } from '@shared/types';

interface SettingsState extends AppSettings {
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}

const DEFAULTS: AppSettings = {
  theme: 'system',
  editorMode: 'wysiwyg',
  fontSize: 14,
  splitRatio: 0.5,
};

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULTS,
  loaded: false,
  load: async () => {
    const s = await window.api.settings.get();
    set({ ...s, loaded: true });
    applyTheme(s.theme);
  },
  update: async (patch) => {
    const next = await window.api.settings.set(patch);
    set({ ...next });
    if (patch.theme) applyTheme(next.theme);
  },
}));

function applyTheme(theme: AppSettings['theme']): void {
  const root = document.documentElement;
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
}

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useSettingsStore.getState();
    if (theme === 'system') applyTheme('system');
  });
}
