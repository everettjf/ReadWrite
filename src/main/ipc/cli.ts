import { ipcMain } from 'electron';
import { nanoid } from 'nanoid';
import { IPC } from '@shared/ipc-channels';
import type { IpcContext } from './index';
import type { CliDetectRequest, CliDetectResponse } from '@shared/types';
import { detectCli } from '../cli/detect';
import { runCliOneShot } from '../cli/registry';
import { getCurrentSettings } from './settings';

/**
 * Active CLI generation jobs. The renderer cancels by sending the
 * jobId; we abort the corresponding controller. Keys are removed on
 * completion / failure / cancel so this map stays small.
 */
const activeJobs = new Map<string, AbortController>();

export function registerCliIpc(_ctx: IpcContext): void {
  ipcMain.handle(
    IPC.AI_CLI_DETECT,
    async (_e, req: CliDetectRequest): Promise<CliDetectResponse> => {
      return detectCli(req.provider, req.pathOverride);
    },
  );

  ipcMain.handle(
    IPC.AI_CLI_GENERATE,
    async (
      e,
      req: { prompt: string; jobId?: string },
    ): Promise<{ jobId: string; text: string }> => {
      const jobId = req.jobId ?? nanoid(10);
      const controller = new AbortController();
      activeJobs.set(jobId, controller);
      try {
        const settings = getCurrentSettings();
        const text = await runCliOneShot(req.prompt, settings, {
          abortSignal: controller.signal,
          onProgress: (evt) => {
            if (e.sender.isDestroyed()) return;
            e.sender.send(IPC.AI_CLI_PROGRESS, { jobId, ...evt });
          },
        });
        return { jobId, text };
      } finally {
        activeJobs.delete(jobId);
      }
    },
  );

  ipcMain.handle(IPC.AI_CLI_CANCEL, (_e, jobId: string): boolean => {
    const ctl = activeJobs.get(jobId);
    if (!ctl) return false;
    ctl.abort();
    activeJobs.delete(jobId);
    return true;
  });
}
