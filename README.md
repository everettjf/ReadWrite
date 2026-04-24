# ReadWrite

> _Read anything. Write anywhere._

A cross-platform desktop app that puts a **reader** and a **Markdown editor** side-by-side, so the gap between consuming and producing knowledge collapses to one window.

<p align="center">
  <img src="build/icon.png" alt="ReadWrite" width="180" height="180" />
</p>

- **Left pane:** multi-tab reader for the web, GitHub, PDFs, EPUBs, and local code folders.
- **Right pane:** a Milkdown-powered WYSIWYG Markdown editor with a first-class source mode (CodeMirror 6).
- **Workflow glue:** one-tap capture the reader view, auto-insert as an image into the editor.

Built with Electron + TypeScript + React + Tailwind + shadcn/ui. Licensed under the MIT License.

---

## Status

Pre-alpha (`0.1.0`). The structure, builds, and primary flows are in place; polish, offline docs, and release automation are ongoing.

Platforms: macOS, Windows, Linux.

---

## Features

| Pane          | What you can do                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------- |
| Reader (web)  | Open any URL; GitHub shorthand (`owner/repo`); real Chromium via `WebContentsView` (no iframe). |
| Reader (PDF)  | Page-by-page rendering via `pdfjs-dist`, zoom, jump-to-page.                                    |
| Reader (EPUB) | Paginated reading via `epubjs` + `react-reader`, location persisted per tab.                    |
| Reader (code) | File tree + Monaco (read-only) for local folders; hot refresh via `chokidar`.                   |
| Editor        | Milkdown WYSIWYG with GFM; one-click toggle to full CodeMirror 6 source mode.                   |
| Screenshot    | Camera button on each reader toolbar → PNG saved + inlined as Markdown image.                   |
| Tabs          | URL/Folder/PDF/EPUB can coexist; sidebars and tab state persist across runs.                    |
| Themes        | Light / dark / system, controlled from the title bar cog menu.                                  |

---

## Quick start

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm i -g pnpm`)
- Platform-native build tools for `better-sqlite3`:
  - macOS: Xcode command-line tools (`xcode-select --install`)
  - Linux: `build-essential`
  - Windows: the Visual Studio C++ build tools

### Develop

```bash
pnpm install          # installs deps + auto-runs electron-builder install-app-deps
                      # (rebuilds better-sqlite3 against Electron's Node ABI)
pnpm dev              # electron-vite dev: main + preload + renderer with HMR
```

The app hot-reloads the renderer on every save, and rebuilds the main / preload on changes.

If you ever see `NODE_MODULE_VERSION` mismatches at startup (system Node and Electron's Node ABI drifted apart), force a rebuild:

```bash
pnpm run rebuild:native
```

Don't run `pnpm rebuild` — that's pnpm's built-in command which uses system Node and won't fix the issue. Always use `pnpm run rebuild:native` (with explicit `run`).

### Build (production bundle only)

```bash
pnpm build            # outputs to out/
pnpm preview          # runs the built app
```

### Package (distributable installers)

```bash
pnpm dist:mac         # .dmg for macOS (x64 + arm64)
pnpm dist:win         # NSIS installer for Windows
pnpm dist:linux       # AppImage + .deb
pnpm dist             # current host platform
```

Output lands in `release/<version>/`.

### Testing & quality gates

```bash
pnpm typecheck        # strict TypeScript check for main+preload+renderer
pnpm lint             # ESLint (strict, no warnings tolerated)
pnpm test             # Vitest (shared types + renderer lib helpers)
pnpm format           # Prettier write
```

Husky enforces ESLint+Prettier on staged files and commitlint (Conventional Commits) on messages.

---

## Architecture

### Process layout

| Process  | Responsibility                                                                         |
| -------- | -------------------------------------------------------------------------------------- |
| Main     | Window lifecycle, `WebContentsView`-backed tabs, filesystem IO, SQLite, file watchers. |
| Preload  | Thin `contextBridge` surface exposing an `electron` + `api` namespace to the renderer. |
| Renderer | React 18 UI: split view, reader pane with four tab kinds, Milkdown editor pane.        |

All IPC channels are declared in [`src/shared/ipc-channels.ts`](src/shared/ipc-channels.ts); shared domain types live in [`src/shared/types.ts`](src/shared/types.ts). The preload surface is typed, so `window.api.*` calls are strongly typed end-to-end.

### Why `WebContentsView` and not `<webview>` / `<iframe>`?

- `<iframe>` can't load anything that sets `X-Frame-Options: DENY|SAMEORIGIN` (e.g. GitHub, most logged-in sites).
- `<webview>` is [deprecated](https://www.electronjs.org/docs/latest/api/webview-tag#warning) and brittle.
- `WebContentsView` (successor to `BrowserView`) is a first-class native child window that sits _on top_ of the renderer window.

Positioning is handled on the renderer side: each `WebReader` component reports its host div's bounding rect to the main process, which updates the view's bounds every animation frame. See [`src/renderer/src/components/reader/WebReader.tsx`](src/renderer/src/components/reader/WebReader.tsx) and [`src/main/tabs.ts`](src/main/tabs.ts).

### Screenshots

- **Web/GitHub tabs:** captured in main (`WebContents.capturePage()`) because the native view lives outside the renderer DOM.
- **PDF / EPUB / Code tabs:** captured in renderer with `html-to-image`, since the content lives in normal DOM.

Both paths converge on the same "insert image at cursor in Milkdown" helper.

### Persistence

- `better-sqlite3` in `app.getPath('userData')/readwrite.sqlite` stores app settings, recent sources, and the last session.
- Editor content is explicit-save (no autosave by default) — unsaved changes are guarded with a `beforeunload` prompt.

---

## Project layout

```
src/
├── main/                     # Electron main process
│   ├── index.ts              # entry / lifecycle
│   ├── window.ts             # BrowserWindow
│   ├── tabs.ts               # WebContentsView tab manager
│   ├── db/                   # better-sqlite3
│   ├── ipc/                  # IPC handlers (reader / fs / screenshot / settings)
│   └── watchers/             # chokidar file watcher hub
├── preload/
│   └── index.ts              # contextBridge API surface
├── renderer/
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── components/       # layout / reader / editor / ui (shadcn)
│       ├── stores/           # zustand: tabs / editor / settings
│       ├── lib/              # utils, ipc helpers, screenshot bridge
│       └── index.css         # Tailwind + shadcn tokens
└── shared/                   # types + IPC channel names shared across processes
```

---

## Documentation

- [ADR-001: Electron over Tauri](docs/adr/001-electron-vs-tauri.md)
- [Contributing](CONTRIBUTING.md)

---

## License

[MIT](LICENSE) © everettjf
