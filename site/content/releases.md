---
title: Changelog
description: Release history for refrakt.md
---

# Changelog

{% changelog %}
## v0.14.4

- Framework adapter parity with the SvelteKit reference (SPEC-058) — six capabilities that previously lived only in `@refrakt-md/sveltekit` now ship in working form across `@refrakt-md/astro`, `@refrakt-md/nuxt`, `@refrakt-md/next`, `@refrakt-md/eleventy`, and `@refrakt-md/html`. Application work — no new contracts, no breaking changes.
- **Site-level token-overrides CSS now works in every adapter.** `composeSiteTokensCss` (the generator that turns `theme.presets`, `theme.tokens`, `theme.modes`, and `site.tints` into a stylesheet — SPEC-048 + SPEC-056) moved out of the SvelteKit plugin and into `@refrakt-md/transform/node` as a shared module. The Astro and Nuxt adapters expose it as a Vite virtual module (`virtual:refrakt/site-tokens.css`); Eleventy ships it as a passthrough-managed file; Next.js exposes it through a Server Component helper; the HTML renderer inlines it via a `page-shell` helper. Sites authored on any adapter can now drop tokens into `refrakt.config.json` and skip writing CSS for the common case, just like SvelteKit.
- **SEO meta enrichment from site config in every adapter.** `siteName`, `baseUrl`, `defaultImage`, and `logo` from `refrakt.config.json` now bake into `og:site_name`, absolute `og:url`, image fallback, and WebSite + Organization JSON-LD on every adapter, not just SvelteKit. `SeoToHtmlOptions` threads through the SEO helpers in Astro, Nuxt, Next, Eleventy, and HTML.
- **CSS tree-shaking by used-rune analysis everywhere.** The SvelteKit-only optimisation that emits only the per-rune CSS files for runes actually present in the corpus is now shared via `@refrakt-md/transform/node`'s `used-css` helper. Vite adapters (Astro, Nuxt) get it via a sibling `virtual:refrakt/runes.css` virtual module; non-Vite adapters (Eleventy, Next, HTML) get a `getUsedCssImports` companion. Sites stop shipping the full theme barrel on every framework.
- **Shared pipeline-stats build summary.** The Phase 1/2/3/4 + warnings table that the SvelteKit plugin printed at the end of every build moved into `@refrakt-md/content` and is adopted across every adapter's build path. Eleventy, Astro, Nuxt, and Next now surface the same build summary instead of going silent or inheriting the host framework's default output.
- **`security` and `variables` plugin options surfaced on every non-SvelteKit adapter.** `SecurityPolicy` and Markdoc `$name` variables were SvelteKit-only surfaces even though `loadContent` already accepted them. The Astro `createRefraktLoader`, Nuxt module, Next data helper, Eleventy plugin, and HTML renderer now all forward both options to the loader.
- **Content HMR for non-SvelteKit Vite adapters and Eleventy.** Content HMR (watching the content directory + sandbox examples, invalidating the loader cache on `.md` edits) extends to Astro + Nuxt via Vite `configureServer` and to Eleventy via `addWatchTarget`. The HMR machinery moved from `@refrakt-md/sveltekit` to `@refrakt-md/transform`'s `content-hmr` module so every adapter can reuse it. Next.js intentionally not covered — its dev server already invalidates the loader's import graph when watched files change. The HTML adapter is a static-build helper with no dev server.
- **`template-astro/src/setup.ts` replaced with `createRefraktLoader`.** The Astro starter template's bespoke setup boilerplate folds into a thin `createRefraktLoader` wrapper — the single entry point now handles loader construction, security/variables options, and the new HMR + tokens wiring. Same for the Next.js template's adapter glue.
- **Footer nav two-column mobile rule.** Cosmetic: footer nav drops to two columns on mobile instead of stacking to one, applies to both the auto-columns rendering and the explicit-column variant. Keeps the footer scannable on phone width where one-column footers turn into long scrolls.

## v0.14.3

- Navigation enrichment: build-time slug resolution + richer dropdowns (SPEC-054 + SPEC-055), `{% badge %}` core inline rune, and a docs IA split into separate author and developer handbooks.
- **SPEC-055: build-time slug resolution + active state.** `{% nav %}` slug references now resolve at build time rather than runtime, so the SSR HTML carries fully-resolved `href` attributes and the "multiple items active at once" symptom is gone. Multi-segment slugs (`docs/configuration/plugins`) are the first-class disambiguator when a leaf slug appears in multiple subtrees — ambiguous bare slugs raise a build error pointing at the offending nav with the candidates listed, instead of silently picking the wrong one. Active state is also computed at build time using exact + longest-prefix matching, with the active class stamped into the SSR HTML so there's no client-side flash. Lumina ships dedicated active-state styles; existing site navs migrated in-place to multi-segment slugs where bare slugs collided.
- **SPEC-054: richer dropdowns, column flow, and the strip layout.** `{% nav layout="menubar" %}` now accepts arbitrary block content inside `## groups`, with a position-based intro/footer slot rule: prose or runes appearing _before_ the first list become the panel intro, content appearing _after_ the list becomes the footer. `{% nav layout="columns" %}` gains a `---`-between-sections column-flow rule (each section becomes a column) plus a headingless mode where a flat list renders as a single-column card. A new `{% nav layout="strip" %}` lands for compact secondary link rows — flat by design; warns on `##` headings since grouped strip-like content should use `columns` or `vertical`. `layout="mega"` was explicitly _not_ added — menubar composition covers it via nested `columns` navs in panel slots.
- **`{% badge %}` core inline rune.** New core inline rune for compact metadata pills — sentiment variants (`success`, `warning`, `danger`, `info`, `neutral`), optional `icon` and `count` attributes. Styled with a sentiment-tinted border and background; standalone usage gets a punchier treatment than inline-in-prose. Lives in `packages/runes/src/tags/badge.ts` and `packages/lumina/styles/runes/badge.css`.
- **Auto-enrichment generalised across `auto=true` layouts.** Description and icon resolution (previously only on a subset of layouts) now applies to every `{% nav auto=true %}` invocation — the cross-page pipeline reads `description` and `icon` from each target page's frontmatter and injects them into the rendered nav item. Menubar panels, column navs, and the new strip layout all benefit. Backwards-compatible: omitting frontmatter just renders the title.
- **Mobile nav fix.** The mobile nav panel now docks below the header and is toggled by a single trigger that flips between open and close — the previous separate open/close buttons led to inconsistent state on rotation. The docs sidebar-nav panel offset was restored after it regressed during the menubar work, and the docs toolbar is now sticky on mobile so the breadcrumb stays visible while scrolling.
- **Docs toolbar breadcrumb.** Surfaces the category and current page title — gives the toolbar useful navigation context on deep pages where the URL alone isn't enough.
- **Docs IA split (WORK-238).** The site's docs tree now splits into two handbooks aimed at different audiences. **Docs** (`/docs/*`) is the author handbook — getting started, authoring, configuration, CLI, adapters, MCP. **Extend** (`/extend/*`) is the new developer handbook — rune authoring, plugin authoring, theme authoring, pipeline, security, contributing. Header restructured to five panels (Docs · Runes · Themes · Extend · Project); footer columns updated to match (Learn · Reference · Extend · Project). Old URLs (`/docs/authoring/*`, `/docs/themes/*`, `/docs/plugins/authoring*`, `/docs/security/*`) redirect to their new homes under `/extend/*`. A new author-facing plugin catalog landed at `/docs/configuration/plugins`. Internal cross-doc links, `CLAUDE.md`, and root READMEs swept to the new paths.
- **Hint rune visual cleanup.** Dropped the border on `{% hint %}` — the tinted surface alone separates it from surrounding prose, the extra border was visual noise.

