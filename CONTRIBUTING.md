# Contributing to ReadWrite

Thanks for taking the time to improve ReadWrite. This document describes how the project is run day-to-day so your change can land smoothly.

## Ground rules

- Be kind. Assume good intent. We review code, not people.
- Keep diffs focused. One PR = one change.
- Write code that reads well six months from now. Add comments only when the _why_ is non-obvious.
- If your change is large, **open an issue first** so we can agree on direction before you spend time.

## Development setup

Requirements: Node ≥ 20, pnpm ≥ 9, native build toolchain for `better-sqlite3`.

```bash
pnpm install
pnpm dev
```

For a one-shot smoke test of the build pipeline:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Branching & commits

- Branch off `main`. Name branches `<type>/<short-slug>` (e.g. `feat/split-view-resize`, `fix/milkdown-cursor-jump`).
- Commits follow **[Conventional Commits](https://www.conventionalcommits.org/)**. Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
  - `feat: add EPUB progress persistence`
  - `fix(reader): debounce bounds sync to avoid flicker`
- The commit-msg hook (via husky + commitlint) enforces this. Don't bypass it.

## Code style

- TypeScript `strict: true` across all three processes. No `any` without a `// eslint-disable` reason.
- Prettier and ESLint are run via `lint-staged` on every `git commit` — don't skip hooks.
- Prefer type imports (`import type { ... }`). The ESLint rule will nudge you.

## Opening a PR

1. Push your branch and open a PR against `main`.
2. Describe the change, the motivation, and how you tested it.
3. All CI jobs must be green: `typecheck`, `lint`, `test`, and the cross-platform build.
4. Keep the PR small if you can; large PRs are harder to review and easier to get wrong.

## Adding a dependency

We ship to users' machines, so every dependency is weight. Before adding one:

- Does the standard library or an existing dep already cover this?
- Is the package still maintained?
- Does it pull in heavy transitive deps?

If the answer to any of those is uncomfortable, ask in the issue before adding it.

## Reporting bugs

Use the issue tracker. Include:

- Platform + version (`macOS 15.2`, `Windows 11 24H2`, etc.)
- Reproduction steps
- Expected vs actual behavior
- Logs from DevTools (`View → Toggle Developer Tools` while in dev mode)

## Security

Please **do not** file public issues for security reports. Email the maintainer directly.
