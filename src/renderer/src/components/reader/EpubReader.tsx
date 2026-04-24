import { useRef, useState } from 'react';
import type { EpubTab } from '@shared/types';
import { ReactReader } from 'react-reader';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { useTabsStore } from '@/stores/tabs';
import { captureElementAndInsert } from '@/lib/screenshot';

interface EpubReaderProps {
  tab: EpubTab;
}

export function EpubReaderView({ tab }: EpubReaderProps): JSX.Element {
  const [location, setLocation] = useState<string | number>(tab.location ?? 0);
  const stageRef = useRef<HTMLDivElement>(null);
  const updateTab = useTabsStore((s) => s.updateTab);

  const onCapture = async (): Promise<void> => {
    if (stageRef.current) await captureElementAndInsert(stageRef.current);
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-background px-2">
        <span className="text-xs text-muted-foreground">{tab.title}</span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={onCapture}>
          <Camera className="h-4 w-4" />
        </Button>
      </div>
      <div ref={stageRef} className="relative flex-1 overflow-hidden">
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