## v0.14.2

- Curated syntax preset lineup phase 1 (SPEC-057) + tint-mode override fix on preset-extending tints + jsonc highlighter language.
- **Six imported syntax palettes.** New `@refrakt-md/lumina/presets/{dracula,solarized,catppuccin,tokyo-night,one-dark,gruvbox}` ship the six most widely-recognised community palettes as first-party presets, following the pattern established by Nord in v0.14.1. Dracula and One Dark are dark-only; Solarized, Catppuccin, Tokyo Night, and Gruvbox carry both light and dark canvases. Each preset uses the SPEC-056 mechanism unchanged — a `ThemeTokensConfig` module with extended `SyntaxTokens` roles, opt-in `color.code.*` for canvas-claiming palettes, and live doc pages at `/themes/<name>` rendered through the scoped-tint mechanism. Application work only; no architectural changes.
- **Tint-mode override fix on preset-extending tints.** When a tint extended a preset module path (e.g. `tint="nord"` → `extends: '@refrakt-md/lumina/presets/nord'`), only the build-time scoped tint stylesheet knew about the preset and emitted `--rf-color-*` directly under `[data-tint="nord"]`. The runtime engine never saw the projected chrome accents because `presetMap` wasn't plumbed through `mergeThemeConfig` → `resolveTintExtends`, so no inline `--tint-*` styles were emitted on tinted elements — `tint.css`'s `[data-color-scheme][data-tint]` selectors collapsed to the colour scheme's neutral defaults regardless of the preset. `presetMap` now threads from the SvelteKit loader path through `assembleThemeConfig` and `mergeThemeConfig` into `resolveTintExtends`, so preset chrome accents land in `TintTokens` shape and the engine emits them as inline `--tint-*` styles. The static scoped tint stylesheet keeps emitting `--rf-color-*`; inline styles override on the same element exactly as `token-stylesheet.ts` already anticipated.
- **`jsonc` added to pre-loaded highlighter languages.** Config snippets across the preset doc pages (and other refrakt docs) use ` ```jsonc ` to fence JSON-with-comments. `jsonc` was intentional but not in Shiki's `DEFAULT_LANGS`, so the highlighter silently fell back to plain text. One-line add — Shiki ships `jsonc` as a bundled language.

## v0.14.1 - May 20, 2026

- Syntax token contract extension (SPEC-056) + diff/compare restyle + mobile and nav polish.
- **SPEC-056: tiered `SyntaxTokens` contract.** `SyntaxTokens` widens from 7 required + 2 optional roles to 7 required + 9 optional. The new optional roles (`type`, `property`, `parameter`, `tag`, `attribute`, `operator`, `number`, `regex`, `decorator`) let preset authors faithfully carry palettes that split distinctions the core collapses (Nord's Frost variants, Tokyo Night, Catppuccin, etc.) while the core stays minimal. Each optional role emits a `var()` fallback chain in the generated CSS, so a preset that doesn't set an optional role still renders correctly — it just shares colour with its documented fallback (`type` → `function`, `property` → `variable`, `tag` → `keyword`, and so on).
- **Extended Shiki css-variables theme.** `@refrakt-md/highlight` now ships an extended css-variables theme that emits the new optional `--rf-syntax-token-*` variables alongside the existing seven. The alias derivation walks the TextMate scope tree to find the right hue for each optional role; presets that don't override a role get the fallback colour through the var() chain.
- **Nord preset module + canonical canvas.** New `@refrakt-md/lumina/presets/nord` ships Arctic Ice Studio's Nord as the first imported palette and the validation case for SPEC-056. The preset also claims the code surface — `theme.code.colorScheme` is `dark` and `color.code.*` projects Nord's canonical bg + fg — so canvas-claiming palettes can ship their full intended look together. Documented at `/themes/nord` with live `{% palette %}` blocks and a code showcase rendered through the scoped-tint mechanism.
- **Scoped tint projection from preset modules.** `theme.tints[].extends` now accepts preset module paths in addition to inline token shapes. When a tint extends a preset, the CSS generator projects the preset's scope-eligible namespaces (`syntax.*`, `color.code.*`, surface tints) into scoped CSS classes — `.rf-tint-nord` and friends — so a documentation page can render a live preset preview inside a page whose active preset is something else entirely. Powers the Nord doc page's live syntax showcase on a niwaki-themed site.
- **Diff + compare restyle.** `{% diff %}` drops the redundant "Before"/"After" labels above each split column (the red/green tints already carry the direction) in favour of an optional full-width header sourced from a new `title` attribute; when `title` is omitted, no header renders. Diff line markers are now a 3px coloured left border (`var(--rf-color-danger)` / `var(--rf-color-success)`) flush with the panel edge instead of an inset, with a slightly stronger background tint via `color-mix`. Equal and empty placeholder lines are both transparent — the previous gray wash on empty placeholders made split columns look like they had different background shades. The `+`/`-` glyph prefix is gone; coloured line numbers carry the directional cue. `{% compare %}` gains a matching `title` attribute that sits above the panels alongside the existing per-panel `labels` (those stay — they identify alternatives, not direction).
- **`theme.code.colorScheme` now cascades through code-bearing wrappers.** The highlight walk previously stamped `data-color-scheme` only on `<pre data-language>`, so the diff's outer `<pre data-name="code">` (which has no `data-language` — only its inner line-content spans do) never received the attribute and the override silently no-op'd on diffs. The walk now stamps the attribute on any `data-rune` wrapper that hosts a highlighted descendant, which generically covers diff, compare, codegroup, and any future code-bearing rune without per-rune knowledge in the transform.
- **Sidebar nav polish.** Collapsible nav groups now animate height transitions from JS (cross-browser consistent across mobile Safari and Firefox) instead of relying on `grid-template-rows` interpolation, which bounced on Firefox. Active items pick up a primary-tinted background instead of the neutral hover style. URL-aware auto-open is unchanged.
- **Mobile layout fixes.** Hero and CTA action rows now stack full-width below 640px instead of trying to fit side-by-side and overflowing. Table cells use a single mobile font-size so adjacent columns don't render at visibly different sizes on iOS. Mobile Safari's automatic text-size adjustment is disabled on `html` so the user's set font-size is respected.

## v0.14.0 - May 19, 2026

- **Typed design tokens contract.** `ThemeTokensConfig` is now the canonical authoring surface for theme values. Site authors can drop tokens directly into `refrakt.config.json` under `theme.tokens` / `theme.modes` and skip writing CSS for the common case. Validated at build time against the contract; presets and modes deep-merge in declared order.
- **Two opt-in Lumina presets.** `tideline` preserves the previous cream-and-navy chrome (now with IBM Plex Sans/Mono typography); `niwaki` is a syntax-only preset with a Japanese-garden palette. Both demonstrate that scoped presets (syntax-only, chrome-only, font-only) are first-class.
- **Per-page tint cascade.** Frontmatter `tint`, `tint-mode`, and `tint-lock` cascade through the layout tree; the refrakt site uses this to lock its marketing pages to dark while letting docs / runes / plan-docs honour the user's preference. New `ThemeToggle` component for unlocked subtrees; pre-paint script eliminates FOIT on locked routes.
- **`theme.code.colorScheme`** lets sites force fenced code blocks to a fixed light/dark scheme regardless of page mode (Stripe/Vercel-style always-dark code on light pages). Replaces the hand-mirrored `pre, pre[data-language]` override pattern that previously drifted from the active preset.
- **Faster SvelteKit dev server.** The virtual content module now caches the loaded Site across navigations and invalidates only on `.md` edits — pages load near-instantly after the first navigation instead of re-running the cross-page pipeline per click.
- **Nav primitives shipped.** Four contextual `nav` layouts (sidebar, header menubar, footer columns, section-landing cards), collapsible sidebar groups with URL-aware auto-open, and a new `pagination` rune for sequential reading flows.
- **Prism logo + favicon set.** Monochrome prism mark replaces the previous cube; 18-PNG favicon set generated from the canonical SVG via `packages/lumina/scripts/generate-favicons.mjs`.
- **Syntax contract simplified.** `SyntaxTokens.number` and `SyntaxTokens.type` removed; `constant` promoted to a direct slot covering numeric literals plus boolean/null/Symbol (matches Shiki's `token-constant` vocabulary). Migrate `syntax.number` → `syntax.constant`; drop `syntax.type` (no Shiki path existed for it).
- **Shiki CSS variables renamed.** `--shiki-*` is now `--rf-syntax-*` (e.g. `--shiki-token-keyword` → `--rf-syntax-token-keyword`). Custom CSS reading the highlighter's variables directly needs to update; themes that consume only the contract surface are unaffected.
- **Lumina's default appearance changed.** The previous cream-and-navy palette moved into the `tideline` preset; the new neutral default is a quiet warm-neutral (#f6f4ef / #1c1a17) designed to disappear behind content. Sites that want the old appearance opt in with `"presets": ["@refrakt-md/lumina/presets/tideline"]`.
- **Tint shape aligned with token vocabulary.** `TintTokens` / `TintDefinition` field names and CSS custom property names (`--tint-*`) updated for consistency with the rest of the contract; lumina + plugin tint configs migrated.
- **Default typography changed.** Outfit → Inter (body) and JetBrains Mono (code). Sites that prefer the old typography pin `font.sans` / `font.mono` back via `theme.tokens.font`, or opt into the tideline preset (which uses IBM Plex Sans/Mono).
- **`RefraktConfig.packages[]` removed.** The deprecated top-level shorthand for `config.plugins[]` is gone (deprecation warning shipped in v0.12.0). Use `plugins[]` directly.
- the tint-vocabulary rename mapping
- the Shiki → `--rf-syntax-*` variable rename
- the syntax-token contract change (`number`/`type` → `constant`)
- restoring the previous appearance via the tideline preset
- the per-page tint cascade frontmatter fields

## v0.12.0 - May 11, 2026

- Rename "rune packages" to "plugins" and unify with CLI plugins. Plugins now contribute runes, layouts, theme config, pipeline hooks, behaviors, **and** CLI commands through a single npm package.
- **Breaking changes:**
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
- **Migration:**
- Rename `RunePackage` to `Plugin` and `loadRunePackage`/`mergePackages` to `loadPlugin`/`mergePlugins` in your code.
- In `refrakt.config.json`, rename per-site `"packages": [...]` to `"plugins": [...]`. If you had a top-level `"packages"` shorthand under flat shape, move it to `"plugins"`.
- Replace any calls to `refrakt package validate` with `refrakt plugins validate`.
- Add an opt-in `SecurityPolicy` for the transform pipeline so hosted products can render untrusted author content with layered defences (WORK-177).
- The policy ships with three tiers, each adding a layer on top of the previous one:
- **Tier 1 — `'strict'`**: in-package, no JS. The schema transform runs the new `sanitizeSandboxContent` helper which strips `<script>` blocks, `on*` event handlers, `javascript:` URLs, and `<iframe>`/`<object>`/`<embed>` tags. The client iframe is built with `sandbox="allow-scripts"` only (drops `allow-same-origin`), and a non-removable visual banner is rendered above the iframe. Only tier with a hard guarantee from the package alone.
- **Tier 2 — `{ trust: 'untrusted', allowJs: true }`**: srcdoc + meta-CSP. Author scripts run, but the iframe gets a unique opaque origin and the srcdoc head is prefixed with a meta-CSP that closes `connect-src`, `form-action`, `img-src` (data + permitted CDN origins only), and gates `script-src`/`style-src` to `'unsafe-inline'` plus the framework preset and declared dependency origins. Closes data exfiltration, off-site form posts, tracking pixels, and external script loads. Does not close fingerprinting, cryptojacking, or browser-exploit chains.
- **Tier 3 — `{ ..., sandboxOrigin: 'https://sandbox.example.com' }`**: separate-origin escape hatch. The iframe loads from the host endpoint instead of `srcdoc`, content is delivered via `postMessage` after a `rf-sandbox-ready` handshake, and the host serves real CSP response headers. Required if you need `frame-ancestors` / `report-uri`. Endpoint contract documented in `site/content/docs/security/`.
- The default remains `'trusted'` — no behaviour change for self-hosted users. The policy flows through `config.variables.__securityPolicy` so plugins authoring risky runes can honour it from their own schema transforms; see the new "Honouring the security policy" section in `site/content/docs/plugins/authoring.md` for the contract.
- ```ts import type { SecurityPolicy } from "@refrakt-md/types";
- // SvelteKit Vite plugin refrakt({ security: "strict" });
- // loadContent() positional arg loadContent(dir, "/", icons, tags, plugins, sandboxDir, vars, "strict"); ```
- v0.11.0 config follow-ups (WORK-176):
- **Schema URL versioning.** The JSON Schema is now published at a versioned URL (`https://refrakt.md/schemas/v0.11/refrakt.config.schema.json`) with the unversioned URL kept as a "latest" alias. `create-refrakt` scaffolds derive the versioned URL from the package version at scaffold time so old projects don't get false validation errors when later releases add fields. Versioning policy documented in `site/content/docs/configuration/schema.md`.
- **Optional mirrored fields.** `RefraktConfig.contentDir`, `theme`, and `target` are now typed as optional (`?:`) — they were strictly required strings before, which papered over the multi-site case where they're undefined. Adapter code that read these directly (`refrakt theme install`/`info`, `refrakt edit`, the Astro/HTML/SvelteKit scaffold templates) now goes through `resolveSite(config).site.contentDir` and friends.
- **Flat-shape deprecation.** Loading a flat-shape `refrakt.config.json` (top-level `contentDir`/`theme`/`target` without a `site` wrapper) now emits a one-time deprecation warning per process. `refrakt config migrate` mentions the v1.0 removal target in its output. Docs (`overview.md`, `migration.md`, `sites.md`, `plugins.md`) replace flat-shape examples with the nested form and add `v0.12 → v1.0` deprecation callouts.
- **`target` field downgraded to documentation-only.** No adapter actually validates or consumes `site.target`, so `SiteConfig.target` is now optional and the SvelteKit validator no longer requires it on flat-shape configs. The schema marks `target` `deprecated: true` with a note that it's slated for removal in v1.0.
- Auto-migrate the legacy `packages` config field to `plugins` and emit a one-time deprecation warning. The field was renamed in v0.12.0 when rune packages and CLI plugins were unified, but the parser was silently ignoring the legacy field rather than warning, which broke sites that still used `sites.X.packages`. The legacy field now auto-migrates with a console warning and will be removed in v1.0.

