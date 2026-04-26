import { useEffect, useRef } from 'react';
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from 'react-resizable-panels';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SplitViewProps {
  /** Optional docs sidebar — appears on the right, alongside the editor. */
  sidebar?: ReactNode;
  /** Show the sidebar? When false, the sidebar panel collapses to 0 width. */
  sidebarVisible?: boolean;
  /**
   * Vertical action rail rendered flush against the editor panel's left
   * edge — i.e. at the reader/editor seam. Hosts cross-pane actions like
   * snip + AI menu.
   */
  rail?: ReactNode;
  left: ReactNode;
  right: ReactNode;
}

const RESIZE_HANDLE_CLASS =
  'relative w-[3px] cursor-col-resize bg-border transition-colors hover:bg-primary/40 data-[resize-handle-active]:bg-primary';

/**
 * Three-pane layout: reader (left) / editor (middle, with action rail on
 * its left edge) / docs sidebar (right, collapsible). The sidebar uses
 * an imperative `collapse()` / `expand()` so the PanelGroup never
 * remounts when toggling — keeps layout state consistent across any
 * number of toggles.
 */
export function SplitView({
  sidebar,
  sidebarVisible,
  rail,
  left,
  right,
}: SplitViewProps): JSX.Element {
  const sidebarRef = useRef<ImperativePanelHandle>(null);
  const showSidebar = !!sidebar && (sidebarVisible ?? true);

  useEffect(() => {
    const panel = sidebarRef.current;
    if (!panel) return;
    if (showSidebar && panel.isCollapsed()) {
      panel.expand();
    } else if (!showSidebar && panel.isExpanded()) {
      panel.collapse();
    }
  }, [showSidebar]);

  return (
    <PanelGroup direction="horizontal" className="h-full w-full">
      <Panel id="reader" order={1} defaultSize={showSidebar ? 41 : 50} minSize={20}>
        <div className="h-full w-full overflow-hidden">{left}</div>
      </Panel>
      <PanelResizeHandle className={RESIZE_HANDLE_CLASS} />
      <Panel id="editor" order={2} defaultSize={showSidebar ? 41 : 50} minSize={20}>
        <div className="flex h-full w-full">
          {rail}
          <div className="min-w-0 flex-1 overflow-hidden">{right}</div>
        </div>
      </Panel>
      <PanelResizeHandle className={cn(RESIZE_HANDLE_CLASS, !showSidebar && 'hidden')} />
      <Panel
        ref={sidebarRef}
        id="sidebar"
        order={3}
        collapsible
        collapsedSize={0}
        defaultSize={showSidebar ? 18 : 0}
        minSize={12}
        maxSize={35}
      >
        <div className="h-full w-full overflow-hidden">{sidebar}</div>
      </Panel>
    </PanelGroup>
  );
}
