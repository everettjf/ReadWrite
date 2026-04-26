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
  /** Optional left sidebar (e.g. workspace docs list). */
  sidebar?: ReactNode;
  /** Show the sidebar? When false, the sidebar panel collapses to 0 width. */
  sidebarVisible?: boolean;
  left: ReactNode;
  right: ReactNode;
}

const RESIZE_HANDLE_CLASS =
  'relative w-[3px] cursor-col-resize bg-border transition-colors hover:bg-primary/40 data-[resize-handle-active]:bg-primary';

/**
 * Three-pane layout (sidebar / reader / editor) where the sidebar is a
 * `collapsible` panel from react-resizable-panels rather than a separate
 * conditional branch. Toggling visibility issues an imperative
 * `collapse()` / `expand()` to the same panel — the underlying
 * PanelGroup never remounts, so layout state stays consistent across
 * any number of toggles.
 *
 * Without this, swapping between two-vs-three-panel branches would
 * unmount and remount the PanelGroup; the library doesn't carry layout
 * state across that, leaving panes at zero width on the second toggle.
 */
export function SplitView({ sidebar, sidebarVisible, left, right }: SplitViewProps): JSX.Element {
  const sidebarRef = useRef<ImperativePanelHandle>(null);
  const showSidebar = !!sidebar && (sidebarVisible ?? true);

  // Keep the panel state in sync with the prop. Use the imperative API so
  // controlled toggling doesn't fight react-resizable-panels' uncontrolled
  // sizing.
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
      <Panel
        ref={sidebarRef}
        id="sidebar"
        order={1}
        collapsible
        collapsedSize={0}
        defaultSize={showSidebar ? 18 : 0}
        minSize={12}
        maxSize={35}
      >
        <div className="h-full w-full overflow-hidden">{sidebar}</div>
      </Panel>
      <PanelResizeHandle className={cn(RESIZE_HANDLE_CLASS, !showSidebar && 'hidden')} />
      <Panel id="reader" order={2} defaultSize={showSidebar ? 41 : 50} minSize={20}>
        <div className="h-full w-full overflow-hidden">{left}</div>
      </Panel>
      <PanelResizeHandle className={RESIZE_HANDLE_CLASS} />
      <Panel id="editor" order={3} minSize={20}>
        <div className="h-full w-full overflow-hidden">{right}</div>
      </Panel>
    </PanelGroup>
  );
}
