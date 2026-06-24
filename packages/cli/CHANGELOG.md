# @refrakt-md/cli

## 0.25.0

### Minor Changes

- 3a3ddf3: v0.25.0 — Distribution & onboarding

  Make the refrakt stack distributable and cut the blank-page activation cost.

  **Authoring scaffolds (`create-refrakt`).** New `--type plugin | theme | preset-pack | template` scaffolds, each ADR-023-compliant (`@refrakt-md/*` as `peerDependencies` with a minor range + matching devDeps + a `refrakt` compat range) and buildable on day one. Themes now scaffold **framework-agnostic by default** (ADR-024) — tokens + `./transform` + `./layouts` configs, no `svelte/` — with `--target svelte` opting into a component layer. The framework axis is `--framework`; `--template <name|dir>` composes a site template.

  **Install robustness (`refrakt theme` / `refrakt template`).** A shared source resolver handles directories, `.tgz` tarballs (read up front, no dead-end), and registry packages with `--registry` passthrough. `--site` targets multi-site projects (with singular→plural migration). New `theme list`, `theme presets list|validate|install`, and `template install` (add-a-site). Post-install validation is framework-aware (`./transform` required, a framework export optional) and checks each distributable's `refrakt` compatibility range.

  **Preset packs (SPEC-111).** Presets are a first-class distributable pack (`presets.json`) with `scope` (`syntax` | `palette`) and advisory `tunedFor` compatibility. A declarative **JSON carrier** (no build step) is the default, validated by a published token-contract **JSON Schema**. Lumina now also ships as a preset pack.

  **Config.** Sandbox runtime directory renamed `sandbox.examplesDir` → `sandbox.dir` (ADR-022); the old name is still accepted with a deprecation warning. New `TemplateManifest` / `PresetPackManifest` types and a dependency-free `checkRefraktCompat` helper.

  Authoring docs for all four distributable layers live under `extend/distributing/`.

### Patch Changes

- Updated dependencies [3a3ddf3]
  - @refrakt-md/transform@0.25.0
  - @refrakt-md/editor@0.25.0
  - @refrakt-md/html@0.25.0
  - @refrakt-md/runes@0.25.0
  - @refrakt-md/ai@0.25.0

## 0.24.6

### Patch Changes

- Updated dependencies [c25b10b]
- Updated dependencies [2ce7a17]
  - @refrakt-md/runes@0.24.6
  - @refrakt-md/transform@0.24.6
  - @refrakt-md/html@0.24.6
  - @refrakt-md/ai@0.24.6
  - @refrakt-md/editor@0.24.6

## 0.24.5

### Patch Changes

- @refrakt-md/ai@0.24.5
- @refrakt-md/editor@0.24.5
- @refrakt-md/html@0.24.5
- @refrakt-md/runes@0.24.5
- @refrakt-md/transform@0.24.5

## 0.24.4

### Patch Changes

- Updated dependencies [fee0ec3]
- Updated dependencies [de974e1]
  - @refrakt-md/transform@0.24.4
  - @refrakt-md/editor@0.24.4
  - @refrakt-md/html@0.24.4
  - @refrakt-md/runes@0.24.4
  - @refrakt-md/ai@0.24.4

## 0.24.3

### Patch Changes

- Updated dependencies [e85a0f0]
  - @refrakt-md/transform@0.24.3
  - @refrakt-md/editor@0.24.3
  - @refrakt-md/html@0.24.3
  - @refrakt-md/runes@0.24.3
  - @refrakt-md/ai@0.24.3

## 0.24.2

### Patch Changes

- Updated dependencies [8090b69]
  - @refrakt-md/runes@0.24.2
  - @refrakt-md/ai@0.24.2
  - @refrakt-md/editor@0.24.2
  - @refrakt-md/html@0.24.2
  - @refrakt-md/transform@0.24.2

## 0.24.1

### Patch Changes

- Updated dependencies [ce700c2]
  - @refrakt-md/transform@0.24.1
  - @refrakt-md/runes@0.24.1
  - @refrakt-md/editor@0.24.1
  - @refrakt-md/html@0.24.1
  - @refrakt-md/ai@0.24.1

## 0.24.0

### Patch Changes

