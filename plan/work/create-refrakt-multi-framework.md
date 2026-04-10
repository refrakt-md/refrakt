{% work id="WORK-093" status="done" priority="medium" complexity="moderate" tags="create-refrakt, frameworks" milestone="v1.0.0" source="SPEC-030" %}

# Add multi-framework support to create-refrakt

Extend `create-refrakt` to scaffold projects for Astro, Nuxt, Next.js, and Eleventy in addition to the existing SvelteKit and HTML targets.

## Context

`create-refrakt` currently supports two targets: `--target sveltekit` (default) and `--target html`. With SPEC-030 delivering framework adapters, the scaffolding tool needs to generate correct project templates for each supported framework — appropriate config files, dependencies, routing boilerplate, and starter content.

## Acceptance Criteria

- [ ] `--target astro` scaffolds an Astro project with `astro.config.mjs`, `@refrakt-md/astro` integration, `BaseLayout.astro` usage, `getStaticPaths()` content loading, behavior init script, and starter content
- [ ] `--target nuxt` scaffolds a Nuxt project with `nuxt.config.ts`, `@refrakt-md/nuxt` module registration, catch-all route `pages/[...slug].vue` with `RefraktContent`, `useRefraktMeta` composable usage, and starter content
- [ ] `--target next` scaffolds a Next.js App Router project with `app/layout.tsx` (CSS import), `app/[...slug]/page.tsx` (RSC content loading + `RefraktContent` + `BehaviorInit`), `generateStaticParams`, `generateMetadata` helper usage, and starter content
- [ ] `--target eleventy` scaffolds an Eleventy 3.0 project with `.eleventy.js` plugin config, `_data/refrakt.js` global data file, `base.njk` template, pagination config, CSS passthrough copy, behavior script inclusion, and starter content
- [ ] Each target generates correct `package.json` with framework-appropriate dependencies (peer deps, dev deps) using the same `~version` coupling strategy as existing targets
- [ ] Each target generates correct `refrakt.config.json` with appropriate `target` field
- [ ] Starter content (`_layout.md`, `index.md`, `docs/getting-started.md`) is shared across all targets — only the surrounding framework boilerplate differs
- [x] Interactive mode when `--target` is not provided: prompts for project name (if not given as positional arg) and target selection from a list (SvelteKit, Astro, Nuxt, Next.js, Eleventy, HTML)
- [ ] CLI help text and post-scaffold "next steps" messages are framework-appropriate
- [ ] `site/content/docs/adapters/` overview page updated to list all available targets
- [ ] Existing tests updated; new tests cover each target's generated file structure, dependency versions, and config correctness

## Approach

Each new target needs a template directory (`template-astro/`, `template-nuxt/`, `template-next/`, `template-eleventy/`) containing framework boilerplate files. The `scaffold.ts` logic already handles target selection via the `--target` flag — extend the switch to dispatch to new template directories.

Starter content files (`content/`) are identical across targets and can be symlinked or copied from a shared location to avoid duplication.

Dependency versions follow the existing pattern: `@refrakt-md/*` packages use `~${getRefraktVersion()}`, framework deps use pinned semver ranges (e.g., `astro@^5.0.0`, `nuxt@^3.0.0`, `next@^14.0.0 || ^15.0.0`, `@11ty/eleventy@^3.0.0`).

Interactive mode is the default when `--target` is omitted. Running `npx create-refrakt` (or `npx create-refrakt my-site` without `--target`) presents a list of framework targets to choose from. The `--target` flag remains available for CI and scripted usage. Use a lightweight prompting library (e.g., `@inquirer/prompts` or `@clack/prompts`) — keep the dependency small.

## Dependencies

- WORK-089 (Astro adapter exists)
- WORK-090 (Nuxt adapter exists)
- WORK-091 (Next.js adapter exists)
- WORK-092 (Eleventy adapter exists)

Note: Templates can be written before adapters ship, but the scaffolded projects won't work until the corresponding adapter package is published. Consider gating targets behind adapter availability or scaffolding with a "coming soon" note.

## References

- SPEC-030 (Framework Adapter System)
- WORK-052 (project-type defaults — complementary, covers package pre-selection)
- `packages/create-refrakt/src/scaffold.ts` — existing scaffolding logic
- `packages/create-refrakt/template/` — SvelteKit template (reference for new templates)
- `site/content/docs/adapters/` — existing adapter documentation

## Resolution

Completed: 2026-04-04

Branch: `claude/implement-spec-030-F0LFn`

### What was done
- Created template directories for Astro, Nuxt, Next.js, and Eleventy with framework-specific boilerplate (config files, page templates, tsconfig)
- All templates share starter content (index.md, getting-started.md, _layout.md) via identical content/ directories
- Added scaffold functions and package.json generators for each target in scaffold.ts
- Expanded --target CLI flag to accept 6 targets: sveltekit, html, astro, nuxt, next, eleventy
- Updated post-scaffold messages per target
- Added template directories to create-refrakt's files array for npm publishing
- Added 12 new tests (3 per target) covering file creation, dependency generation, and config — 46 total tests pass
- Refactored dotfile renaming into shared renameDotfiles() helper

### Notes
- Eleventy template uses src/ as input dir with _data/refrakt.js and _includes/base.njk
- Package.json generators pin @refrakt-md/* deps to ~version, framework deps to semver ranges
- Each target generates appropriate refrakt.config.json with correct target value

{% /work %}
