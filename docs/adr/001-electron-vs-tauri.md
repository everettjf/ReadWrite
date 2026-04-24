# ADR-001: Use Electron, not Tauri, for the ReadWrite shell

- Status: Accepted
- Date: 2026-04-24
- Deciders: everettjf

## Context

ReadWrite is a cross-platform desktop app whose **core value proposition is reading arbitrary content** — web pages (many of which set `X-Frame-Options: DENY`), GitHub, PDFs, EPUBs, local code — next to a Markdown editor. The web embed isn't optional; if a user can't open GitHub or their company's docs, the product fails at its main job.

The two realistic choices in 2026 are **Electron** (bundle Chromium + Node) and **Tauri** (use the OS-native WebView, a small Rust host).

We evaluated both.

## Decision

Use **Electron**. Specifically, Electron 30+ with `WebContentsView` for reader tabs, contextBridge for IPC, and `better-sqlite3` for local persistence.

## Rationale

1. **Web reader fidelity.** Tauri's WebView maps to WKWebView (macOS), WebView2 (Windows), and WebKitGTK (Linux). That's three different engines with three different bugs. For a reader, we need:
   - Correct rendering of GitHub / Notion / any SPA that sets CSP or X-Frame-Options.
   - Stable `capturePage()` semantics for the screenshot-to-Markdown flow.
   - A multi-tab architecture where tabs are real navigable web contents with cookies and sessions.

   Electron's `WebContentsView` gives us exactly that, consistently across platforms. Tauri requires us to build the same story on top of three engines with three workarounds.

2. **No iframe fallback.** We explicitly **cannot** use `<iframe>`, because many target sites (GitHub being a canonical example) set `X-Frame-Options: DENY`. Both Electron's `<webview>` tag (deprecated) and `WebContentsView` bypass that restriction because they are OS-level child windows, not subframes. Tauri has no equivalent of `WebContentsView`; its closest story is multi-window, which breaks the side-by-side UX.

3. **Node ecosystem access for free.** `better-sqlite3`, `chokidar`, `epubjs`, `pdfjs-dist`, `monaco-editor` — the entire toolchain we need already runs on Node and in the browser. Electron lets us use all of them without wrapping anything in a Rust shim.

4. **Team velocity.** One of us is paid to ship, not to learn Rust. The incremental cost of Electron's larger binary size (~100 MB vs ~10 MB) is acceptable for a productivity tool users install once and keep open.

5. **Boilerplate and tooling maturity.** `electron-vite`, `electron-builder`, `@electron-toolkit/*`, Husky integration, DevTools, crash reporting — all of this is mature and well-documented for Electron. Tauri's equivalents exist but are younger and less battle-tested.

## Consequences

### Positive

- The reader Just Works across macOS / Windows / Linux without per-platform engine bugs.
- We can ship new reader types (e.g. "open any URL in an auth'd browser session") with zero extra infrastructure.
- Recruiting contributors is easier — TypeScript + Node is a larger pond than Rust + Tauri.

### Negative

- Distributable size: installers will be ~80–120 MB. Documented and accepted.
- Memory footprint: each reader tab runs a full Chromium process tree. We mitigate with a single shared window process and lazy tab creation.
- We pay the cost of shipping Chromium updates (security + rendering). Mitigated by Electron's predictable release cadence.

## Revisit criteria

We would revisit this decision if:

- Tauri ships a first-class, cross-platform, `WebContentsView`-equivalent primitive that can host arbitrary cookies + sessions with consistent capture semantics.
- Our user base becomes size-sensitive (e.g. a mobile companion app that can't afford 100 MB).
- A critical security issue in Chromium embedding forces a shift in the industry.

None of these are true today.
