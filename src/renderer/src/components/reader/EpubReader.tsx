import { useState } from 'react';
import type { EpubTab } from '@shared/types';
import { ReactReader } from 'react-reader';
import { useTabsStore } from '@/stores/tabs';
import { useReaderSelectionStore } from '@/stores/reader-selection';

interface EpubReaderProps {
  tab: EpubTab;
}

interface EpubContents {
  window: Window;
  document: Document;
}

interface EpubContentHook {
  register: (cb: (contents: EpubContents) => void) => void;
}

interface EpubRendition {
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  hooks?: { content?: EpubContentHook };
}

export function EpubReaderView({ tab }: EpubReaderProps): JSX.Element {
  const [location, setLocation] = useState<string | number>(tab.location ?? 0);
  const updateTab = useTabsStore((s) => s.updateTab);
  const setReaderSelection = useReaderSelectionStore((s) => s.set);
  const clearReaderSelection = useReaderSelectionStore((s) => s.clear);

  const handleRendition = (rendition: EpubRendition): void => {
    const publishFromContents = (contents: EpubContents): void => {
      const sel = contents.window.getSelection();
      const text = sel?.toString() ?? '';
      if (!text.trim()) {
        clearReaderSelection();
        return;
      }
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const innerRect = range.getBoundingClientRect();
      // Convert from inside-iframe coords to outer viewport coords by
      // adding the iframe's offset.
      const iframe = contents.document.defaultView?.frameElement as HTMLIFrameElement | null;
      const iframeRect = iframe?.getBoundingClientRect() ?? { top: 0, left: 0 };
      setReaderSelection({
        text,
        source: 'epub',
        rect: {
          top: innerRect.top + iframeRect.top,
          left: innerRect.left + iframeRect.left,
          width: innerRect.width,
          height: innerRect.height,
        },
      });
    };

    rendition.on('selected', ((_cfiRange: string, contents: EpubContents) => {
      publishFromContents(contents);
    }) as (...args: unknown[]) => void);

    // 'selected' only fires for non-empty selections in some epubjs
    // builds, so attach a selectionchange listener inside each iframe
    // (one per spread / column). This catches the "user clicks empty
    // space inside the iframe" case where the outside-click handler in
    // the toolbar can't see the event because mousedown doesn't bubble
    // out of the iframe.
    rendition.hooks?.content?.register((contents) => {
      contents.document.addEventListener('selectionchange', () => {
        const text = contents.window.getSelection()?.toString() ?? '';
        if (!text.trim()) clearReaderSelection();
      });
    });
  };

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
          getRendition={handleRendition as unknown as never}
        />
      </div>
    </div>
  );
}
