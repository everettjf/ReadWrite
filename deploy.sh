#!/usr/bin/env bash
# deploy.sh — build / package / release helper for ReadWrite
#
# Usage:
#   ./deploy.sh                          Build for the current host platform
#   ./deploy.sh mac                      Build a macOS .dmg (must run on macOS)
#   ./deploy.sh win                      Build a Windows installer (cross-builds via Wine on mac/linux if available)
#   ./deploy.sh linux                    Build Linux AppImage + .deb (must run on Linux)
#   ./deploy.sh all                      Build everything for the current host (cross-platform if tooling is present)
#   ./deploy.sh release <version>        Tag + push to trigger the GitHub Actions release workflow
#                                        Builds mac/win/linux on the matrix and uploads to a GitHub Release
#
# Env:
#   SKIP_CHECKS=1                        Skip typecheck/lint/test before packaging

set -euo pipefail

cd "$(dirname "$0")"

usage() {
  sed -n '/^# Usage:/,/^# Env:/p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

run_checks() {
  if [ "${SKIP_CHECKS:-0}" = "1" ]; then
    echo "==> Skipping checks (SKIP_CHECKS=1)"
    return
  fi
  echo "==> typecheck"
  pnpm typecheck
  echo "==> lint"
  pnpm lint
  echo "==> test"
  pnpm test
}

ensure_pnpm_install() {
  if [ ! -d node_modules ]; then
    echo "==> pnpm install"
    pnpm install --frozen-lockfile
  fi
}

build_mac() {
  if [ "$(uname)" != "Darwin" ]; then
    echo "ERROR: Building macOS distributables requires running on macOS." >&2
    exit 1
  fi
  pnpm dist:mac
}

build_win() {
  if [ "$(uname)" = "Linux" ] || [ "$(uname)" = "Darwin" ]; then
    if ! command -v wine >/dev/null 2>&1; then
      cat >&2 <<'EOF'
ERROR: Building Windows installers from macOS / Linux requires Wine.
       Install via:
         macOS:  brew install --cask --no-quarantine wine-stable
         Linux:  apt install wine
       Or use:   ./deploy.sh release <version>
                 — that triggers a GitHub Actions matrix that builds
                 mac/win/linux natively on cloud runners.
EOF
      exit 1
    fi
  fi
  pnpm dist:win
}

build_linux() {
  if [ "$(uname)" != "Linux" ]; then
    echo "WARNING: Building Linux distributables natively works best on Linux." >&2
    echo "         Falling through to electron-builder (will use the host's tools)." >&2
  fi
  pnpm dist:linux
}

build_current() {
  case "$(uname)" in
    Darwin)  build_mac ;;
    Linux)   build_linux ;;
    *)       echo "Unsupported host: $(uname)"; exit 1 ;;
  esac
}

build_all() {
  case "$(uname)" in
    Darwin)
      build_mac
      build_win  # requires Wine; deploy.sh will tell the user if missing
      ;;
    Linux)
      build_linux
      build_win
      ;;
    *)
      echo "Use ./deploy.sh release <version> for cross-platform builds via CI." >&2
      exit 1
      ;;
  esac
}

release_tag() {
  local version="${1:-}"
  if [ -z "$version" ]; then
    echo "ERROR: Pass a version, e.g. ./deploy.sh release 0.1.0" >&2
    exit 1
  fi
  if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.-]+)?$ ]]; then
    echo "ERROR: Version must look like 0.1.0 or 0.1.0-rc.1" >&2
    exit 1
  fi

  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "ERROR: Working tree is dirty. Commit or stash before tagging." >&2
    exit 1
  fi

  local tag="v${version}"
  if git rev-parse "$tag" >/dev/null 2>&1; then
    echo "ERROR: Tag $tag already exists." >&2
    exit 1
  fi

  echo "==> Verifying package.json version matches"
  local pkg_version
  pkg_version=$(node -p "require('./package.json').version")
  if [ "$pkg_version" != "$version" ]; then
    echo "ERROR: package.json says \"$pkg_version\" but you asked for \"$version\"."
    echo "       Bump it with:  pnpm version $version --no-git-tag-version"
    exit 1
  fi

  echo "==> Creating tag $tag and pushing"
  git tag -a "$tag" -m "Release $version"
  git push origin "$tag"

  cat <<EOF

Tagged $tag and pushed. The GitHub Actions release workflow will:
  1. Build .dmg on macos-latest
  2. Build NSIS installer on windows-latest
  3. Build AppImage + .deb on ubuntu-latest
  4. Upload all artifacts to a new GitHub Release at:
     https://github.com/everettjf/ReadWrite/releases/tag/$tag

Track progress:
  https://github.com/everettjf/ReadWrite/actions
EOF
}

main() {
  local cmd="${1:-current}"
  shift || true

  case "$cmd" in
    -h|--help|help)
      usage 0
      ;;
    current)
      ensure_pnpm_install
      run_checks
      build_current
      ;;
    mac)
      ensure_pnpm_install
      run_checks
      build_mac
      ;;
    win|windows)
      ensure_pnpm_install
      run_checks
      build_win
      ;;
    linux)
      ensure_pnpm_install
      run_checks
      build_linux
      ;;
    all)
      ensure_pnpm_install
      run_checks
      build_all
      ;;
    release)
      release_tag "$@"
      ;;
    *)
      echo "ERROR: Unknown command: $cmd" >&2
      usage 1
      ;;
  esac
}

main "$@"
