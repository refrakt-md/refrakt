# @refrakt-md/eleventy

## 0.23.0

### Patch Changes

- Updated dependencies [b2f3f23]
  - @refrakt-md/transform@0.23.0
  - @refrakt-md/content@0.23.0
  - @refrakt-md/behaviors@0.23.0
  - @refrakt-md/types@0.23.0

## 0.22.0

### Patch Changes

- Updated dependencies [f27a573]
  - @refrakt-md/types@0.22.0
  - @refrakt-md/transform@0.22.0
  - @refrakt-md/content@0.22.0
  - @refrakt-md/behaviors@0.22.0

## 0.21.0

### Patch Changes

- Updated dependencies [92c8f1b]
- Updated dependencies [27124ea]
- Updated dependencies [2f6332d]
- Updated dependencies [7d89f23]
  - @refrakt-md/behaviors@0.21.0
  - @refrakt-md/transform@0.21.0
  - @refrakt-md/content@0.21.0
  - @refrakt-md/types@0.21.0

## 0.20.2

### Patch Changes

- @refrakt-md/behaviors@0.20.2
- @refrakt-md/content@0.20.2
- @refrakt-md/transform@0.20.2
- @refrakt-md/types@0.20.2

## 0.20.1

### Patch Changes

- Updated dependencies [7a6aaf5]
- Updated dependencies [7a6aaf5]
  - @refrakt-md/behaviors@0.20.1
  - @refrakt-md/transform@0.20.1
  - @refrakt-md/content@0.20.1
  - @refrakt-md/types@0.20.1

## 0.20.0

### Patch Changes

- Updated dependencies [8faa272]
- Updated dependencies [702732b]
- Updated dependencies [3952770]
- Updated dependencies [32a3b52]
- Updated dependencies [2d6dad9]
  - @refrakt-md/transform@0.20.0
  - @refrakt-md/types@0.20.0
  - @refrakt-md/behaviors@0.20.0
  - @refrakt-md/content@0.20.0

## 0.19.0

### Patch Changes

- Updated dependencies [9cb55f3]
- Updated dependencies [e4e5f5c]
- Updated dependencies [5c92e0b]
- Updated dependencies [0375d22]
  - @refrakt-md/content@0.19.0
  - @refrakt-md/behaviors@0.19.0
  - @refrakt-md/transform@0.19.0
  - @refrakt-md/types@0.19.0

## 0.18.0

### Patch Changes

- Updated dependencies [cd30659]
- Updated dependencies [b05fc8d]
  - @refrakt-md/transform@0.18.0
  - @refrakt-md/content@0.18.0
  - @refrakt-md/behaviors@0.18.0
  - @refrakt-md/types@0.18.0

## 0.17.0

### Patch Changes

- Updated dependencies [2d85b5f]
  - @refrakt-md/types@0.17.0
  - @refrakt-md/transform@0.17.0
  - @refrakt-md/content@0.17.0
  - @refrakt-md/behaviors@0.17.0

## 0.16.1

### Patch Changes

- Updated dependencies [ae5c904]
- Updated dependencies [8a84210]
  - @refrakt-md/types@0.16.1
  - @refrakt-md/transform@0.16.1
  - @refrakt-md/content@0.16.1
  - @refrakt-md/behaviors@0.16.1

## 0.16.0

### Minor Changes