## v0.11.3 - May 4, 2026

- Fix two bugs in the MCP server:
- `serverInfo.version` was hardcoded as `0.10.1` and never tracked the package version. It now reads the version from `package.json` at startup so each release reports correctly.
- Tool calls that returned arrays (notably `refrakt.plugins_list`) failed the SDK's response validator because `structuredContent` was set unconditionally and the SDK rejects non-record values. Arrays are now wrapped under `{ items: [...] }`, and the field is omitted entirely for non-object results.
- Fix plan tools failing with `ENOENT: ... 'plan'` when the MCP server is launched from outside the project directory (e.g. via `scripts/start-mcp.sh`, which `cd`s to `/tmp` before exec).
- The MCP server already accepted `--cwd` and forwarded it to its core tools, but plugin-contributed tools dropped it: `buildPluginTool` called `command.mcpHandler(input)` without the cwd context, so `@refrakt-md/plan`'s handlers fell back to `process.cwd()` when resolving `refrakt.config.json` and the default `'plan'` directory.
- `@refrakt-md/types`: `CliPluginCommand.mcpHandler` now takes an optional second `ctx?: McpHandlerContext` argument carrying the server's resolved cwd. New `McpHandlerContext` type is re-exported from the package entry. The change is non-breaking — existing handlers that ignore the second argument keep compiling.
- `@refrakt-md/mcp`: `buildPluginTool` forwards the server's `ctx` to the plugin's `mcpHandler`. The argv-shimming fallback path is unchanged (it still uses `process.cwd()`); plugins that need project-cwd awareness should provide an explicit `mcpHandler`.
- `@refrakt-md/plan`: every `*McpHandler` accepts the new `ctx`, threads it into `resolvePlanDir`, and absolutizes the resolved `dir` against `ctx.cwd` so relative paths from any source (flag, env, config, default) consistently resolve against the project root.

