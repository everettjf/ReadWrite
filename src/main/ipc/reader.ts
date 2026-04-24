import { ipcMain, shell } from 'electron';
import { IPC } from '@shared/ipc-channels';
import type { IpcContext } from './index';
import type { TabBounds } from '@shared/types';

export function registerReaderIpc(ctx: IpcContext): void {
  ipcMain.handle(IPC.TAB_CREATE, (_e, payload: { url: string; kind?: 'web' | 'github' }) => {
    return ctx.getTabManager().createWebTab(payload.url, payload.kind ?? 'web');
  });

  ipcMain.handle(IPC.TAB_CLOSE, (_e, id: string) => {
    ctx.getTabManager().closeTab(id);
  });

  ipcMain.handle(IPC.TAB_FOCUS, (_e, id: string) => {
    ctx.getTabManager().focusTab(id);
  });

  ipcMain.handle(IPC.TAB_UPDATE_BOUNDS, (_e, payload: { id: string; bounds: TabBounds }) => {
    ctx.getTabManager().setBounds(payload.id, payload.bounds);
  });

  ipcMain.handle(IPC.TAB_SET_VISIBILITY, (_e, payload: { id: string; visible: boolean }) => {
    ctx.getTabManager().setVisibility(payload.id, payload.visible);
  });

  ipcMain.handle(IPC.TAB_NAVIGATE, (_e, payload: { id: string; url: string }) => {
    ctx.getTabManager().navigate(payload.id, payload.url);
  });

  ipcMain.handle(IPC.TAB_GO_BACK, (_e, id: string) => {
    ctx.getTabManager().goBack(id);
  });

  ipcMain.handle(IPC.TAB_GO_FORWARD, (_e, id: string) => {
    ctx.getTabManager().goForward(id);
  });

  ipcMain.handle(IPC.TAB_RELOAD, (_e, id: string) => {
    ctx.getTabManager().reload(id);
  });

  ipcMain.handle(IPC.SHELL_OPEN_EXTERNAL, async (_e, url: string) => {
    await shell.openExternal(url);
  });
}