- e5b9dc6: **v0.16.0 — Registry-driven sites.**

  Turns the entity registry into pages and listings declaratively, ships the three sibling registry-query runes (`collection` / `relationships` / `aggregate` — items / edges / numbers), and proves the system by scaffolding refrakt's own plan site from the `plan/` content tree.

  ### Registry-query runes

  - **`{% collection %}`** (SPEC-070) — the plural counterpart to `ref` / `expand`. Queries the registry with `type` + `filter`, applies `sort` / `group` / `limit`, and projects entities into `list` / `grid` / `table` layouts. Per-item body templates with `$item` bound; heading-delimited table columns; shared field-match grammar; shared formatter functions (`humanize`, `date`, `number`, `currency`, `join`); 3-zone body (preamble / template / fallback) with `$count` / `$shown` bindings; `group-display="accordion"` for collapsible groups.
  - **`{% relationships %}`** (SPEC-072) — graph-edge counterpart to `collection`. Renders an entity's edges grouped by kind (or type), generic over any domain's relationship vocabulary. Shares `$item` semantics with `collection` so card partials are reusable across both. Domain-aware ordering, accordion group display, body zones for empty state.
  - **`{% aggregate %}`** (SPEC-076) — number-projecting sibling. No-body form (`{% aggregate type="work" filter="status:done" /%}`) renders a single inline integer; body-zoned form iterates groups with `$item` bound to `{ key, count, value, percent, total, shown }`. Optional `value` sub-filter (e.g. `value="status:done"`) drives `$item.percent` for progress-bar ratios without a second query.

  ### Site machinery

  - **Plugin-contributed routes** (SPEC-069) — new `contributePages` pipeline phase plus declarative `entityRoutes` in `refrakt.config.json` that generate one page per registered entity matching `type` + optional `filter`. `embed()` embeddability contract for cross-page composition.
  - **Plan site scaffolding** (SPEC-071) — refrakt's own plan site rebuilt from `plan/` via `entityRoutes` + the registry-query runes. The bespoke `plan build` / `plan serve` commands are retired. Dashboard composition (aggregate header summary + per-status `collection` panels + empty-state `hint` runes) shipped as the canonical scaffold template.

  ### Chrome and polish

  - **Theme toggle** (SPEC-073) — light / dark / auto toggle as both a chrome slot and a `{% theme-toggle /%}` rune, with shared behavior and prod-build CSS parity for the Cloudflare-style no-runes-bundle.
  - Accordion polish — leading rotating chevron via SVG mask, native `<details>` slide animation via `::details-content` + `interpolate-size`, dividers-only outer treatment.
  - Badge restyle to a compact sentiment-tinted chip; sentiment via `color-mix(in srgb, var(--meta-color) X%, transparent)`.
  - New "Registry" category in the rune catalog for the cross-page-query runes (`xref` / `expand` / `collection` / `relationships` / `aggregate`); seven previously-missing runes added to the catalog (`xref`, `badge`, `gallery`, `showcase`, `bg`, `tint`, `blog`).

  ### Schema and docs corrections

  - `refrakt.config.json` schema — `theme` is now `string | SiteThemeConfig` (was just `string`); new `SiteThemeConfig` definition with `package`, `presets`, `tokens`, `modes`, and `code.colorScheme`. `highlight` flagged as legacy in favour of `theme.presets` (Lumina syntax presets contributing `--rf-syntax-*` overrides) + `theme.code.colorScheme` (forced light/dark code).
  - `site/content/runes/aggregate.md` — full reference page with live previews; sites.md updated for the theme object form.

  ### Bug fixes

  - Nav items containing an inline `{% badge %}` now sit as a flex row so the badge rides alongside the link instead of wrapping under it (link's `display: block` was claiming the full row).
  - Mobile docs toolbar long page titles now ellipsise instead of forcing horizontal page scroll (`flex: 1 1 0` + `max-width: 100%; overflow: hidden;` on the toolbar).
  - Conversation rune's `speakers="A,B"` attribute now renders names as bold-inline prefix inside the bubble, matching the explicit `> **Name**:` form. Two related issues fixed: the extractor was missing the Markdoc `inline` wrapper around paragraph content, and the fallback path didn't inject a strong-prefix. The speaker-carrier span is now hidden via the correct `data-field="speaker"` selector.

### Patch Changes

- Updated dependencies [e5b9dc6]
  - @refrakt-md/types@0.16.0
  - @refrakt-md/transform@0.16.0
  - @refrakt-md/content@0.16.0
  - @refrakt-md/behaviors@0.16.0

## 0.15.0

### Minor Changes

- f5fa9d5: Page variables: add `$page.dir`, `$page.slug`, `$page.title`, and `$file.path`; rename `$page.filePath` to `$page.path` (breaking).

  The Markdoc variable surface available to authored content is now:

  - `$page.path` — content-root-relative file path, POSIX-normalized (replaces `$page.filePath`)
  - `$page.dir` — directory portion of `$page.path` (`""` for content-root pages, no trailing slash)
  - `$page.slug` — last segment of `$page.url` (for index pages, the directory name; `""` for the homepage)
  - `$page.title` — `$frontmatter.title` when present and non-empty after trimming, else the first H1 in the page AST (depth-first, descending into rune children), else `undefined`
  - `$file.path` — project-root-relative source file path, POSIX-normalized (project root is the directory containing `refrakt.config.json`)

  **Breaking:** `$page.filePath` is removed. Authored content that referenced `$page.filePath` must use `$page.path` instead. A grep of the refrakt corpus showed zero usages; external sites that adopted it should rename in the same step they upgrade.

  Adapters (SvelteKit, Eleventy, Editor) now thread the project root through to the content loader so `$file.path` works out of the box. Hosts using `loadContentFromTree` directly can pass `projectRoot` on the options bag; when omitted, `$file.path` falls back to the content-root-relative path.

### Patch Changes

- Updated dependencies
- Updated dependencies [55de91d]
- Updated dependencies [f5fa9d5]
- Updated dependencies [8a0a6fa]
- Updated dependencies [ce36eac]
- Updated dependencies [8f8daec]
  - @refrakt-md/types@0.15.0
  - @refrakt-md/behaviors@0.15.0
  - @refrakt-md/content@0.15.0
  - @refrakt-md/transform@0.15.0

## 0.14.4

### Patch Changes

- Framework adapter parity with the SvelteKit reference (SPEC-058) — six capabilities that previously lived only in `@refrakt-md/sveltekit` now ship in working form across `@refrakt-md/astro`, `@refrakt-md/nuxt`, `@refrakt-md/next`, `@refrakt-md/eleventy`, and `@refrakt-md/html`. Application work — no new contracts, no breaking changes.

  **Site-level token-overrides CSS now works in every adapter.** `composeSiteTokensCss` (the generator that turns `theme.presets`, `theme.tokens`, `theme.modes`, and `site.tints` into a stylesheet — SPEC-048 + SPEC-056) moved out of the SvelteKit plugin and into `@refrakt-md/transform/node` as a shared module. The Astro and Nuxt adapters expose it as a Vite virtual module (`virtual:refrakt/site-tokens.css`); Eleventy ships it as a passthrough-managed file; Next.js exposes it through a Server Component helper; the HTML renderer inlines it via a `page-shell` helper. Sites authored on any adapter can now drop tokens into `refrakt.config.json` and skip writing CSS for the common case, just like SvelteKit.

  **SEO meta enrichment from site config in every adapter.** `siteName`, `baseUrl`, `defaultImage`, and `logo` from `refrakt.config.json` now bake into `og:site_name`, absolute `og:url`, image fallback, and WebSite + Organization JSON-LD on every adapter, not just SvelteKit. `SeoToHtmlOptions` threads through the SEO helpers in Astro, Nuxt, Next, Eleventy, and HTML.

  **CSS tree-shaking by used-rune analysis everywhere.** The SvelteKit-only optimisation that emits only the per-rune CSS files for runes actually present in the corpus is now shared via `@refrakt-md/transform/node`'s `used-css` helper. Vite adapters (Astro, Nuxt) get it via a sibling `virtual:refrakt/runes.css` virtual module; non-Vite adapters (Eleventy, Next, HTML) get a `getUsedCssImports` companion. Sites stop shipping the full theme barrel on every framework.

  **Shared pipeline-stats build summary.** The Phase 1/2/3/4 + warnings table that the SvelteKit plugin printed at the end of every build moved into `@refrakt-md/content` and is adopted across every adapter's build path. Eleventy, Astro, Nuxt, and Next now surface the same build summary instead of going silent or inheriting the host framework's default output.

  **`security` and `variables` plugin options surfaced on every non-SvelteKit adapter.** `SecurityPolicy` and Markdoc `$name` variables were SvelteKit-only surfaces even though `loadContent` already accepted them. The Astro `createRefraktLoader`, Nuxt module, Next data helper, Eleventy plugin, and HTML renderer now all forward both options to the loader.

  **Content HMR for non-SvelteKit Vite adapters and Eleventy.** Content HMR (watching the content directory + sandbox examples, invalidating the loader cache on `.md` edits) extends to Astro + Nuxt via Vite `configureServer` and to Eleventy via `addWatchTarget`. The HMR machinery moved from `@refrakt-md/sveltekit` to `@refrakt-md/transform`'s `content-hmr` module so every adapter can reuse it. Next.js intentionally not covered — its dev server already invalidates the loader's import graph when watched files change. The HTML adapter is a static-build helper with no dev server.

  **`template-astro/src/setup.ts` replaced with `createRefraktLoader`.** The Astro starter template's bespoke setup boilerplate folds into a thin `createRefraktLoader` wrapper — the single entry point now handles loader construction, security/variables options, and the new HMR + tokens wiring. Same for the Next.js template's adapter glue.

  **Footer nav two-column mobile rule.** Cosmetic: footer nav drops to two columns on mobile instead of stacking to one, applies to both the auto-columns rendering and the explicit-column variant. Keeps the footer scannable on phone width where one-column footers turn into long scrolls.

- Updated dependencies
  - @refrakt-md/transform@0.14.4
  - @refrakt-md/content@0.14.4
  - @refrakt-md/behaviors@0.14.4
  - @refrakt-md/types@0.14.4

## 0.14.3

### Patch Changes

- Updated dependencies
  - @refrakt-md/transform@0.14.3
  - @refrakt-md/content@0.14.3
  - @refrakt-md/behaviors@0.14.3
  - @refrakt-md/types@0.14.3

## 0.14.2

### Patch Changes

- Updated dependencies
  - @refrakt-md/transform@0.14.2
  - @refrakt-md/content@0.14.2
  - @refrakt-md/behaviors@0.14.2
  - @refrakt-md/types@0.14.2

## 0.14.1

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.14.1
  - @refrakt-md/transform@0.14.1
  - @refrakt-md/behaviors@0.14.1
  - @refrakt-md/content@0.14.1

## 0.14.0

### Patch Changes

- @refrakt-md/behaviors@0.14.0
- @refrakt-md/content@0.14.0
- @refrakt-md/transform@0.14.0
- @refrakt-md/types@0.14.0

## 0.12.0

### Minor Changes

- 7471ad8: Rename "rune packages" to "plugins" and unify with CLI plugins. Plugins now contribute runes, layouts, theme config, pipeline hooks, behaviors, **and** CLI commands through a single npm package.

  **Breaking changes:**

  - `RunePackage` interface → `Plugin`
  - `RunePackageEntry` → `PluginRune`
  - `RunePackageAttribute` → `PluginAttribute`
  - `RunePackageThemeConfig` → `PluginThemeConfig`
  - `PackagePipelineHooks` → `PluginPipelineHooks`
  - `loadRunePackage()` → `loadPlugin()`
  - `mergePackages()` → `mergePlugins()`
  - `discoverPackageFixtures()` → `discoverPluginFixtures()`
  - `LoadedPackage` → `LoadedPlugin`, `MergedPackageResult` → `MergedPluginResult`
  - `RuneProvenance.packageName` → `pluginName`; `source: 'package'` → `source: 'plugin'`
  - `RuneInfo.package` → `RuneInfo.plugin`; `SerializedRune.package` → `plugin`
  - Config field `site.packages[]` → `site.plugins[]`. The deprecated top-level shorthand `config.packages[]` is removed; use the existing `config.plugins[]` (which now covers both rune contributions and CLI commands).
  - `assembleThemeConfig` inputs renamed: `packageRunes` → `pluginRunes`, `packageIcons` → `pluginIcons`, `packageBackgrounds` → `pluginBackgrounds`.
  - `MergedPluginResult.packages` → `MergedPluginResult.plugins`
  - CLI: `refrakt package validate` removed; use `refrakt plugins validate` instead.
  - CLI: `refrakt reference list --package` flag is now `--plugin` (the old name still works as an alias).
  - Repo layout: `runes/{marketing,docs,…,plan}/` workspace globs moved to `plugins/{…}/`. npm package names (`@refrakt-md/marketing` etc.) are unchanged.

  **Migration:**

  - Rename `RunePackage` to `Plugin` and `loadRunePackage`/`mergePackages` to `loadPlugin`/`mergePlugins` in your code.
  - In `refrakt.config.json`, rename per-site `"packages": [...]` to `"plugins": [...]`. If you had a top-level `"packages"` shorthand under flat shape, move it to `"plugins"`.
  - Replace any calls to `refrakt package validate` with `refrakt plugins validate`.

### Patch Changes

- Updated dependencies [799583f]
- Updated dependencies [7471ad8]
- Updated dependencies [7537459]
- Updated dependencies [a733ec6]
  - @refrakt-md/transform@0.12.0
  - @refrakt-md/types@0.12.0
  - @refrakt-md/content@0.12.0
  - @refrakt-md/behaviors@0.12.0

## 0.11.3

### Patch Changes

- Updated dependencies [8cf7caf]
  - @refrakt-md/types@0.11.3
  - @refrakt-md/content@0.11.3
  - @refrakt-md/transform@0.11.3
  - @refrakt-md/behaviors@0.11.3

## 0.11.2

### Patch Changes

- @refrakt-md/behaviors@0.11.2
- @refrakt-md/content@0.11.2
- @refrakt-md/transform@0.11.2
- @refrakt-md/types@0.11.2

## 0.11.1

### Patch Changes

- @refrakt-md/behaviors@0.11.1
- @refrakt-md/content@0.11.1
- @refrakt-md/transform@0.11.1
- @refrakt-md/types@0.11.1

## 0.11.0

### Minor Changes

- 6a89ebe: v0.11.0 — unified config + multi-site + MCP server.

  - **Unified `refrakt.config.json`**. New `$schema`, `plugins`, `plan`, `site` / `sites` sections collapsed into a canonical sites map by `normalizeRefraktConfig()` in `@refrakt-md/transform/node`. Flat / singular / plural shapes all valid; single-site fields mirror to the top level for backwards compat. JSON Schema published from `@refrakt-md/transform` and referenced from a repo-root symlink for in-repo `$schema` references.
  - **Plugin discovery**. `discoverPlugins()` in `@refrakt-md/cli/lib/plugins` resolves `config.plugins` first, then falls back to scanning `package.json` deps + `node_modules/@refrakt-md/*`. CLI dispatch uses it for routing, "Did you mean?" suggestions on misspellings, and `--help` plugin listing. New `refrakt plugins list` command.
  - **Multi-site support**. New `--site <name>` flag on site-scoped commands (`inspect`, `contracts`, `scaffold-css`, `validate`, `package validate`). Resolves via `resolveSite()`; multi-site without `--site` errors with available names; unknown name errors with a suggestion. All five framework adapters (`sveltekit`, `astro`, `nuxt`, `next`, `eleventy`) accept a `site?: string` option.
  - **`@refrakt-md/mcp`** (new package). Model Context Protocol server wrapping the refrakt CLI. Stdio transport, six core tools (`refrakt.detect`, `refrakt.plugins_list`, `refrakt.reference`, `refrakt.contracts`, `refrakt.inspect`, `refrakt.inspect_list`), plugin-discovered tools registered as `<namespace>.<name>`, and read-only resources (`refrakt://detect`, `refrakt://plan/index`, `refrakt://plan/<type>/<id>`, etc.). Errors return structured envelopes with `errorCode` + `hint`. `--cwd <path>` overrides cwd. Long-running commands (`plan.serve`, `plan.build`) intentionally excluded.
  - **Plan + MCP integration**. New `inputSchema` / `outputSchema` / `mcpHandler` fields on `CliPluginCommand`. Plan commands ship MCP bindings (`next`, `update`, `create`, `status`, `validate`, `next-id`, `init`, `history`, `migrate`). Plan package consumes the unified config via `resolvePlanDir()` (precedence: flag → env → config → `'plan'`). `plan init` scaffolds `refrakt.config.json` by default (`--no-config` opts out).
  - **`refrakt config migrate`**. New subcommand. Default is dry-run with a line diff; `--apply` writes. `--to nested` (default) handles flat → singular; `--to multi-site --name <n>` handles singular → plural. Idempotent. Auto-populates `plugins` from `discoverPlugins()` on first migration.
  - **`.mcp.json` scaffolding**. `plan init` and `create-refrakt` (all six site scaffolds) drop a project-scoped `.mcp.json` registering `@refrakt-md/mcp` for MCP-aware agents (Claude Code, Cursor). Gated on agent detection; `--no-mcp` opts out.
  - **Site docs**. New `site/content/docs/configuration/` (overview, plugins, plan, sites, migration, schema) and `site/content/docs/mcp/` (overview, installation, tools, resources, errors). `packages/authoring.md` extended with an "Adding CLI Commands and MCP Tools" section. `CLAUDE.md` gains an MCP section directing agents to prefer MCP tools over the CLI when both are available.
  - **Path resolution semantics**. Nested-shape paths (`contentDir`, `sandbox.examplesDir`, `theme`, `overrides`, `runes.local`) now resolve relative to the config file's directory when a `configDir` is provided to `normalizeRefraktConfig()`. Flat-shape paths remain cwd-relative for legacy projects. `DEFAULT_SITE_NAME` exported as `'main'` (was `'default'`) so flat / singular configs promote to `sites.main` and match the `create-refrakt` scaffolds.

### Patch Changes

- Updated dependencies [6a89ebe]
  - @refrakt-md/transform@0.11.0
  - @refrakt-md/content@0.11.0
  - @refrakt-md/behaviors@0.11.0
  - @refrakt-md/types@0.11.0

## 0.10.1

### Patch Changes

- @refrakt-md/content@0.10.1
- @refrakt-md/behaviors@0.10.1
- @refrakt-md/transform@0.10.1
- @refrakt-md/types@0.10.1

## 0.10.0

### Patch Changes

- Version bump for coordinated release

## 0.9.9

### Patch Changes

- @refrakt-md/behaviors@0.9.9
- @refrakt-md/content@0.9.9
- @refrakt-md/transform@0.9.9
- @refrakt-md/types@0.9.9

## 0.9.8

### Patch Changes

- @refrakt-md/behaviors@0.9.8
- @refrakt-md/content@0.9.8
- @refrakt-md/transform@0.9.8
- @refrakt-md/types@0.9.8

## 0.9.7

### Patch Changes

- @refrakt-md/behaviors@0.9.7
- @refrakt-md/content@0.9.7
- @refrakt-md/transform@0.9.7
- @refrakt-md/types@0.9.7

## 0.9.6

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.9.6
  - @refrakt-md/content@0.9.6
  - @refrakt-md/transform@0.9.6
  - @refrakt-md/behaviors@0.9.6

## 0.9.5

### Patch Changes

- Updated dependencies
  - @refrakt-md/transform@0.9.5
  - @refrakt-md/content@0.9.5
  - @refrakt-md/types@0.9.5

## 0.9.4

### Patch Changes

- Updated dependencies
  - @refrakt-md/content@0.9.4
  - @refrakt-md/transform@0.9.4
  - @refrakt-md/types@0.9.4

## 0.9.3

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.9.3
  - @refrakt-md/content@0.9.3
  - @refrakt-md/transform@0.9.3

## 0.9.2

### Patch Changes

- Add multi-framework adapter packages (Astro, Eleventy, Next.js, Nuxt, React, Vue) with ADR-008 framework-native component interfaces. Implement ADR-009 framework-agnostic theme architecture. Add vue, astro, and jinja to Shiki default languages.
- Updated dependencies
  - @refrakt-md/types@0.9.2
  - @refrakt-md/transform@0.9.2
  - @refrakt-md/content@0.9.2
