{% bug id="BUG-004" status="fixed" severity="major" milestone="v0.32.0" tags="config,schema,site,create-refrakt" %}

# Scaffolded projects reference schema URLs the site does not serve

`create-refrakt` writes a `$schema` URL derived from its own package version:

```
https://refrakt.md/schemas/v{major}.{minor}/refrakt.config.schema.json
```

The site only served one hardcoded version, `v0.11`. Every project scaffolded from v0.12 onward therefore points its `$schema` at a 404 — roughly twenty releases' worth of new projects get no editor validation, no autocomplete, and (depending on the editor) a fetch error on the config file.

The theme-token schema is worse: `getThemeTokensSchemaUrl()` scaffolds `https://refrakt.md/schemas/v{major}.{minor}/theme-tokens.json`, and there was **no route for it at any URL** — versioned or not. Its own `$id` claims `https://refrakt.md/schemas/theme-tokens.json`, which also 404'd.

## Steps to reproduce

1. Scaffold a project with the current `create-refrakt`.
2. Open `refrakt.config.json` in an editor that resolves `$schema`.
3. The URL is `https://refrakt.md/schemas/v0.31/refrakt.config.schema.json`; only `/schemas/v0.11/...` exists.

## Expected

The scaffolded `$schema` URL resolves, giving autocomplete, hover documentation, and inline validation in editors that follow `$schema` references. The same holds for the `theme-tokens.json` URL scaffolded for preset authoring.

## Actual

Both URLs 404. Editors silently fall back to no validation, or surface a fetch error on the config file. Only `/schemas/v0.11/refrakt.config.schema.json` — the version hardcoded when the route was written — ever resolved, and no `theme-tokens.json` route existed at any URL.

## Root cause

Two mechanisms that had to agree were written independently (WORK-176): the scaffold derives its URL from the package version, while the route was a literal `v0.11` directory. Nothing tied them together, so the scaffold moved forward each release and the route did not. WORK-458 later added `theme-tokens.schema.json` and referenced the same URL convention without adding any route at all.

The underlying reason it went unnoticed: the site is prerendered by `adapter-static` with `strict: true`, so an unenumerated route simply isn't emitted. There is no runtime 404 in the build log to notice.

## Acceptance Criteria
- [x] Every version from the first versioned release through the current one serves `refrakt.config.schema.json`
- [x] The same versions serve `theme-tokens.json`
- [x] The unversioned `schemas/theme-tokens.json` alias resolves, matching that schema's own `$id`
- [x] The version list is derived from the shipped package version, so a release publishes its own URL without a manual step
- [x] Each endpoint's `$id` matches the URL it is served from
- [x] Tests cover the enumeration and the `$id` stamping
- [x] The versioning docs describe what the versioned URLs actually guarantee

## Approach

Replace the hardcoded `schemas/v0.11/` directory with a `schemas/[version]/` dynamic route whose `entries()` enumerates `v0.11` through the version `@refrakt-md/transform` currently ships. Because a release builds the site *after* the version bump, the release that publishes vX.Y also publishes `/schemas/vX.Y/` — the coupling that was missing.

Serve the schema body with `$id` rewritten to the requested URL, and leave the source files carrying the unversioned `$id` so the copy bundled in the npm package cannot go stale between releases.

Archiving a real per-release snapshot is deliberately **not** done here. Schema changes are additive, so serving the latest body at an older URL produces no false errors — only a missing warning for a field the pinned version doesn't support. The docs now say this plainly instead of promising frozen snapshots.

## Resolution

Completed: 2026-09-08

Branch: `claude/content-author-docs-org-vps1un`

### What was done

- **`site/src/lib/schema-versions.ts`** (new) — enumerates `v0.11` through the version `@refrakt-md/transform` ships, and reads a schema with its `$id` stamped to the URL being served. Locates `packages/transform` by walking up from the working directory rather than from `import.meta.url`: Vite bundles this module into `.svelte-kit/output/server/chunks/`, so the module's own path says nothing about where the repo is at build time. Walking up handles both callers — the site build runs from `site/`, the test runner from the repo root.
- **`site/src/routes/schemas/[version]/refrakt.config.schema.json/`** and **`.../theme-tokens.json/`** (new) — dynamic prerendered endpoints with `entries()` over that version list.
- **`site/src/routes/schemas/theme-tokens.json/`** (new) — the unversioned alias the theme-token schema's own `$id` has always claimed and which had never resolved.
- **`site/src/routes/schemas/v0.11/`** — removed; superseded by the dynamic route.
- **`site/src/routes/refrakt.config.schema.json/+server.ts`** — switched to the shared helper.
- **`packages/transform/refrakt.config.schema.json`** — `$id` changed from the hardcoded `schemas/v0.11/...` to the unversioned alias, so the copy bundled in the npm package can't go stale between releases. Served copies are version-stamped at request time instead.
- **`site/src/lib/schema-versions.test.ts`** (new, 9 tests) — range invariants (starts at v0.11, ends at current, no gaps, no duplicates), that the set contains the URL `create-refrakt` bakes in, and the `$id` stamping for both versioned and unversioned forms.
- **`.github/workflows/release.yml`** — comment recording that the site deploy must stay after the version bump, since that ordering is what publishes the new release's URL.
- **`site/content/docs/configuration/schema.md`** — documents both schemas' URL forms and replaces the "frozen for that minor release line" claim with what the URLs actually guarantee.

### Verification

Ran a real `vite build` and inspected `site/build/`: 21 versioned copies of `refrakt.config.schema.json` (v0.11–v0.31), 21 of `theme-tokens.json`, plus both unversioned aliases. Confirmed each file's `$id` matches its own URL, that the served body is byte-identical to the source apart from `$id`, and that `v0.31` — the URL current scaffolds reference — is present. Full suite 4185/4185.

### Notes

- The first build attempt failed and is worth recording: `import.meta.url`-relative path resolution broke under Vite's bundling, and because the failure happened inside SvelteKit's prerender fork the outer command still reported exit 0. Checking the build *output* rather than the exit code is what caught it.
- Per-release schema snapshots are deliberately not implemented. Schema changes are additive, so serving the latest body at an older URL yields no false errors — only a missing warning for a field the pinned version doesn't support. The docs now say this rather than promising freezing; archiving remains available later without changing any URL.
- `svelte-check` reports 2 pre-existing errors in `packages/svelte/src/ThemeShell.svelte`, untouched by this change; the new files are clean.

{% /bug %}