- Updated dependencies [dd2d955]
- Updated dependencies [dd2d955]
  - @refrakt-md/runes@0.24.0
  - @refrakt-md/transform@0.24.0
  - @refrakt-md/ai@0.24.0
  - @refrakt-md/editor@0.24.0
  - @refrakt-md/html@0.24.0

## 0.23.0

### Minor Changes

- b2f3f23: **Surface axes — `elevation` is now a depth ladder (SPEC-107).** The `elevation` attribute is decomposed into three composable axes so the same content rune can read as a contained card _or_ a full-bleed hero with no rune fork:

  - **`elevation`** — a depth ladder `sunken | flush | flat | raised | floating | overlay` (was the `none|sm|md|lg` shadow scale). Each rune ships a `defaultElevation` (a `card` is `flat`, a `hint` is `flush`, a `chart` is `sunken`); styled by `[data-elevation]`, no BEM modifier class.
  - **`prominence`** — the page-section-header family `quiet | normal | prominent | display`, re-pointing the section title type size.
  - **`width`** — the existing layout/bleed axis (`compact|narrow|wide|full`), now documented as the third, layout-side axis.

  **Breaking change + deprecation window.** The old `elevation="none|sm|md|lg"` values are deprecated. They still resolve — `none`→`flat`, `sm`/`md`→`raised`, `lg`→`floating` — with a build-time warning, and will be removed in a future release. Run the codemod to migrate authored content:

  ```sh
  refrakt migrate elevation <path>   # --apply to write; dry-run by default
  ```

  The codemod is scoped to the `elevation` attribute only — `frame-shadow` carries the identical `none/sm/md/lg` values on the media surface and is left untouched.

  Lumina's `dimensions/surfaces.css` is now rune-name-free: surface chrome is selected entirely by `[data-elevation]` / `[data-prominence]` rather than enumerated rune lists, so a new theme inherits the base defaults and overrides only the deltas.

### Patch Changes

- Updated dependencies [b2f3f23]
  - @refrakt-md/transform@0.23.0
  - @refrakt-md/runes@0.23.0
  - @refrakt-md/editor@0.23.0
  - @refrakt-md/html@0.23.0
  - @refrakt-md/ai@0.23.0

## 0.22.0

### Minor Changes

- f27a573: **Standardised rune-fixture corpus + CI validation** (SPEC-102) — rune examples now live as annotated Markdown fixtures (`fixtures/*.md`) with validated YAML frontmatter (`role`, `attributes`, `demonstrates`, `notes`) and `<rune>.<scenario>.md` scenarios; `RUNE_EXAMPLES` is generated from them. A CI test parses, schema-validates, and transforms every fixture in the corpus (rejecting unknown keys / wrong types and any parse/transform error), and `refrakt plugins validate` now reports role coverage — e.g. a rune that has fixtures but no `canonical` one. One source of truth for the inspect command, the gallery, docs, and AI few-shot, with an authoring guide for content authors.
- f27a573: **`refrakt gallery` + an opt-in visual-regression harness** (SPEC-094) — a new `gallery` command renders every rune across its variants (light + dark) plus the four layout fixtures over a synthetic multi-page context to static, deterministic HTML — the safety net (and AI-iteration surface) for theme work. The companion `@refrakt-md/gallery-harness` package (opt-in; the only Playwright/browser dependency in the repo, deliberately kept out of the core CLI and runtime install path) screenshots the gallery's rune-cell clips and layout pages and diffs them against an ephemeral, gitignored baseline — for restyle before/after and inert-refactor (skeleton/skin) proofs.

### Patch Changes

- Updated dependencies [f27a573]
- Updated dependencies [f27a573]
- Updated dependencies [f27a573]
- Updated dependencies [f27a573]
  - @refrakt-md/ai@0.22.0
  - @refrakt-md/runes@0.22.0
  - @refrakt-md/transform@0.22.0
  - @refrakt-md/editor@0.22.0
  - @refrakt-md/html@0.22.0

## 0.21.0

### Minor Changes

- 8939b35: **`reference list` / `reference dump` are now site-aware** (`--site <name>`) — they resolve a multi-site config's per-site `plugins` (and `runes`) instead of only reading the flat single-site shape, so the rune reference for a multi-site project includes its plugin runes, not just core.

  **xref no longer warns on same-destination name collisions.** With SPEC-092's typed page entities, a `/runes/<x>` doc page is registered as both a `page` and a `rune` of the same name — an `{% xref %}` by that name matched both and warned, even though both resolve to the _same URL_. The resolver now only warns when the candidates' destinations actually diverge.

