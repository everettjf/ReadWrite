import { app, BrowserWindow, shell, Menu } from 'electron';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { join } from 'node:path';
import { createMainWindow } from './window';
import { registerAllIpcHandlers } from './ipc';
import { initDatabase, closeDatabase } from './db';
import { TabManager } from './tabs';
import { FileWatcherHub } from './watchers/file-watcher';
import { buildApplicationMenu } from './menu';
import { initAutoUpdater } from './auto-update';

const APP_NAME = 'ReadWrite';

// Set the app name as early as possible so the macOS menu bar, the dock
// label, and the auto-generated "About <name>" item all show "ReadWrite"
// instead of the default "Electron" / package.json's lowercase "readwrite".
// Production .app bundles get this from electron-builder's productName,
// but in dev (and for window/dock titles before the bundle name kicks in)
// we have to do it ourselves.
app.setName(APP_NAME);

let mainWindow: BrowserWindow | null = null;
let tabManager: TabManager | null = null;
let watcherHub: FileWatcherHub | null = null;

function bootstrap(): void {
  electronApp.setAppUserModelId('app.readwrite.desktop');

  Menu.setApplicationMenu(buildApplicationMenu(APP_NAME));

  // In dev macOS the dock icon is Electron's. Point it at our packaged
  // PNG so the dock matches the production .app bundle's icon.icns.
  if (process.platform === 'darwin' && app.dock) {
    try {
      app.dock.setIcon(join(__dirname, '../../build/icon.png'));
    } catch {
      // Best-effort — missing in some packaged scenarios; not fatal.
    }
  }

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
  initAutoUpdater();

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
