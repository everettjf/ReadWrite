import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspace';
import { useT } from '@/i18n';
import { Section, Field } from './Field';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Folder, Plus, ExternalLink, EyeOff, Trash2, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateWorkspaceDialog } from '../workspace/CreateWorkspaceDialog';

export function WorkspacesPanel(): JSX.Element {
  const t = useT();
  const known = useWorkspaceStore((s) => s.known);
  const active = useWorkspaceStore((s) => s.active);
  const load = useWorkspaceStore((s) => s.load);
  const setActive = useWorkspaceStore((s) => s.setActive);
  const forget = useWorkspaceStore((s) => s.forget);
  const trash = useWorkspaceStore((s) => s.trash);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const onAddExisting = async (): Promise<void> => {
    const paths = await window.api.fs.openDialog({
      directory: true,
      title: t('workspace.dialog.pickExisting'),
    });
    if (!paths || paths.length === 0) return;
    await setActive(paths[0]!);
  };

  const onForget = (path: string, name: string): void => {
    if (confirm(t('settings.workspaces.confirm.forget', { name }))) {
      forget(path).catch((err) => alert(`Forget failed: ${(err as Error).message}`));
    }
  };

  const onDelete = (path: string, name: string): void => {
    if (confirm(t('settings.workspaces.confirm.delete', { name }))) {
      trash(path).catch((err) => alert(`Delete failed: ${(err as Error).message}`));
    }
  };

  return (
    <div className="space-y-8">
      <Section title={t('settings.workspaces.title')}>
        <Field
          label={t('settings.workspaces.list.label')}
          description={t('settings.workspaces.list.description')}
        >
          <div className="space-y-1.5">
            {known.length === 0 && (
              <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
                {t('settings.workspaces.empty')}
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
                      {t('settings.workspaces.switch')}
                    </Button>
                  )}
                  {isActive && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      {t('settings.workspaces.activeBadge')}
                    </span>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" title="More actions">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuItem onSelect={() => window.api.workspace.reveal(w.path)}>
                        <ExternalLink className="mr-2 h-4 w-4" />{' '}
                        {t('settings.workspaces.action.reveal')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => onForget(w.path, w.name)}>
                        <EyeOff className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{t('settings.workspaces.action.forget')}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {t('settings.workspaces.action.forget.hint')}
                          </span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => onDelete(w.path, w.name)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{t('settings.workspaces.action.delete')}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {t('settings.workspaces.action.delete.hint')}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 pt-3">
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> {t('settings.workspaces.cta.createNew')}
            </Button>
            <Button variant="outline" onClick={onAddExisting}>
              <Folder className="mr-2 h-4 w-4" /> {t('settings.workspaces.cta.openExisting')}
            </Button>
          </div>
        </Field>
      </Section>
      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
