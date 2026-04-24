import { app, BrowserWindow, shell } from 'electron';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { join } from 'node:path';
import { createMainWindow } from './window';
import { registerAllIpcHandlers } from './ipc';
import { initDatabase, closeDatabase } from './db';
import { TabManager } from './tabs';
import { FileWatcherHub } from './watchers/file-watcher';

let mainWindow: BrowserWindow | null = null;
let tabManager: TabManager | null = null;
let watcherHub: FileWatcherHub | null = null;

function bootstrap(): void {
  electronApp.setAppUserModelId('app.readwrite.desktop');

  app.on('browser-window-created', (_event, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  initDatabase();

  mainWindow = createMainWindow({
    preloadPath: join(__dirname, '../preload/index.mjs'),
    devUrl: process.env['ELECTRON_RENDERER_URL'],
    indexHtml: join(__dirname, '../renderer/index.html'),
    isDev: is.dev,
  });

  tabManager = new TabManager(mainWindow);
  watcherHub = new FileWatcherHub(mainWindow);

  registerAllIpcHandlers({
    getMainWindow: () => mainWindow,
    getTabManager: () => tabManager!,
    getWatcherHub: () => watcherHub!,
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    tabManager?.destroyAll();
    watcherHub?.destroyAll();
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  bootstrap();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      bootstrap();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});
