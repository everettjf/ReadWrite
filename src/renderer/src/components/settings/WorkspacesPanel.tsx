import { useEffect } from 'react';
import { useWorkspaceStore } from '@/stores/workspace';
import { Section, Field } from './Field';
import { Button } from '@/components/ui/button';
import { Folder, Plus, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WorkspacesPanel(): JSX.Element {
  const known = useWorkspaceStore((s) => s.known);
  const active = useWorkspaceStore((s) => s.active);
  const load = useWorkspaceStore((s) => s.load);
  const setActive = useWorkspaceStore((s) => s.setActive);
  const forget = useWorkspaceStore((s) => s.forget);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const onAddExisting = async (): Promise<void> => {
    const paths = await window.api.fs.openDialog({
      directory: true,
      title: 'Pick an existing workspace folder',
    });
    if (!paths || paths.length === 0) return;
    await setActive(paths[0]!);
  };

  const onAddNew = async (): Promise<void> => {
    const paths = await window.api.fs.openDialog({
      directory: true,
      title: 'Pick a parent folder for the new workspace',
    });
    if (!paths || paths.length === 0) return;
    const name = prompt('New workspace name:', 'My Notes');
    if (!name) return;
    const entry = await window.api.workspace.create({
      parent: paths[0]!,
      name,
      activate: true,
    });
    await setActive(entry.path);
  };

  return (
    <div className="space-y-8">
      <Section title="Workspaces">
        <Field
          label="Known workspaces"
          description="Each workspace is a folder; documents inside it live in subfolders. Click to switch — the editor reloads with that workspace as the active root."
        >
          <div className="space-y-1.5">
            {known.length === 0 && (
              <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
                No workspaces yet. Add one below.
              </div>
            )}
            {known.map((w) => {
              const isActive = w.path === active;
              return (
                <div
                  key={w.path}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                    isActive
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-border bg-background hover:bg-muted/30',
                  )}
                >
                  <Folder
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isActive ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{w.name}</div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground">
                      {w.path}
                    </div>
                  </div>
                  {!isActive && (
                    <Button size="sm" variant="outline" onClick={() => setActive(w.path)}>
                      Switch
                    </Button>
                  )}
                  {isActive && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Active
                    </span>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => window.api.workspace.reveal(w.path)}
                    title="Reveal in Finder"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (
                        confirm(`Forget workspace "${w.name}"? The folder on disk is not deleted.`)
                      ) {
                        forget(w.path);
                      }
                    }}
                    title="Remove from list (does not delete the folder)"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 pt-3">
            <Button variant="outline" onClick={onAddNew}>
              <Plus className="mr-2 h-4 w-4" /> Create new
            </Button>
            <Button variant="outline" onClick={onAddExisting}>
              <Folder className="mr-2 h-4 w-4" /> Open existing folder
            </Button>
          </div>
        </Field>
      </Section>
    </div>
  );
}
