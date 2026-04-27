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

One command, end-to-end:

```bash
./deploy.sh release           # auto-bump patch (0.1.0 → 0.1.1)
./deploy.sh release patch     # same — explicit
./deploy.sh release minor     # 0.1.0 → 0.2.0
./deploy.sh release major     # 0.1.0 → 1.0.0
./deploy.sh release 0.1.0     # explicit version (passing the current package.json
                              #   version is fine too — publishes the current state
                              #   as that version without re-bumping or re-writing
                              #   the CHANGELOG entry that already exists)
```

What happens, in order:

1. Resolves the target version (auto-bump from `package.json` or uses
   the explicit one you passed).
2. Refuses if the working tree is dirty, the target tag already
   exists, or there are no commits since the last tag.
3. Prints a plan (version, tag, commits since last tag) and prompts
   `Continue? [y/N]`. Skip the prompt with `YES=1 ./deploy.sh release`.
4. Runs the quality gate (`pnpm typecheck && pnpm lint && pnpm test &&
pnpm build`). Skip with `SKIP_CHECKS=1`.
5. Bumps `package.json` via `pnpm version --no-git-tag-version`.
6. Generates a `## [<version>] — YYYY-MM-DD` block in `CHANGELOG.md`
   from `git log <last-tag>..HEAD`, grouped by Conventional Commits
   type (`feat` → Added, `fix` → Fixed, `refactor`/`perf` → Changed;
   the rest is omitted). Inserts it right after `## [Unreleased]`.
   Implementation: [`scripts/cut-changelog.mjs`](../scripts/cut-changelog.mjs).
7. `git commit` (`chore: cut v<version>`) + `git push`.
8. Creates an annotated `v<version>` tag and pushes it.
9. GitHub Actions matrix kicks off (`.github/workflows/release.yml`):
   - `macos-latest` → `.dmg`
   - `windows-latest` → NSIS installer
   - `ubuntu-latest` → AppImage + `.deb`
   - Uploads all artifacts to a new GitHub Release at
     `https://github.com/everettjf/ReadWrite/releases/tag/v<version>`.

Release notes on the GitHub Release page come from the matching
`## [<version>]` block in `CHANGELOG.md`. Typical wall-clock: 5–10
minutes from the moment you pushed.

Track CI progress at <https://github.com/everettjf/ReadWrite/actions>.

### When the auto-changelog isn't enough

The generated section is conservative — only `feat` / `fix` /
`refactor` / `perf` commits land in it. If you want richer prose
(highlights paragraph, folding related entries, marketing copy),
edit `CHANGELOG.md` after the script runs but before pushing the
tag. Quickest path: pass an unknown bump arg first to dry-run the
checks, then do the cut manually:

```bash
pnpm version <version> --no-git-tag-version
node scripts/cut-changelog.mjs <version>
# edit CHANGELOG.md by hand
git add package.json CHANGELOG.md
git commit -m "chore: cut v<version>"
git push
git tag -a v<version> -m "Release <version>"
git push origin v<version>
```

For most releases the auto-generated content is fine — Conventional
Commits + decent commit subjects do most of the work.

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
