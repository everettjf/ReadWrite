import { WebContentsView, nativeImage } from 'electron';
import type { BrowserWindow } from 'electron';
import { nanoid } from 'nanoid';
import type { TabBounds, Tab, ScreenshotResult } from '@shared/types';
import { IPC } from '@shared/ipc-channels';

interface ManagedTab {
  id: string;
  kind: 'web' | 'github';
  view: WebContentsView;
  url: string;
  title: string;
  visible: boolean;
  bounds: TabBounds;
}

export class TabManager {
  private tabs = new Map<string, ManagedTab>();
  private activeTabId: string | null = null;

  constructor(private win: BrowserWindow) {}

  createWebTab(url: string, kind: 'web' | 'github' = 'web'): Tab {
    const id = nanoid(10);
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    const managed: ManagedTab = {
      id,
      kind,
      view,
      url,
      title: url,
      visible: false,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    };

    view.webContents.on('page-title-updated', (_e, title) => {
      managed.title = title;
      this.broadcastState(id);
    });

    view.webContents.on('did-navigate', (_e, nav) => {
      managed.url = nav;
      this.broadcastState(id);
    });

    view.webContents.on('did-navigate-in-page', (_e, nav) => {
      managed.url = nav;
      this.broadcastState(id);
    });

    view.webContents.on('did-start-loading', () => this.broadcastState(id));
    view.webContents.on('did-stop-loading', () => this.broadcastState(id));

    view.webContents.loadURL(url).catch((err) => {
      console.error(`[tabs] loadURL failed for ${url}:`, err);
    });

    this.win.contentView.addChildView(view);
    view.setVisible(false);

    this.tabs.set(id, managed);

    return {
      id,
      kind,
      title: url,
      url,
      createdAt: Date.now(),
    };
  }

  closeTab(id: string): void {
    const t = this.tabs.get(id);
    if (!t) return;
    try {
      this.win.contentView.removeChildView(t.view);
    } catch {
      // ignore
    }
    // WebContentsView cleanup — close its webContents
    try {
      t.view.webContents.close();
    } catch {
      // ignore
    }
    this.tabs.delete(id);
    if (this.activeTabId === id) {
      this.activeTabId = null;
    }
  }

  focusTab(id: string): void {
    for (const [tabId, tab] of this.tabs) {
      const isActive = tabId === id;
      tab.view.setVisible(isActive && tab.visible);
    }
    this.activeTabId = id;
  }

  setBounds(id: string, bounds: TabBounds): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.bounds = bounds;
    const rounded = {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    };
    tab.view.setBounds(rounded);
  }

  setVisibility(id: string, visible: boolean): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.visible = visible;
    tab.view.setVisible(visible);
  }

  navigate(id: string, url: string): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.url = url;
    tab.view.webContents.loadURL(url).catch((err) => {
      console.error(`[tabs] navigate failed:`, err);
    });
  }

  goBack(id: string): void {
    const tab = this.tabs.get(id);
    if (tab?.view.webContents.navigationHistory.canGoBack()) {
      tab.view.webContents.navigationHistory.goBack();
    }
  }

  goForward(id: string): void {
    const tab = this.tabs.get(id);
    if (tab?.view.webContents.navigationHistory.canGoForward()) {
      tab.view.webContents.navigationHistory.goForward();
    }
  }

  reload(id: string): void {
    const tab = this.tabs.get(id);
    tab?.view.webContents.reload();
  }

  async screenshot(id: string): Promise<ScreenshotResult | null> {
    const tab = this.tabs.get(id);
    if (!tab) return null;
    const image = await tab.view.webContents.capturePage();
    const png = image.toPNG();
    const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
    const size = image.getSize();
    return {
      dataUrl,
      width: size.width,
      height: size.height,
    };
  }

  /** Capture an arbitrary view as data URL (kept for future non-active tab grabs) */
  async snapshotImage(id: string): Promise<string | null> {
    const tab = this.tabs.get(id);
    if (!tab) return null;
    const image = await tab.view.webContents.capturePage();
    const buf = image.toPNG();
    const file = nativeImage.createFromBuffer(buf);
    return file.toDataURL();
  }

  /**
   * Extract plain article text from a web/github tab. Uses a small DOM
   * heuristic (prefer <article>/<main>, strip nav/aside/footer/scripts)
   * — keeps payload manageable when feeding the result to an LLM.
   * Avoid pulling in a Readability dep just for this; the heuristic is
   * good enough for most articles and we can swap in @mozilla/readability
   * later if quality matters.
   */
  async extractWebText(
    id: string,
  ): Promise<{ title: string; source: string; text: string } | null> {
    const tab = this.tabs.get(id);
    if (!tab) return null;
    // Run in the page's main world. Returns a JSON string we parse here.
    const script = `(function () {
      try {
        var article = document.querySelector('article, main, [role="main"]');
        var root = article || document.body;
        var clone = root.cloneNode(true);
        var stripSel = 'nav, aside, footer, header, script, style, noscript, iframe, .nav, .header, .footer, .sidebar, [aria-hidden="true"], [role="navigation"], [role="banner"], [role="contentinfo"]';
        clone.querySelectorAll(stripSel).forEach(function (n) { n.remove(); });
        var text = clone.innerText || clone.textContent || '';
        return JSON.stringify({
          title: document.title || '',
          url: location.href,
          text: text.replace(/\\n{3,}/g, '\\n\\n').trim(),
        });
      } catch (err) {
        return JSON.stringify({ error: String(err && err.message || err) });
      }
    })();`;
    const json = (await tab.view.webContents.executeJavaScript(script, true)) as string;
    let parsed: { title?: string; url?: string; text?: string; error?: string };
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Reader extraction returned invalid JSON.');
    }
    if (parsed.error) throw new Error(`Reader extraction failed: ${parsed.error}`);
    return {
      title: parsed.title ?? '',
      source: parsed.url ?? tab.url,
      text: parsed.text ?? '',
    };
  }

  destroyAll(): void {
    for (const id of [...this.tabs.keys()]) {
      this.closeTab(id);
    }
  }

  private broadcastState(id: string): void {
    const tab = this.tabs.get(id);
    if (!tab || this.win.isDestroyed()) return;
    const wc = tab.view.webContents;
    this.win.webContents.send(IPC.TAB_STATE_CHANGED, {
      id,
      title: tab.title,
      url: tab.url,
      loading: wc.isLoading(),
      canGoBack: wc.navigationHistory.canGoBack(),
      canGoForward: wc.navigationHistory.canGoForward(),
    });
  }
}
