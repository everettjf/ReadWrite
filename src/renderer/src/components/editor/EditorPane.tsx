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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Code,
  Eye,
  Share2,
  Sparkles,
  Loader2,
  Send,
  FileCode2,
  TextSelect,
  ScrollText,
  HelpCircle,
  Upload,
  Languages,
  FileSearch,
  BookOpen,
} from 'lucide-react';
import { MilkdownEditor } from './MilkdownEditor';
import { SourceEditor } from './SourceEditor';
import { useMilkdownBridge } from '@/lib/milkdown-instance';
import { buildWeChatHtml, copyHtmlToClipboard } from '@/lib/wechat-html';
import { AIInterpretDialog, type InsertTarget } from '@/components/dialogs/AIInterpretDialog';
import { PublishToWeChatDialog } from '@/components/dialogs/PublishToWeChatDialog';
import { marked } from 'marked';
import juice from 'juice';

interface ToolbarStatus {
  kind: 'info' | 'error';
  text: string;
}

const POLISH_DOC_INSTRUCTION =
  'Polish the following Markdown document for clarity and flow. Preserve all structure, code, links, images, and formatting. Return only the revised Markdown.';
const POLISH_SELECTION_INSTRUCTION =
  'Polish the following Markdown excerpt. Preserve any inline code, links, and emphasis. Return only the revised Markdown.';
const TRANSLATE_EN_INSTRUCTION =
  'Translate the following Markdown to natural, idiomatic English. Preserve all structure, code, links, images, and formatting. Return only the translated Markdown.';
const TRANSLATE_ZH_INSTRUCTION =
  '把下面的 Markdown 翻译成自然、地道的中文。保留所有结构、代码、链接、图片和格式。只返回翻译后的 Markdown。';
const SUMMARIZE_INSTRUCTION =
  'Summarize the following Markdown into 3 bullet points. Return only the bullet list.';
const EXPLAIN_INSTRUCTION =
  'Explain the following Markdown excerpt step by step in plain language. Return only the explanation, in the same language as the original.';

