import { create } from 'zustand';
import type { UiLanguageSetting } from '@shared/types';
import { en, type DictKey } from './locales/en';
import { zh } from './locales/zh';

export type ResolvedLang = 'en' | 'zh';

const dictionaries = { en, zh } as const;

/**
 * Resolve `setting` against the runtime locale. 'en' / 'zh' are explicit;
 * 'system' (and any unknown value) consults `navigator.language` and falls
 * back to English when the OS language isn't one we ship a dictionary for.
 */
export function resolveLang(setting: UiLanguageSetting | undefined): ResolvedLang {
  if (setting === 'en' || setting === 'zh') return setting;
  if (typeof navigator === 'undefined') return 'en';
  const raw = (navigator.language || '').toLowerCase();
  if (raw.startsWith('zh')) return 'zh';
  return 'en';
}

interface I18nState {
  lang: ResolvedLang;
}

const useI18nStore = create<I18nState>(() => ({ lang: resolveLang('system') }));

/**
 * Push a new language setting to the i18n store. Called by the settings
 * store after load and after every settings update.
 */
export function applyLanguage(setting: UiLanguageSetting | undefined): void {
  const next = resolveLang(setting);
  if (next !== useI18nStore.getState().lang) {
    useI18nStore.setState({ lang: next });
  }
  if (typeof document !== 'undefined') {
    // Keep the <html lang> attribute honest so screen readers / spell-check
    // pick the right language alongside the visible text.
    document.documentElement.lang = next === 'zh' ? 'zh-Hans' : 'en';
  }
}

if (typeof window !== 'undefined') {
  // Re-resolve when the user changes their OS language while the app is
  // open *and* their setting is 'system'. Browsers expose this as a
  // 'languagechange' event on window.
  window.addEventListener('languagechange', () => {
    // We don't know the current setting here without coupling to the
    // settings store, so we just force a re-resolve assuming 'system'.
    // Settings-store apply will overwrite this on the next change anyway.
    applyLanguage('system');
  });
}

function lookup(lang: ResolvedLang, key: DictKey): string {
  const dict = dictionaries[lang] as Partial<Record<DictKey, string>>;
  return dict[key] ?? en[key] ?? key;
}

/**
 * React hook: returns a `t(key, vars?)` function bound to the current locale.
 * Re-renders the calling component when the locale changes.
 */
export function useT(): (key: DictKey, vars?: Record<string, string | number>) => string {
  const lang = useI18nStore((s) => s.lang);
  return (key, vars) => format(lookup(lang, key), vars);
}

/**
 * Imperative lookup for places that can't easily use a hook (event handlers,
 * native confirm() prompts). Reads the current locale from the i18n store.
 */
export function t(key: DictKey, vars?: Record<string, string | number>): string {
  return format(lookup(useI18nStore.getState().lang, key), vars);
}

function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}
