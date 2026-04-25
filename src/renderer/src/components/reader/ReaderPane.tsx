import { useTabsStore } from '@/stores/tabs';
import { TabBar } from './TabBar';
import { WebReader } from './WebReader';
import { PdfReader } from './PdfReader';
import { EpubReaderView } from './EpubReader';
import { CodeReader } from './CodeReader';

export function ReaderPane(): JSX.Element {
  const { tabs, activeTabId } = useTabsStore();
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  return (
    <div data-rw-pane="reader" className="flex h-full w-full flex-col bg-background">
      <TabBar />
      <div className="relative flex-1 overflow-hidden">
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
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <div className="text-sm">
        Open a URL, PDF, EPUB or a local folder from the <span className="font-mono">+</span> button
        above.
      </div>
      <div className="text-xs opacity-75">
        Tip: type <span className="font-mono">owner/repo</span> to open a GitHub repository.
      </div>
    </div>
  );
}
