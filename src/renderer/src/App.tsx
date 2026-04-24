import { useEffect } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { SplitView } from './components/layout/SplitView';
import { ReaderPane } from './components/reader/ReaderPane';
import { EditorPane } from './components/editor/EditorPane';
import { useSettingsStore } from './stores/settings';
import { useEditorStore } from './stores/editor';

export function App(): JSX.Element {
  const load = useSettingsStore((s) => s.load);
  const loaded = useSettingsStore((s) => s.loaded);

  useEffect(() => {
    load().catch((e) => console.error('[settings] load failed:', e));
  }, [load]);

  // Unsaved-changes guard
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (useEditorStore.getState().dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <TitleBar />
      <div className="flex-1 overflow-hidden">
        <SplitView left={<ReaderPane />} right={<EditorPane />} />
      </div>
    </div>
  );
}
