import { useState } from 'react';
import { useEditorStore } from '@/stores/editor';
import { useSettingsStore } from '@/stores/settings';
import { Button } from '@/components/ui/button';
import { Code, Eye, Copy, Download, Sparkles, Loader2 } from 'lucide-react';
import { MilkdownEditor } from './MilkdownEditor';
import { SourceEditor } from './SourceEditor';
import { saveMarkdownToPath } from '@/lib/doc-io';
import { useMilkdownBridge } from '@/lib/milkdown-instance';
import juice from 'juice';

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
  const bridge = useMilkdownBridge();

  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const onCopyHtml = async (): Promise<void> => {
    const html = await renderMarkdownToHtml(content);
    await navigator.clipboard.writeText(juice(html));
  };

  const onSave = async (): Promise<void> => {
    const saved = await saveMarkdownToPath(content, path);
    if (saved) {
      setPath(saved);
      setDirty(false);
    }
  };

  const onPolish = async (): Promise<void> => {
    setAiError(null);
    if (mode !== 'wysiwyg') {
      setAiError('Switch to WYSIWYG mode to use AI polish.');
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
      setAiError((err as Error).message);
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
        <Button variant="ghost" size="icon" onClick={onCopyHtml} title="Copy as inlined HTML">
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSave} title="Save">
          <Download className="h-4 w-4" />
        </Button>
      </div>
      {aiError && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-1 text-xs text-destructive">
          {aiError}
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

async function renderMarkdownToHtml(md: string): Promise<string> {
  const { marked } = await import('marked').catch(() => ({ marked: null as unknown }));
  if (marked && typeof marked === 'function') {
    return (marked as (src: string) => string)(md);
  }
  return `<pre>${md.replace(/[<>&]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;',
  )}</pre>`;
}