## v0.11.2 - May 3, 2026

- Fix MCP server failing to invoke the refrakt CLI for `inspect`, `contracts`, `reference`, `inspect_list`, and `plugins_list` tools.
- The MCP server resolves the CLI bin via `require.resolve('@refrakt-md/cli/package.json')`, but the cli package's `exports` map didn't declare `./package.json`, so Node threw `ERR_PACKAGE_PATH_NOT_EXPORTED`. The MCP server's catch branch silently fell back to the bare string `'refrakt'`, which `execFileSync` then tried to resolve as a relative path against the user's cwd, producing a confusing `Cannot find module '<cwd>/refrakt'` error.
- `@refrakt-md/cli` now exports `./package.json` so the existing resolution path works.
- `@refrakt-md/mcp` adds a secondary fallback (resolve via the always-exported `lib/plugins.js` and walk up to the package root) and now throws a clear error instead of returning a bogus bin path. Both core tools and resource handlers go through the shared helper.

## v0.11.1 - May 3, 2026

- Include `packages/mcp` in the root build chain so the published tarball contains `dist/`. Previously the package was added to the workspace but never built during `npm run release`, causing `npx -y @refrakt-md/mcp` to fail because `bin: ./dist/bin.js` was missing from the npm artifact (only `package.json` shipped).

