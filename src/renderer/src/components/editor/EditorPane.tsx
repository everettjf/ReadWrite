import { useEditorStore } from '@/stores/editor';
import { Button } from '@/components/ui/button';
import { Code, Eye, Copy, Download } from 'lucide-react';
import { MilkdownEditor } from './MilkdownEditor';
import { SourceEditor } from './SourceEditor';
import { saveMarkdownToPath } from '@/lib/doc-io';
import juice from 'juice';

export function EditorPane(): JSX.Element {
  const mode = useEditorStore((s) => s.mode);
  const setMode = useEditorStore((s) => s.setMode);
  const content = useEditorStore((s) => s.content);
  const path = useEditorStore((s) => s.path);
  const dirty = useEditorStore((s) => s.dirty);
  const setDirty = useEditorStore((s) => s.setDirty);
  const setPath = useEditorStore((s) => s.setPath);

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

  return (
    <div className="flex h-full w-full flex-col bg-background">
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
        <span className="text-xs text-muted-foreground">
          {path ? path.split(/[\\/]/).pop() : 'Untitled'}
          {dirty && ' •'}
        </span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={onCopyHtml} title="Copy as inlined HTML">
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSave} title="Save">
          <Download className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        {mode === 'wysiwyg' ? <MilkdownEditor /> : <SourceEditor />}
      </div>
    </div>
  );
}

async function renderMarkdownToHtml(md: string): Promise<string> {
  // Render via a transient Milkdown to HTML pipeline — reuse the serializer
  // from the instance when available. For simplicity we do a conservative
  // Markdown→HTML using remark-compatible parser exposed by @milkdown/transformer.
  const { marked } = await import('marked').catch(() => ({ marked: null as unknown }));
  if (marked && typeof marked === 'function') {
    return (marked as (src: string) => string)(md);
  }
  // Fallback: dump markdown inside <pre>.
  return `<pre>${md.replace(/[<>&]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;',
  )}</pre>`;
}
