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

### Changed — Workspaces (Obsidian-style)

- **Workspaces are now first-class.** A workspace is a folder; documents live inside as subfolders. On first launch (or whenever there's no active workspace) you get an onboarding screen with three paths: create a new workspace, open an existing folder, or pick from recent ones.
- **iCloud-friendly defaults.** On macOS, the workspace creator suggests iCloud Drive as the parent location ahead of `~/Documents` so notes sync across your Macs out of the box. Linux / Windows keep `~/Documents` as the default.
- **Multiple workspaces.** Switch between workspaces from a dropdown in the title bar (or from Settings → Workspaces). Switching reloads the editor against the new workspace; the old workspace's last document is kept on disk and reopens when you switch back to it. Cross-window sync via a `workspace:active-changed` broadcast keeps the main and Settings windows in sync when one of them switches.
- **Settings → Workspaces panel** lists every known workspace with switch / reveal-in-Finder / forget actions. "Forget" only removes the entry from the known list; the folder on disk is never deleted.
- **Migration from 0.1.0 settings**: the old `settings.workspaceRoot` field is auto-migrated to the new active-workspace store on first launch of this version, so existing users land back where they left off.

### Added — Docs sidebar

- **Workspace docs sidebar**, on by default. The split view now has three panes: docs (left, ~18%), reader (middle), editor (right). The sidebar lists every document in the active workspace sorted by last modified, with the currently-open one highlighted. Toggle via the new sidebar icon in the title bar. Width is resizable; the visibility preference persists.
- Each row has a per-doc actions menu (⋯): **Rename**, **Reveal in Finder**, **Move to Trash**. "Move to Trash" routes through Electron's `shell.trashItem` so the doc folder lands in the system Trash where it can be restored.
- The "+" in the sidebar header creates a new doc folder (same flow as the title-bar New button).
- The store auto-refreshes on workspace switch and after any internal mutation (create / rename / trash). New docs that the user creates by simply starting to type — autosave silently materializing a folder — also surface in the list immediately.

### Changed — Document folders (carried over)

- **Folder-per-document model**. Every document now lives in its own folder under a configurable workspace root (default `~/Documents/ReadWrite/`). Inside each doc folder: `<name>.md` and `images/`. Move the folder anywhere — image links use relative paths and travel with the doc.
- **Autosave**. The editor saves the active document to disk a configurable amount of time after the last edit (default 1.5s). The first edit on a fresh app launch creates the doc folder lazily — no save dialog, no friction.
- **New / Open / Rename document** in the title bar. New creates a fresh doc folder named from the H1 (or "Untitled - timestamp"). Rename atomically renames both the folder and the .md inside; relative image refs keep working. The doc filename in the title bar is clickable and reveals the folder in Finder.
- **Save dialog gone**. Documents are always on disk; the explicit Save button has been retired. The dirty marker (`·`) flips to a checkmark (`✓`) once autosave finishes.
- **Per-tab Camera buttons removed**. The title-bar Crop button + ⇧⌘S is the single screenshot entry point. Snipped images now auto-insert into the editor as a relative path link, in addition to going to the clipboard.
- **Path transforms at the I/O boundary**. In-memory editor content carries `file://` image URLs (so the WYSIWYG view actually renders the images). On save, those are rewritten to relative paths so the on-disk markdown is portable. On load, relative paths are rewritten back to `file://` so the editor displays them. The transform lives in `src/renderer/src/lib/path-transform.ts`.

### Added — AI v2

- **Polish selection** and **Polish whole document** are now two distinct actions in the editor toolbar's AI menu (replacing the single context-sensitive button).
- **Interpret with prompt**: a dialog where you enter a custom prompt (e.g. "解读一下", "Translate to English", "Summarize in 3 bullets"), choose whether to act on the current selection or the whole document, run the AI, then choose where to drop the response — replace the selection, insert after the selection, or append to the document. Includes a few quick-prompt chips.
