import { useEffect, useState, type ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Folder as FolderIcon, Plus, ExternalLink } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace';
import { useEditorStore } from '@/stores/editor';
import { cn } from '@/lib/utils';

interface WorkspaceSwitcherProps {
  /** The visual element that triggers the dropdown. */
  trigger: ReactNode;
  /** Alignment of the menu against the trigger. */
  align?: 'start' | 'end';
  /** Optional menu width override. */
  className?: string;
}

/**
 * Workspace dropdown — used in both the title bar and the docs
 * sidebar header. Owns its own refresh-on-open behavior and the
 * "Discard unsaved changes?" guard around switching.
 */
export function WorkspaceSwitcher({
  trigger,
  align = 'start',
  className,
}: WorkspaceSwitcherProps): JSX.Element {
  const active = useWorkspaceStore((s) => s.active);
  const known = useWorkspaceStore((s) => s.known);
  const setActive = useWorkspaceStore((s) => s.setActive);
  const [open, setOpen] = useState(false);

  // Refresh known list when the dropdown opens — covers the case
  // where another window created or removed a workspace.
  useEffect(() => {
    if (open)
      useWorkspaceStore
        .getState()
        .load()
        .catch(() => null);
  }, [open]);

  const onSwitch = async (targetPath: string): Promise<void> => {
    if (targetPath === active) return;
    if (useEditorStore.getState().dirty && !confirm('Discard unsaved changes?')) return;
    await setActive(targetPath);
  };

  const onAddNew = async (): Promise<void> => {
    const paths = await window.api.fs.openDialog({
      directory: true,
      title: 'Pick a parent folder for the new workspace',
    });
    if (!paths || paths.length === 0) return;
    const parent = paths[0]!;
    const name = prompt('New workspace name:', 'My Notes');
    if (!name) return;
    const entry = await window.api.workspace.create({ parent, name, activate: true });
    await useWorkspaceStore.getState().load();
    if (useEditorStore.getState().dirty && !confirm('Discard unsaved changes?')) return;
    await setActive(entry.path);
  };

  const onAddExisting = async (): Promise<void> => {
    const paths = await window.api.fs.openDialog({
      directory: true,
      title: 'Pick an existing workspace folder',
    });
    if (!paths || paths.length === 0) return;
    if (useEditorStore.getState().dirty && !confirm('Discard unsaved changes?')) return;
    await setActive(paths[0]!);
  };

  const onRevealActive = (): void => {
    if (active) window.api.workspace.reveal(active).catch(() => null);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={cn('w-80', className)}>
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {known.map((w) => (
          <DropdownMenuItem key={w.path} onSelect={() => onSwitch(w.path)}>
            <FolderIcon
              className={cn(
                'mr-2 h-4 w-4 shrink-0',
                w.path === active ? 'text-primary' : 'text-muted-foreground',
              )}
            />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm">{w.name}</span>
              <span className="truncate font-mono text-[10px] text-muted-foreground">{w.path}</span>
            </div>
            {w.path === active && (
              <span className="ml-auto text-[10px] text-muted-foreground">active</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onAddNew}>
          <Plus className="mr-2 h-4 w-4" /> Create new workspace…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onAddExisting}>
          <FolderIcon className="mr-2 h-4 w-4" /> Open existing folder…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onRevealActive} disabled={!active}>
          <ExternalLink className="mr-2 h-4 w-4" /> Reveal in Finder
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
