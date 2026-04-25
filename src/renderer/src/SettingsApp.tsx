import { useEffect, useState } from 'react';
import { useSettingsStore } from './stores/settings';
import { cn } from './lib/utils';
import { Type, Image as ImageIcon, Sparkles, Send, Info, Palette, Folder } from 'lucide-react';
import { GeneralPanel } from './components/settings/GeneralPanel';
import { EditorPanel } from './components/settings/EditorPanel';
import { WorkspacesPanel } from './components/settings/WorkspacesPanel';
import { ImagesPanel } from './components/settings/ImagesPanel';
import { AIPanel } from './components/settings/AIPanel';
import { WeChatPanel } from './components/settings/WeChatPanel';
import { AboutPanel } from './components/settings/AboutPanel';

type SectionId = 'general' | 'workspaces' | 'editor' | 'images' | 'ai' | 'wechat' | 'about';

const SECTIONS: Array<{
  id: SectionId;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'general', label: 'General', Icon: Palette },
  { id: 'workspaces', label: 'Workspaces', Icon: Folder },
  { id: 'editor', label: 'Editor', Icon: Type },
  { id: 'images', label: 'Images', Icon: ImageIcon },
  { id: 'ai', label: 'AI', Icon: Sparkles },
  { id: 'wechat', label: 'WeChat', Icon: Send },
  { id: 'about', label: 'About', Icon: Info },
];

export function SettingsApp(): JSX.Element {
  const load = useSettingsStore((s) => s.load);
  const loaded = useSettingsStore((s) => s.loaded);
  const [active, setActive] = useState<SectionId>('general');

  useEffect(() => {
    load().catch((e) => console.error('[settings] load failed:', e));
  }, [load]);

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background text-foreground">
      <aside
        className="flex w-52 shrink-0 flex-col border-r border-border bg-muted/20 pt-12"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="px-4 pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Settings
        </div>
        <nav
          className="flex flex-col gap-0.5 px-2"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {SECTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                active === id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-10">
          {active === 'general' && <GeneralPanel />}
          {active === 'workspaces' && <WorkspacesPanel />}
          {active === 'editor' && <EditorPanel />}
          {active === 'images' && <ImagesPanel />}
          {active === 'ai' && <AIPanel />}
          {active === 'wechat' && <WeChatPanel />}
          {active === 'about' && <AboutPanel />}
        </div>
      </main>
    </div>
  );
}
