# Development & release

How to build, package, and release ReadWrite. End-user docs live in
the [README](../README.md); contributor norms (commits, PRs, code
style) live in [CONTRIBUTING.md](../CONTRIBUTING.md). This file is
the operations side: shell commands, CI behavior, signing notes.

---

## Local development

```bash
git clone https://github.com/everettjf/ReadWrite.git
cd ReadWrite
pnpm install            # auto-rebuilds better-sqlite3 against Electron's Node ABI
pnpm dev                # main + preload + renderer with HMR
```

Requires **Node ≥ 20** and **pnpm ≥ 9**.

If you ever see a `NODE_MODULE_VERSION` mismatch, run:

```bash
pnpm run rebuild:native
```

The explicit `run` matters — `pnpm rebuild` is a different built-in
command and won't fix it.

### Quality gate

The same set CI runs on every PR:

```bash
pnpm typecheck          # tsc --noEmit on node + web projects
pnpm lint               # eslint --cache
pnpm test               # vitest (unit)
pnpm build              # electron-vite build (smoke)
```

There's also a manual black-box test plan in
[`docs/testing.md`](./testing.md) — run it before tagging a release
on macOS to catch regressions a unit test can't see.

---

## Building distributables

For the current host platform:

```bash
./deploy.sh                  # typecheck + lint + test + dist for the host
```

The `deploy.sh` wrapper runs the quality gate and picks the right
target for your OS. To skip the checks (when you've already verified
elsewhere), set `SKIP_CHECKS=1`.

Or invoke `electron-builder` directly:

```bash
pnpm dist:mac                # .dmg (x64 + arm64) — must run on macOS
pnpm dist:win                # NSIS installer    — best on Windows (cross-builds need Wine)
pnpm dist:linux              # AppImage + .deb   — must run on Linux
```

Output lands in `release/<version>/`.

### macOS specifics

If you have a Developer ID certificate in the system keychain,
electron-builder picks it up automatically and signs the .app and
.dmg. **Notarization is disabled** by default
(`electron-builder.yml: notarize: false`), which means:

- The DMG is signed → users see the Apple identity, not "unidentified
  developer".
- It's not notarized → first launch still gets a Gatekeeper prompt.
  Right-click → Open once to trust.

To enable real notarization, flip `notarize: true` and supply
`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` via
environment variables.

### Windows specifics

NSIS installer is unsigned by default. Users see a SmartScreen warning
on first run. Authenticode signing requires a code-signing certificate
(EV recommended for instant SmartScreen reputation) and `CSC_LINK` /
`CSC_KEY_PASSWORD` env vars.

### Linux specifics

AppImage and .deb both build natively. No signing concerns.

---

## Cutting a release

1.  **Bump the version** without creating a tag (the deploy script does
    that):

    ```bash
    pnpm version <version> --no-git-tag-version
    ```

2.  **Update CHANGELOG.md** — move accumulated `## [Unreleased]` entries
    into a new `## [<version>] — YYYY-MM-DD` block. Leave `Unreleased`
    empty.

3.  **Commit + push** the bump:

    ```bash
    git add package.json CHANGELOG.md
    git commit -m "chore: cut v<version>"
    git push
    ```

4.  **Tag + push to trigger CI**:

    ```bash
    ./deploy.sh release <version>
    ```

    The script verifies `package.json` matches the requested version,
    refuses to run on a dirty tree, refuses an existing tag, then
    creates an annotated `v<version>` tag and pushes it.

5.  **GitHub Actions takes over**. The `release.yml` workflow runs the
    matrix on macos-latest / ubuntu-latest / windows-latest, builds
    .dmg / .exe / .AppImage / .deb, and uploads everything to a new
    GitHub Release at:

        https://github.com/everettjf/ReadWrite/releases/tag/v<version>

    Release notes are auto-extracted from the matching
    `## [<version>]` block in `CHANGELOG.md`.

    Track progress at <https://github.com/everettjf/ReadWrite/actions>.
    Typical wall-clock: 5–10 minutes.

### Manual upload (skip CI)

If you've already built artifacts locally and want to publish them
directly without the CI matrix:

```bash
gh release create v<version> \
  release/<version>/ReadWrite-<version>-arm64.dmg \
  release/<version>/ReadWrite-<version>-x64.dmg \
  --title "v<version>" \
  --notes "See CHANGELOG.md for details."
```

This is fine for macOS-only experimentation but loses the win/linux
artifacts the CI matrix would have built.

---

## Troubleshooting

### `electron-builder` says "Cannot find module"

After dependency changes, the Electron native modules can drift:

```bash
pnpm run rebuild:native
```

### Build hangs at "downloading electron"

First-time builds download ~200 MB of Electron binaries
(per-arch + per-platform). Subsequent builds use the cache at
`~/Library/Caches/electron/` (macOS) or platform equivalent.

### `pnpm dist:win` from macOS / Linux fails

Cross-compiling Windows installers requires Wine:

```bash
# macOS
brew install --cask --no-quarantine wine-stable

# Linux
sudo apt install wine
```

Or just push a tag and let CI build it natively on a Windows runner.

### Native module rebuild loop on `pnpm install`

We pin `electron-builder install-app-deps` as a `postinstall` script.
If it's looping, delete `node_modules/` and re-install fresh. Don't
mix npm and pnpm in the same checkout.
