---
title: Contributing
description: How this repo runs — branches, the plan workflow, releases, and where to file issues
---

# Contributing to refrakt

refrakt is a [monorepo on GitHub](https://github.com/refrakt-md/refrakt) using npm workspaces. Contributions are welcome — bug reports, feature suggestions, documentation fixes, and code. This page covers how the project runs so you know what to expect when you open an issue or a PR.

## Repository layout

```
packages/   — Core packages (types, runes, transform, lumina, content, svelte, ...)
plugins/    — Official plugins (marketing, docs, design, learning, ...)
plan/       — Project planning content (specs, work items, decisions, milestones)
site/       — Documentation site (this site, built with SvelteKit)
```

See the root [`CLAUDE.md`](https://github.com/refrakt-md/refrakt/blob/main/CLAUDE.md) for the canonical architecture overview, build order, and convention notes.

## Build and test

```bash
npm install
npm run build    # builds all packages in dependency order
npm test         # runs the full vitest suite
```

Build order matters — types and transform must build before runes; runes must build before the official plugins; plugins must build before lumina/sveltekit; and so on. The root `package.json` `build` script encodes the canonical sequence.

## Branch and PR flow

- **Branch from `main`** for any change. Use `feat/`, `fix/`, `docs/`, or `chore/` prefixes (or `claude/...` if Claude Code is driving the work).
- **One concern per PR.** Smaller diffs review faster.
- **Tests** — add tests for new functionality. Bug fixes should add a test that fails on `main` and passes with the fix.
- **Changesets** — for anything user-visible, run `npx changeset` to add a changeset describing the change. Maintainers handle the version bump and release.
- **Conventions** — see `CLAUDE.md` for code conventions (rune output contract, BEM naming, engine config patterns).

## The plan workflow

This project uses its own [`@refrakt-md/plan`](/runes/plan) plugin to track work. Specs, work items, decisions, and milestones all live in the `plan/` directory as Markdoc files.

If you're picking up a non-trivial change, the canonical entry points are:

```bash
npx refrakt plan next                # find the next ready work item
npx refrakt plan update <id> \
  --status in-progress               # claim it
npx refrakt plan update <id> \
  --check "criterion text"           # check off acceptance criteria as you go
npx refrakt plan update <id> \
  --status done --resolve "summary"  # close it out with a resolution note
```

You don't need to file a plan item for small fixes (typos, doc cleanups, single-file bug fixes). For larger work, filing the plan item up front makes review easier — reviewers can see the acceptance criteria and the rationale.

## Releases

See [`RELEASING.md`](https://github.com/refrakt-md/refrakt/blob/main/RELEASING.md) for the full release process. The short version: maintainers run `npm run version-packages` to consume open changesets, then `npm run release` to publish. All `@refrakt-md/*` packages and `create-refrakt` are versioned together (Changesets fixed mode).

## Reporting issues

- **Bug reports** — [open an issue](https://github.com/refrakt-md/refrakt/issues/new) with a minimal reproduction. The `refrakt inspect <rune>` output is often useful context for identity-transform bugs.
- **Feature requests** — open an issue describing the use case before the implementation, so the design can be discussed before code review.
- **Security issues** — see [Security](/extend/security) for the threat model. Email security disclosures privately rather than opening a public issue.

## Related

- [`/plan`](/plan) — Live project planning view. Specs, milestones, and in-flight work items.
- [Roadmap](https://plan.refrakt.md/refrakt-md/refrakt) — Higher-level milestone view.
- [Changelog](/releases) — Released changes by version.
