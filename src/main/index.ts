import type { BrowserWindow } from 'electron';
import { app, shell, Menu } from 'electron';
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

// One-time process-wide setup: IPC handlers, DB, menu, dock icon. Must
// only run once per app lifetime — re-running it would re-register IPC
// handlers and crash with "Attempted to register a second handler".
function setupOnce(): void {
  electronApp.setAppUserModelId('app.readwrite.desktop');

  Menu.setApplicationMenu(buildApplicationMenu(APP_NAME));

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

  // IPC handlers read the current window/managers through these getters,
  // so re-opening the window after close still routes correctly without
  // re-registering anything.
  registerAllIpcHandlers({
    getMainWindow: () => mainWindow,
    getTabManager: () => tabManager!,
    getWatcherHub: () => watcherHub!,
  });
}

// Open (or re-open) the main window. Safe to call again after the window
// was closed — e.g. macOS dock-icon click when no windows are open.
function openMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = createMainWindow({
    preloadPath: join(__dirname, '../preload/index.mjs'),
    devUrl: process.env['ELECTRON_RENDERER_URL'],
    indexHtml: join(__dirname, '../renderer/index.html'),
    isDev: is.dev,
  });

  tabManager = new TabManager(mainWindow);
  watcherHub = new FileWatcherHub(mainWindow);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    tabManager?.destroyAll();
    watcherHub?.destroyAll();
    tabManager = null;
    watcherHub = null;
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  setupOnce();
  openMainWindow();
  initAutoUpdater();

  app.on('activate', () => {
    openMainWindow();
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
