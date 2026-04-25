<div align="center">
  <img src="build/icon.png" alt="ReadWrite" width="128" height="128" />
  <h1>ReadWrite</h1>
  <p><em>Read anything. Write anywhere.</em></p>
  <p>
    <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
    <img alt="Platforms" src="https://img.shields.io/badge/platforms-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey">
    <img alt="Status" src="https://img.shields.io/badge/status-pre--alpha-orange">
    <a href="https://github.com/everettjf/ReadWrite/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/everettjf/ReadWrite/actions/workflows/ci.yml/badge.svg"></a>
  </p>
</div>

ReadWrite is a cross-platform desktop app that puts a **reader** and a **Markdown editor** side-by-side. Read a paper, GitHub repo, PDF, or EPUB on the left; write notes — with a working WYSIWYG editor, screenshot-to-clipboard, AI polish, and one-click export to your blog or 微信公众号 — on the right. No tab-switching, no Cmd+V dance.

---

## What it does

**Read** — multi-tab reader for the left pane:

- Any URL or GitHub repo (`owner/repo` shorthand) via Electron's `WebContentsView` — so cookies, CSP, and sites that set `X-Frame-Options` (which is _everyone_ logged-in) just work, unlike iframes.
- PDF via `pdfjs-dist` with page nav and zoom.
- EPUB via `epubjs` + `react-reader`, with location persisted per tab.
- Local code folder via Monaco (read-only) + a `chokidar`-driven file tree that hot-refreshes on disk changes.

**Write** — Milkdown editor on the right:

- WYSIWYG mode (Milkdown 7.x, GFM, history, slash commands) with a one-click toggle to a full **CodeMirror 6 source mode** that shares the same buffer.
- Live editor font / family / max-width controlled by CSS variables driven from settings.
- Pasting any image (from anywhere — system clipboard, snip tool, drag-drop) auto-saves it to `images/` next to the markdown file and inserts a relative-path link.

**Capture** — get content from reader to editor in one motion:

- **Full-pane screenshot** — camera button on each reader toolbar grabs the whole tab.
- **Region snip** — title-bar ✂️ button (or `⇧⌘S` / `Ctrl+Shift+S`). Freezes the reader pane, lets you drag a rectangle, copies the cropped PNG to the clipboard _and_ saves it to disk. For web tabs the native `WebContentsView` is briefly hidden so a renderer-side overlay can be drawn — see [docs/adr/001-electron-vs-tauri.md](docs/adr/001-electron-vs-tauri.md) for why this matters.

**AI**:

- Configurable OpenAI-compatible endpoint (works with OpenAI, DeepSeek, Moonshot, Azure OpenAI, local Ollama, …).
- ✨ Polish action in the editor: with a selection, polishes the selection in place; without, polishes the whole doc.
- Connection test in Settings → AI verifies endpoint + key + model with a real chat-completions call.
- API key stays in the main process; renderer never sees the network request.

**Publish**:

