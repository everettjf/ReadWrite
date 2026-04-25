import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { useEditorStore } from '@/stores/editor';
import { useSettingsStore } from '@/stores/settings';
import { buildWeChatHtml } from '@/lib/wechat-html';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface PreparedArticle {
  html: string;
  imageCount: number;
  coverDataUrl: string | null;
  warnings: string[];
}

function suggestTitle(content: string): string {
  const m = content.match(/^#\s+(.+)$/m);
  return m?.[1]?.trim() ?? '';
}

function suggestDigest(content: string): string {
  // Strip frontmatter, headings, and image refs; take the first paragraph.
  const stripped = content
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/^#+\s+.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.slice(0, 120);
}

function pickFirstDataImage(html: string): string | null {
  const m = html.match(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=\n]+/);
  return m ? m[0] : null;
}

export function PublishToWeChatDialog({ open, onClose }: Props): JSX.Element {
  const path = useEditorStore((s) => s.path);
  const content = useEditorStore((s) => s.content);
  const wechatExportTheme = useSettingsStore((s) => s.wechatExportTheme);
  const wechatAppId = useSettingsStore((s) => s.wechatAppId);
  const wechatAppSecret = useSettingsStore((s) => s.wechatAppSecret);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [digest, setDigest] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  const [prepared, setPrepared] = useState<PreparedArticle | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ draftMediaId: string; inlineImageCount: number } | null>(
    null,
  );

  const credsConfigured = !!wechatAppId && !!wechatAppSecret;

  // Build the WeChat HTML when the dialog opens
  useEffect(() => {
    if (!open) return;
    setError(null);
    setResult(null);
    setTitle(suggestTitle(content));
    setAuthor((prev) => prev); // keep last
    setDigest(suggestDigest(content));
    setSourceUrl('');

    setPreparing(true);
    buildWeChatHtml(content, { markdownPath: path, themeId: wechatExportTheme })
      .then(({ html, warnings }) => {
        const cover = pickFirstDataImage(html);
        const imageCount = (html.match(/data:image\//g) ?? []).length;
        setPrepared({ html, imageCount, coverDataUrl: cover, warnings });
      })
      .catch((err) => {
        setError(`Failed to prepare article: ${(err as Error).message}`);
      })
      .finally(() => setPreparing(false));
  }, [open, content, path, wechatExportTheme]);

  const canPublish = useMemo(
    () => !busy && !preparing && credsConfigured && !!prepared?.coverDataUrl && !!title.trim(),
    [busy, preparing, credsConfigured, prepared, title],
  );

  const onPublish = async (): Promise<void> => {
    if (!prepared) return;
    setError(null);
    setBusy(true);
    try {
      const out = await window.api.wechat.publishDraft({
        title,
        author: author || undefined,
        digest: digest || undefined,
        contentSourceUrl: sourceUrl || undefined,
        htmlContent: prepared.html,
      });
      setResult(out);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Publish to WeChat 公众号
          </DialogTitle>
          <DialogDescription>
            Uploads inline images to WeChat, then creates a draft you can review and publish from
            mp.weixin.qq.com.
          </DialogDescription>
        </DialogHeader>

        {!credsConfigured && (
          <div className="flex items-start gap-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              AppID / AppSecret not configured. Open <strong>Settings → WeChat</strong> to add them
              first.
            </div>
          </div>
        )}

        {result ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded border border-emerald-500/40 bg-emerald-500/10 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div className="space-y-2 text-sm">
                <div className="font-medium">Draft created.</div>
                <div className="text-xs text-muted-foreground">
                  Uploaded {result.inlineImageCount} image
                  {result.inlineImageCount === 1 ? '' : 's'}, plus the cover. Open the WeChat
                  backend to review and publish.
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  draft media_id: {result.draftMediaId}
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={onClose}>
                Done
              </Button>
              <Button
                onClick={() =>
                  window.api.shell
                    .openExternal('https://mp.weixin.qq.com/cgi-bin/home')
                    .catch(() => null)
                }
              >
                <ExternalLink className="mr-2 h-4 w-4" /> Open WeChat backend
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 text-sm">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wxTitle">Title</Label>
                  <Input
                    id="wxTitle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My article title"
                    maxLength={64}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wxAuthor">Author (optional, max 8 chars)</Label>
                  <Input
                    id="wxAuthor"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder=""
                    maxLength={8}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wxDigest">Digest (optional, max 120 chars)</Label>
                  <textarea
                    id="wxDigest"
                    value={digest}
                    onChange={(e) => setDigest(e.target.value.slice(0, 120))}
                    placeholder="Brief summary shown in feeds…"
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <div className="text-right text-[10px] text-muted-foreground">
                    {digest.length} / 120
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wxSource">Source URL (optional)</Label>
                  <Input
                    id="wxSource"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="w-40">
                <Label className="mb-1.5 block">Cover image</Label>
                <div className="aspect-square w-full overflow-hidden rounded border border-border bg-muted">
                  {preparing ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : prepared?.coverDataUrl ? (
                    <img
                      src={prepared.coverDataUrl}
                      alt="cover"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-muted-foreground">
                      No image in article — add one first.
                    </div>
                  )}
                </div>
                <div className="pt-1.5 text-[10px] text-muted-foreground">
                  Auto-extracted from the first image in the article.
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {prepared ? (
                <>
                  Article has <strong>{prepared.imageCount}</strong> inline image
                  {prepared.imageCount === 1 ? '' : 's'}. They&rsquo;ll be uploaded to WeChat before
                  the draft is created.
                  {prepared.warnings.length > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      {' '}
                      ({prepared.warnings.length} preparation warning
                      {prepared.warnings.length === 1 ? '' : 's'} — see DevTools console)
                    </span>
                  )}
                </>
              ) : (
                'Preparing article…'
              )}
            </div>

            {error && (
              <div className="rounded border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={onPublish} disabled={!canPublish}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Create draft
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
