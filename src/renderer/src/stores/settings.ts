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
  editorFontSize: 16,
  editorFontFamily: 'sans',
  editorMaxWidth: 760,
  imagesDirMode: 'next-to-doc',
  imagesDirSubfolderName: 'images',
  aiEnabled: false,
  aiEndpoint: 'https://api.openai.com/v1',
  aiApiKey: '',
  aiModel: 'gpt-4o-mini',
  aiSystemPrompt: '',
  wechatExportTheme: 'default',
  autosaveDebounceMs: 1500,
};

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULTS,
  loaded: false,
  load: async () => {
    const s = await window.api.settings.get();
    set({ ...s, loaded: true });
    applyTheme(s.theme);
    applyEditorVars(s);
  },
  update: async (patch) => {
    const next = await window.api.settings.set(patch);
    set({ ...next });
    if (patch.theme) applyTheme(next.theme);
    applyEditorVars(next);
  },
}));

function applyTheme(theme: AppSettings['theme']): void {
  const root = document.documentElement;
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
}

function applyEditorVars(s: AppSettings): void {
  const root = document.documentElement;
  root.style.setProperty('--rw-editor-font-size', `${s.editorFontSize}px`);
  root.style.setProperty('--rw-editor-max-width', `${s.editorMaxWidth}px`);
  const family =
    s.editorFontFamily === 'mono'
      ? 'JetBrains Mono, SF Mono, Menlo, monospace'
      : s.editorFontFamily === 'serif'
        ? 'Georgia, "Times New Roman", serif'
        : 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  root.style.setProperty('--rw-editor-font-family', family);
}

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useSettingsStore.getState();
    if (theme === 'system') applyTheme('system');
  });
  // Cross-window sync: when settings change in any window, refresh state here.
  window.api?.settings?.onChanged?.((next) => {
    useSettingsStore.setState({ ...next, loaded: true });
    applyTheme(next.theme);
    applyEditorVars(next);
  });
}