### Patch Changes

- Updated dependencies [92c8f1b]
- Updated dependencies [b8d9396]
- Updated dependencies [cf0489f]
- Updated dependencies [27124ea]
- Updated dependencies [8939b35]
- Updated dependencies [69b4d9c]
- Updated dependencies [2f6332d]
- Updated dependencies [ad780ca]
  - @refrakt-md/runes@0.21.0
  - @refrakt-md/transform@0.21.0
  - @refrakt-md/ai@0.21.0
  - @refrakt-md/editor@0.21.0

## 0.20.2

### Patch Changes

- @refrakt-md/ai@0.20.2
- @refrakt-md/editor@0.20.2
- @refrakt-md/runes@0.20.2
- @refrakt-md/transform@0.20.2

## 0.20.1

### Patch Changes

- Updated dependencies [7a6aaf5]
  - @refrakt-md/transform@0.20.1
  - @refrakt-md/editor@0.20.1
  - @refrakt-md/runes@0.20.1
  - @refrakt-md/ai@0.20.1

## 0.20.0

### Patch Changes

- Updated dependencies [8faa272]
- Updated dependencies [702732b]
- Updated dependencies [3952770]
- Updated dependencies [32a3b52]
- Updated dependencies [2d6dad9]
  - @refrakt-md/runes@0.20.0
  - @refrakt-md/transform@0.20.0
  - @refrakt-md/ai@0.20.0
  - @refrakt-md/editor@0.20.0

## 0.19.0

### Patch Changes

- Updated dependencies [97522a0]
- Updated dependencies [9cb55f3]
- Updated dependencies [6f30052]
- Updated dependencies [fd484bc]
- Updated dependencies [e4e5f5c]
- Updated dependencies [2f2b04f]
- Updated dependencies [5c92e0b]
- Updated dependencies [61e15c9]
  - @refrakt-md/runes@0.19.0
  - @refrakt-md/transform@0.19.0
  - @refrakt-md/ai@0.19.0
  - @refrakt-md/editor@0.19.0

## 0.18.0

### Patch Changes

- Updated dependencies [cd30659]
- Updated dependencies [b05fc8d]
  - @refrakt-md/transform@0.18.0
  - @refrakt-md/editor@0.18.0
  - @refrakt-md/runes@0.18.0
  - @refrakt-md/ai@0.18.0

## 0.17.0

### Patch Changes

- Updated dependencies [2d85b5f]
  - @refrakt-md/transform@0.17.0
  - @refrakt-md/runes@0.17.0
  - @refrakt-md/editor@0.17.0
  - @refrakt-md/ai@0.17.0

## 0.16.1

### Patch Changes

- Updated dependencies [ae5c904]
- Updated dependencies [8a84210]
  - @refrakt-md/runes@0.16.1
  - @refrakt-md/transform@0.16.1
  - @refrakt-md/ai@0.16.1
  - @refrakt-md/editor@0.16.1

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
  - @refrakt-md/transform@0.16.0
  - @refrakt-md/runes@0.16.0
  - @refrakt-md/editor@0.16.0
  - @refrakt-md/ai@0.16.0

## 0.15.0

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies [55de91d]
- Updated dependencies [f5fa9d5]
- Updated dependencies [ce36eac]
- Updated dependencies [8f8daec]
  - @refrakt-md/runes@0.15.0
  - @refrakt-md/editor@0.15.0
  - @refrakt-md/transform@0.15.0
  - @refrakt-md/ai@0.15.0

## 0.14.4

### Patch Changes

- Updated dependencies
  - @refrakt-md/transform@0.14.4
  - @refrakt-md/editor@0.14.4
  - @refrakt-md/runes@0.14.4
  - @refrakt-md/ai@0.14.4

## 0.14.3

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.14.3
  - @refrakt-md/transform@0.14.3
  - @refrakt-md/ai@0.14.3
  - @refrakt-md/editor@0.14.3

## 0.14.2

### Patch Changes

- Updated dependencies
  - @refrakt-md/transform@0.14.2
  - @refrakt-md/editor@0.14.2
  - @refrakt-md/runes@0.14.2
  - @refrakt-md/ai@0.14.2

