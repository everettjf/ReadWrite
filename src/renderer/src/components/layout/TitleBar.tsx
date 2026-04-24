import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, FolderOpen, Moon, Settings, Sun, Monitor, Save, FilePlus } from 'lucide-react';
import { useEditorStore } from '@/stores/editor';
import { useSettingsStore } from '@/stores/settings';
import { useTabsStore } from '@/stores/tabs';
import { openMarkdownFromDialog, saveMarkdownToPath } from '@/lib/doc-io';

export function TitleBar(): JSX.Element {
  const editor = useEditorStore();
  const settings = useSettingsStore();

  const onNew = (): void => {
    if (editor.dirty && !confirm('Discard unsaved changes?')) return;
    editor.reset('# Untitled\n\n');
    editor.setPath(null);
  };

  const onOpen = async (): Promise<void> => {
    const doc = await openMarkdownFromDialog();
    if (!doc) return;
    editor.reset(doc.content);
    editor.setPath(doc.path ?? null);
  };

  const onSave = async (): Promise<void> => {
    await saveMarkdownToPath(editor.content, editor.path);
    editor.setDirty(false);
  };

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
          {editor.path && (
            <span className="ml-3 truncate text-xs text-muted-foreground">
              {editor.path}
              {editor.dirty && ' •'}
            </span>
          )}
        </div>

        <div
          className="flex items-center gap-0.5"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onNew}>
                <FilePlus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New document</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onOpen}>
                <FileText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open Markdown</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onSave}>
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onOpenFolder}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open code folder</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => settings.update({ theme: 'light' })}>
                <Sun className="mr-2 h-4 w-4" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => settings.update({ theme: 'dark' })}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => settings.update({ theme: 'system' })}>
                <Monitor className="mr-2 h-4 w-4" />
                System
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Version 0.1.0</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
