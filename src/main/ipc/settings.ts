import { ipcMain } from 'electron';
import { IPC } from '@shared/ipc-channels';
import type { IpcContext } from './index';
import { kvGet, kvSet } from '../db';
import type { AppSettings } from '@shared/types';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  editorMode: 'wysiwyg',
  fontSize: 14,
  splitRatio: 0.5,
};

export function registerSettingsIpc(_ctx: IpcContext): void {
  ipcMain.handle(IPC.SETTINGS_GET, (): AppSettings => {
    const stored = kvGet<Partial<AppSettings>>('settings') ?? {};
    return { ...DEFAULT_SETTINGS, ...stored };
  });

  ipcMain.handle(IPC.SETTINGS_SET, (_e, patch: Partial<AppSettings>): AppSettings => {
    const stored = kvGet<Partial<AppSettings>>('settings') ?? {};
    const merged = { ...DEFAULT_SETTINGS, ...stored, ...patch };
    kvSet('settings', merged);
    return merged;
  });

  ipcMain.handle(IPC.SESSION_LOAD, () => {
    return kvGet('session') ?? null;
  });

  ipcMain.handle(IPC.SESSION_SAVE, (_e, payload: unknown) => {
    kvSet('session', payload);
  });
}