## 0.14.1

### Patch Changes

- Updated dependencies
  - @refrakt-md/transform@0.14.1
  - @refrakt-md/runes@0.14.1
  - @refrakt-md/editor@0.14.1
  - @refrakt-md/ai@0.14.1

## 0.14.0

### Patch Changes

- @refrakt-md/ai@0.14.0
- @refrakt-md/editor@0.14.0
- @refrakt-md/runes@0.14.0
- @refrakt-md/transform@0.14.0

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

- 7537459: v0.11.0 config follow-ups (WORK-176):

  - **Schema URL versioning.** The JSON Schema is now published at a versioned URL (`https://refrakt.md/schemas/v0.11/refrakt.config.schema.json`) with the unversioned URL kept as a "latest" alias. `create-refrakt` scaffolds derive the versioned URL from the package version at scaffold time so old projects don't get false validation errors when later releases add fields. Versioning policy documented in `site/content/docs/configuration/schema.md`.
  - **Optional mirrored fields.** `RefraktConfig.contentDir`, `theme`, and `target` are now typed as optional (`?:`) — they were strictly required strings before, which papered over the multi-site case where they're undefined. Adapter code that read these directly (`refrakt theme install`/`info`, `refrakt edit`, the Astro/HTML/SvelteKit scaffold templates) now goes through `resolveSite(config).site.contentDir` and friends.
  - **Flat-shape deprecation.** Loading a flat-shape `refrakt.config.json` (top-level `contentDir`/`theme`/`target` without a `site` wrapper) now emits a one-time deprecation warning per process. `refrakt config migrate` mentions the v1.0 removal target in its output. Docs (`overview.md`, `migration.md`, `sites.md`, `plugins.md`) replace flat-shape examples with the nested form and add `v0.12 → v1.0` deprecation callouts.
  - **`target` field downgraded to documentation-only.** No adapter actually validates or consumes `site.target`, so `SiteConfig.target` is now optional and the SvelteKit validator no longer requires it on flat-shape configs. The schema marks `target` `deprecated: true` with a note that it's slated for removal in v1.0.

### Patch Changes

- Updated dependencies [799583f]
- Updated dependencies [7471ad8]
- Updated dependencies [7537459]
- Updated dependencies [a733ec6]
  - @refrakt-md/transform@0.12.0
  - @refrakt-md/runes@0.12.0
  - @refrakt-md/editor@0.12.0
  - @refrakt-md/ai@0.12.0

## 0.11.3

### Patch Changes

- @refrakt-md/editor@0.11.3
- @refrakt-md/runes@0.11.3
- @refrakt-md/transform@0.11.3
- @refrakt-md/ai@0.11.3

## 0.11.2

### Patch Changes

- bda80cc: Fix MCP server failing to invoke the refrakt CLI for `inspect`, `contracts`, `reference`, `inspect_list`, and `plugins_list` tools.

  The MCP server resolves the CLI bin via `require.resolve('@refrakt-md/cli/package.json')`, but the cli package's `exports` map didn't declare `./package.json`, so Node threw `ERR_PACKAGE_PATH_NOT_EXPORTED`. The MCP server's catch branch silently fell back to the bare string `'refrakt'`, which `execFileSync` then tried to resolve as a relative path against the user's cwd, producing a confusing `Cannot find module '<cwd>/refrakt'` error.

  - `@refrakt-md/cli` now exports `./package.json` so the existing resolution path works.
  - `@refrakt-md/mcp` adds a secondary fallback (resolve via the always-exported `lib/plugins.js` and walk up to the package root) and now throws a clear error instead of returning a bogus bin path. Both core tools and resource handlers go through the shared helper.
  - @refrakt-md/ai@0.11.2
  - @refrakt-md/editor@0.11.2
  - @refrakt-md/runes@0.11.2
  - @refrakt-md/transform@0.11.2

## 0.11.1

### Patch Changes

- @refrakt-md/ai@0.11.1
- @refrakt-md/editor@0.11.1
- @refrakt-md/runes@0.11.1
- @refrakt-md/transform@0.11.1

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
  - @refrakt-md/editor@0.11.0
  - @refrakt-md/runes@0.11.0
  - @refrakt-md/ai@0.11.0

