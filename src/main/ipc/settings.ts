import { ipcMain, BrowserWindow, app } from 'electron';
import { IPC } from '@shared/ipc-channels';
import type { IpcContext } from './index';
import { kvGet, kvSet } from '../db';
import type { AppSettings } from '@shared/types';
import { openSettingsWindow } from '../window';
import { join } from 'node:path';
import { is } from '@electron-toolkit/utils';

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
};

export function getCurrentSettings(): AppSettings {
  const stored = kvGet<Partial<AppSettings>>('settings') ?? {};
  return { ...DEFAULT_SETTINGS, ...stored };
}

function broadcastSettings(next: AppSettings): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send(IPC.SETTINGS_CHANGED, next);
    }
  }
}

export function registerSettingsIpc(_ctx: IpcContext): void {
  ipcMain.handle(IPC.SETTINGS_GET, (): AppSettings => getCurrentSettings());

  ipcMain.handle(IPC.SETTINGS_SET, (_e, patch: Partial<AppSettings>): AppSettings => {
    const merged = { ...getCurrentSettings(), ...patch };
    kvSet('settings', merged);
    broadcastSettings(merged);
    return merged;
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
    if (is.dev) {
      // no-op; SettingsWindow is set up to optionally open dev tools later
    }
  });
}
