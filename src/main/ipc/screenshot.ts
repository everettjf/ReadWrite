import { ipcMain, app } from 'electron';
import { IPC } from '@shared/ipc-channels';
import type { IpcContext } from './index';
import type {
  ScreenshotOptions,
  ScreenshotResult,
  AppSettings,
  ImageSaveOptions,
  ImageSaveResult,
} from '@shared/types';
import { writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname, relative, isAbsolute, sep } from 'node:path';
import { getCurrentSettings } from './settings';

interface ResolvedDir {
  /** Absolute directory where the image will be saved. */
  absDir: string;
  /** Directory used for computing the relative href in markdown, if applicable. */
  baseForRelative: string | null;
}

function resolveImagesDir(settings: AppSettings, markdownPath: string | null): ResolvedDir {
  const subfolder = (settings.imagesDirSubfolderName || 'images').replace(/[\\/]+$/, '');

  if (settings.imagesDirMode === 'next-to-doc' && markdownPath) {
    const docDir = dirname(markdownPath);
    return { absDir: join(docDir, subfolder), baseForRelative: docDir };
  }

  if (settings.imagesDirMode === 'custom' && settings.imagesDirCustom) {
    const custom = settings.imagesDirCustom;
    const absDir = isAbsolute(custom) ? custom : join(app.getPath('home'), custom);
    return { absDir, baseForRelative: markdownPath ? dirname(markdownPath) : null };
  }

  // pictures (default fallback)
  return {
    absDir: join(app.getPath('pictures'), 'ReadWrite'),
    baseForRelative: markdownPath ? dirname(markdownPath) : null,
  };
}

function toPosixPath(p: string): string {
  return p.split(sep).join('/');
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    case 'image/bmp':
      return 'bmp';
    default:
      return 'bin';
  }
}

function sanitizeBaseName(name: string): string {
  return (
    (name || `image-${Date.now()}`)
      .replace(/\.[^./\\]+$/, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || `image-${Date.now()}`
  );
}

async function uniqueFilePath(dir: string, baseName: string, ext: string): Promise<string> {
  const tryPath = (n: number): string =>
    join(dir, n === 0 ? `${baseName}.${ext}` : `${baseName}-${n}.${ext}`);
  for (let i = 0; i < 100; i++) {
    const p = tryPath(i);
    try {
      await access(p);
    } catch {
      return p;
    }
  }
  return tryPath(Date.now());
}

export function registerScreenshotIpc(ctx: IpcContext): void {
  ipcMain.handle(
    IPC.SCREENSHOT_TAB,
    async (_e, opts: ScreenshotOptions): Promise<ScreenshotResult | null> => {
      // The screenshot capture itself doesn't write to disk anymore — only
      // the snip flow's IMAGE_SAVE handler does, with the cropped output.
      // This avoids saving a wasteful full-pane PNG every time the user snips.
      return await ctx.getTabManager().screenshot(opts.tabId);
    },
  );

  /**
   * Capture an arbitrary region of the main window's renderer. Used by
   * the snip flow for renderer-DOM readers (PDF / EPUB / code) — much
   * faster than html-to-image, and unlike capturePage() of a tab, it
   * actually sees the renderer's drawn pixels (PDF.js canvases etc.).
   *
   * Native WebContentsViews (web/github tabs) are NOT in the main
   * window's render tree — those still go through TabManager.screenshot.
   */
  ipcMain.handle(
    IPC.SCREENSHOT_MAIN_WINDOW,
    async (
      _e,
      rect: { x: number; y: number; width: number; height: number },
    ): Promise<{ dataUrl: string; width: number; height: number } | null> => {
      const win = ctx.getMainWindow();
      if (!win || win.isDestroyed()) return null;
      const image = await win.webContents.capturePage({
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
      const png = image.toPNG();
      const size = image.getSize();
      return {
        dataUrl: `data:image/png;base64,${png.toString('base64')}`,
        width: size.width,
        height: size.height,
      };
    },
  );

  ipcMain.handle(IPC.IMAGE_SAVE, async (_e, opts: ImageSaveOptions): Promise<ImageSaveResult> => {
    const settings = getCurrentSettings();
    const { absDir, baseForRelative } = resolveImagesDir(settings, opts.markdownPath ?? null);
    await mkdir(absDir, { recursive: true });

    const ext = mimeToExt(opts.mime);
    const baseName = sanitizeBaseName(opts.suggestedName ?? `image-${Date.now()}`);
    const savedPath = await uniqueFilePath(absDir, baseName, ext);

    const buf = Buffer.from(opts.base64, 'base64');
    await writeFile(savedPath, buf);

    let relativePath: string | undefined;
    if (baseForRelative) {
      const rel = relative(baseForRelative, savedPath);
      if (!rel.startsWith('..') && !isAbsolute(rel)) {
        relativePath = toPosixPath(rel);
      }
    }
    return { savedPath, relativePath };
  });
}