## 0.10.1

### Patch Changes

- Updated dependencies [b04d001]
  - @refrakt-md/runes@0.10.1
  - @refrakt-md/ai@0.10.1
  - @refrakt-md/editor@0.10.1
  - @refrakt-md/transform@0.10.1

## 0.10.0

### Patch Changes

- Version bump for coordinated release

## 0.9.9

### Patch Changes

- bcc1335: Expand `refrakt plan init` to fully wire the host project for agent use:

  - **AGENTS.md is now canonical** — full workflow content lives in `AGENTS.md` at the project root; tool-specific files (`CLAUDE.md`, `.cursorrules`, etc.) get one-line pointers to it.
  - **Host `package.json` wiring** — adds `@refrakt-md/cli` + `@refrakt-md/plan` to `devDependencies` (pinned to the running plan version) and `"plan": "refrakt plan"` to `scripts`. Walks up to find the install root (respects npm/pnpm/yarn/lerna workspaces). Never clobbers existing keys.
  - **Claude SessionStart hook** — writes `.claude/settings.json` with a hook that runs the detected package manager's install command if `node_modules/.bin/refrakt` is missing. Gated on Claude detection (explicit `--agent claude` or auto-detect seeing `CLAUDE.md`). PM detection happens at hook execution time by reading the lockfile, so switching package managers later just works.
  - **`./plan.sh` wrapper script** — POSIX script that installs deps on first run and defers to `npx refrakt plan "$@"`. Works in any agent environment where hooks aren't available.
  - **Opt-out flags** — `--no-package-json`, `--no-hooks`, `--no-wrapper`, and `--minimal` (all three) for users who want bare scaffolding.

  Also fixes the `esbuild` dependency leak in `@refrakt-md/plan`: the `bundleBehaviors` helper now lazy-imports `esbuild`, so non-build plan commands (`status`, `next`, `update`, etc.) no longer fail to load when esbuild isn't installed. `esbuild` is declared as an optional peer dependency.

  - @refrakt-md/ai@0.9.9
  - @refrakt-md/editor@0.9.9
  - @refrakt-md/runes@0.9.9
  - @refrakt-md/transform@0.9.9

## 0.9.8

### Patch Changes

- @refrakt-md/ai@0.9.8
- @refrakt-md/editor@0.9.8
- @refrakt-md/runes@0.9.8
- @refrakt-md/transform@0.9.8

## 0.9.7

### Patch Changes

- @refrakt-md/ai@0.9.7
- @refrakt-md/editor@0.9.7
- @refrakt-md/runes@0.9.7
- @refrakt-md/transform@0.9.7

## 0.9.6

### Patch Changes

- @refrakt-md/editor@0.9.6
- @refrakt-md/runes@0.9.6
- @refrakt-md/transform@0.9.6
- @refrakt-md/ai@0.9.6

## 0.9.5

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.9.5
  - @refrakt-md/transform@0.9.5
  - @refrakt-md/editor@0.9.5
  - @refrakt-md/ai@0.9.5

## 0.9.4

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.9.4
  - @refrakt-md/editor@0.9.4
  - @refrakt-md/ai@0.9.4
  - @refrakt-md/transform@0.9.4

## 0.9.3

### Patch Changes

- @refrakt-md/editor@0.9.3
- @refrakt-md/runes@0.9.3
- @refrakt-md/transform@0.9.3
- @refrakt-md/ai@0.9.3

## 0.9.2

### Patch Changes

- Add multi-framework adapter packages (Astro, Eleventy, Next.js, Nuxt, React, Vue) with ADR-008 framework-native component interfaces. Implement ADR-009 framework-agnostic theme architecture. Add vue, astro, and jinja to Shiki default languages.
- Updated dependencies
  - @refrakt-md/transform@0.9.2
  - @refrakt-md/runes@0.9.2
  - @refrakt-md/ai@0.9.2
  - @refrakt-md/editor@0.9.2

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
  - @refrakt-md/ai@0.9.1
  - @refrakt-md/editor@0.9.1
  - @refrakt-md/runes@0.9.1
  - @refrakt-md/transform@0.9.1

## 0.9.0

## 0.8.5

### Patch Changes

