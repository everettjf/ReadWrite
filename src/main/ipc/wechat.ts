import { ipcMain } from 'electron';
import { IPC } from '@shared/ipc-channels';
import type { IpcContext } from './index';
import { getCurrentSettings } from './settings';
import type { WechatPublishPayload, WechatPublishResult } from '@shared/types';

/**
 * WeChat 公众号 publish pipeline.
 *
 *   1. Cache an access_token (7200s TTL) keyed by AppID+AppSecret.
 *   2. For each `<img src="data:image/...">` in the article HTML, upload to
 *      WeChat's `/cgi-bin/material/uploadimg` (永久素材, doesn't count toward
 *      the material library quota) and replace the `data:` URL with the
 *      returned mmbiz.qpic.cn URL.
 *   3. Use the first inline image as the cover thumb — upload it through
 *      `/cgi-bin/material/add_material?type=image` to get a `media_id`.
 *   4. POST the article to `/cgi-bin/draft/add`. WeChat returns a draft
 *      media_id; the user reviews and publishes from mp.weixin.qq.com.
 *
 * Errors are surfaced verbatim from WeChat (their errmsg is usually the
 * most actionable thing — e.g. "invalid ip not in whitelist").
 */

interface WechatTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface WechatUploadImgResponse {
  url?: string;
  errcode?: number;
  errmsg?: string;
}

interface WechatAddMaterialResponse {
  media_id?: string;
  url?: string;
  errcode?: number;
  errmsg?: string;
}

interface WechatDraftAddResponse {
  media_id?: string;
  errcode?: number;
  errmsg?: string;
}

interface WechatFreepublishResponse {
  errcode?: number;
  errmsg?: string;
  publish_id?: string;
  msg_data_id?: string;
}

interface TokenCache {
  appId: string;
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  const settings = getCurrentSettings();
  if (!settings.wechatAppId || !settings.wechatAppSecret) {
    throw new Error('WeChat AppID / AppSecret not configured. Open Settings → WeChat.');
  }

  if (
    tokenCache &&
    tokenCache.appId === settings.wechatAppId &&
    tokenCache.expiresAt > Date.now() + 60_000
  ) {
    return tokenCache.token;
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(
    settings.wechatAppId,
  )}&secret=${encodeURIComponent(settings.wechatAppSecret)}`;
  const res = await fetch(url);
  const json = (await res.json()) as WechatTokenResponse;

  if (!json.access_token) {
    throw new Error(
      `WeChat token request failed: errcode=${json.errcode ?? '?'}, errmsg="${json.errmsg ?? 'unknown'}". ` +
        `Common cause: caller IP not in 公众号 → 设置 → IP白名单.`,
    );
  }

  const ttlMs = (json.expires_in ?? 7200) * 1000 - 60_000;
  tokenCache = {
    appId: settings.wechatAppId,
    token: json.access_token,
    expiresAt: Date.now() + ttlMs,
  };
  return json.access_token;
}

async function uploadInlineImage(buf: Buffer, filename: string, mime: string): Promise<string> {
  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/material/uploadimg?access_token=${encodeURIComponent(token)}`;
  const form = new FormData();
  form.append('media', new Blob([buf], { type: mime }), filename);
  const res = await fetch(url, { method: 'POST', body: form });
  const json = (await res.json()) as WechatUploadImgResponse;
  if (!json.url) {
    throw new Error(
      `WeChat uploadimg failed (${filename}): errcode=${json.errcode ?? '?'}, errmsg="${json.errmsg ?? 'unknown'}"`,
    );
  }
  return json.url;
}

