import { Menu, shell, BrowserWindow, type MenuItemConstructorOptions } from 'electron';
import { openSettingsWindow } from './window';
import { join } from 'node:path';

/**
 * Build the application menu. macOS gets a real native menu bar with a
 * "ReadWrite" submenu so the bold app-name slot is correct (in dev the
 * default Electron.app bundle would otherwise show "Electron").
 *
 * Linux / Windows hide the menu bar entirely (see autoHideMenuBar in
 * window.ts), so we only return a useful menu on macOS — elsewhere we
 * return null and let the caller skip menu installation.
 */
export function buildApplicationMenu(appName: string): Menu | null {
  if (process.platform !== 'darwin') {
    // Auto-hide is on for non-mac windows; an empty menu still leaves
    // accelerators (Cmd-Q etc.) wired by Electron's defaults via roles.
    return null;
  }

  const openSettings = (): void => {
    const focused = BrowserWindow.getFocusedWindow() ?? undefined;
    openSettingsWindow({
      preloadPath: join(__dirname, '../preload/index.mjs'),
      devUrl: process.env['ELECTRON_RENDERER_URL'],
      indexHtml: join(__dirname, '../renderer/index.html'),
      parent: focused && !focused.isDestroyed() ? focused : undefined,
    });
  };

  const template: MenuItemConstructorOptions[] = [
    {
      label: appName,
      submenu: [
        { role: 'about', label: `About ${appName}` },
        { type: 'separator' },
        {
          label: 'Settings…',
          accelerator: 'Cmd+,',
          click: openSettings,
        },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide', label: `Hide ${appName}` },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: `Quit ${appName}` },
      ],
    },
    {
      label: 'File',
      submenu: [{ role: 'close' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      role: 'windowMenu',
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'GitHub Repository',
          click: () => shell.openExternal('https://github.com/everettjf/ReadWrite'),
        },
        {
          label: 'Author on X',
          click: () => shell.openExternal('https://x.com/everettjf'),
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}