- Add blog rune for listing posts with filtering and sorting. Expose frontmatter and page data as content-level Markdoc variables. Redesign juxtapose rune with --- delimiter and overlay labels. Auto-discover runes in VS Code extension and editor. Fix map rune collapsed border and add spacing support. Fix juxtapose tint mode.
- Updated dependencies
  - @refrakt-md/ai@0.8.5
  - @refrakt-md/editor@0.8.5
  - @refrakt-md/runes@0.8.5
  - @refrakt-md/transform@0.8.5

## 0.8.4

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.8.4
  - @refrakt-md/ai@0.8.4
  - @refrakt-md/editor@0.8.4
  - @refrakt-md/transform@0.8.4

## 0.8.3

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.8.3
  - @refrakt-md/ai@0.8.3
  - @refrakt-md/editor@0.8.3
  - @refrakt-md/transform@0.8.3

## 0.8.2

### Patch Changes

- Bug fixes and editor improvements including CodeMirror code editing, mobile search fix, structure tab enhancements, and block editor UI refinements.
- Updated dependencies
  - @refrakt-md/transform@0.8.2
  - @refrakt-md/runes@0.8.2
  - @refrakt-md/ai@0.8.2
  - @refrakt-md/editor@0.8.2

## 0.8.1

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.8.1
  - @refrakt-md/ai@0.8.1
  - @refrakt-md/editor@0.8.1
  - @refrakt-md/transform@0.8.1

## 0.8.0

### Patch Changes

- @refrakt-md/editor@0.8.0
- @refrakt-md/runes@0.8.0
- @refrakt-md/transform@0.8.0
- @refrakt-md/ai@0.8.0

## 0.7.2

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.7.2
  - @refrakt-md/transform@0.7.2
  - @refrakt-md/editor@0.7.2
  - @refrakt-md/ai@0.7.2

## 0.7.1

### Patch Changes

- @refrakt-md/ai@0.7.1
- @refrakt-md/editor@0.7.1
- @refrakt-md/runes@0.7.1
- @refrakt-md/transform@0.7.1

## 0.7.0

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.7.0
  - @refrakt-md/ai@0.7.0
  - @refrakt-md/editor@0.7.0
  - @refrakt-md/transform@0.7.0

## 0.6.0

### Minor Changes

- ### Editor

  - WYSIWYG block editor with stacked previews, Shadow DOM isolation, and rail navigation
  - Three-mode editor toggle: Visual, Code, and Preview with unified header bar
  - Category-based sidenav that groups content by route rules from refrakt.config.json
  - Positioned popovers for page/folder/category creation near trigger buttons
  - Rune palette with attribute autocomplete and Markdoc tag highlighting
  - Layout editor with visual navigation editing
  - Frontmatter editor with raw YAML mode
  - Live Svelte preview runtime with full-fidelity layout rendering
  - File watching via SSE for external editor coexistence
  - Responsive viewport selector (desktop/tablet/mobile)
  - Preview link navigation — clicking links in preview navigates the editor
  - Client-side syntax highlighting via Shiki
  - File operations: create, rename, duplicate, delete, toggle draft

  ### Framework neutrality

  - Migrated Diagram, Sandbox, Map, and Comparison runes from Svelte components to framework-neutral web components
  - Added postTransform hooks to identity transform engine for component-free interactive runes

  ### Tooling

  - Python symbol extraction pipeline (`refrakt extract`)
  - Theme distribution: complete export package with CLI install command
  - Icon rune system with Lucide icon set and per-project custom icons via refrakt.config.json

  ### Theme Studio

  - AI-powered theme generation with design expression prompts
  - Per-rune CSS override editor with CodeMirror
  - Undo/redo history with keyboard shortcuts
  - Fixture picker with configurable rune previews and coverage indicator
  - Visual design token editors
  - Export panel with CSS preview, copy, and ZIP download
  - localStorage persistence

  ### Content & site

  - Layout transform engine for computed content in layouts
  - Semantic rune usage throughout documentation
  - Dedicated CLI documentation section

### Patch Changes

- Updated dependencies
  - @refrakt-md/editor@0.6.0
  - @refrakt-md/transform@0.6.0
  - @refrakt-md/theme-base@0.6.0
  - @refrakt-md/runes@0.6.0
  - @refrakt-md/ai@0.6.0

## 0.5.1

### Patch Changes

