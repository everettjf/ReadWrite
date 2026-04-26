import { useEffect } from 'react';
import { useTabsStore } from '@/stores/tabs';

/**
 * Native `WebContentsView`s sit on top of the renderer (they're OS-level
 * child windows), so any in-renderer dialog gets visually obscured by a
 * visible web tab. While `active` is true, hide every web/github tab; on
 * cleanup, restore visibility of the currently-active tab. Same trick the
 * snip overlay uses.
 *
 * Drop this hook into any Dialog component to make it readable when a
 * web tab is open behind it:
 *
 *   useNativeViewMute(open);
 */
export function useNativeViewMute(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const tabsAtOpen = useTabsStore.getState().tabs;
    const webTabIds = tabsAtOpen
      .filter((t) => t.kind === 'web' || t.kind === 'github')
      .map((t) => t.id);

    for (const id of webTabIds) {
      window.api.tabs.setVisibility(id, false).catch(() => null);
    }

    return () => {
      const cur = useTabsStore.getState();
      const activeTab = cur.tabs.find((t) => t.id === cur.activeTabId) ?? null;
      // Only show the currently-active tab; siblings stay hidden as before.
      if (activeTab && (activeTab.kind === 'web' || activeTab.kind === 'github')) {
        window.api.tabs.setVisibility(activeTab.id, true).catch(() => null);
      }
    };
  }, [active]);
}
