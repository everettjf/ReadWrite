import { useState } from 'react';
import { useTabsStore } from '@/stores/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Globe, FileText, Book, Code2 } from 'lucide-react';
import { TabBar } from './TabBar';
import { WebReader } from './WebReader';
import { PdfReader } from './PdfReader';
import { EpubReaderView } from './EpubReader';
import { CodeReader } from './CodeReader';
import {
  openWebOrGithubTab,
  openPdfFromDialog,
  openEpubFromDialog,
  openCodeFolderFromDialog,
} from '@/lib/open-tab';
import { toGithubWebUrl } from '@/lib/utils';

interface ReaderPaneProps {
  onStartSnip?: () => void;
}

export function ReaderPane({ onStartSnip }: ReaderPaneProps): JSX.Element {
  const { tabs, activeTabId } = useTabsStore();
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  return (
    <div data-rw-pane="reader" className="flex h-full w-full flex-col bg-background">
      <TabBar onStartSnip={onStartSnip} />
      <div data-rw-snip-area className="relative flex-1 overflow-hidden">
        {tabs.length === 0 && <EmptyState />}
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          const hiddenStyle: React.CSSProperties = {
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            visibility: 'hidden',
          };
          const activeStyle: React.CSSProperties = { position: 'absolute', inset: 0 };
          if (tab.kind === 'web' || tab.kind === 'github') {
            return (
              <div
                key={tab.id}
                className="absolute inset-0"
                style={active ? activeStyle : hiddenStyle}
              >
                <WebReader tab={tab} active={active} />
              </div>
            );
          }
          if (!active) return null;
          if (tab.kind === 'pdf') return <PdfReader key={tab.id} tab={tab} />;
          if (tab.kind === 'epub') return <EpubReaderView key={tab.id} tab={tab} />;
          if (tab.kind === 'code') return <CodeReader key={tab.id} tab={tab} />;
          return null;
        })}
        {/* Void touch of activeTab for React compiler */}
        <span className="hidden">{activeTab?.id}</span>
      </div>
    </div>
  );
}

function EmptyState(): JSX.Element {
  const [input, setInput] = useState('');
  const canOpenUrl = !!toGithubWebUrl(input);

  const handleWeb = async (): Promise<void> => {
    if (await openWebOrGithubTab(input)) setInput('');
  };

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-md space-y-5">
        <div className="space-y-1 text-center text-muted-foreground">
          <div className="text-sm">Open a URL, GitHub repo, PDF, EPUB, or local code folder.</div>
          <div className="text-xs opacity-75">
            Tip: type <span className="font-mono">owner/repo</span> for a GitHub repository.
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="https://... or github-owner/repo"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleWeb();
            }}
          />
          <Button onClick={handleWeb} disabled={!canOpenUrl}>
            <Globe className="mr-2 h-4 w-4" /> Open
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={() => openPdfFromDialog()}>
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={() => openEpubFromDialog()}>
            <Book className="mr-2 h-4 w-4" /> EPUB
          </Button>
          <Button variant="outline" onClick={() => openCodeFolderFromDialog()}>
            <Code2 className="mr-2 h-4 w-4" /> Code
          </Button>
        </div>
      </div>
    </div>
  );
}