- @refrakt-md/ai@0.5.1
- @refrakt-md/editor@0.5.1
- @refrakt-md/runes@0.5.1
- @refrakt-md/theme-base@0.5.1
- @refrakt-md/transform@0.5.1

## 0.5.0

### Minor Changes

- ### Theme Development Toolkit

  - **`refrakt scaffold --theme`** generates a complete custom theme with layout, CSS tokens, manifest, test infrastructure, and kitchen sink content
  - **`refrakt inspect`** command for theme developers — rune coverage audit, CSS audit, structure contracts
  - **`refrakt inspect --contracts`** generates HTML structure contracts (`structures.json`) for all 74 runes
  - Theme scaffold produces full `SvelteTheme` runtime integration (manifest, layouts, components, elements)
  - CSS entry points: `base.css` (tokens-only), `svelte/tokens.css` (dev bridge), `styles/runes/*.css` (tree-shakable)

  ### Behaviors Library

  - **`@refrakt-md/behaviors`** — vanilla JS progressive enhancement via `data-rune` attributes
  - Tabs, accordion/reveal, datatable, form, copy-to-clipboard, and preview behaviors
  - Framework-agnostic: works with any renderer, no Svelte dependency

  ### Theme Base Package

  - **`@refrakt-md/theme-base`** — extracted universal rune config, interactive components, and structural CSS
  - 74 rune configurations in identity transform engine
  - Enables multi-theme support with shared component registry

  ### Identity Transform Expansion

  - Moved 8+ Svelte components to pure CSS/identity transform + behaviors
  - `styles`, `staticModifiers`, `postTransform` engine capabilities
  - Context-aware BEM modifiers
  - Design runes (palette, typography, spacing) moved to identity layer
  - Blockquote as CSS-only implementation
  - Migrated all components to `--rf-*` prefixed tokens (removed `aliases.css`)

  ### New Runes

  - **`symbol`** — code construct documentation (functions, classes, interfaces)
  - **`preview`** — component showcase with theme toggle, code/preview tabs, responsive viewports
  - **`sandbox`** — live HTML playground with iframe isolation
  - **`map`** — interactive location visualizations
  - **`design-context`** — token extraction and sandbox injection
  - Standalone design runes: swatch, palette, typography, spacing

  ### Preview Rune Enhancements

  - Three-tab source panel (Markdoc, Rune, HTML)
  - Auto-inferred source mode
  - Responsive bleed with container queries
  - Theme toggle with dark mode support

  ### VS Code Extension

  - Language server with completion, hover, and diagnostics
  - Rune Inspector tree view
  - Sandbox and preview snippets
  - Bundled for distribution

  ### Build & Performance

  - Build-time CSS tree-shaking via content analysis
  - Configurable Shiki syntax highlight themes
  - Form field HTML generation moved into rune schemas

  ### CLI Enhancements

  - Multi-file generation in `refrakt write`
  - Gemini Flash provider as free cloud AI option
  - Improved CLI feedback and scaffolding versions

  ### Mobile & Layout

  - Mobile navigation for Lumina theme (hamburger toggle, scroll lock, breadcrumbs)
  - Blog layout with post listing and index page
  - Layout CSS extracted from Svelte components into standalone files

  ### Bug Fixes

  - Fix preview content leaking between pages on navigation
  - Fix codegroup title placement and pre border
  - Fix tab list decoration dots and duplicate copy button
  - Fix form fields rendering empty
  - Fix map rune streaming init and geocoding fallback
  - Fix timeline dots, lines, and title display
  - Fix duplicate step numbers in Steps rune
  - Fix feature rune dt/dd bug and split/mirror API
  - Fix mobile nav hidden links and panel positioning
  - Fix TS2307 on Cloudflare with dynamic import

### Patch Changes

- Updated dependencies
  - @refrakt-md/transform@0.5.0
  - @refrakt-md/runes@0.5.0
  - @refrakt-md/theme-base@0.5.0
  - @refrakt-md/ai@0.5.0

## 0.4.0

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.4.0
  - @refrakt-md/ai@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [4588cf7]
  - @refrakt-md/runes@0.3.0
  - @refrakt-md/ai@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [c0b3cb5]
  - @refrakt-md/runes@0.2.0
  - @refrakt-md/ai@0.2.0
