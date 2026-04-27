import { useWorkspaceStore } from '@/stores/workspace';
import { useEditorStore } from '@/stores/editor';
import { Button } from '@/components/ui/button';
import { FilePlus, FileText } from 'lucide-react';
import { relativeTime } from '@/lib/utils';
import { createNewDocument, openMarkdownFromDialog, openMarkdownAtPath } from '@/lib/doc-io';
import type { DocSummary } from '@shared/types';

const MAX_DOCS_SHOWN = 8;

/**
 * Replaces the editor with a "Welcome / Recent" view when no document
 * is open. Editor-side concern only — focused on documents and
 * writing. Reader-side affordances (URL / PDF / EPUB / code, recent
 * reader items) live in the left pane's EmptyState.
 */
export function WelcomePanel(): JSX.Element {
  const activeWorkspace = useWorkspaceStore((s) => s.active);
  const known = useWorkspaceStore((s) => s.known);
  const docs = useWorkspaceStore((s) => s.docs);
  const refreshDocs = useWorkspaceStore((s) => s.refreshDocs);
  const editor = useEditorStore;

  const wsName = known.find((w) => w.path === activeWorkspace)?.name ?? '—';

  const onNewDoc = async (): Promise<void> => {
    const created = await createNewDocument({ initialContent: '# Untitled\n\n' });
    editor.getState().setPath(created.path);
    editor.getState().setContent(created.content, { markDirty: false });
    await refreshDocs();
  };

  const onOpenMarkdown = async (): Promise<void> => {
    const opened = await openMarkdownFromDialog();
    if (!opened) return;
    editor.getState().setPath(opened.path);
    editor.getState().setContent(opened.content, { markDirty: false });
  };

  const onOpenDoc = async (doc: DocSummary): Promise<void> => {
    const opened = await openMarkdownAtPath(doc.path);
    editor.getState().setPath(opened.path);
    editor.getState().setContent(opened.content, { markDirty: false });
  };

  const recentDocs = [...docs].sort((a, b) => b.mtime - a.mtime).slice(0, MAX_DOCS_SHOWN);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-8 px-8 py-12">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">ReadWrite</h1>
          <p className="text-sm text-muted-foreground">
            Workspace: <span className="font-medium text-foreground">{wsName}</span>
          </p>
        </header>

        <section className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button onClick={onNewDoc}>
              <FilePlus className="mr-2 h-4 w-4" /> New document
            </Button>
            <Button variant="outline" onClick={onOpenMarkdown}>
              <FileText className="mr-2 h-4 w-4" /> Open Markdown…
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent documents
          </h2>
          {recentDocs.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
              No documents yet. Click <span className="font-mono">New document</span> above.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {recentDocs.map((doc) => (
                <li key={doc.path}>
                  <button
                    type="button"
                    onClick={() => onOpenDoc(doc)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent/40"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm">{doc.name}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {relativeTime(doc.mtime)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
