# @refrakt-md/plan

## 0.10.0

### Minor Changes

- Adopt `{ID}-{slug}.md` as the canonical filename for plan items. `refrakt plan create` now emits e.g. `WORK-058-my-task.md` instead of `my-task.md` for every auto-ID type (work, bug, spec, decision). Milestones still use their semver names (`v1.0.0.md`).

  New command: `refrakt plan migrate filenames` renames legacy slug-only files in existing projects. Use `--apply --git` to apply with `git mv`.

  `refrakt plan validate` now emits `filename-missing-id` / `filename-id-mismatch` warnings when a file's name doesn't match its frontmatter `id`.

### Patch Changes

- `refrakt plan init` no longer scaffolds the root `index.md`, type-level `index.md` pages, or status filter pages. The plan site synthesises these dynamically.

## 0.9.9

### Patch Changes

- bcc1335: Expand `refrakt plan init` to fully wire the host project for agent use:

  - **AGENTS.md is now canonical** — full workflow content lives in `AGENTS.md` at the project root; tool-specific files (`CLAUDE.md`, `.cursorrules`, etc.) get one-line pointers to it.
  - **Host `package.json` wiring** — adds `@refrakt-md/cli` + `@refrakt-md/plan` to `devDependencies` (pinned to the running plan version) and `"plan": "refrakt plan"` to `scripts`. Walks up to find the install root (respects npm/pnpm/yarn/lerna workspaces). Never clobbers existing keys.
  - **Claude SessionStart hook** — writes `.claude/settings.json` with a hook that runs the detected package manager's install command if `node_modules/.bin/refrakt` is missing. Gated on Claude detection (explicit `--agent claude` or auto-detect seeing `CLAUDE.md`). PM detection happens at hook execution time by reading the lockfile, so switching package managers later just works.
  - **`./plan.sh` wrapper script** — POSIX script that installs deps on first run and defers to `npx refrakt plan "$@"`. Works in any agent environment where hooks aren't available.
  - **Opt-out flags** — `--no-package-json`, `--no-hooks`, `--no-wrapper`, and `--minimal` (all three) for users who want bare scaffolding.

  Also fixes the `esbuild` dependency leak in `@refrakt-md/plan`: the `bundleBehaviors` helper now lazy-imports `esbuild`, so non-build plan commands (`status`, `next`, `update`, etc.) no longer fail to load when esbuild isn't installed. `esbuild` is declared as an optional peer dependency.

  - @refrakt-md/behaviors@0.9.9
  - @refrakt-md/content@0.9.9
  - @refrakt-md/highlight@0.9.9
  - @refrakt-md/html@0.9.9
  - @refrakt-md/runes@0.9.9
  - @refrakt-md/transform@0.9.9
  - @refrakt-md/types@0.9.9

## 0.9.8

### Patch Changes

- Add edge-safe `./render` entry point for rendering plan entity Markdoc source to a serialized RendererNode. Works on Cloudflare Workers — no Node.js dependencies. Consumers apply their own theme's identity transform and render to HTML.
  - @refrakt-md/behaviors@0.9.8
  - @refrakt-md/content@0.9.8
  - @refrakt-md/highlight@0.9.8
  - @refrakt-md/html@0.9.8
  - @refrakt-md/runes@0.9.8
  - @refrakt-md/transform@0.9.8
  - @refrakt-md/types@0.9.8

## 0.9.7

### Patch Changes

- Plan package improvements: tool-agnostic `plan init` with `--agent` flag for multi-editor support, renamed plan directories to plural form (specs/, decisions/, milestones/), and refactored internals for edge runtime compatibility with new entry points (./diff, ./relationships, ./cards)
  - @refrakt-md/behaviors@0.9.7
  - @refrakt-md/content@0.9.7
  - @refrakt-md/highlight@0.9.7
  - @refrakt-md/html@0.9.7
  - @refrakt-md/runes@0.9.7
  - @refrakt-md/transform@0.9.7
  - @refrakt-md/types@0.9.7

## 0.9.6

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.9.6
  - @refrakt-md/content@0.9.6
  - @refrakt-md/highlight@0.9.6
  - @refrakt-md/html@0.9.6
  - @refrakt-md/runes@0.9.6
  - @refrakt-md/transform@0.9.6
  - @refrakt-md/behaviors@0.9.6

## 0.9.5

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.9.5
  - @refrakt-md/behaviors@0.9.5
  - @refrakt-md/transform@0.9.5
  - @refrakt-md/content@0.9.5
  - @refrakt-md/types@0.9.5
  - @refrakt-md/html@0.9.5
  - @refrakt-md/highlight@0.9.5

## 0.9.4

### Patch Changes

- Updated dependencies
  - @refrakt-md/content@0.9.4
  - @refrakt-md/runes@0.9.4
  - @refrakt-md/behaviors@0.9.4
  - @refrakt-md/html@0.9.4
  - @refrakt-md/highlight@0.9.4
  - @refrakt-md/transform@0.9.4
  - @refrakt-md/types@0.9.4

## 0.9.3

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.9.3
  - @refrakt-md/content@0.9.3
  - @refrakt-md/highlight@0.9.3
  - @refrakt-md/html@0.9.3
  - @refrakt-md/runes@0.9.3
  - @refrakt-md/transform@0.9.3
  - @refrakt-md/behaviors@0.9.3

## 0.9.2

### Patch Changes

- Add multi-framework adapter packages (Astro, Eleventy, Next.js, Nuxt, React, Vue) with ADR-008 framework-native component interfaces. Implement ADR-009 framework-agnostic theme architecture. Add vue, astro, and jinja to Shiki default languages.
- Updated dependencies
  - @refrakt-md/types@0.9.2
  - @refrakt-md/transform@0.9.2
  - @refrakt-md/runes@0.9.2
  - @refrakt-md/behaviors@0.9.2
  - @refrakt-md/content@0.9.2
  - @refrakt-md/highlight@0.9.2
  - @refrakt-md/html@0.9.2

## 0.9.1

### Patch Changes

- ### Transform engine enhancements (SPEC-033)

  - Named slots with ordering for structured element placement
  - Repeated element generation for multi-instance structures
  - Element projection (hide, group, relocate) for layout control
  - Value mapping and configurable density contexts
  - Migrate postTransform uses to declarative config

  ### Rune schema modernization

  - Replace legacy Model class with `createContentModelSchema` across all runes (WORK-099–102)
  - Replace `useSchema`/`Type` system with inline rune identifiers (ADR-005)
  - Remove legacy Model class, decorators, `createSchema`, and `NodeStream`

  ### Other improvements

  - File-derived timestamps for runes (SPEC-029)
  - Move extract command from CLI to `@refrakt-md/docs` package
  - Fix accordion item schema metadata duplication
  - Fix paragraph-wrapped images in juxtapose panels
  - Auto-assign IDs and detect duplicates in plan CLI
  - Inspect and contracts updated for structure slots

- Updated dependencies
  - @refrakt-md/behaviors@0.9.1
  - @refrakt-md/content@0.9.1
  - @refrakt-md/highlight@0.9.1
  - @refrakt-md/html@0.9.1
  - @refrakt-md/runes@0.9.1
  - @refrakt-md/transform@0.9.1
  - @refrakt-md/types@0.9.1

## 0.9.0

### Patch Changes

- Updated dependencies
  - @refrakt-md/behaviors@0.9.0
  - @refrakt-md/highlight@0.9.0
  - @refrakt-md/html@0.9.0
  - @refrakt-md/runes@0.9.0
  - @refrakt-md/transform@0.9.0
  - @refrakt-md/types@0.9.0
