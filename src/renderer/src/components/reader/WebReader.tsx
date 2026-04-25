import { useEffect, useRef, useState } from 'react';
import type { WebTab } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, RotateCw, ExternalLink } from 'lucide-react';
import { useTabsStore } from '@/stores/tabs';

interface WebReaderProps {
  tab: WebTab;
  active: boolean;
}

export function WebReader({ tab, active }: WebReaderProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const [address, setAddress] = useState(tab.url);
  const updateTab = useTabsStore((s) => s.updateTab);

  // Sync native view bounds to the host div
  useEffect(() => {
    if (!hostRef.current) return;
    const host = hostRef.current;
    let frame = 0;

    const applyBounds = (): void => {
      const rect = host.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      window.api.tabs
        .setBounds(tab.id, {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        })
        .catch(() => null);
    };

    const schedule = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(applyBounds);
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(host);
    window.addEventListener('resize', schedule);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [tab.id]);

  // Toggle visibility based on active state
  useEffect(() => {
    window.api.tabs.setVisibility(tab.id, active).catch(() => null);
    if (active) window.api.tabs.focus(tab.id).catch(() => null);
  }, [tab.id, active]);

  // Receive URL/title/loading state from main
  useEffect(() => {
    const off = window.api.tabs.onStateChange((state) => {
      if (state.id !== tab.id) return;
      updateTab(tab.id, {
        title: state.title,
        url: state.url,
        canGoBack: state.canGoBack,
        canGoForward: state.canGoForward,
        loading: state.loading,
      } as Partial<WebTab>);
      setAddress(state.url);
    });
    return off;
  }, [tab.id, updateTab]);

  const onNavigate = async (): Promise<void> => {
    const url = address.startsWith('http') ? address : `https://${address}`;
    await window.api.tabs.navigate(tab.id, url);
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-background px-2">
        <Button
          variant="ghost"
          size="icon"
          disabled={!tab.canGoBack}
          onClick={() => window.api.tabs.goBack(tab.id)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={!tab.canGoForward}
          onClick={() => window.api.tabs.goForward(tab.id)}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => window.api.tabs.reload(tab.id)}>
          <RotateCw className="h-4 w-4" />
        </Button>
        <Input
          className="ml-1 flex-1"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onNavigate();
          }}
        />
        <Button variant="ghost" size="icon" onClick={() => window.api.shell.openExternal(tab.url)}>
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
      <div ref={hostRef} className="webview-host flex-1" />
    </div>
  );
}
