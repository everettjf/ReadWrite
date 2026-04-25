import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Crop,
  FileText,
  Settings,
  FilePlus,
  Pencil,
  Folder as FolderIcon,
  ChevronDown,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editor';
import { useWorkspaceStore } from '@/stores/workspace';
import { docBasename } from '@/lib/doc-io';
import { cn } from '@/lib/utils';

interface TitleBarProps {
  onStartSnip?: () => void;
  onNewDoc?: () => void;
  onOpenDoc?: () => void;
  onRenameDoc?: () => void;
}

export function TitleBar({
  onStartSnip,
  onNewDoc,
  onOpenDoc,
  onRenameDoc,
}: TitleBarProps): JSX.Element {
  const path = useEditorStore((s) => s.path);
  const dirty = useEditorStore((s) => s.dirty);
  const active = useWorkspaceStore((s) => s.active);
  const known = useWorkspaceStore((s) => s.known);
  const setActive = useWorkspaceStore((s) => s.setActive);

  const activeWorkspaceName =
    known.find((w) => w.path === active)?.name ?? (active ? docBasename(active) : '—');

  const [busy, setBusy] = useState<string | null>(null);

  const onSwitch = async (targetPath: string): Promise<void> => {
    if (targetPath === active) return;
    if (useEditorStore.getState().dirty && !confirm('Discard unsaved changes?')) return;
    setBusy(targetPath);
    try {
      await setActive(targetPath);
    } finally {
      setBusy(null);
    }
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

  const onRevealDoc = (): void => {
    if (path) window.api.workspace.revealInFinder(path).catch(() => null);
  };

  // Refresh the known list when the dropdown opens
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open)
      useWorkspaceStore
        .getState()
        .load()
        .catch(() => null);
  }, [open]);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex h-10 select-none items-center justify-between border-b border-border bg-background/80 pl-20 pr-2"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div
          className="flex items-center gap-2 overflow-hidden"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs font-medium transition-colors hover:bg-accent',
                  busy && 'opacity-60',
                )}
                title={active ?? undefined}
              >
                <FolderIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="max-w-[10rem] truncate">{activeWorkspaceName}</span>
                <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
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
                    <span className="truncate font-mono text-[10px] text-muted-foreground">
                      {w.path}
                    </span>
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

          {path && (
            <button
              className="flex max-w-[36rem] items-center gap-1 truncate text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={onRevealDoc}
              title="Reveal in Finder"
            >
              <span className="opacity-50">/</span>
              <span className="truncate">{docBasename(path)}</span>
              <span className="shrink-0">{dirty ? '·' : '✓'}</span>
            </button>
          )}
        </div>

        <div
          className="flex items-center gap-0.5"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {onNewDoc && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onNewDoc}>
                  <FilePlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New document (creates a new folder)</TooltipContent>
            </Tooltip>
          )}

          {onOpenDoc && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onOpenDoc}>
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open Markdown</TooltipContent>
            </Tooltip>
          )}

          {onRenameDoc && path && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onRenameDoc}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rename document</TooltipContent>
            </Tooltip>
          )}

          {onStartSnip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onStartSnip}>
                  <Crop className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Snip region from reader (⇧⌘S)</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  window.api.app.openSettings().catch((e) => console.error('[settings]', e))
                }
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