- **Copy to WeChat 公众号** in the editor toolbar. Renders the document with per-element inline `style="..."` attributes (no `<style>` tag — WeChat strips them) and base64-embeds local images. Three themes ship: Default (sans, comfortable), Serif (long-form), Compact. Approach modeled on [Spute/obsidian-copy-to-mp](https://github.com/Spute/obsidian-copy-to-mp).
- **Copy as inlined HTML** for generic targets like email or Notion.

**Settings**:

- Standalone settings window (separate `BrowserWindow`) with sidebar panels: General · Editor · Images · AI · WeChat · About.
- Cross-window sync — change a value here and the main window updates live.

---

## Quick start

```bash
git clone https://github.com/everettjf/ReadWrite.git
cd ReadWrite
pnpm install         # auto-rebuilds better-sqlite3 against Electron's Node ABI
pnpm dev             # main + preload + renderer with HMR
```

Requires **Node ≥ 20** and **pnpm ≥ 9**. If you ever see a `NODE_MODULE_VERSION` mismatch, run `pnpm run rebuild:native` (note the explicit `run` — `pnpm rebuild` is a different built-in command and won't fix it).

## Build distributables

```bash
pnpm dist:mac        # .dmg for macOS (x64 + arm64)
pnpm dist:win        # NSIS installer
pnpm dist:linux      # AppImage + .deb
```

Output lands in `release/<version>/`.

---

## Architecture (in one minute)

| Process  | Responsibility                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| Main     | Window lifecycle, `WebContentsView` tab manager, IPC, SQLite persistence, file watchers, AI and WeChat fetch. |
| Preload  | Typed `contextBridge` exposing `window.api.*` to the renderer.                                                |
| Renderer | React 18 + Tailwind + shadcn/ui. Reader pane (4 tab kinds), Milkdown / CodeMirror editor, Settings window.    |

The non-obvious load-bearing decisions — **Electron over Tauri**, **`WebContentsView` over iframe / `<webview>`**, **screenshot via capture-then-overlay**, **per-element inline styles for the WeChat exporter** — all live in [docs/adr/001-electron-vs-tauri.md](docs/adr/001-electron-vs-tauri.md). Read it before opening a "why don't we just use \_\_\_" issue.

IPC channels are declared once in [`src/shared/ipc-channels.ts`](src/shared/ipc-channels.ts); the preload surface is fully typed so `window.api.foo()` calls are end-to-end strongly typed.

---

## Project layout

```
src/
├── main/                       # Electron main process
│   ├── index.ts                # entry / lifecycle
│   ├── window.ts               # main + settings BrowserWindow factories
│   ├── tabs.ts                 # WebContentsView tab manager
│   ├── db/                     # better-sqlite3 (kv_store, recent_docs)
│   ├── ipc/                    # reader / fs / screenshot / settings / ai / wechat handlers
│   └── watchers/               # chokidar file watcher hub
├── preload/index.ts            # contextBridge api surface
├── renderer/
│   ├── index.html
│   └── src/
│       ├── App.tsx             # main window root
│       ├── SettingsApp.tsx     # settings window root (loaded at #/settings)
│       ├── components/
│       │   ├── layout/         # SplitView, TitleBar
│       │   ├── reader/         # WebReader, PdfReader, EpubReaderView, CodeReader, TabBar
│       │   ├── editor/         # MilkdownEditor, SourceEditor, EditorPane
│       │   ├── settings/       # General/Editor/Images/AI/WeChat/About panels
│       │   ├── snip/           # full-window region-snip overlay
│       │   └── ui/             # shadcn primitives (button, dialog, select, switch, …)
│       ├── stores/             # zustand: tabs, editor, settings
│       └── lib/                # utils, ipc, screenshot, snip, wechat-html, wechat-themes
└── shared/                     # types + IPC channel names shared across processes
```

---

## Tech stack

- **Shell**: Electron 33+, electron-vite, electron-builder
- **UI**: React 18, Tailwind 3, shadcn/ui (Radix primitives), lucide-react, react-resizable-panels
- **Editor**: Milkdown 7.x (commonmark, gfm, history, listener, clipboard, upload), CodeMirror 6
- **Reader**: pdfjs-dist, epubjs + react-reader, Monaco, Electron WebContentsView
- **Data**: better-sqlite3 (settings, sessions, recents), chokidar (file watching), Zustand (state), TanStack Query
- **Tooling**: TypeScript strict, ESLint, Prettier, Husky, lint-staged, commitlint (Conventional Commits), Vitest

---

## Roadmap

Tracked in [CHANGELOG.md](CHANGELOG.md). Short-term items I'm working on:

- [ ] Direct publish to WeChat 公众号 drafts (credentials are wired, the upload + create-draft flow is the missing piece).
- [ ] More AI actions: continue, translate, summarize-into-frontmatter, slash commands.
- [ ] Snip rectangle: drag handles for post-release adjustment.
- [ ] Tab session restore across launches.
- [ ] API keys behind `keytar` instead of plaintext SQLite.

---

## Contributing

PRs welcome. The basics:

- Branch off `main`. Use [Conventional Commits](https://www.conventionalcommits.org/).
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` must all pass; CI runs them on every PR.
- For non-trivial changes, open an issue first so we can agree on direction.

Full guide: [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Acknowledgements

- The "Copy to WeChat 公众号" pipeline — particularly the per-element inline-styles approach and the `<li>`-children-wrapped-in-`<p>` quirk — was directly modeled on [Spute/obsidian-copy-to-mp](https://github.com/Spute/obsidian-copy-to-mp). Different runtime, same set of WeChat-editor pain points.
- [Milkdown](https://milkdown.dev/) for the WYSIWYG core, [CodeMirror](https://codemirror.net/) for the source mode, [pdfjs-dist](https://github.com/mozilla/pdf.js) for PDFs, [epubjs](https://github.com/futurepress/epub.js) for EPUBs.
- [shadcn/ui](https://ui.shadcn.com/) and [Radix UI](https://www.radix-ui.com/) for accessible primitives that don't need a 200KB component library to look good.

---

## License

[MIT](LICENSE) © everettjf