function EditorToolbar(): JSX.Element {
  const mode = useEditorStore((s) => s.mode);
  const setMode = useEditorStore((s) => s.setMode);
  const content = useEditorStore((s) => s.content);
  const path = useEditorStore((s) => s.path);
  const dirty = useEditorStore((s) => s.dirty);
  const setContent = useEditorStore((s) => s.setContent);
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const wechatExportTheme = useSettingsStore((s) => s.wechatExportTheme);
  const bridge = useMilkdownBridge();

  const [aiBusy, setAiBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [status, setStatus] = useState<ToolbarStatus | null>(null);
  const [interpretOpen, setInterpretOpen] = useState(false);
  const [interpretSelection, setInterpretSelection] = useState('');
  const [publishOpen, setPublishOpen] = useState(false);

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

  const requireWysiwyg = (): boolean => {
    if (mode !== 'wysiwyg') {
      setStatus({ kind: 'error', text: 'Switch to WYSIWYG mode to use AI actions.' });
      return false;
    }
    if (!bridge) {
      setStatus({ kind: 'error', text: 'Editor is still booting — try again in a moment.' });
      return false;
    }
    return true;
  };

  const onPolishSelection = async (): Promise<void> => {
    setStatus(null);
    if (!requireWysiwyg() || !bridge) return;
    const selection = bridge.getSelectionText();
    if (!selection.trim()) {
      setStatus({ kind: 'error', text: 'Select some text first to polish a portion.' });
      return;
    }
    setAiBusy(true);
    try {
      const result = await window.api.ai.complete({
        input: selection,
        instruction: POLISH_SELECTION_INSTRUCTION,
      });
      bridge.replaceSelection(result.text);
      setStatus({ kind: 'info', text: 'Polished selection.' });
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message });
    } finally {
      setAiBusy(false);
    }
  };

  const onPolishDocument = async (): Promise<void> => {
    setStatus(null);
    setAiBusy(true);
    try {
      const result = await window.api.ai.complete({
        input: content,
        instruction: POLISH_DOC_INSTRUCTION,
      });
      setContent(result.text, { markDirty: true });
      setStatus({ kind: 'info', text: 'Polished whole document.' });
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message });
    } finally {
      setAiBusy(false);
    }
  };

  /** Generic AI action: applies an instruction to selection (replace) or whole doc (replace). */
  const runAiAction = async (
    instruction: string,
    label: string,
    target: 'selection' | 'document',
  ): Promise<void> => {
    setStatus(null);
    if (!requireWysiwyg() || !bridge) return;

    let input: string;
    if (target === 'selection') {
      const selection = bridge.getSelectionText();
      if (!selection.trim()) {
        setStatus({
          kind: 'error',
          text: `Select some text first to ${label.toLowerCase()} a portion.`,
        });
        return;
      }
      input = selection;
    } else {
      input = content;
    }

    setAiBusy(true);
    try {
      const result = await window.api.ai.complete({ input, instruction });
      if (target === 'selection') {
        bridge.replaceSelection(result.text);
      } else {
        setContent(result.text, { markDirty: true });
      }
      setStatus({ kind: 'info', text: `${label} done.` });
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message });
    } finally {
      setAiBusy(false);
    }
  };

  const onOpenInterpret = (): void => {
    setStatus(null);
    if (!requireWysiwyg()) return;
    setInterpretSelection(bridge?.getSelectionText() ?? '');
    setInterpretOpen(true);
  };

  const onInterpretInsert = (markdown: string, target: InsertTarget): void => {
    if (!bridge) return;
    if (target === 'replace-selection') {
      bridge.replaceSelection(markdown);
    } else if (target === 'insert-after-selection') {
      // ProseMirror tip: insertMarkdown drops at the current cursor; after a
      // selection that means at the end of the selection range.
      bridge.insertMarkdown(`\n\n${markdown}\n\n`);
    } else {
      setContent(`${content}\n\n${markdown}\n`, { markDirty: true });
    }
    setInterpretOpen(false);
    setStatus({ kind: 'info', text: 'Inserted AI response.' });
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
          {path ? path.split(/[\\/]/).pop() : 'Untitled (unsaved)'}
          {dirty && ' ·'}
        </span>
        <div className="flex-1" />

        {aiEnabled && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="AI" disabled={aiBusy}>
                {aiBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>AI</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Polish
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-56">
                    <DropdownMenuItem onClick={onPolishSelection}>
                      <TextSelect className="mr-2 h-4 w-4" /> Selection
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onPolishDocument}>
                      <ScrollText className="mr-2 h-4 w-4" /> Whole document
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Languages className="mr-2 h-4 w-4" />
                  Translate
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-64">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Selection →
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() =>
                        runAiAction(TRANSLATE_EN_INSTRUCTION, 'Translate to English', 'selection')
                      }
                    >
                      English
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        runAiAction(TRANSLATE_ZH_INSTRUCTION, '翻译为中文', 'selection')
                      }
                    >
                      中文
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Whole document →
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() =>
                        runAiAction(
                          TRANSLATE_EN_INSTRUCTION,
                          'Translate doc to English',
                          'document',
                        )
                      }
                    >
                      English
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        runAiAction(TRANSLATE_ZH_INSTRUCTION, '翻译全文为中文', 'document')
                      }
                    >
                      中文
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuItem
                onClick={() => runAiAction(SUMMARIZE_INSTRUCTION, 'Summarize', 'document')}
              >
                <FileSearch className="mr-2 h-4 w-4" />
                Summarize document
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => runAiAction(EXPLAIN_INSTRUCTION, 'Explain', 'selection')}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Explain selection
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenInterpret}>
                <HelpCircle className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>Interpret with prompt…</span>
                  <span className="text-[10px] text-muted-foreground">
                    Custom prompt, review response, then insert
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPublishOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span>Publish draft to WeChat 公众号</span>
                <span className="text-[10px] text-muted-foreground">
                  Uploads images, creates a draft to review
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

      {aiEnabled && (
        <AIInterpretDialog
          open={interpretOpen}
          selectionText={interpretSelection}
          documentText={content}
          onCancel={() => setInterpretOpen(false)}
          onInsert={onInterpretInsert}
        />
      )}

      <PublishToWeChatDialog open={publishOpen} onClose={() => setPublishOpen(false)} />
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
