import { useState } from 'react';
import type { EpubTab } from '@shared/types';
import { ReactReader } from 'react-reader';
import { useTabsStore } from '@/stores/tabs';

interface EpubReaderProps {
  tab: EpubTab;
}

export function EpubReaderView({ tab }: EpubReaderProps): JSX.Element {
  const [location, setLocation] = useState<string | number>(tab.location ?? 0);
  const updateTab = useTabsStore((s) => s.updateTab);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-background px-2">
        <span className="text-xs text-muted-foreground">{tab.title}</span>
        <div className="flex-1" />
      </div>
      <div className="relative flex-1 overflow-hidden">
        <ReactReader
          url={`file://${encodeURI(tab.path)}`}
          location={location}
          locationChanged={(loc) => {
            setLocation(loc);
            updateTab(tab.id, { location: loc } as Partial<EpubTab>);
          }}
          epubInitOptions={{ openAs: 'epub' }}
        />
      </div>
    </div>
  );
}
