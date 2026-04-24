import { useState } from 'react';
import { useTabsStore } from '@/stores/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, X, Globe, FileText, Book, Code2, Github } from 'lucide-react';
import { cn, toGithubWebUrl, basename } from '@/lib/utils';
import type { Tab } from '@shared/types';

const ICONS: Record<Tab['kind'], React.ComponentType<{ className?: string }>> = {
  web: Globe,
  github: Github,
  pdf: FileText,
  epub: Book,
  code: Code2,
};

export function TabBar(): JSX.Element {
  const { tabs, activeTabId, setActive, removeTab } = useTabsStore();

  const onClose = async (e: React.MouseEvent, id: string): Promise<void> => {
    e.stopPropagation();
    await window.api.tabs.close(id).catch(() => null);
    removeTab(id);
  };

  const onFocus = async (id: string): Promise<void> => {
    setActive(id);
    const tab = tabs.find((t) => t.id === id);
    if (tab && (tab.kind === 'web' || tab.kind === 'github')) {
      await window.api.tabs.focus(id);
    }
  };

  return (
    <div className="flex h-9 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border bg-muted/30 px-2">
      {tabs.map((tab) => {
        const Icon = ICONS[tab.kind];
        const active = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onFocus(tab.id)}
            className={cn(
              'group flex h-7 max-w-52 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs transition-colors',
              active
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{tab.title || 'Untitled'}</span>
            <button
              className="ml-1 rounded p-0.5 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
              onClick={(e) => onClose(e, tab.id)}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      <NewTabButton />
    </div>
  );
}

function NewTabButton(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { makeLocalTab, addTab } = useTabsStore();

  const createWebOrGithub = async (): Promise<void> => {
    const asGithub = toGithubWebUrl(input);
    if (!asGithub) return;
    const kind: 'web' | 'github' = /github\.com/i.test(asGithub) ? 'github' : 'web';
    const tab = await window.api.tabs.create({ url: asGithub, kind });
    addTab({ ...(tab as Tab), kind } as Tab);
    setOpen(false);
    setInput('');
  };

  const openPdf = async (): Promise<void> => {
    const paths = await window.api.fs.openDialog({
      title: 'Open PDF',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (!paths || paths.length === 0) return;
    const path = paths[0]!;
    const tab = makeLocalTab('pdf', { title: basename(path), path });
    addTab(tab);
    setOpen(false);
  };

  const openEpub = async (): Promise<void> => {
    const paths = await window.api.fs.openDialog({
      title: 'Open EPUB',
      filters: [{ name: 'EPUB', extensions: ['epub'] }],
    });
    if (!paths || paths.length === 0) return;
    const path = paths[0]!;
    const tab = makeLocalTab('epub', { title: basename(path), path });
    addTab(tab);
    setOpen(false);
  };

  const openFolder = async (): Promise<void> => {
    const folders = await window.api.fs.openDialog({
      directory: true,
      title: 'Open code folder',
    });
    if (!folders || folders.length === 0) return;
    const rootPath = folders[0]!;
    const tab = makeLocalTab('code', { title: basename(rootPath), rootPath });
    addTab(tab);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="ml-1 h-6 w-6">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New reader tab</DialogTitle>
          <DialogDescription>
            Open a URL, GitHub repo, PDF, EPUB, or a local code folder.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            autoFocus
            placeholder="https://... or github-owner/repo"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createWebOrGithub();
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={openPdf}>
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" onClick={openEpub}>
              <Book className="mr-2 h-4 w-4" /> EPUB
            </Button>
            <Button variant="outline" onClick={openFolder}>
              <Code2 className="mr-2 h-4 w-4" /> Code folder
            </Button>
            <Button onClick={createWebOrGithub} disabled={!toGithubWebUrl(input)}>
              <Globe className="mr-2 h-4 w-4" /> Open URL
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
