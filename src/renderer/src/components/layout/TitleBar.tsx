import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  FileText,
  Settings,
  FilePlus,
  Folder as FolderIcon,
  ChevronDown,
  Plus,
  ExternalLink,
  PanelRightOpen,
  PanelRightClose,
  Sparkles,
  TextSelect,
  ScrollText,
  Languages,
  FileSearch,
  BookOpen,
  HelpCircle,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editor';
import { useWorkspaceStore } from '@/stores/workspace';
import { useSettingsStore } from '@/stores/settings';
import { useEditorCommandsStore } from '@/stores/editor-commands';
import { docBasename } from '@/lib/doc-io';
import { cn } from '@/lib/utils';

interface TitleBarProps {
  onNewDoc?: () => void;
  onOpenDoc?: () => void;
}

export function TitleBar({ onNewDoc, onOpenDoc }: TitleBarProps): JSX.Element {
  const path = useEditorStore((s) => s.path);
  const dirty = useEditorStore((s) => s.dirty);
  const active = useWorkspaceStore((s) => s.active);
  const known = useWorkspaceStore((s) => s.known);
  const setActive = useWorkspaceStore((s) => s.setActive);
  const sidebarVisible = useSettingsStore((s) => s.sidebarVisible);
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const updateSettings = useSettingsStore((s) => s.update);
  const requestAiCmd = useEditorCommandsStore((s) => s.request);

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
          {aiEnabled && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>AI</TooltipContent>
              </Tooltip>
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
                      <DropdownMenuItem
                        onClick={() => requestAiCmd({ kind: 'polish', target: 'selection' })}
                      >
                        <TextSelect className="mr-2 h-4 w-4" /> Selection
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => requestAiCmd({ kind: 'polish', target: 'document' })}
                      >
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
                          requestAiCmd({ kind: 'translate', target: 'selection', lang: 'en' })
                        }
                      >
                        English
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          requestAiCmd({ kind: 'translate', target: 'selection', lang: 'zh' })
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
                          requestAiCmd({ kind: 'translate', target: 'document', lang: 'en' })
                        }
                      >
                        English
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          requestAiCmd({ kind: 'translate', target: 'document', lang: 'zh' })
                        }
                      >
                        中文
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuItem onClick={() => requestAiCmd({ kind: 'summarize' })}>
                  <FileSearch className="mr-2 h-4 w-4" />
                  Summarize document
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => requestAiCmd({ kind: 'explain' })}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Explain selection
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => requestAiCmd({ kind: 'interpret' })}>
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

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => updateSettings({ sidebarVisible: !sidebarVisible })}
              >
                {sidebarVisible ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {sidebarVisible ? 'Hide docs sidebar' : 'Show docs sidebar'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