## v0.11.0 - May 3, 2026

- v0.11.0 — unified config + multi-site + MCP server.
- **Unified `refrakt.config.json`**. New `$schema`, `plugins`, `plan`, `site` / `sites` sections collapsed into a canonical sites map by `normalizeRefraktConfig()` in `@refrakt-md/transform/node`. Flat / singular / plural shapes all valid; single-site fields mirror to the top level for backwards compat. JSON Schema published from `@refrakt-md/transform` and referenced from a repo-root symlink for in-repo `$schema` references.
- **Plugin discovery**. `discoverPlugins()` in `@refrakt-md/cli/lib/plugins` resolves `config.plugins` first, then falls back to scanning `package.json` deps + `node_modules/@refrakt-md/*`. CLI dispatch uses it for routing, "Did you mean?" suggestions on misspellings, and `--help` plugin listing. New `refrakt plugins list` command.
- **Multi-site support**. New `--site <name>` flag on site-scoped commands (`inspect`, `contracts`, `scaffold-css`, `validate`, `package validate`). Resolves via `resolveSite()`; multi-site without `--site` errors with available names; unknown name errors with a suggestion. All five framework adapters (`sveltekit`, `astro`, `nuxt`, `next`, `eleventy`) accept a `site?: string` option.
- **`@refrakt-md/mcp`** (new package). Model Context Protocol server wrapping the refrakt CLI. Stdio transport, six core tools (`refrakt.detect`, `refrakt.plugins_list`, `refrakt.reference`, `refrakt.contracts`, `refrakt.inspect`, `refrakt.inspect_list`), plugin-discovered tools registered as `<namespace>.<name>`, and read-only resources (`refrakt://detect`, `refrakt://plan/index`, `refrakt://plan/<type>/<id>`, etc.). Errors return structured envelopes with `errorCode` + `hint`. `--cwd <path>` overrides cwd. Long-running commands (`plan.serve`, `plan.build`) intentionally excluded.
- **Plan + MCP integration**. New `inputSchema` / `outputSchema` / `mcpHandler` fields on `CliPluginCommand`. Plan commands ship MCP bindings (`next`, `update`, `create`, `status`, `validate`, `next-id`, `init`, `history`, `migrate`). Plan package consumes the unified config via `resolvePlanDir()` (precedence: flag → env → config → `'plan'`). `plan init` scaffolds `refrakt.config.json` by default (`--no-config` opts out).
- **`refrakt config migrate`**. New subcommand. Default is dry-run with a line diff; `--apply` writes. `--to nested` (default) handles flat → singular; `--to multi-site --name <n>` handles singular → plural. Idempotent. Auto-populates `plugins` from `discoverPlugins()` on first migration.
- **`.mcp.json` scaffolding**. `plan init` and `create-refrakt` (all six site scaffolds) drop a project-scoped `.mcp.json` registering `@refrakt-md/mcp` for MCP-aware agents (Claude Code, Cursor). Gated on agent detection; `--no-mcp` opts out.
- **Site docs**. New `site/content/docs/configuration/` (overview, plugins, plan, sites, migration, schema) and `site/content/docs/mcp/` (overview, installation, tools, resources, errors). `packages/authoring.md` extended with an "Adding CLI Commands and MCP Tools" section. `CLAUDE.md` gains an MCP section directing agents to prefer MCP tools over the CLI when both are available.
- **Path resolution semantics**. Nested-shape paths (`contentDir`, `sandbox.examplesDir`, `theme`, `overrides`, `runes.local`) now resolve relative to the config file's directory when a `configDir` is provided to `normalizeRefraktConfig()`. Flat-shape paths remain cwd-relative for legacy projects. `DEFAULT_SITE_NAME` exported as `'main'` (was `'default'`) so flat / singular configs promote to `sites.main` and match the `create-refrakt` scaffolds.

## v0.10.1 - April 29, 2026

- Add nav top-level links support. Items before the first heading in a `{% nav %}` rune now render as prominent top-level links above the grouped navigation, styled with `.rf-nav__top-level`. Explicit markdown links (`[Label](/path)`) in nav items pass through as-is rather than being treated as slugs for web component resolution.

## v0.10.0 - April 28, 2026

- Version bump for coordinated release
- Adopt `{ID}-{slug}.md` as the canonical filename for plan items. `refrakt plan create` now emits e.g. `WORK-058-my-task.md` instead of `my-task.md` for every auto-ID type (work, bug, spec, decision). Milestones still use their semver names (`v1.0.0.md`).
- New command: `refrakt plan migrate filenames` renames legacy slug-only files in existing projects. Use `--apply --git` to apply with `git mv`.
- `refrakt plan validate` now emits `filename-missing-id` / `filename-id-mismatch` warnings when a file's name doesn't match its frontmatter `id`.
- `refrakt plan init` no longer scaffolds the root `index.md`, type-level `index.md` pages, or status filter pages. The plan site synthesises these dynamically.

## v0.9.9 - April 19, 2026

