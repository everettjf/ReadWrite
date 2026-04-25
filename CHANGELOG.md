# Changelog

All notable changes to ReadWrite will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial scaffold: Electron + React + TypeScript + Tailwind + shadcn/ui.
- Main process with `WebContentsView`-based multi-tab reader manager.
- IPC surface exposed via `contextBridge` with strong typing across processes.
- Four reader kinds: web, GitHub shorthand, PDF (`pdfjs-dist`), EPUB (`epubjs`), local code (Monaco).
- Right-pane Markdown editor with Milkdown (WYSIWYG) and CodeMirror 6 (source mode) toggle.
- Screenshot-to-insert: camera button on each reader toolbar captures current view and inserts as Markdown image.
- SQLite-backed persistence for settings, session, and recent documents.
- File watcher (chokidar) for live-refresh of local code folders.
- ESLint + Prettier + Husky + commitlint + Vitest.
- electron-builder configuration for macOS (dmg), Windows (nsis), Linux (AppImage, deb).
- GitHub Actions CI for lint, typecheck, test, and cross-platform build.
- ADR-001 documenting the Electron-over-Tauri decision.

### Changed

- Replaced the generated placeholder icon with a skeuomorphic book + fountain pen design. Shipped as `build/icon.png` (1024×1024) and `build/icon.icns` (native macOS iconset with all sizes embedded). Windows `.ico` is derived automatically by electron-builder at packaging time.

### Fixed

- Renamed the `rebuild` npm script to `rebuild:native` so it isn't shadowed by pnpm's built-in `pnpm rebuild` command, which uses system Node and silently caused `NODE_MODULE_VERSION` mismatches when launching Electron.
- Added a `postinstall` script that runs `electron-builder install-app-deps` automatically after `pnpm install`, so native modules (e.g. `better-sqlite3`) are compiled against Electron's Node ABI from the very first install.

### Added — Settings & AI

- **Standalone Settings window** (separate `BrowserWindow` loading the renderer at `#/settings`) with a sidebar and dedicated panels for General, Editor, Images, AI, WeChat, and About. Replaces the inline theme dropdown that used to live behind the title-bar cog.
- **Editor preferences**: font family (sans / serif / mono), font size (10–32px), content max-width, and default mode (WYSIWYG / Source). All values feed CSS custom properties that both Milkdown and CodeMirror inherit live.
- **Images / Screenshots**: configurable storage location with three modes — *next to current document* (default; writes to `images/` beside the .md and inserts a portable relative href like `images/screenshot-….png`), *custom absolute folder*, or *user Pictures folder*. Subfolder name is configurable.
- **AI configuration**: OpenAI-compatible endpoint, API key (with show/hide), model, system prompt, plus a one-click connection test that issues a real chat-completions request.
- **AI Polish action**: when AI is enabled, a sparkles button appears in the editor toolbar. With a selection, it polishes the selection in-place; with no selection, it polishes the whole document. Routes through the main process so the API key never leaves the user's machine via the renderer.
- **WeChat 公众号 credentials**: AppID + AppSecret form with a credential-verification test that hits the real WeChat `cgi-bin/token` endpoint. Publish action is scaffolded with a "coming soon" state.
- **Cross-window settings sync**: changing a setting in the Settings window broadcasts via IPC and the main window's UI updates live (theme switch, editor font size, etc.).
- **Copy to WeChat 公众号** in the editor toolbar (new dropdown menu, replaces the single Copy button). Renders the current document into a self-contained HTML fragment styled with per-element inline `style="..."` attributes — no `<style>` block (WeChat strips them), so the formatting survives the paste into mp.weixin.qq.com. Local images (`images/foo.png` next to the markdown file) are read from disk and embedded as base64 `data:` URIs so they render immediately in the WeChat editor without a separate upload step. Three themes ship: *Default* (sans, comfortable), *Serif* (long-form essays), *Compact* (denser). Theme is configured under Settings → WeChat → Export theme. Approach is modeled on Spute/obsidian-copy-to-mp, including its `<li>`-children-wrapped-in-`<p>` quirk that prevents the WeChat editor from injecting `<section>` blocks around list items.
- **Region-snip tool** (Crop button in the title bar, or ⇧⌘S / Ctrl+Shift+S). Captures a still image of the reader pane, freezes the view, and lets you drag a rectangle to crop. The cropped PNG goes straight to the clipboard *and* to the configured images directory; paste with Cmd/Ctrl+V into the editor (or anywhere else). For web tabs the native `WebContentsView` is briefly hidden during the snip so the renderer-side overlay can be drawn on top, then restored automatically.
- **Milkdown image paste**: the editor now accepts pasted/dropped images via `@milkdown/plugin-upload`. Each pasted image is saved into the images directory (per the Images settings) and inserted as a Markdown image with a portable relative path — so the snip → paste flow gives you `![image](images/snip-….png)` with no manual disk juggling.
