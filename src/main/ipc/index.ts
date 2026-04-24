import type { BrowserWindow } from 'electron';
import type { TabManager } from '../tabs';
import type { FileWatcherHub } from '../watchers/file-watcher';
import { registerReaderIpc } from './reader';
import { registerFsIpc } from './fs';
import { registerScreenshotIpc } from './screenshot';
import { registerSettingsIpc } from './settings';

export interface IpcContext {
  getMainWindow: () => BrowserWindow | null;
  getTabManager: () => TabManager;
  getWatcherHub: () => FileWatcherHub;
}

export function registerAllIpcHandlers(ctx: IpcContext): void {
  registerReaderIpc(ctx);
  registerFsIpc(ctx);
  registerScreenshotIpc(ctx);
  registerSettingsIpc(ctx);
}
