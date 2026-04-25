import { useEffect, useState } from 'react';
import { useEditorStore } from '@/stores/editor';
import { useSettingsStore } from '@/stores/settings';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Code, Eye, Share2, Download, Sparkles, Loader2, Send, FileCode2 } from 'lucide-react';
import { MilkdownEditor } from './MilkdownEditor';
import { SourceEditor } from './SourceEditor';
import { saveMarkdownToPath } from '@/lib/doc-io';
import { useMilkdownBridge } from '@/lib/milkdown-instance';
import { buildWeChatHtml, copyHtmlToClipboard } from '@/lib/wechat-html';
import { marked } from 'marked';
import juice from 'juice';

interface ToolbarStatus {
  kind: 'info' | 'error';
  text: string;
}

function EditorToolbar(): JSX.Element {
  const mode = useEditorStore((s) => s.mode);
  const setMode = useEditorStore((s) => s.setMode);
  const content = useEditorStore((s) => s.content);
  const path = useEditorStore((s) => s.path);
  const dirty = useEditorStore((s) => s.dirty);
  const setDirty = useEditorStore((s) => s.setDirty);
  const setPath = useEditorStore((s) => s.setPath);
  const setContent = useEditorStore((s) => s.setContent);
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const wechatExportTheme = useSettingsStore((s) => s.wechatExportTheme);
  const bridge = useMilkdownBridge();

  const [aiBusy, setAiBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [status, setStatus] = useState<ToolbarStatus | null>(null);

  // Auto-clear info toasts after a few seconds
  useEffect(() => {
    if (!status || status.kind !== 'info') return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const onCopyHtml = async (): Promise<void> => {
    setStatus(null);
    try {
      const rawHtml = await marked.parse(content);
      const html = juice(rawHtml);
      await copyHtmlToClipboard(html);
      setStatus({ kind: 'info', text: 'Copied as inlined HTML — paste into your destination.' });
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message });
    }
  };

  const onCopyToWeChat = async (): Promise<void> => {
    setStatus(null);
    setExportBusy(true);
    try {
      const { html, warnings } = await buildWeChatHtml(content, {
        markdownPath: path,
        themeId: wechatExportTheme,
      });
      await copyHtmlToClipboard(html);
      const tail =
        warnings.length > 0
          ? ` (${warnings.length} warning${warnings.length === 1 ? '' : 's'})`
          : '';
      setStatus({
        kind: 'info',
        text: `Copied to clipboard. Open mp.weixin.qq.com → 写新图文 → paste.${tail}`,
      });
      if (warnings.length > 0) console.warn('[wechat-export] warnings:', warnings);
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message });
    } finally {
      setExportBusy(false);
    }
  };

  const onSave = async (): Promise<void> => {
    const saved = await saveMarkdownToPath(content, path);
    if (saved) {
      setPath(saved);
      setDirty(false);
    }
  };

  const onPolish = async (): Promise<void> => {
    setStatus(null);
    if (mode !== 'wysiwyg') {
      setStatus({ kind: 'error', text: 'Switch to WYSIWYG mode to use AI polish.' });
      return;
    }
    if (!bridge) return;
    const selection = bridge.getSelectionText();
    const target = selection.trim().length > 0 ? selection : content;
    const isWholeDoc = target === content;
    setAiBusy(true);
    try {
      const result = await window.api.ai.complete({
        input: target,
        instruction: isWholeDoc
          ? 'Polish the following Markdown document for clarity and flow. Preserve structure, code, and links.'
          : 'Polish the following Markdown excerpt.',
      });
      if (isWholeDoc) {
        setContent(result.text, { markDirty: true });
      } else {
        bridge.replaceSelection(result.text);
      }
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message });
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <>
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-background px-2">
        <div className="flex items-center rounded-md border border-border p-0.5">
          <Button
            variant={mode === 'wysiwyg' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7"
            onClick={() => setMode('wysiwyg')}
          >
            <Eye className="mr-1 h-3.5 w-3.5" /> WYSIWYG
          </Button>
          <Button
            variant={mode === 'source' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7"
            onClick={() => setMode('source')}
          >
            <Code className="mr-1 h-3.5 w-3.5" /> Source
          </Button>
        </div>
        <div className="flex-1" />
        <span className="truncate text-xs text-muted-foreground">
          {path ? path.split(/[\\/]/).pop() : 'Untitled'}
          {dirty && ' •'}
        </span>
        <div className="flex-1" />

        {aiEnabled && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onPolish}
            disabled={aiBusy}
            title="AI polish (selection or whole doc)"
          >
            {aiBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="Export / copy" disabled={exportBusy}>
              {exportBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Copy / Export</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCopyToWeChat}>
              <Send className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span>Copy to WeChat 公众号</span>
                <span className="text-[10px] text-muted-foreground">
                  Inline-styled HTML, images embedded
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyHtml}>
              <FileCode2 className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span>Copy as inlined HTML</span>
                <span className="text-[10px] text-muted-foreground">
                  Generic — for emails, etc.
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={onSave} title="Save">
          <Download className="h-4 w-4" />
        </Button>
      </div>
      {status && (
        <div
          className={
            status.kind === 'error'
              ? 'border-b border-destructive/30 bg-destructive/10 px-3 py-1 text-xs text-destructive'
              : 'border-b border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600 dark:text-emerald-400'
          }
        >
          {status.text}
        </div>
      )}
    </>
  );
}

export function EditorPane(): JSX.Element {
  const mode = useEditorStore((s) => s.mode);

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {mode === 'wysiwyg' ? (
        <MilkdownEditor>
          <EditorToolbar />
        </MilkdownEditor>
      ) : (
        <>
          <EditorToolbar />
          <div className="flex-1 overflow-hidden">
            <SourceEditor />
          </div>
        </>
      )}
    </div>
  );
}
