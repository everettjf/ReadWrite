import { ipcMain } from 'electron';
import { IPC } from '@shared/ipc-channels';
import type { IpcContext } from './index';
import type { CliDetectRequest, CliDetectResponse } from '@shared/types';
import { detectCli } from '../cli/detect';

export function registerCliIpc(_ctx: IpcContext): void {
  ipcMain.handle(
    IPC.AI_CLI_DETECT,
    async (_e, req: CliDetectRequest): Promise<CliDetectResponse> => {
      const result = await detectCli(req.provider, req.pathOverride);
      return result;
    },
  );
}
