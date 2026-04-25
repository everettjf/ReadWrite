import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Crop,
  FileText,
  FolderOpen,
  Settings,
  FilePlus,
  Pencil,
  Folder as FolderIcon,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editor';
import { useTabsStore } from '@/stores/tabs';
import { docBasename } from '@/lib/doc-io';

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

  const onOpenFolder = async (): Promise<void> => {
    const folder = await window.api.fs.openDialog({ directory: true, title: 'Open code folder' });
    if (!folder || folder.length === 0) return;
    const rootPath = folder[0]!;
    const { makeLocalTab, addTab } = useTabsStore.getState();
    const tab = makeLocalTab('code', {
      title: rootPath.split('/').pop() ?? rootPath,
      rootPath,
    });
    addTab(tab);
  };

  const onOpenSettings = (): void => {
    window.api.app.openSettings().catch((e) => console.error('[settings] open failed:', e));
  };

  const onReveal = (): void => {
    if (!path) return;
    window.api.workspace.revealInFinder(path).catch(() => null);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex h-10 select-none items-center justify-between border-b border-border bg-background/80 pl-20 pr-2"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold tracking-tight text-muted-foreground">
            ReadWrite
          </span>
          {path && (
            <button
              className="ml-3 flex max-w-[42rem] items-center gap-1 truncate text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={onReveal}
              title="Reveal in Finder"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <FolderIcon className="h-3 w-3 shrink-0 opacity-60" />
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

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onOpenFolder}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open code folder (reader)</TooltipContent>
          </Tooltip>

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
              <Button variant="ghost" size="icon" onClick={onOpenSettings}>
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