async function uploadCoverThumb(buf: Buffer, filename: string, mime: string): Promise<string> {
  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${encodeURIComponent(token)}&type=image`;
  const form = new FormData();
  form.append('media', new Blob([buf], { type: mime }), filename);
  const res = await fetch(url, { method: 'POST', body: form });
  const json = (await res.json()) as WechatAddMaterialResponse;
  if (!json.media_id) {
    throw new Error(
      `WeChat add_material(thumb) failed: errcode=${json.errcode ?? '?'}, errmsg="${json.errmsg ?? 'unknown'}"`,
    );
  }
  return json.media_id;
}

interface DraftArticle {
  title: string;
  author: string;
  digest: string;
  content: string;
  content_source_url: string;
  thumb_media_id: string;
  need_open_comment: 0 | 1;
  only_fans_can_comment: 0 | 1;
}

async function createDraft(article: DraftArticle): Promise<string> {
  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articles: [article] }),
  });
  const json = (await res.json()) as WechatDraftAddResponse;
  if (!json.media_id) {
    throw new Error(
      `WeChat draft/add failed: errcode=${json.errcode ?? '?'}, errmsg="${json.errmsg ?? 'unknown'}"`,
    );
  }
  return json.media_id;
}

interface ParsedDataImage {
  /** The full `data:image/png;base64,xxx` value as it appears in the HTML. */
  fullDataUrl: string;
  /** Canonical extension derived from the MIME (png / jpeg / gif / bmp). */
  ext: string;
  /** MIME string. */
  mime: string;
  /** Decoded bytes. */
  buf: Buffer;
}

function parseDataImages(html: string): ParsedDataImage[] {
  const re = /(data:image\/([a-z+]+);base64,([A-Za-z0-9+/=\n]+))/g;
  const seen = new Set<string>();
  const out: ParsedDataImage[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const fullDataUrl = m[1]!;
    if (seen.has(fullDataUrl)) continue;
    seen.add(fullDataUrl);
    const rawExt = m[2]!.toLowerCase();
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
    const buf = Buffer.from(m[3]!, 'base64');
    out.push({
      fullDataUrl,
      ext,
      mime: `image/${rawExt === 'jpg' ? 'jpeg' : rawExt}`,
      buf,
    });
  }
  return out;
}

export function registerWechatIpc(_ctx: IpcContext): void {
  ipcMain.handle(
    IPC.WECHAT_TEST_CREDENTIALS,
    async (): Promise<{ ok: boolean; message: string }> => {
      const settings = getCurrentSettings();
      if (!settings.wechatAppId || !settings.wechatAppSecret) {
        return { ok: false, message: 'AppID or AppSecret not configured.' };
      }
      // Force a fresh token so the test reflects current credentials.
      tokenCache = null;
      try {
        const token = await getAccessToken();
        return {
          ok: true,
          message: `Credentials verified — access token issued (${token.slice(0, 6)}…).`,
        };
      } catch (err) {
        return { ok: false, message: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    IPC.WECHAT_PUBLISH,
    async (_e, payload: WechatPublishPayload): Promise<WechatPublishResult> => {
      if (!payload.title.trim()) {
        throw new Error('Title is required.');
      }

      const images = parseDataImages(payload.htmlContent);
      if (images.length === 0) {
        throw new Error(
          'Article has no images. WeChat requires at least one image to use as the cover. Add an image and try again.',
        );
      }

      // Upload every unique inline image and build a replacement map.
      const replacements = new Map<string, string>();
      for (let i = 0; i < images.length; i += 1) {
        const img = images[i]!;
        const url = await uploadInlineImage(
          img.buf,
          `inline-${Date.now()}-${i}.${img.ext}`,
          img.mime,
        );
        replacements.set(img.fullDataUrl, url);
      }

      // Replace each data URL with its WeChat counterpart in the HTML.
      let html = payload.htmlContent;
      for (const [oldUrl, newUrl] of replacements) {
        // Use split/join for literal-string replacement (regex-meta-safe).
        html = html.split(oldUrl).join(newUrl);
      }

      // Use the first inline image as the cover thumb (separate API).
      const cover = images[0]!;
      const thumbMediaId = await uploadCoverThumb(
        cover.buf,
        `cover-${Date.now()}.${cover.ext}`,
        cover.mime,
      );

      const draftMediaId = await createDraft({
        title: payload.title.trim().slice(0, 64),
        author: (payload.author ?? '').trim().slice(0, 8),
        digest: (payload.digest ?? '').trim().slice(0, 120),
        content: html,
        content_source_url: (payload.contentSourceUrl ?? '').trim(),
        thumb_media_id: thumbMediaId,
        need_open_comment: 0,
        only_fans_can_comment: 0,
      });

      return { draftMediaId, inlineImageCount: images.length };
    },
  );

  ipcMain.handle(
    IPC.WECHAT_FREEPUBLISH,
    async (_e, opts: { draftMediaId: string }): Promise<{ publishId: string }> => {
      if (!opts.draftMediaId) {
        throw new Error('draftMediaId is required to publish.');
      }
      const token = await getAccessToken();
      const url = `https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=${encodeURIComponent(token)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: opts.draftMediaId }),
      });
      const json = (await res.json()) as WechatFreepublishResponse;
      if (json.errcode && json.errcode !== 0) {
        throw new Error(
          `WeChat freepublish failed: errcode=${json.errcode}, errmsg="${json.errmsg ?? 'unknown'}".\n` +
            "Common causes: account doesn't have publishing permission, or this account type " +
            "(personal 订阅号) can't use freepublish. Fall back to publishing from " +
            'mp.weixin.qq.com manually.',
        );
      }
      if (!json.publish_id) {
        throw new Error('WeChat freepublish returned no publish_id.');
      }
      return { publishId: json.publish_id };
    },
  );
}