- Expand `refrakt plan init` to fully wire the host project for agent use:
- **AGENTS.md is now canonical** — full workflow content lives in `AGENTS.md` at the project root; tool-specific files (`CLAUDE.md`, `.cursorrules`, etc.) get one-line pointers to it.
- **Host `package.json` wiring** — adds `@refrakt-md/cli` + `@refrakt-md/plan` to `devDependencies` (pinned to the running plan version) and `"plan": "refrakt plan"` to `scripts`. Walks up to find the install root (respects npm/pnpm/yarn/lerna workspaces). Never clobbers existing keys.
- **Claude SessionStart hook** — writes `.claude/settings.json` with a hook that runs the detected package manager's install command if `node_modules/.bin/refrakt` is missing. Gated on Claude detection (explicit `--agent claude` or auto-detect seeing `CLAUDE.md`). PM detection happens at hook execution time by reading the lockfile, so switching package managers later just works.
- **`./plan.sh` wrapper script** — POSIX script that installs deps on first run and defers to `npx refrakt plan "$@"`. Works in any agent environment where hooks aren't available.
- **Opt-out flags** — `--no-package-json`, `--no-hooks`, `--no-wrapper`, and `--minimal` (all three) for users who want bare scaffolding.
- Also fixes the `esbuild` dependency leak in `@refrakt-md/plan`: the `bundleBehaviors` helper now lazy-imports `esbuild`, so non-build plan commands (`status`, `next`, `update`, etc.) no longer fail to load when esbuild isn't installed. `esbuild` is declared as an optional peer dependency.

## v0.9.8 - April 15, 2026

- Add edge-safe `./render` entry point for rendering plan entity Markdoc source to a serialized RendererNode. Works on Cloudflare Workers — no Node.js dependencies. Consumers apply their own theme's identity transform and render to HTML.

## v0.9.7 - April 15, 2026

- Plan package improvements: tool-agnostic `plan init` with `--agent` flag for multi-editor support, renamed plan directories to plural form (specs/, decisions/, milestones/), and refactored internals for edge runtime compatibility with new entry points (./diff, ./relationships, ./cards)

## v0.9.6 - April 14, 2026

