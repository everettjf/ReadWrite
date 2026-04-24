import { ipcMain, app } from 'electron';
import { IPC } from '@shared/ipc-channels';
import type { IpcContext } from './index';
import type { ScreenshotOptions, ScreenshotResult } from '@shared/types';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { kvGet } from '../db';

export function registerScreenshotIpc(ctx: IpcContext): void {
  ipcMain.handle(
    IPC.SCREENSHOT_TAB,
    async (_e, opts: ScreenshotOptions): Promise<ScreenshotResult | null> => {
      const tabs = ctx.getTabManager();
      const base = await tabs.screenshot(opts.tabId);
      if (!base) return null;

      const customPath = kvGet<string>('screenshotSavePath');
      const dir =
        customPath && customPath.length > 0
          ? customPath
          : join(app.getPath('pictures'), 'ReadWrite');

      try {
        await mkdir(dir, { recursive: true });
        const filename = `readwrite-${Date.now()}.png`;
        const savedPath = join(dir, filename);
        const buf = Buffer.from(base.dataUrl.split(',')[1]!, 'base64');
        await writeFile(savedPath, buf);
        return { ...base, savedPath };
      } catch (err) {
        console.error('[screenshot] save failed:', err);
        return base;
      }
    },
  );
}
