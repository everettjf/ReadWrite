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
