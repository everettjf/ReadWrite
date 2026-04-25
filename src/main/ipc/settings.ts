import { ipcMain, BrowserWindow, app } from 'electron';
import { IPC } from '@shared/ipc-channels';
import type { IpcContext } from './index';
import { kvGet, kvSet } from '../db';
import type { AppSettings } from '@shared/types';
import { openSettingsWindow } from '../window';
import { join } from 'node:path';
import { readSecret, writeSecret, migrateSecretsFromLegacySettings, SECRET_KEYS } from '../secrets';

const DEFAULT_SETTINGS: AppSettings = {
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
  aiSystemPrompt:
    'You are a precise Markdown copy-editor. Improve clarity and flow without changing meaning, code, or links. Return only the revised Markdown — no commentary.',

  wechatExportTheme: 'default',

  autosaveDebounceMs: 1500,

  sidebarVisible: true,
};

export function getCurrentSettings(): AppSettings {
  const stored = kvGet<Partial<AppSettings>>('settings') ?? {};
  const merged = { ...DEFAULT_SETTINGS, ...stored } as AppSettings;
  // Splice in the keychain-encrypted secrets last (overrides any plaintext
  // value still hiding in the legacy settings blob).
  for (const key of SECRET_KEYS) {
    const decrypted = readSecret(key);
    if (decrypted) {
      (merged as unknown as Record<string, string>)[key] = decrypted;
    }
  }
  return merged;
}

function broadcastSettings(next: AppSettings): void {
  // Don't include secrets in cross-window broadcasts — they're refetched
  // by each window via SETTINGS_GET when needed.
  const sanitized: AppSettings = { ...next };
  for (const key of SECRET_KEYS) {
    (sanitized as unknown as Record<string, string>)[key] = '';
  }
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send(IPC.SETTINGS_CHANGED, sanitized);
    }
  }
}

export function registerSettingsIpc(_ctx: IpcContext): void {
  // Run once at startup: if upgrading from a build that stored API keys
  // plaintext in the settings blob, move them into the encrypted store.
  migrateSecretsFromLegacySettings();

  ipcMain.handle(IPC.SETTINGS_GET, (): AppSettings => getCurrentSettings());

  ipcMain.handle(IPC.SETTINGS_SET, (_e, patch: Partial<AppSettings>): AppSettings => {
    // Pull any secret fields out of the patch and route them through the
    // OS-keychain-backed store. The non-secret fields go into the regular
    // settings blob as before.
    const nonSecretPatch: Record<string, unknown> = { ...patch };
    for (const key of SECRET_KEYS) {
      if (key in patch) {
        const value = (patch as unknown as Record<string, string | undefined>)[key];
        writeSecret(key, value ?? '');
        delete nonSecretPatch[key];
      }
    }

    const previousNonSecret = kvGet<Partial<AppSettings>>('settings') ?? {};
    const persistedSettings = { ...DEFAULT_SETTINGS, ...previousNonSecret, ...nonSecretPatch };
    // Make sure secrets are never persisted to the settings blob — even if
    // a stale value lingers from before the migration.
    for (const key of SECRET_KEYS) {
      (persistedSettings as unknown as Record<string, string>)[key] = '';
    }
    kvSet('settings', persistedSettings);

    const fullMerged = getCurrentSettings();
    broadcastSettings(fullMerged);
    return fullMerged;
  });

  ipcMain.handle(IPC.SESSION_LOAD, () => kvGet('session') ?? null);
  ipcMain.handle(IPC.SESSION_SAVE, (_e, payload: unknown) => kvSet('session', payload));

  ipcMain.handle(IPC.APP_GET_VERSION, () => app.getVersion());

  ipcMain.handle(IPC.APP_OPEN_SETTINGS, (event) => {
    const parent = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    openSettingsWindow({
      preloadPath: join(__dirname, '../preload/index.mjs'),
      devUrl: process.env['ELECTRON_RENDERER_URL'],
      indexHtml: join(__dirname, '../renderer/index.html'),
      parent: parent && !parent.isDestroyed() ? parent : undefined,
    });
  });
}
