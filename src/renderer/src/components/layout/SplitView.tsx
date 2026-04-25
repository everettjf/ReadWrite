import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import type { ReactNode } from 'react';
import { useSettingsStore } from '@/stores/settings';

interface SplitViewProps {
  /** Optional left sidebar (e.g. workspace docs list). */
  sidebar?: ReactNode;
  /** Show the sidebar? When false, sidebar is collapsed and only left/right show. */
  sidebarVisible?: boolean;
  left: ReactNode;
  right: ReactNode;
}

export function SplitView({ sidebar, sidebarVisible, left, right }: SplitViewProps): JSX.Element {
  const splitRatio = useSettingsStore((s) => s.splitRatio);
  const update = useSettingsStore((s) => s.update);

  const showSidebar = !!sidebar && (sidebarVisible ?? true);

  if (showSidebar) {
    return (
      <PanelGroup direction="horizontal" className="h-full w-full">
        <Panel defaultSize={18} minSize={12} maxSize={35}>
          <div className="h-full w-full overflow-hidden">{sidebar}</div>
        </Panel>
        <PanelResizeHandle className="relative w-[3px] cursor-col-resize bg-border transition-colors hover:bg-primary/40 data-[resize-handle-active]:bg-primary" />
        <Panel defaultSize={41} minSize={20}>
          <div className="h-full w-full overflow-hidden">{left}</div>
        </Panel>
        <PanelResizeHandle className="relative w-[3px] cursor-col-resize bg-border transition-colors hover:bg-primary/40 data-[resize-handle-active]:bg-primary" />
        <Panel minSize={20}>
          <div className="h-full w-full overflow-hidden">{right}</div>
        </Panel>
      </PanelGroup>
    );
  }

  return (
    <PanelGroup
      direction="horizontal"
      className="h-full w-full"
      onLayout={(sizes) => {
        const ratio = (sizes[0] ?? 50) / 100;
        if (Math.abs(ratio - splitRatio) > 0.02) {
          update({ splitRatio: ratio });
        }
      }}
    >
      <Panel defaultSize={Math.round(splitRatio * 100)} minSize={20}>
        <div className="h-full w-full overflow-hidden">{left}</div>
      </Panel>
      <PanelResizeHandle className="relative w-[3px] cursor-col-resize bg-border transition-colors hover:bg-primary/40 data-[resize-handle-active]:bg-primary" />
      <Panel minSize={20}>
        <div className="h-full w-full overflow-hidden">{right}</div>
      </Panel>
    </PanelGroup>
  );
}