- Bug Fixes:
- Fix ThemeShell build failure ({@const} inside {#if} block)
- Fix lumina tsconfig to flatten dist output, restoring editor icons
- Fix tab partition and post-processing for split header/preamble slots
- Fix breadcrumb separator and preview rendering
- Fix codegroup title invisible due to generic section color override
- Fix embed rune inheriting browser default figure margin
- Fix visual block preview ignoring theme background color
- Fix sandbox dark mode on mobile browsers
- Fix missing functionality in Nuxt, Next.js, and Eleventy adapters
- Fix SEO meta tags not rendering
- Fix gallery responsive behavior
- Fix duplicate docs nav entry (themes/configuration renamed to config-api)
- Fix CI crash on undefined xref id and missing scopedRefs
- Add configurable defaultImage fallback for og:image meta tag
- Add WebSite/Organization JSON-LD for SEO
- Add baseUrl and siteName config fields
- Add filesystem-agnostic plan scanner API (parseFileContent, scanPlanSources)
- Add preamble slot with title and blurb extraction for plan entities
- Split plan entity header into primary and secondary badge groups
- Implement tab layout for plan entity pages
- Implement git-native entity history (plan-history rune)
- Implement mobile section nav and desktop TOC filtering
- Implement plan package hardening (knownSections, validation, cross-references)
- Add source attribute to work/bug/decision runes for spec traceability
- Simplify codegroup chrome: skip tabs for single fence without labels
- Move event register button from header to bottom of component

## v0.9.5 - April 10, 2026

- Fix sidenote rune rendering empty due to minimal density hiding body
- Fix juxtapose label rendering and restyle toggle buttons
- Unwrap runes from paragraph wrappers in juxtapose panels
- Fix diagram surface and style mermaid diagrams with Lumina tokens
- Fix mediatext wrap mode ignoring ratio attribute
- Fix budget estimate indicator and improve examples
- Fix sandbox dark mode on mobile browsers
- Improve SEO and AI discoverability
- - Fix annotate rune: margin notes invisible, inline notes not inline

## v0.9.4 - April 9, 2026

- Fix Vite dev server warnings: deprecated svelte:component, dynamic imports, void elements
- Fix gallery responsive behavior: reset margin, columns, and gap at breakpoints
- Fix pipeline hooks: unwrap LoadedPackage to RunePackage for community packages
- Fix Astro adapter: manifest JSON import, layouts compilation, sandbox rendering
- Add syntax highlighting to Astro template
- Derive Astro theme from config instead of hardcoding lumina
- Remove table/pre element overrides in favor of Markdoc node schemas
- Fix runes broken by table/codeblock wrapper divs
- Improve form rune styling: surface background, full width, inline alignment
- Fix figure rune image extraction
- Align mark.svg dark mode color with Lumina palette
- Add SVG favicon using existing mark.svg logo

## v0.9.3 - April 9, 2026

- Bug fixes, rune restyling, and new features since v0.9.2.
- Add `createRefraktLoader` and `virtual:refrakt/content` to eliminate content loading boilerplate
- Add `--css` flag to plan build/serve for custom style overrides
- Fix content HMR with dev-mode cache bypass (`createSiteLoader`)
- Fix create-refrakt: interactive mode, CSS imports, community package loading
- Fix density CSS leaking into nested runes with different density
- Fix empty aggregation rune showcases on site
- Fix missing bottom margin on code fences in prose
- Fix preview source panel horizontal scroll on mobile
- Fix hint header margin and vertical spacing
- Fix testimonial star rating and author name/role styling
- Fix details and diff rune styling issues
- Fix blockquote quote mark overlap
- Fix chart rune default figure margin
- Fix diff split mode on mobile with horizontal scroll
- Fix codegroup title font size and tab readability
- Fix compact density title size
- Fix build order and implicit any types in nuxt module
- Add missing exports fields for NodeNext module resolution
- Restyle API, bond, budget, details, event runes with metadata dimension system
- Unify design rune styling with consistent titles and surfaces
- Update Lumina default palette: cerulean, frosted blue, warm parchment
- Thin table header border, cleaner table look with better mobile column sizing
- Use logo apricot for syntax keywords
- Document Svelte component override props and snippet pattern
- Update Astro adapter docs for component override support
- Audit and fix site documentation gaps
- Redesign milestone progress indicator as two-row layout

## v0.9.2 - April 7, 2026

- Add multi-framework adapter packages (Astro, Eleventy, Next.js, Nuxt, React, Vue) with ADR-008 framework-native component interfaces. Implement ADR-009 framework-agnostic theme architecture. Add vue, astro, and jinja to Shiki default languages.

## v0.9.1 - April 3, 2026

- Named slots with ordering for structured element placement
- Repeated element generation for multi-instance structures
- Element projection (hide, group, relocate) for layout control
- Value mapping and configurable density contexts
- Migrate postTransform uses to declarative config
- Replace legacy Model class with `createContentModelSchema` across all runes (WORK-099–102)
- Replace `useSchema`/`Type` system with inline rune identifiers (ADR-005)
- Remove legacy Model class, decorators, `createSchema`, and `NodeStream`
- File-derived timestamps for runes (SPEC-029)
- Move extract command from CLI to `@refrakt-md/docs` package
- Fix accordion item schema metadata duplication
- Fix paragraph-wrapped images in juxtapose panels
- Auto-assign IDs and detect duplicates in plan CLI
- Inspect and contracts updated for structure slots

## v0.9.0 - March 30, 2026

- Metadata dimensions system: density, section anatomy, media slots, checklist, sequential items, and interactive state dimensions added to rune configs and identity transform engine
- Universal dimension CSS in Lumina theme with generic metadata styling
- Shared split layout CSS with two-mode mobile collapse for marketing and storytelling runes
- Rune output standardization: recipe, howto, playlist, character, realm, and faction runes refactored to consistent 3-section structure
- @refrakt-md/plan community rune package for project planning with spec, work, bug, decision, and milestone runes
- Markdoc partials support with LSP and VS Code integration
- xref rune for inline cross-referencing via entity registry
- Sandbox directory source support for multi-file sandboxes
- labelHidden option to hide self-explanatory metadata labels
- Rename intro header to preamble to disambiguate from chrome header
- Lumina design refresh: soft gray page background, borderless surfaces, bordered pill badges, transparent banners
- `--audit-dimensions` and `--audit-meta` flags for refrakt inspect CLI
- Fix tint-mode CSS stripped in production builds
- Fix preview rune light mode toggle when OS is in dark mode
- Fix sandbox ignoring tint-mode by reading data-color-scheme attribute
- Fix overflow:hidden on media zones clipping preview bleed
- Fix Feature config: sections/mediaSlots key should be 'media' not 'image'
- Fix docs layout 3-track grid leaking into rune articles
- Fix media/scene positioning in storytelling runes
- Fix missing dimensions CSS in production build
- Fix storytelling pipeline TypeScript narrowing errors
- Fix theme CSS resolution to load full theme instead of tokens only
- Many Lumina CSS refinements: recipe cover ratio, CTA alignment, hero centering, testimonial borders, blog post hover shadows

## v0.8.5 - March 20, 2026

- Add blog rune for listing posts with filtering and sorting. Expose frontmatter and page data as content-level Markdoc variables. Redesign juxtapose rune with --- delimiter and overlay labels. Auto-discover runes in VS Code extension and editor. Fix map rune collapsed border and add spacing support. Fix juxtapose tint mode.

## v0.8.4 - March 19, 2026

- Fix scaffolded sites not loading community packages or applying identity transform. Fix preview rune code toggle broken by data-field/data-name mismatch. Add smarter heading-level detection in sections content model for preamble support. Restore ordered-list-based steps authoring pattern.

## v0.8.3 - March 19, 2026

- Add draggable popover and clickable prose blocks
- Redesign prose editor with popover tabs and hover inline editing
- Group consecutive prose elements into editable prose blocks
- Fix Content tab cursor reset on Enter/Backspace in prose editor
- Fix prose sections not rendering in block editor
- Add editor compatibility to all rune packages: core, marketing, docs, learning, business, places, storytelling, design, and media runes
- Redesign recipe, steps, howto, tabs, preview, pullquote, event, organization, and plot runes
- Polish playlist, track, audio, and storytelling runes
- Add scene images and split layouts to storytelling runes (realm, faction)
- Fix cast rune layout, budget rune currency, dark mode text in preview
- Add TabPanel engine config entry with BEM class
- Sync language server and VS Code extension with current runes
- Polish datatable rune and unify table wrapper class

## v0.8.2 - March 17, 2026

- Bug fixes and editor improvements including CodeMirror code editing, mobile search fix, structure tab enhancements, and block editor UI refinements.

## v0.8.1 - March 16, 2026

- Add @refrakt-md/html pure HTML renderer, content-model-driven Structure tab in editor, inline editing popovers, accessible tab structure for tabs/codegroup, feature rune redesign with granular field editing, and editor hover tooltips with edit hint controls.

## v0.8.0 - March 10, 2026

- Declarative content model: migrated 50+ runes from imperative Model classes to `createContentModelSchema`
- Cross-page pipeline: EntityRegistry, breadcrumb auto-resolution, aggregated data
- New media runes: `playlist`, `track`, `audio` with full schema.org RDFa annotations
- Section header BEM classes with pill-badge eyebrow styling
- Automatic RunePackage version sync on release
- Production CSS tree-shaking: kebab→PascalCase key mismatch
- Audio player: idempotency guard, playlist interaction, autoplay race condition
- Editor serializing numerical attributes as strings
- Metadata hiding in rune CSS breaking nested runes
- Showcase centering and place attribute in split layout
- Type safety: replace string booleans with proper boolean types
- `style` attribute renamed to `variant` across all runes
- `typeof`/`property` renamed to `data-rune`/`data-field` across the pipeline

## v0.7.2 - March 4, 2026

- Add cross-page pipeline infrastructure with `EntityRegistry`, `runPipeline()`, and `PackagePipelineHooks`. Includes nav auto mode, pipeline build output, design token context propagation, and editor preview/autocomplete support for community runes.
- Fix duplicate BEM classes on runes nested inside `data-name` elements. Make `autoLabel` recursive in the identity transform engine so eyebrow, headline, and blurb children inside `<header>` wrappers receive BEM classes. Add `pageSectionAutoLabel` to all marketing and core page-section runes.
- Add pill-badge eyebrow variant: an eyebrow paragraph containing a link renders as a rounded pill with a border, muted prose text, and primary-colored link. The entire pill is clickable via a CSS `::before` overlay.
- Add `mockup` rune to `@refrakt-md/design` for wrapping content in device frames.
- Fix multiple preview runtime issues: `structuredClone` errors, `DataCloneError` when sending `routeRules` via `postMessage`, and cache not invalidating on source changes. Remove `ComponentType` and `PropertyNodes` from the schema system.

## v0.7.1 - March 3, 2026

- Fix production builds excluding CSS for runes from @refrakt-md/\* rune packages. The CSS tree-shaker now uses the assembled config (core + package runes) instead of only the core theme config when determining which rune CSS files to include.

## v0.7.0 - March 3, 2026

- Introduce 8 official @refrakt-md/\* rune packages: marketing, docs, storytelling, places, business, design, learning, and media. 33 runes migrated from core @refrakt-md/runes into domain-specific installable packages. Rune schema interfaces moved from @refrakt-md/types to owning packages. Added package tooling (validate command, fixture discovery, AI prompt extensions). Site docs reorganized to reflect official rune packages.

## v0.6.0 - March 2, 2026

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
- Migrated Diagram, Sandbox, Map, and Comparison runes from Svelte components to framework-neutral web components
- Added postTransform hooks to identity transform engine for component-free interactive runes
- Python symbol extraction pipeline (`refrakt extract`)
- Theme distribution: complete export package with CLI install command
- Icon rune system with Lucide icon set and per-project custom icons via refrakt.config.json
- AI-powered theme generation with design expression prompts
- Per-rune CSS override editor with CodeMirror
- Undo/redo history with keyboard shortcuts
- Fixture picker with configurable rune previews and coverage indicator
- Visual design token editors
- Export panel with CSS preview, copy, and ZIP download
- localStorage persistence
- Layout transform engine for computed content in layouts
- Semantic rune usage throughout documentation
- Dedicated CLI documentation section

## v0.5.1

- Fix scaffolded dependency versions to derive from package version at runtime instead of hardcoding. Previously, the template hardcoded `^0.4.0` which with 0.x semver resolved to `<0.5.0`, causing newly scaffolded sites to install incompatible older packages. Also fixes invalid rune attribute usage in the kitchen sink template.

## v0.5.0 - February 23, 2026

- **`refrakt scaffold --theme`** generates a complete custom theme with layout, CSS tokens, manifest, test infrastructure, and kitchen sink content
- **`refrakt inspect`** command for theme developers — rune coverage audit, CSS audit, structure contracts
- **`refrakt inspect --contracts`** generates HTML structure contracts (`structures.json`) for all 74 runes
- Theme scaffold produces full `SvelteTheme` runtime integration (manifest, layouts, components, elements)
- CSS entry points: `base.css` (tokens-only), `svelte/tokens.css` (dev bridge), `styles/runes/*.css` (tree-shakable)
- **`@refrakt-md/behaviors`** — vanilla JS progressive enhancement via `data-rune` attributes
- Tabs, accordion/reveal, datatable, form, copy-to-clipboard, and preview behaviors
- Framework-agnostic: works with any renderer, no Svelte dependency
- **`@refrakt-md/theme-base`** — extracted universal rune config, interactive components, and structural CSS
- 74 rune configurations in identity transform engine
- Enables multi-theme support with shared component registry
- Moved 8+ Svelte components to pure CSS/identity transform + behaviors
- `styles`, `staticModifiers`, `postTransform` engine capabilities
- Context-aware BEM modifiers
- Design runes (palette, typography, spacing) moved to identity layer
- Blockquote as CSS-only implementation
- Migrated all components to `--rf-*` prefixed tokens (removed `aliases.css`)
- **`symbol`** — code construct documentation (functions, classes, interfaces)
- **`preview`** — component showcase with theme toggle, code/preview tabs, responsive viewports
- **`sandbox`** — live HTML playground with iframe isolation
- **`map`** — interactive location visualizations
- **`design-context`** — token extraction and sandbox injection
- Standalone design runes: swatch, palette, typography, spacing
- Three-tab source panel (Markdoc, Rune, HTML)
- Auto-inferred source mode
- Responsive bleed with container queries
- Theme toggle with dark mode support
- Language server with completion, hover, and diagnostics
- Rune Inspector tree view
- Sandbox and preview snippets
- Bundled for distribution
- Build-time CSS tree-shaking via content analysis
- Configurable Shiki syntax highlight themes
- Form field HTML generation moved into rune schemas
- Multi-file generation in `refrakt write`
- Gemini Flash provider as free cloud AI option
- Improved CLI feedback and scaffolding versions
- Mobile navigation for Lumina theme (hamburger toggle, scroll lock, breadcrumbs)
- Blog layout with post listing and index page
- Layout CSS extracted from Svelte components into standalone files
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

## v0.4.0 - February 16, 2026

- `@refrakt-md/highlight` — Shiki-based syntax highlighting with Markdoc grammar support, CSS variables integration, and copy-to-clipboard
- `@refrakt-md/transform` — Identity transform engine extracted into its own package (BEM classes, structural injection, meta consumption)
- `form` — Form component with field validation
- `comparison` — Comparison matrices and tables
- `storyboard` — Story visualization
- `reveal` — Progressive disclosure
- `conversation` — Chat-style content
- `bento` — Grid layout component
- `annotate` — Annotated content
- Merged `@refrakt-md/theme-lumina` into `@refrakt-md/lumina/svelte` as a subpath export
- SvelteKit plugin now derives theme adapter dynamically from `config.theme` + `config.target`
- Theme packages now serve framework adapters via subpath exports — no separate packages per framework
- Replaced Editor rune with dedicated CodeGroup component for multi-file code blocks
- Added Recipe, HowTo, Event, Person, Organization, and Dataset schema.org extractors
- Unified actions pattern across Hero and CTA runes
- Blog layout added to Lumina theme
- Copy-to-clipboard for code blocks
- Test coverage expanded from ~299 to 370 tests

## v0.3.0 - February 13, 2026

- New runes and bug fixes
- recipe — Ingredients, steps, chef's tips with prep/cook time metadata howto — Step-by-step instructions with tools/materials list event — Event info with date, location, registration URL cast (alias: team) — People directory with name/role parsing organization (alias: business) — Structured business information
- datatable (alias: data-table) — Interactive table with sortable/searchable attributes api (alias: endpoint) — API endpoint documentation with method badges diff — Side-by-side or unified diff between two code blocks 0chart — Bar/line/pie/area charts from Markdown tables diagram — Mermaid.js diagram rendering
- Other: sidenote (aliases: footnote, marginnote) — Margin notes, footnotes, and tooltips

## v0.2.0 - February 12, 2026

- Added SEO layer
{% /changelog %}
