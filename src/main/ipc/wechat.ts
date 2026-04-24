import { ipcMain } from 'electron';
import { IPC } from '@shared/ipc-channels';
import type { IpcContext } from './index';
import { getCurrentSettings } from './settings';

interface WechatPublishPayload {
  title: string;
  htmlContent: string;
  digest?: string;
  thumbMediaId?: string;
}

export function registerWechatIpc(_ctx: IpcContext): void {
  ipcMain.handle(
    IPC.WECHAT_TEST_CREDENTIALS,
    async (): Promise<{ ok: boolean; message: string }> => {
      const settings = getCurrentSettings();
      if (!settings.wechatAppId || !settings.wechatAppSecret) {
        return { ok: false, message: 'AppID or AppSecret not configured.' };
      }
      try {
        const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(settings.wechatAppId)}&secret=${encodeURIComponent(settings.wechatAppSecret)}`;
        const res = await fetch(url);
        const json = (await res.json()) as {
          access_token?: string;
          errcode?: number;
          errmsg?: string;
        };
        if (json.access_token) {
          return { ok: true, message: 'Credentials verified — access token issued.' };
        }
        return {
          ok: false,
          message: `WeChat error ${json.errcode ?? '?'}: ${json.errmsg ?? 'unknown'}`,
        };
      } catch (err) {
        return { ok: false, message: (err as Error).message };
      }
    },
  );

  ipcMain.handle(IPC.WECHAT_PUBLISH, async (_e, _payload: WechatPublishPayload) => {
    // Scaffolded — full publish flow (upload images, draft article, push to all) is
    // intentionally left as TODO. The configuration and credential-test surface above
    // is enough to start wiring the rest.
    throw new Error('WeChat publish is not yet implemented. Coming in a future release.');
  });
}
