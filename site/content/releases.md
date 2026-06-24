---
title: Changelog
description: Release history for refrakt.md
---

# Changelog

{% changelog %}
## v0.25.0

- v0.25.0 — Distribution & onboarding
- Make the refrakt stack distributable and cut the blank-page activation cost.
- **Authoring scaffolds (`create-refrakt`).** New `--type plugin | theme | preset-pack | template` scaffolds, each ADR-023-compliant (`@refrakt-md/*` as `peerDependencies` with a minor range + matching devDeps + a `refrakt` compat range) and buildable on day one. Themes now scaffold **framework-agnostic by default** (ADR-024) — tokens + `./transform` + `./layouts` configs, no `svelte/` — with `--target svelte` opting into a component layer. The framework axis is `--framework`; `--template <name|dir>` composes a site template.
- **Install robustness (`refrakt theme` / `refrakt template`).** A shared source resolver handles directories, `.tgz` tarballs (read up front, no dead-end), and registry packages with `--registry` passthrough. `--site` targets multi-site projects (with singular→plural migration). New `theme list`, `theme presets list|validate|install`, and `template install` (add-a-site). Post-install validation is framework-aware (`./transform` required, a framework export optional) and checks each distributable's `refrakt` compatibility range.
- **Preset packs (SPEC-111).** Presets are a first-class distributable pack (`presets.json`) with `scope` (`syntax` | `palette`) and advisory `tunedFor` compatibility. A declarative **JSON carrier** (no build step) is the default, validated by a published token-contract **JSON Schema**. Lumina now also ships as a preset pack.
- **Config.** Sandbox runtime directory renamed `sandbox.examplesDir` → `sandbox.dir` (ADR-022); the old name is still accepted with a deprecation warning. New `TemplateManifest` / `PresetPackManifest` types and a dependency-free `checkRefraktCompat` helper.
- Authoring docs for all four distributable layers live under `extend/distributing/`.

## v0.24.6 - June 23, 2026

- Add a `search` opt-out and document search setup.
- New `SiteConfig.search` option (`refrakt.config.json`). Defaults to `true`;
- `@refrakt-md/transform` exports `withoutSearch(layouts)` /
- `create-refrakt` SvelteKit scaffolds now wire Pagefind out of the box:
- New docs page "Setting up Search" covering how the Pagefind index is built and
- set `false` to omit the search chrome entirely — no trigger button and the `search` behavior (including `Cmd/Ctrl+K`) is never initialized. `withoutSearchLayout(layout)` helpers and `renderPage` now accepts a `search` flag. The opt-out is wired through every adapter: SvelteKit reads it from config automatically (virtual theme module); Astro (`<BaseLayout search>`), Next (`<RefraktContent search>`), Nuxt/HTML (`renderPage({ search })`), and Eleventy (`createDataFile({ search })`) expose it as a passthrough sourced from `SiteConfig.search`. `pagefind` devDependency + a `vite build && pagefind --site build` build step, so new projects get working search results instead of an empty "Search is not available." dialog. served, the dev-vs-production gotcha, per-adapter build steps, and the `search: false` opt-out.
- Also unifies the two header buttons: the theme toggle now shares the search trigger's chrome (surface fill, full radius, muted colour, primary hover), and the collapsed mobile search trigger is fully rounded to match the toggle.
- Add the `frame-overflow: clip | bleed` media-frame facet (SPEC-116, WORK-444). A guest whose content is wider than its frame — a fixed-width or naturally wide component — is clipped at the rounded inset edge by default; `frame-overflow="bleed"` instead runs an overflowing guest's inline-end out to the layout edge on a narrow viewport and squares those corners, so it reads as cropped by the screen.
- It's a universal frame facet (host/slot-set), resolved onto the media zone as `data-frame-overflow`, and gated by a runtime per-guest `data-overflowing` signal — the guest reports the fact (the `sandbox` measures its iframe with hysteresis), the host decides the policy. It's meaningful only on a bleed host (hero/feature); on a clip host (card/bento-cell) the media well crops the over-width, so it's a no-op and emits a build warning. The bleed reaches a layout-owned boundary (`--rf-bleed-room-end`, default the page gutter), never the raw viewport, so a chrome'd layout can cap it at the content row. v1 is collapsed-viewport, inline-end only; direction (via `frame-anchor`) and side-by-side are deferred.

## v0.24.5 - June 22, 2026

- **Fixed the gap that could appear between a sticky header and the bar below it while scrolling.** Layout headers (`.rf-header`, `.rf-docs-header`, `.rf-blog-header`) now pin their height to `--rf-header-height` instead of being content-driven, so the sticky offsets that dock below them — the docs mobile toolbar and the mobile nav panel — line up exactly with the header bottom. Previously a header that rendered shorter than the assumed `3.5rem` left a strip where page content scrolled through between the two bars (and a taller one overlapped). The docs toolbar also hard-coded the `3.5rem` literal rather than reading the token, so layout overrides like the blog layout's `4.25rem` never reached it; all offsets now derive from `--rf-header-height`. Sites whose header needs to be taller should set `--rf-header-height` on their layout root.

## v0.24.4 - June 18, 2026

- `codegroup` and `diff` chrome now derives from the code surface instead of the page chrome. For both runes the wrapper fill, header/topbar, tabs, their text, and the internal separators are now derived from `--rf-color-code-bg` / `--rf-color-code-text` (the tokens a syntax preset owns) via `color-mix`, with only the outer frame (border + shadow) staying in the page world. Previously `codegroup`'s topbar/tabs and `diff`'s header used `--rf-color-surface`, so when the active preset gave the code surface a palette that diverged from the page — e.g. Nord's Polar Night code surface on an otherwise-neutral site — the light card chrome clashed with the dark code body. Both runes are now internally coherent with their own code body in light and dark modes.
- Add a `contentMeasure` axis so page sections keep their content readable when bled to the `wide` track. Previously `width="wide"` widened both a section's background _and_ its content, while `width="full"` widened only the background (content stayed anchored to the text measure) — an inconsistency for runes like `hero` and `feature`.
- `RuneConfig.contentMeasure: 'anchored' | 'fill'` (default `fill`) is emitted as `data-content-measure`. `anchored` runes (hero, cta, feature) keep their content at the text measure at `width="wide"` so only the surface/gradient bleeds, matching `width="full"`. `fill` runes (card, table, bento) keep the "break gently out of the text column" behavior. `width="full"` still anchors content into a band for every rune, so composing any rune into a hero (`elevation="flush" width="full"`) is unchanged.
- Round the corners of a `sandbox` like other rich media guests. The iframe canvas is opaque (the behaviour writes `color-scheme` onto the srcdoc, so the browser paints a solid backdrop that `background: transparent` can't see through), so a rounded shape can only come from the embedding element clipping the iframe — but the sandbox owned no radius, so it rendered square (most visibly in a bleed host like a `hero`, where the slot no longer imposes its radius on guests).
- The sandbox now owns a `border-radius` and lets the iframe inherit it, so skeleton's `overflow: hidden` clips the iframe to the rounded shape. It mirrors `codegroup`: `radius-container` standalone (and in a bleed host, keeping its own chrome), the smaller media tier when merged into a clip-host well (card/bento), and flush in a full-bleed cover/backdrop.
- Fix `validateThemeTokensConfig` rejecting valid tokens because its internal `TOKEN_CONTRACT_SHAPE` had drifted from the `TokenContract` type. The validator was missing the SPEC-056 extended syntax roles (`type`, `property`, `parameter`, `tag`, `attribute`, `operator`, `number`, `regex`), the spacing densification band (`spacing.snug`, `spacing.cozy`), and `shadow.none`. As a result, an integrated preset like Nord — which sets the extended syntax roles when it's the _active_ preset — failed validation with "unknown token key" errors, even though those keys are part of the contract (scoped Nord _tints_ took a different code path and were unaffected). The validator shape now mirrors `SyntaxTokens` and the rest of `TokenContract`.

## v0.24.3 - June 17, 2026

- Add a `guestFit` media-host axis so a theme declares whether a rune frames its media-zone guests or leaves them alone. `RuneConfig.guestFit: 'clip' | 'bleed'` (default `clip`) is emitted by the engine as `data-guest-fit` on the media zone, a sibling to `data-guest-posture`.
- This fixes rich guests (`sandbox`, `codegroup`, `juxtapose`) being given rounded corners in bare section hosts like `hero` and `feature`: those now declare `guestFit: 'bleed'`, so a rune guest keeps its own chrome (its natural radius/border) instead of being masked by the slot — while leaf images still frame to the slot. Framed wells (`card`, `bento-cell`, …) keep `clip` and are unchanged, still merging a guest into the well as one surface. The shared rule replaces the per-host CSS so any rune can opt into either behavior from config.
- `guestFit` also drives the displace containment default: a displaced guest now defaults to `peek` (cropped) in a clip host and `bleed` (spills) in a bleed host, so a hero no longer needs `frame-displace-mode="bleed"` spelled out (an explicit mode still overrides). The hero-specific media-zone unclip is retired in favour of the shared `data-guest-fit="bleed"` rule; the guest-intrinsic opt-outs (`preview`, `juxtapose`, displaced `showcase`) are unchanged.
- A bleed host no longer clips its rune guest at all (not just on displace), so a guest's own drop-shadow is no longer cropped into the corner gaps left by its rounding — which showed as darker corners behind, e.g., a codegroup in a hero.

## v0.24.2 - June 17, 2026

- Fix paragraph-wrapped media in media+content runes. Markdoc wraps inline media (a bare image, or a single block rune like `{% sandbox %}`) in a `<p>`; several runes passed their media/header zone through raw, so the media well held a stray paragraph instead of the element. `hero`, `feature`, `step`, `event`, `organization`, `symbol`, and `howto` now unwrap it, matching `card`/`bento`. Additionally, content-model fields matching `image` now capture standalone images (parsed by Markdoc as a paragraph), fixing the `character` portrait being silently dropped.

## v0.24.1 - June 17, 2026

- **Frame displacement gains a `bleed` mode and a longer offset ramp; bg gradients accept `transparent` and `name/alpha` stops; spacing-attribute overrides now win cleanly.**
- **`frame-displace-mode="bleed"`** — a second rendering model for `frame-displace`. `peek` (default) keeps the existing `transform: translate()` behaviour where a displaced media guest is cropped by its zone — correct for card / bento-cell. `bleed` puts a negative margin on the media zone so following layout pulls up and the guest extends past the host's edge with no gap above — useful for a hero or cta whose media should overflow downward.
- **Hero unclip** — when a hero's media zone contains a displaced guest (`data-displace` on the zone itself or on a child rune), the zone now opts out of `overflow: hidden` so the spill is actually visible. Card / bento-cell continue to clip into peeks; only section-like hosts unclip.
- **Extended `frame-offset` ramp** — adds `2xl` (4rem), `3xl` (6rem), `4xl` (8rem). Non-linear by design: `sm`–`xl` still ride the block-spacing tokens for peek granularity inside a card; `2xl`+ jumps to section-spacing so a bleed-mode displacement can clear a section's `padding-block` and have visible overhang.
- **`bg` gradient stops accept `transparent`** — `{% bg gradient="to-br" from="transparent" to="primary" %}` emits the literal CSS keyword, so a token-driven gradient can fade in or out without falling back to a raw-CSS preset.
- **`bg` gradient stops accept `name/alpha` shorthand** — Tailwind-style. `to="primary/0.5"` (decimal) or `to="primary/50"` (percent) compiles to `color-mix(in srgb, var(--rf-color-primary) 50%, transparent)`. Theme-aware: the colour still tracks `tint`.
- **`spacing="flush" | "tight" | …` overrides** — the universal-margin default selector in `dimensions/surfaces.css` was at specificity (0,3,0) because of its `:not([data-rune] [data-rune])` clause, beating the `[data-rune][data-spacing="…"]` attribute rules (0,2,0). Wrapping the default in `:where()` zeros its specificity so `spacing` (and per-rune / per-instance) overrides now win cleanly.
- **`sandbox` loses its hand-rolled `border-radius`** — sandbox now inherits whatever radius its host provides (or none), and the in-preview `border-radius: 0` workaround is dropped.
- **Fix `height="fill"` on sandbox; bump juxtapose container radius to `lg` for consistency.**
- **`sandbox height="fill"` now actually fills the host.** The behaviour set the iframe to `height: 100%`, but the `.rf-sandbox` host itself was auto-height, so the iframe's 100% resolved against an undefined containing block and collapsed to the 150px fallback. This only worked in cover media (`media-position="cover"`) where the host was positioned absolutely with `inset: 0`. Any other context — a card with `frame-aspect`, a hero with a media zone, a parent that owns its height some other way — silently produced a 150px iframe. Skeleton now sets `.rf-sandbox[data-height="fill"] { height: 100% }` so the host claims its container's height and the iframe's `100%` means what it says.
- **`juxtapose` panels container radius `md` → `lg`.** A standalone juxtapose now matches the container-radius tier used by card / hero / bento-cell (`--rf-radius-lg`). The existing media-zone-guest override (`--rf-radius-media`) still wins when a juxtapose is dropped into a card's media well, so it never out-rounds its host.

## v0.24.0 - June 16, 2026

- **Live sandbox guests in the `bg` backdrop layer (SPEC-104).** A surface can now carry **both** an animated backdrop **and** a positioned subject media — the visualiser is the `bg`, the image/code/embed stays an in-flow media guest, so they stop competing for the single media zone.
- `bg` gains an optional body holding one bare `sandbox`: it's transformed normally (the real rune runs, with file resolution + sanitisation), tagged `data-bg-guest`, and the engine relocates it into the bg layer (a sibling of `bg-video`, above the boot frame, below overlay/scrim). A chromed guest (`video`/`audio`/`figure`) is rejected with a build warning.
- A new **backdrop posture** (`data-guest-posture="backdrop"`): the guest is mounted and running but pointer-inert; the sandbox is forced to `height="fill"` + eager activation, **not** mounted under `prefers-reduced-motion` (the boot frame stands in), and suspended off-screen / on a hidden tab.
- A **named `sandbox` bg preset** (`BgPresetDefinition.sandbox`, project-level `backgrounds` config) applies a reusable scene by name (`bg="midnight-waves"`) like any other preset, resolved at transform time and memoised per scene.
- **Scroll-reveal motion — a token-driven entrance dimension (SPEC-105).** Sections can now animate in as they scroll into view. The author declares _intent_ with two universal attributes; the theme owns the choreography; a behaviour owns the timing — JS = when, CSS = how.
- **`reveal`** — a closed entrance vocabulary on every block rune: `none` (default), `fade`, `slide`, `scale`, `blur`. An unknown value is a build error.
- **`stagger`** — cascades a multi-child block's items in (feature/bento/steps/pricing/playlist); a silent no-op on single-child runes. The engine stamps `--rf-reveal-index` on the cascade items.
- **The motion dimension** (`dimensions/motion.css` + `--rf-reveal-*` physics tokens) renders each character keyed on `data-reveal` × `data-in-view`, from one stylesheet covering all section runes. It animates the individual `translate`/`scale` properties (never the `transform` shorthand) so it composes with existing rune transforms. The physics are a first-class token group, retunable site-wide via `refrakt.config.json` `theme.tokens.reveal.*`.
- **An IntersectionObserver behaviour** flips `data-in-view` on first intersection. Opt-in and enhancement-gated: SSR/no-JS/crawler and `prefers-reduced-motion` render the fully-visible final state — nothing is hidden behind JS.
- **Fix: `mockup` as a media guest renders correctly (incl. iOS Safari).** A mockup placed in a rune's media zone (cards, bento) now fills its slot instead of capping at its native size, and is inset from the media-zone sides. The upscale is gated to fine-pointer / wide slots, scaled with `transform` rather than `zoom`, and its fill factor is measured in JS (a new `mockup` behaviour) rather than `cqi` — fixing the sizing on iOS Safari.
- **Fix: structure contracts were missing the plan plugin (and recent chart modifiers).** The committed `structures.json` (both the repo-level copy and Lumina's shipped `./contracts` export) had drifted from the generator — the drift guard regenerated from a `fullConfig` that omitted `@refrakt-md/plan`, so 11 plan runes (`spec`/`work`/`bug`/`decision`/`milestone` + the plan UI runes) and the `chart` `tick-count`/`tick-step`/`label-angle` modifiers were absent from the published contract. The contract now covers all 9 official plugins (131 runes); the drift test includes the plan plugin and additionally guards the repo-level copy so the two committed files can't diverge again.
- **Fix: `preview` no longer bleeds to the viewport edge inside a `feature` (default layout).** The WORK-438 skeleton/skin split promoted the in-feature breakout `.rf-preview--in-feature { margin-inline: calc(-1 * var(--rf-content-gutter)) }` into `@layer skeleton`, where it lost to Lumina's skin rule `.rf-preview { margin: 2rem 0 }` (skin beats skeleton regardless of specificity), nullifying the breakout. The bleed is moved back to `@layer skin`, where it again wins over the base margin by specificity and fires together with the canvas border-radius reset at the `@container (max-width: 1280px)` breakpoint. Docs-layout previews were unaffected (they bleed via the canvas de-chrome, not the in-feature root margin).
- **Fix: `plan create` now validates enum attributes at write time.** `plan update` rejected invalid `status`/`priority`/`complexity`/`severity` values, but `plan create` passed any `attrs` straight into the scaffolded file unchecked — so a stray `complexity="small"` (or `status="todo"`) landed silently and only surfaced later as a `plan validate` error. `create` (and the `plan.create` MCP tool) now run the same validation as `update`, rejecting unknown attributes and out-of-vocabulary enum values with a message listing the valid set, before any file is written. The vocabularies (`VALID_STATUS`, `VALID_PRIORITY`, `VALID_COMPLEXITY`, `VALID_SEVERITY`, allowed-attr lists) are consolidated into a single shared `enums` module so `create`, `update`, and `validate` can no longer drift apart, and the `plan.create` MCP schema documents the accepted enum values.

## v0.23.0 - June 16, 2026

- **Surface axes — `elevation` is now a depth ladder (SPEC-107).** The `elevation` attribute is decomposed into three composable axes so the same content rune can read as a contained card _or_ a full-bleed hero with no rune fork:
- **`elevation`** — a depth ladder `sunken | flush | flat | raised | floating | overlay` (was the `none|sm|md|lg` shadow scale). Each rune ships a `defaultElevation` (a `card` is `flat`, a `hint` is `flush`, a `chart` is `sunken`); styled by `[data-elevation]`, no BEM modifier class.
- **`prominence`** — the page-section-header family `quiet | normal | prominent | display`, re-pointing the section title type size.
- **`width`** — the existing layout/bleed axis (`compact|narrow|wide|full`), now documented as the third, layout-side axis.
- **Breaking change + deprecation window.** The old `elevation="none|sm|md|lg"` values are deprecated. They still resolve — `none`→`flat`, `sm`/`md`→`raised`, `lg`→`floating` — with a build-time warning, and will be removed in a future release. Run the codemod to migrate authored content:
- The codemod is scoped to the `elevation` attribute only — `frame-shadow` carries the identical `none/sm/md/lg` values on the media surface and is left untouched.
- Lumina's `dimensions/surfaces.css` is now rune-name-free: surface chrome is selected entirely by `[data-elevation]` / `[data-prominence]` rather than enumerated rune lists, so a new theme inherits the base defaults and overrides only the deltas.
- **New `@refrakt-md/skeleton` package + cascade-layer infrastructure (SPEC-094 §3).** Stands up the skeleton/skin split: a dedicated, independently-versioned package that ships `@layer skeleton` and the `@layer skeleton, skin;` order declaration, plus the token-name contract (the `TokenContract` type + layer-name constants, re-exported so the contract has one home). A breaking structural change bumps _this_ package, not a skin.
- **Lumina** now depends on `@refrakt-md/skeleton` and imports it first, so the layer order is declared before any layer content. Lumina's own CSS is currently unlayered (it wins over the empty skeleton layer, so rendered output is unchanged); the per-file `@layer skin` re-bucketing that fills the skeleton layer lands in a follow-up.
- **The SvelteKit loader** emits the `@refrakt-md/skeleton` import before any theme CSS in both dev and build modes — the order-declaration-first guarantee that lets a theme's `@layer skin` win over `@layer skeleton` with ordinary selectors and **no `!important`**, regardless of import order.
- **Icon-from-config (SPEC-094 §8).** Embedded `data:image/svg+xml` mask-image glyphs are lifted out of `hint` and `accordion` CSS into the theme icon registry (`config.icons`). The token generator surfaces them as `--rf-icon-<group>-<name>` mask custom properties, and the rune CSS reads those via `var()`. A theme re-glyphs the hint icons / accordion chevron by editing config alone — no CSS change.
- **Skeleton/skin re-bucketing — the skeleton layer is now filled (SPEC-094 §3, WORK-438).** The follow-up promised by the skeleton-package infrastructure change: Lumina's framework-agnostic _structure_ is moved out of `@layer skin` into `@refrakt-md/skeleton`'s `@layer skeleton`, group by group and strictly bottom-up (foundation → dimensions → layouts → runes).
- **`@refrakt-md/skeleton`** now ships the structural CSS for ~81 runes plus the shared dimension layers (state, media, cover, metadata, sections, checklist, sequence, guest-posture) and the page-shell layouts (default, docs, blog, mobile, on-this-page, search, theme-toggle, version-switcher, plan, split). Each file is imported with `layer(skeleton)`, so the cut line — `display` / `grid-*` / `flex-*` / `position` / `inset` / `z-index` / `overflow` / sizing / zone resets / disclosure mechanisms — lives in one framework-agnostic package.
- **Lumina** keeps only the skin remainder (colour, border, radius, shadow, font, and spacing _values_), which wins over the skeleton layer purely by cascade-layer order — ordinary single-class/attribute selectors, no `!important`. Rendered output is unchanged: the split is a re-bucketing, verified declaration-for-declaration against the pre-split CSS.
- This is what makes a second theme a token file + skin rather than a fork: the structure is now shared infrastructure, and a skin overrides only the aesthetic deltas.

## v0.22.0 - June 15, 2026

- **AI `write` mode draws fixtures as few-shot exemplars** (SPEC-102) — the write-mode prompt's hardcoded "Example structure" stub is replaced by the fixture corpus: fixtures explicitly tagged `role: canonical`/`rich` (with their authoring `notes`) are surfaced as in-context exemplars, so generated content reflects idiomatic, well-formed rune usage. The set grows automatically as the corpus is annotated. Prompt-time retrieval only — no training or fine-tuning pipeline.
- **Standardised rune-fixture corpus + CI validation** (SPEC-102) — rune examples now live as annotated Markdown fixtures (`fixtures/*.md`) with validated YAML frontmatter (`role`, `attributes`, `demonstrates`, `notes`) and `<rune>.<scenario>.md` scenarios; `RUNE_EXAMPLES` is generated from them. A CI test parses, schema-validates, and transforms every fixture in the corpus (rejecting unknown keys / wrong types and any parse/transform error), and `refrakt plugins validate` now reports role coverage — e.g. a rune that has fixtures but no `canonical` one. One source of truth for the inspect command, the gallery, docs, and AI few-shot, with an authoring guide for content authors.
- **`refrakt gallery` + an opt-in visual-regression harness** (SPEC-094) — a new `gallery` command renders every rune across its variants (light + dark) plus the four layout fixtures over a synthetic multi-page context to static, deterministic HTML — the safety net (and AI-iteration surface) for theme work. The companion `@refrakt-md/gallery-harness` package (opt-in; the only Playwright/browser dependency in the repo, deliberately kept out of the core CLI and runtime install path) screenshots the gallery's rune-cell clips and layout pages and diffs them against an ephemeral, gitignored baseline — for restyle before/after and inert-refactor (skeleton/skin) proofs.
- **Image-src scheme sugar** (SPEC-106) — standard Markdown image syntax now resolves two custom URL schemes to inline SVG at transform time. `![Portrait](placeholder:portrait)` emits a deterministic, theme-token-tinted placeholder (shapes: `cover`/`wide`/`banner`/`square`/`portrait`/`thumbnail`/`avatar`), and `![GitHub](icon:github)` inlines a named icon from the theme's icon set — the same source the `{% icon %}` rune uses, with `alt` as the accessible label. Unknown schemes, relative paths, and absolute URLs pass through to `<img>` unchanged, and the scheme set is a small registry a plugin can extend. Authors can draft image-heavy pages before the assets exist and swap in real paths later. The image-consuming runes (`figure`, `gallery`, `juxtapose`, `mediatext`, `showcase`, `card`, `cast`, `recipe`, `realm`, `testimonial`, `storyboard`) now accept scheme-resolved `<svg>` media, not just `<img>`.
- **Tokenized typography** (SPEC-094) — the token contract gains a full type system: a modular type scale, line-heights, font-weights, letter-spacing, and a display family, as typed `--rf-*` tokens. Lumina's ~351 hardcoded `font-size` declarations are refactored onto the tokens with no visual change, and the token CSS is now generated from `tokens.ts` rather than hand-maintained against a coverage test. Typography is the single largest visual differentiator between a product/docs theme and an editorial one, so this makes it themeable by overriding tokens instead of forking rune CSS — the foundation for themes beyond Lumina.

## v0.21.0 - June 12, 2026

- **Data-bound sandboxes** (SPEC-093 core) — the registry's third render target, after `collection` (HTML) and `aggregate` (SVG): bring your own renderer. A `{% sandbox data="type:page" %}` binds a registry query (SPEC-070 field-match grammar); the build resolves it, projects (`data-fields`) and shapes it (`data-shape="flat"` | `"tree"`), caps the payload, and injects the JSON so the iframe code can read it as a frozen `window.RF_DATA`. The payload rides the same data-attribute rail as design tokens, so it works across every adapter. Over-cap payloads warn and truncate; a sandbox with no static fallback warns (progressive-enhancement reminder). Enables registry-fed visualizations like a 3D sitemap or relationship graph.
- **Hero cover layout + animated sandbox backgrounds** (SPEC-101). `hero` is now a first-class `media-position="cover"` host: the media well fills the section interior and the headline/blurb/actions overlay it, with the cover knobs (`content-place`, `height`, `aspect`), a band-appropriate height authority (a viewport-relative floor instead of the 3/4 tile default), root padding rerouted to the overlay, and a centred-band overlay default with an even scrim. Any non-`img`/`video` media guest now fills a cover well; `sandbox` gains `height="fill"` (iframe pinned to 100%, auto-resize negotiation disabled), applied automatically when a sandbox is a cover backdrop — so a live three.js scene drops into a hero as a full-bleed, inert animated background. A non-eager (`activation="visible"|"click"`) sandbox under cover warns at build time (the Run affordance is unreachable on an inert backdrop). Ships with the wireframe-waves showcase (`site/examples/wireframe-waves/`) — a displaced wireframe terrain whose crests pick up the niwaki palette. Also fixes nested-density title sizing: `[data-section="title"]` now sizes via `--rf-title-size` (set per density root), so a full-density rune inside a compact host (a hero in a `preview`) keeps its real title size. And fixes inverted stacked media labels (BUG-001): hero/feature/step have content-first DOM, so the shared media-first stacked CSS rendered `top` at the bottom and vice versa — their default is now a truthful `bottom` (zero visual change for existing content) and explicit `top`/`bottom` render where they say.
- **Deferred sandbox activation** (WORK-381) — keep heavy sandboxes off the critical path. `{% sandbox %}` gains `activation` (`eager` default | `visible` | `click`) and a `poster` image URL. A non-eager sandbox shows the poster and an explicit **Run** control in the iframe's place and defers iframe creation _and_ every dependency download until activated — `visible` mounts on scroll-in (`IntersectionObserver`), `click` mounts on user action. Under `prefers-reduced-motion` a non-eager sandbox never auto-activates: the poster and control stay so motion-sensitive visitors opt in. Eager sandboxes are unchanged (no markup or behaviour regression). The site's 3D star-map sitemap now loads only when scrolled into view.
- **`reference list` / `reference dump` are now site-aware** (`--site <name>`) — they resolve a multi-site config's per-site `plugins` (and `runes`) instead of only reading the flat single-site shape, so the rune reference for a multi-site project includes its plugin runes, not just core.
- **xref no longer warns on same-destination name collisions.** With SPEC-092's typed page entities, a `/runes/<x>` doc page is registered as both a `page` and a `rune` of the same name — an `{% xref %}` by that name matched both and warned, even though both resolve to the _same URL_. The resolver now only warns when the candidates' destinations actually diverge.
- Pages can now register as **typed registry entities** (SPEC-092 Layers 2 & 3). A page that sets a frontmatter `type` (and optional `id`) is registered as that entity type in addition to its `page` entity, reusing the page's reserved-filtered data; `id` defaults to the page URL. A new `routeRules` `entity` field types a whole section by convention (e.g. `{ "pattern": "runes/**", "entity": "rune" }`) without per-page frontmatter — a page's own `type` overrides the rule. Duplicate `(type, id)` registrations warn. This lets `collection`/`aggregate` query content by domain type (e.g. `collection type="rune"`), and it's the complement of `entityRoutes` (entity → page). Works across all adapters.
- **`section` rune** — a generic page section: the shared eyebrow → headline → blurb (+ image) header above **arbitrary body content**. Unlike `feature`/`hero`/`reveal`, it doesn't bake in a specific body layout, so it can introduce header-less primitives like [`bento`](https://refrakt.md/runes/marketing/bento) with a title and intro. Every header slot is optional (body-only renders just the body); `align` (`start`|`center`|`end`) positions the header while the body spans the section.
- Page frontmatter is now indexed onto the `page` entity, so `collection` and `aggregate` can filter and group pages by any frontmatter field — `tags`, `author`, `image`, or your own custom fields (e.g. `category`, `status`). Routing/render-control keys (`layout`, `tint`, `tint-mode`, `tint-lock`, `slug`, `redirect`) are excluded so they don't pollute queries; the curated fields (`title`, `description`, `date`, `order`, `icon`, `draft`) keep their normalised values. Enables tag-driven page collections and registry-fed catalogues (SPEC-092 Layer 1).
- **`data-shape="graph"` for data-bound sandboxes** (SPEC-093 / WORK-390) — the third payload shape, after `flat` and `tree`. A `{% sandbox data="type:spec type:work" data-shape="graph" %}` projects the queried entities as **nodes** and walks their SPEC-072 relationship edges into a node-link payload: `window.RF_DATA = { shape: "graph", nodes, edges }`, where each edge is `{ from, to, kind }`. Only edges whose both endpoints are in the selection are kept, so the graph is closed — ready for a force-directed or node-link layout.
- Fix the `tree` shape of a data-bound sandbox: page entity `url`s carry no trailing slash while `parentUrl`s do, so the nesting never matched and the tree came out flat. Normalize trailing slashes when building the tree so parent↔child relationships resolve.

## v0.20.2 - June 11, 2026

- The `@refrakt-md/html` scaffold now ships a working client runtime. `template-html`'s build bundles `initPage()` (from `@refrakt-md/html/client` + `@refrakt-md/behaviors`) to `build/client.js` via esbuild and loads it on every page, and it ships the layout-chrome CSS (header, theme-toggle, search, mobile, on-this-page). Scaffolded static HTML sites now have working interactive runes (tabs, accordion, drawer, search) and a functioning, styled theme-toggle — previously all inert.
- Also fixes a nav-slug error in the `template-html` starter content (`_layout.md` linked `getting-started` instead of `docs/getting-started`), so a freshly scaffolded html site now builds with zero errors.

## v0.20.1 - June 11, 2026

- `diagram` now renders after SPA navigation and re-renders when the colour scheme changes, so diagrams stay correct across client-side route changes and theme toggles.
- Surface model fixes, found and fixed while building the surface documentation:
- **Cover scrims** now clip to the media zone's rounded corners; a centred `content-place` emits a radial scrim (`farthest-side`) that reaches the box edges instead of leaving the sides of a wide aspect uncovered; dark-tint scrim support.
- **Frame** — displaced / oversized peeks clip correctly at the media zone and carry across the mobile breakpoint; `frame-shadow` rides the guest's silhouette on a `figure`.
- **Substrate** — the `cross` pattern redraws crisply at any device-pixel-ratio; `substrate-target="media"` routing.
- **Media-zone guests** (chart, diagram, map) drop their own double chrome and inherit the slot surface; a `map` card gains a slot aspect.
- **`bg`** stacks content above the background layer and clips to the rounded surface.

## v0.20.0 - June 10, 2026

- SPEC-090 media-guest interaction posture. A rune in another rune's media slot is a presentational guest by default; interactivity is now an explicit capability — `RuneConfig.interactive`, set on the behaviour-driven runes (`codegroup`, `tabs`, `datatable`, `form`, `map`, `sandbox`, `juxtapose`). When the container is itself an interaction target — a `card`/`bento-cell` with a stretched whole-tile `href` — or the guest is a `cover` backdrop (SPEC-089), the engine marks the media zone `data-guest-posture="presentational"`: it goes `pointer-events: none` (so clicks fall through to the link / the overlay owns interaction) and the behaviours layer skips enhancement, so the guest renders its static fallback (the demoted `codegroup`/`tabs` tab strip is hidden so panels read as plain stacked content). The demotion is scoped to the media zone only — content-overlay controls (body/footer links & buttons) stay interactive. An interactive guest in a linked tile emits an informative (non-fatal) build warning. A container without `href` (and not `cover`) hosts interactive guests normally.
- SPEC-086 surface chrome. Adds a universal `elevation` attribute (self-surface `box-shadow` on the `--rf-shadow-*` scale), a `frames` preset registry with the `frame` attribute and inline `frame-*` facets (modelled on `bg`), `RuneConfig.frameTarget` routing (media zone vs self) with a build warning when unresolved, and a shared frame CSS layer (silhouette drop-shadow, displacement/peek, oversize, place, anchor). `showcase` collapses into the frame model as `frameTarget: 'self'`; its `shadow`/`bleed`/`offset`/`aspect`/`place` attributes are deprecated aliases for `frame-*` facets (warn for one minor, then removed), with breakout retained. The `offset` named scale is completed (`none|sm|md|lg|xl`) and its raw-length fallthrough closed.
- SPEC-087 surface fills. Adds a tint-tracking inset surface (the `--rf-surface-inset-shift` mix amount + a use-site `color-mix` recipe applied to media wells and `chart`/`diagram`), and `substrate` — a generated surface pattern with a fixed engine enum (`dots|grid|lines|cross|checker|none`), inline `substrate-size`/`opacity`/`fill` facets, a shared always-included gradient recipe stylesheet, and `RuneConfig.substrateTarget` routing (default `self`, per-instance `substrate-target` override, build warning when targeting a missing media section).
- SPEC-088 bg gradients & scrim. Adds a token-driven `bg` gradient fill (inline `bg-gradient`/`bg-from`/`bg-to`/`bg-via`/`bg-gradient-type` facets with semantic token stops, and a structured `BgPresetDefinition.gradient` preset), a structured `scrim` legibility facet (`gradient`/`frost`, strength/blur/tone — tone also flips the overlaid foreground), and a constrained flat `overlay` vocabulary (`dark`/`light`/token + opacity). The raw-string `overlay` passthrough is deprecated (warns) now that `scrim` ships, the `style` escape hatch is documented with a stated contract (valid in theme & project config; project merges over theme), and a build-time soft-lint flags raw gradients that the structured facet covers. `bg.css` is force-included since `bg` is now a universal-attribute feature.
- SPEC-089 cover layout. Adds `media-position="cover"` as a `media-position` engine variant (SPEC-091): the media well fills the rune interior and content overlays it, with a one-attribute switch from `top|bottom|start|end`. Two rune-declared scopes — `full` (card: the whole box overlays) and `header` (recipe: only the title band overlays, body flows below) — bound the overlay region; there is no overlay primitive in the layout config. Adds `content-place`, a 2-axis logical overlay anchor (`<block> <inline>`, mapping to `align`/`justify`) active only in cover mode (warns otherwise), whose `auto` default — also the behaviour when unset — adapts to the cover region's container-query orientation. Cover turns on a default scrim on the media surface (consuming the SPEC-088 scrim facet), weighted toward the content edge and following `content-place` unless an explicit `scrim="top|bottom|left|right"` pins it; `scrim="none"` opts out. `scrim-type="frost"` swaps the gradient for a frosted-glass blur (`scrim-blur` scale) — in cover mode the scrim renders on the media well, never the self-surface bg layer, masked to the content edge so it never covers the whole image. The overlay foreground follows `scrim-tone` (a dark scrim yields light text) and is scoped to the overlay (`[data-name="content"]` in full scope, the cover-band in header scope), so the card's own surface keeps the page palette (light in light mode) while only the text on the media flips. Adds a card intrinsic-height knob (`height` named scale + `aspect`) for cover / `bg`-only cards, and documents cover mode in the card reference.
- Bento: a grid-level `elevation` now cascades to cells (joining the `frame` cascade) so `{% bento elevation="md" %}` lifts each cell rather than the grid box; a cell's own `elevation` still wins. Fixes the bento reference page's frame/elevation example (the images needed an `---` to land in the media zone).

## v0.19.0 - June 9, 2026

- Chart theming contract (SPEC-083 / WORK-353): the `rf-chart` SVG renderer no longer hardcodes its palette or geometry. Every paint + geometry value is now an `--rf-chart-*` custom property Lumina ships on `.rf-chart` — a dedicated categorical series palette (distinct from the semantic status tokens), bar/point/ line geometry, and typography/grid. The renderer emits only tagged elements (`.rf-chart__bar[data-series]`, `__point`, `__line`, `__axis`, `__label`) that `chart.css` paints from the props, and reads layout geometry via `getComputedStyle` — so a theme retones a chart by setting `--rf-chart-*` alone, and a future canvas/ d3 provider reads the same vocabulary. Adds a **sentiment colouring** mode: data cells carrying `data-meta-sentiment` colour by the semantic token (positive→success, negative→danger, caution→warning, neutral→muted).
- Also fixes `aggregate layout="chart"` to emit the chart rune's field channel, so a non-bar `chart-type` survives the identity transform and the `.rf-chart` class isn't doubled.
- Per-group sentiment projection in `aggregate` (SPEC-076 / WORK-357). `aggregate` now projects `$item.sentiment` onto the per-group template (and tags chart data cells with `data-meta-sentiment`), looked up from a `(type → field → value →
- Add a pair of opt-in text-zone knobs to `bento`, settable as a grid-level default or a per-cell override (cell wins; the grid default is the only lever for heading-sugar grids):
- **`content-height`** (`sm` | `md` | `lg` → 3 / 5 / 7rem) — pins the text area on
- **`media-ratio`** (`1/3` | `2/5` | `1/2` | `3/5` | `2/3`) — pins the media zone's
- **column cells** (top/bottom media) so they line up vertically; the media zone absorbs the remaining row-track height. share of the width on **beside cells** (start/end media); the content absorbs the rest.
- The two act on perpendicular axes (a cell is either a column cell or a beside cell), so they never collide. Both default to the existing behavior (natural text height / 42% media split) and revert to natural height on the mobile stack.
- Add a `row-height` attribute to the `bento` rune (`sm` | `md` | `lg` | `xl`) for control over the uniform grid row-track height in grid mode (8 / 12 / 16 / 20rem; `md` matches the previous default). Falls back to the theme's `--rf-bento-row-height` when unset, and is overridden by the stack's auto rows on mobile.
- Bento substrate (SPEC-085) — v0.19.0 batch C.
- **Bento is a grid primitive, not a page-section.** Dropped the eyebrow/title/blurb preamble; every heading is now a cell. A titled bento is a composition (wrap it in `feature`/section). Content before the first heading renders as loose content above the grid.
- **Cell adopts card's zone contract.** A `bento-cell`'s content splits on a top-level `---` into `media` / body / footer zones (`data-section`), mirroring `card`. The media zone is clipped/sized by the name-agnostic WORK-339 selector (no bento-specific per-guest CSS) so a `showcase` bleed peeks. The cell background is tint-deferrable, and the leading heading becomes a uniform-level `<h3>` title contributing to the outline.
- **Proportional sizing model.** A 6-column default for both authoring modes; `size` presets resolve as fractions of the column count (small ⅓, medium ½, large ⅔ × 2 rows, full = all), and `cols` / `rows` give precise per-axis spans that override the preset. Uniform fixed row tracks (`grid-auto-rows: var(--rf-bento-row-height)`, never column-tied). Author-controlled `collapse="sm|md|lg|never"` plus automatic progressive column reduction with `min(span, current-columns)` auto-capping.
- **Size-derived media placement + link tiles.** `media-position` (`top|bottom|start|end`) is author-controllable per cell with a size-derived default (large/full → beside, smaller → on top); an optional `href` makes a whole cell a link.
- **Explicit `{% bento-cell %}` authoring.** A bento whose children include `bento-cell` tags uses them directly — full per-tile control (the dashboard case) — short-circuiting heading conversion (explicit wins, no mixing). The legacy `span` attribute is removed (subsumed by `cols`). `cols` / `rows` author as unquoted numbers (`cols=4 rows=2`), matching `columns`.
- Rewrote the bento rune reference docs for the new substrate.
- **Even column ladder + landscape 2-up.** Reduction now steps 6 → 4 → 2 → 1, skipping the odd 3-col step where a `small` cell can't pair. On tablets (`≤1024`) `medium` cells drop to a half so two pair per row. At `≤768` the grid is a 2-up auto-row stack: `small` cells take half a row (two pair up), medium/large/full span full width, and media reflows to an aspect-ratio banner so wide cells no longer crop their image to a thin strip.
- **Collapse is a stack, not a shrunken grid.** At a single column the fixed row track is dropped (`grid-auto-rows: auto`) so cells size to their content and text is never clipped; media reflows to an aspect-ratio banner (`--bento-media-aspect`, default 16/9) on top. Cells are text-first in grid mode too — the body keeps its height and the media zone absorbs the leftover track and crops.
- Composability foundation (SPEC-084) — v0.19.0 batch B.
- **Media-zone guest adaptation.** Replaced Lumina's name-enumerated media allow-list with one **name-agnostic** rule: any visual rune dropped into a `[data-section="media"]` slot is sized, clipped, rounded, and given a container-query context (so intrinsically responsive guests like `mockup` auto-scale). Guests that manage their own bleed (`preview`, `juxtapose`, a bleeding `showcase`) self-declare an opt-out. Covers `card`/`feature`/`hero`/`recipe` with one rule.
- **`requiresParent` nesting validation.** New self-declared `RuneConfig.requiresParent` (distinct from the advisory `parent`). The identity transform validates it at build time — a rune that opts in must have the named parent as its nearest ancestor rune, else it's reported: an **error** for structurally-meaningless children (accordion-item, tab, step, tier, map-pin, …), a **warning** otherwise. Opt-in, so standalone-capable runes (`track`) are never flagged. No container-side allow-list.
- **Context-modifier audit.** Removed the one nonsensical pairing (Hero `→ in-feature`); every remaining context modifier has CSS coverage. `refrakt inspect --audit` reports context-modifier coverage, and `inspect` now surfaces a rune's `requiresParent`.
- **Docs.** A new composability authoring guide documents the open-world contract.
- Lumina polish: token hygiene, dark parity, theme-aware chrome, and a11y (v0.19.0 batch A).
- **Token hygiene.** Reconciled seven phantom colour tokens that were painting stale literal fallbacks (the out-of-place blue and cold-gray muted text): `text-muted`→`muted`, `heading`→`text`, `accent`→`primary`, `background`→`bg`, `border-light`→`border`, `warning-fg`→`warning`. Added a derived `--rf-color-primary-bg` (tracks `primary` in both modes) and a mode-flipped `--rf-color-on-primary` (fixes invisible white text on the light dark-mode primary).
- **Breaking (theme authors):** the misnamed `--rf-color-primary-50…950` ramp and the `PrimaryScale` type are **removed** — it was a warm-neutral scale mislabelled "primary" with almost no consumers. Set `--rf-color-primary` directly; `primary-bg` derives from it.
- **Dark parity.** Verified every absolute token has a dark override; the remaining four are intentionally shared (derived from mode-aware tokens), now annotated.
- **Theme-aware chrome.** Branded `::selection`, token-driven scrollbars, and `color-scheme` per mode so native chrome (including the main scrollbar) follows the theme.
- **Accessibility.** A uniform `:focus-visible` ring across all interactive elements and a global `prefers-reduced-motion` reset.
- Two-tier surface rounding + inset media on mobile.
- New semantic radius tokens: `--rf-radius-container` (→ `lg`, 16px) for outer
- Media in a `data-media-position="top"` container no longer becomes a full-bleed
- Top media now bleeds out past the body padding to a small, consistent margin
- surfaces and `--rf-radius-media` (→ `md`, 10px) for media guests nested inside them. Cards, the card/inset surface groups, feature items and bento cells move to the container tier; the shared `[data-section="media"]` zone and figure / recipe images move to the media tier, so a guest never reads as more rounded than its container. SPEC-086's `frame` will override these per-instance. square banner when the layout collapses on mobile — it stays inset within the card padding and fully rounded, matching its desktop framed look. on its top/left/right edges (new `--rf-media-margin`, defaulting to `--rf-spacing-sm`), figure-style, so the image isn't over-inset in containers with generous padding (e.g. bento cells). The `figure` image drops its box-shadow to match the unshadowed media elsewhere.
- Bento media/responsive fixes:
- **Container-query responsiveness** — the bento grid is now a query container
- **Unwrap paragraph-wrapped images** — images in a bento cell's media (and body)
- **Neutralize the global media-zone block margin** — `[data-section="media"]` no
- (`container-type: inline-size`) and its progressive-reduction/collapse rules use `@container` instead of `@media`, so it reduces columns and stacks based on its own width. Grids in doc previews, sidebars, or narrow tracks now break correctly instead of only at viewport breakpoints. zone are unwrapped from their `<p>`, so the media zone holds a bare `<img>` and layouts size it directly. longer applies a `var(--rf-spacing-sm)` top/bottom margin that misaligned media in flex/beside layouts; media spacing now comes from each layout. Affects all media zones (card, recipe, realm, faction, split, bento).
- Surface/media polish:
- More generous vertical spacing (`--rf-spacing-md`) between a top media banner
- A `code-group` nested in a media zone now rounds at the media radius tier so
- Dark-mode code background was a near-neutral grey that clashed with the warm
- A `card` with no `href` no longer shows a hover background — the hover is now
- The semantic `--rf-radius-container` / `--rf-radius-media` / `--rf-media-margin`
- and the content below it, in card/recipe/bento and on mobile stacks. its border lines up with the zone's clip instead of the larger container radius. `surface`; it's been warmed to the surface hue (`#1e1c19`, also applied to the derived `--rf-syntax-background`). gated on the presence of the stretched card link. aliases moved from the generated token contract into the styles layer (they reference the scale rather than holding raw values).
- Unify the media-zone corner radius with the card radius. Media slots (`[data-section="media"]`, shared by card, recipe, bento cell, feature, hero, realm, faction) rounded at `--rf-radius-lg` while their containers round at `--rf-radius-md`, so images looked more rounded than the card holding them. The media zone now uses `--rf-radius-md`, and recipe's redundant `lg` image override is removed (figure was already `md`).
- Decompose `plan-progress` into sugar over the `aggregate` rune (SPEC-076). It now composes **one aggregate per entity type** — a type heading ("Work", "Specs", …) above a progress bar labelled with that type's achieved status ("Done", "Accepted", …) plus a per-status badge row — resolved by the shared `resolveAggregates`. Mixing types under a single ratio was misleading (work `done` and bug `fixed` measure different things). Plan defaults are baked in (`type="work,bug"`, achieved-status per type, `group="status"`, `milestone=` scoping); the bespoke plan-side render path is removed. A bare `{% plan-progress /%}` scopes to `work,bug`; widen with `type=`/`show=`. (Per-status badge colour is deferred — see WORK-357.)
- Surface containers (card, the card/inset surface groups, feature items, bento cells) now carry a subtle 1px border in addition to their surface fill, pairing with the inset media framing.
- The dark neutral surface family was browner than the rest of the palette: the page background and inline-code background are warm-grays (R=G) but `surface`, its hover/active/raised steps, `border`, and `code-bg` carried a red lift (R>G ≈ 36° hue). That red lift is removed so the whole dark neutral ladder shares one warm-gray character (kept warm via a blue deficit, just no longer brown), and `code-bg` / `--rf-syntax-background` follow it.
- Fix dark surface staying brown in a scoped scheme override (e.g. a preview rune toggled to dark, or a sandbox). `tint.css` re-declares the palette under `[data-color-scheme="dark"]` — a hand-kept third copy that the token coverage test didn't reach — and it still held the pre-de-brown surface/border/code values. Synced it to the neutralized palette, and added a coverage test that checks every `--rf-*` key tint.css's `[data-color-scheme]` overrides share with the canonical token CSS, so this copy can't silently drift again.
- Add `layout="chart"` to the `aggregate` rune (SPEC-076 chart layout): grouped counts render as a chart — one bar/point per group — by emitting the `chart` rune's `<rf-chart>` + `data-name="data"` table pipeline (SVG with a no-JS table fallback). `chart-type` (`bar` default / `line` / `area` / `pie`) and `chart-title` are configurable; a `value` sub-filter adds a second series; the axis honors domain-aware group ordering; an empty query renders the `empty` fallback rather than a broken chart.
- Modernize `backlog` to compose over the `bar` rune (SPEC-084 / WORK-342). Its default item is now a `card` whose top strip is a `bar` — the identifier on the left, a sentiment-coloured status `badge` on the right, title below — built from a **universal projection** that works for every plan type. New `layout` attribute (`cards` default · `list` · `table`) is forwarded to `collection`. A type chip appears only for a mixed set; a single-type backlog also surfaces that type's key field (work→priority, bug→severity). The `$item` projection gains `identifier` (`id || name`, so milestones slot in), `sentiment`, and `mixed`, shared by every collection/aggregate rollup.
- Expose group metadata on `$item` in a grouped `collection` (SPEC-070 / WORK-344): the per-item template can now read `$item.group` (its group key) and `$item.groupCount` (the group's size), so a grouped collection can render group context inline without dropping to `aggregate`. Ungrouped collections are unaffected (`group` empty, `groupCount` 0).
- `card` now recognizes its title as the first _heading_ in the body rather than only the first child, so a composed header (e.g. a `{% bar %}` strip before the title) no longer leaves the title carrying a prose-sized top margin. Fixes the gap between a bar header and the title in `backlog` cards.
- Fix `escapeFenceTags` desyncing on code fences with info strings. A titled/attributed fence (e.g. ` ```yaml title="config.ts" `) was not recognised as a fence opener, so fence tracking lost sync and `{% %}` tags following the fence were wrongly escaped — corrupting document structure (for instance a `{% /codegroup %}` after a titled fence leaking as literal text). The opener now matches the full info string.
- Add a `levels` attribute to the `bento` rune's heading-sugar path: an author-defined footprint ladder, indexed by relative heading depth, where each rung is a column count `W` (× 1 row) or a footprint `WxH` — e.g. `levels="6,5,4,3,2,1"` (uniform-height, width-by-depth; the former `span` mode) or `levels="4x2,3x1,2x1"`. Depth is measured from the auto-detected base (shallowest heading), so the shallowest is always rung 0; ladders shorter than the heading depth clamp to the last rung. Omitting `levels` keeps the default tiered sizing unchanged, and explicit `{% bento-cell %}` grids ignore it.

## v0.18.0 - June 3, 2026

- Remove the legacy `slots` + `structure` assembly shim from the identity transform engine (SPEC-079 phase 3).
- **Breaking for third-party themes/plugins that still declare `RuneConfig.slots`.** Every first-party rune migrated to the SPEC-080 `metaFields` + `blocks` + `layout` model across v0.17.0, and the deprecation warning shipped for a full minor release. This release removes:
- `RuneConfig.slots` (the ordered slot-name array) and the slot-based assembly path in the engine.
- `StructureEntry.slot` and `StructureEntry.order` — only meaningful under slot assembly.
- The automatic universal `.rf-badge` class the shim applied to every meta-typed `StructureEntry`. A `StructureEntry` that should render as a chip must now set its own `class` via `attrs`. The `data-meta-type` / `data-meta-sentiment` attributes are unchanged.
- The `structure`-only before/after assembly (icons/badges injected around content) is **unchanged** — only the slot vocabulary is gone.
- **Migration:** move slot ordering into a `layout` tree and project metadata through `metaFields` + `blocks`. See the SPEC-079 migration notes in the theme-authoring docs (`config-api`, `dimensions`).
- Harden the rune output contract (SPEC-081 + SPEC-082).
- **Declarative structure assembly (SPEC-081).** A recursive `layout` field assembles a rune's output tree from flat, named `data-name` slots the transform emits — wrappers, headers, and grouping are described in config rather than built imperatively in each rune's `transform`/`postTransform`. All first-party runes (recipe, howto, character, realm, faction, event, playlist, symbol, budget, embed, diagram, sandbox, mockup, comparison, …) migrated to flat-emit + `layout`, removing most `postTransform` structure-building.
- **Typed node data channel (SPEC-082).** Rune field data now rides a single typed `data-rune-fields` JSON bag (camelCase keys) instead of per-field `<meta data-field>` children. The engine reads modifiers/metaFields/field-consumers from the bag and strips it from the final output, so rune HTML is markedly cleaner. Schema.org/RDFa SEO metadata is emitted inline and kept separate from the data channel.
- **Chart seam.** `chart` keeps the authored `<table>` as the single source of truth and emits an `<rf-chart>` custom element that renders an SVG (bar/line) on the client; the table remains as the no-JS fallback.
- Contracts now surface the layout skeleton; `projection.group`/`projection.relocate` are deprecated in favour of placing slots directly in the `layout` tree.

## v0.17.0 - June 2, 2026

- **v0.17.0 — Declarative metadata & layout.**
- A new, fully declarative model for how metadata-bearing and media-bearing runes are assembled — replacing per-rune imperative structure code with a small, orthogonal config vocabulary, and giving every rune a consistent metadata treatment. Additive: existing content keeps rendering; meta-bearing runes simply gain a cleaner, theme-overridable structure.
- **`metaFields`** — a pure data manifest of a rune's meta-bearing fields (each declares its `metaType`, `label`, `condition`, sentiment, and any rich rendering). No layout, no placement.
- **`blocks`** — named metadata blocks projected from `metaFields`, each a flat field list rendered by one layout primitive.
- **`layout`** — explicit, ordered placement of block names and content children per container (reserved `root` key for flat runes); unlisted content always appends, never drops.
- A field's render **shape** is intrinsic to its `metaType` — a chip (`.rf-badge`) for `status` / `category` / `tag`, bare inline text for `id` / `quantity` / `temporal` / `code` — independent of the block's layout. Themes override a rune's `metaFields` / `blocks` / `layout` by inner key.
- **`bar`** — a horizontal flex row of fields; per-field `align: 'end'` pushes a field (and everything after) to the right edge, `wrap` toggles single-line.
- **`definition-list`** — labelled `<dt>` / `<dd>` rows in a responsive multi-column grid.
- **`{% bar %}`** and **`{% deflist %}`** — prose authoring handles that emit the same DOM as the projected primitives, for hand-authored rows and definition lists.
- A single chip primitive — `.rf-badge` plus `[data-meta-type]` / `[data-meta-sentiment]` — is shared by the standalone `{% badge %}` rune and every chip-rendered field. `data-meta-type` carries typography only (monospace for `id` / `code`, tabular-nums for `quantity` / `temporal`, primary color for `id`); geometry comes from the layout primitive and the badge class; sentiment drives color.
- **`href`** — render as a link (`<a>`), the named modifier holds the URL.
- **`rating`** — a filled-marks-out-of-total widget (stars, dots).
- **`icon`** — a leading glyph selected by the field's value (e.g. the hint header's note / warning / caution / check).
- **`renderWhenEmpty`** — gate on _presence_ rather than truthiness, so a present-but-empty value still projects its block (e.g. `{% codegroup title="" %}` renders the window chrome without a filename).
- Every meta-bearing first-party rune is migrated to the model: docs `api` / `symbol`; learning `recipe` / `howto`; storytelling `character` / `realm` / `faction` / `lore` / `plot`; places `event`; media `playlist`; marketing `testimonial`; core `budget` / `codegroup` / `hint`; and the plan entities.
- **Structure contracts** (`refrakt contracts`) now surface each projected block as an addressable element with its layout primitive and fields, and derive child order from `layout`.
- The legacy `slots` + `structure` config path still renders, but is superseded by `metaFields` + `blocks` + `layout` and emits a one-time migration warning. Its removal — and the removal of `RuneConfig.slots` — is a breaking change planned for a later release; third-party plugins on the legacy path should migrate. `projection` (hide / group / relocate) and `postTransform` remain as escape hatches.

## v0.16.1 - May 31, 2026

- `file-ref` rune + shared `preview="drawer"` attribute on reference runes (SPEC-078, WORK-298..303).
- **New rune — `file-ref`.** Path-based inline reference to a project file — third member of the Registry family beside `xref` (one entity) and `expand` (one entity inlined). Renders as an inline `<a>` to the file's canonical GitHub URL; optional `preview="drawer"` hoists a drawer containing the file's snippet plus a "View source on GitHub →" footer link. Sandbox shared with `snippet` (rejects absolute paths / traversal escapes / out-of-root symlinks).
- **`xref preview="drawer"` extension.** The existing `xref` rune gains an optional `preview="drawer"` attribute that hoists a drawer containing the entity's `expand`-equivalent body. Same hoist mechanism as `file-ref` — one preview vocabulary across both reference runes. The drawer's chrome footer links to the entity's `sourceUrl` (or hides silently for URL-less entities). Inline link still resolves via the registry; clicking opens the drawer rather than navigating away.
- **Drawer footer slot + always-visible chrome.** The drawer body splits on a top-level `---` into two zones — body and footer — same shape `{% card %}` uses. In dialog mode, the drawer becomes a flex column: header and footer pin via `flex: 0 0 auto`, body scrolls via `flex: 1 1 auto; overflow-y: auto`, so a long entity body or file snippet scrolls inside the drawer with the footer staying one tap away.
- **Site config — `repoUrl` + `repoBranch`.** Two new optional fields on `SiteConfig` for the canonical repo URL + git ref. `file-ref` uses them to build `{repoUrl}/blob/{repoBranch}/{path}#L{N}-L{M}` URLs; falls back to a no-href link with a build warning when `repoUrl` is absent.
- **Internal mechanism — drawer hoist pipeline.** New `hoistPreviewDrawers` postProcess step collects `hoist-drawer` sentinels (emitted by `file-ref preview="drawer"` and `xref preview="drawer"`) and materializes drawers at the page root. Source-specific `HoistBuilder` registrations keep the drawer pipeline ignorant of file paths / entity ids — reference runes register their own builders. Per-page dedup: multiple references to the same target collapse to one hoisted drawer.
- **SvelteKit plugin** — `configure` lifecycle hook now runs on all plugins in the CSS-analysis pipeline pass (it was only running for the page-rendering virtual modules), so the plan plugin's unconditional scan registers entities for the CSS analyzer too. Also threads `repoUrl`/`repoBranch` from `SiteConfig` through the content loader chain.
- Fence-level annotations: `source`, `lines`, `linenumbers`, `highlight`, `label` (SPEC-062, WORK-304).
- The Markdoc fence node schema gains five optional attributes that work uniformly on hand-authored fences and snippet-derived ones:
- `source` / `lines` — provenance metadata. Snippet's preprocess now writes these unprefixed names instead of the internal `data-snippet-source` / `data-snippet-lines`. The fence transform renders them as `data-source` / `data-lines` on the output `<pre>` and `<code>`.
- `linenumbers` (boolean) — opt into a numbered gutter rendered in pure CSS via `counter()`. The start number is seeded from `data-lines` so the gutter reflects the file's real offsets.
- `highlight` (range string) — emphasize specific lines without cropping. Shiki-style format (`"74-78"`, `"74-78,82,90-92"`); file coordinates so it composes naturally with `lines=`. The highlight transform stamps `data-line-status="highlight"` on matching `span.line` rows post-Shiki.
- `label` — per-fence tab label hint consumed by `codegroup`.
- **codegroup**: tab labels now fall back through a precedence chain — `labels=` → per-fence `label` annotation → derived from `source` (basename + `:lines`) → prettified language name. The composition story propagates through fence attributes so codegroup doesn't care whether a panel came from `{% snippet %}` or a hand-authored fence.
- **diff**: the header derives from each panel's `source` (matching paths collapse to one label; differing paths render as `before → after`). Each panel's gutter honors its own `lines=` start, so a diff between two slices of the same file shows real file line numbers per side. The `highlight` annotation is silently ignored inside diff — the add/remove channel is the primary line-level signal.
- CSS: diff's `[data-line-status]` row template grows a third `highlight` value with a neutral tint (`--rf-color-line-highlight`) and primary-accent left rail. Snippet and codegroup share the same row primitive for the new highlight state. New tokens: `--rf-color-line-highlight`, `--rf-color-line-highlight-rail`, `--rf-color-line-number`.
- **Internal protocol changes** (no user-facing API broken; only CSS targeting the previous internal `data-*` names needs updating):
- The internal `data-snippet-source` / `data-snippet-lines` attributes emitted by the snippet rune are renamed to `data-source` / `data-lines`. These were documented as internal protocol when snippet shipped in v0.16 (SPEC-062).
- Diff's per-line `data-type` attribute is renamed to `data-line-status` to share one CSS row primitive across snippet / codegroup / diff with the three states `add | remove | highlight`.
- Diff's `<pre>` output now wraps its line spans in an inner `<div data-name="rows">` (`.rf-diff__rows`) — mirrors the codeblock's `<pre><code>` shape so the row tint extends across horizontal scroll. Themes targeting `.rf-diff__code > .rf-diff__line` directly need to update the selector.

## v0.16.0 - May 29, 2026

- **v0.16.0 — Registry-driven sites.**
- Turns the entity registry into pages and listings declaratively, ships the three sibling registry-query runes (`collection` / `relationships` / `aggregate` — items / edges / numbers), and proves the system by scaffolding refrakt's own plan site from the `plan/` content tree.
- **`{% collection %}`** (SPEC-070) — the plural counterpart to `ref` / `expand`. Queries the registry with `type` + `filter`, applies `sort` / `group` / `limit`, and projects entities into `list` / `grid` / `table` layouts. Per-item body templates with `$item` bound; heading-delimited table columns; shared field-match grammar; shared formatter functions (`humanize`, `date`, `number`, `currency`, `join`); 3-zone body (preamble / template / fallback) with `$count` / `$shown` bindings; `group-display="accordion"` for collapsible groups.
- **`{% relationships %}`** (SPEC-072) — graph-edge counterpart to `collection`. Renders an entity's edges grouped by kind (or type), generic over any domain's relationship vocabulary. Shares `$item` semantics with `collection` so card partials are reusable across both. Domain-aware ordering, accordion group display, body zones for empty state.
- **`{% aggregate %}`** (SPEC-076) — number-projecting sibling. No-body form (`{% aggregate type="work" filter="status:done" /%}`) renders a single inline integer; body-zoned form iterates groups with `$item` bound to `{ key, count, value, percent, total, shown }`. Optional `value` sub-filter (e.g. `value="status:done"`) drives `$item.percent` for progress-bar ratios without a second query.
- **Plugin-contributed routes** (SPEC-069) — new `contributePages` pipeline phase plus declarative `entityRoutes` in `refrakt.config.json` that generate one page per registered entity matching `type` + optional `filter`. `embed()` embeddability contract for cross-page composition.
- **Plan site scaffolding** (SPEC-071) — refrakt's own plan site rebuilt from `plan/` via `entityRoutes` + the registry-query runes. The bespoke `plan build` / `plan serve` commands are retired. Dashboard composition (aggregate header summary + per-status `collection` panels + empty-state `hint` runes) shipped as the canonical scaffold template.
- **Theme toggle** (SPEC-073) — light / dark / auto toggle as both a chrome slot and a `{% theme-toggle /%}` rune, with shared behavior and prod-build CSS parity for the Cloudflare-style no-runes-bundle.
- Accordion polish — leading rotating chevron via SVG mask, native `<details>` slide animation via `::details-content` + `interpolate-size`, dividers-only outer treatment.
- Badge restyle to a compact sentiment-tinted chip; sentiment via `color-mix(in srgb, var(--meta-color) X%, transparent)`.
- New "Registry" category in the rune catalog for the cross-page-query runes (`xref` / `expand` / `collection` / `relationships` / `aggregate`); seven previously-missing runes added to the catalog (`xref`, `badge`, `gallery`, `showcase`, `bg`, `tint`, `blog`).
- `refrakt.config.json` schema — `theme` is now `string | SiteThemeConfig` (was just `string`); new `SiteThemeConfig` definition with `package`, `presets`, `tokens`, `modes`, and `code.colorScheme`. `highlight` flagged as legacy in favour of `theme.presets` (Lumina syntax presets contributing `--rf-syntax-*` overrides) + `theme.code.colorScheme` (forced light/dark code).
- `site/content/runes/aggregate.md` — full reference page with live previews; sites.md updated for the theme object form.
- Nav items containing an inline `{% badge %}` now sit as a flex row so the badge rides alongside the link instead of wrapping under it (link's `display: block` was claiming the full row).
- Mobile docs toolbar long page titles now ellipsise instead of forcing horizontal page scroll (`flex: 1 1 0` + `max-width: 100%; overflow: hidden;` on the toolbar).
- Conversation rune's `speakers="A,B"` attribute now renders names as bold-inline prefix inside the bubble, matching the explicit `> **Name**:` form. Two related issues fixed: the extractor was missing the Markdoc `inline` wrapper around paragraph content, and the fallback path didn't inject a strong-prefix. The speaker-carrier span is now hidden via the correct `data-field="speaker"` selector.

## v0.15.0 - May 25, 2026

- Drawer rune: a body-only rune that opens its content as a slide-in panel from an xref-as-trigger in prose (SPEC-060). A cross-reference to the drawer's id anywhere on the page opens the drawer; the body is registered as a page-scoped entity rather than rendered inline.
- Ships in two states: a no-JS `<details>`-style fallback that works without scripts, and a progressively-enhanced `<dialog>` with slide-in animation, scroll-lock, a keyboard shortcut, URL-hash sync, and back-button integration.
- New `EntityRegistration.scope: 'page' | 'site'` field distinguishes page-local entities (drawer bodies) from site-wide ones, so a drawer registered on one page doesn't leak into another page's xref namespace.
- `@refrakt-md/types`: `EntityRegistration.scope`.
- `@refrakt-md/runes`: `{% drawer %}` schema + transform + drawer pipeline; engine config for both rendered states.
- `@refrakt-md/behaviors`: `drawer` behavior (`<dialog>` enhancement, shortcut, hash sync, back-button).
- `@refrakt-md/lumina`: drawer CSS for the no-JS and JS states.
- File roots: configurable named directories that file-reading runes can reach via `namespace:filename` syntax (SPEC-063).
- A new top-level `fileRoots` field in `refrakt.config.json` registers named directories that Markdoc partials (and, when SPEC-062's v2 lands, the snippet rune) can resolve from:
- Plugins can declare their own file roots via a new `Plugin.fileRoots` field on the plugin shape (paths relative to the plugin package's own directory). User-config and plugin-registered roots merge at load time: user config wins any collision (with a dev warning); plugin-vs-plugin namespace collisions throw at plugin load.
- The namespace `site` is reserved for future site-level resolution. Empty namespace, absolute paths, and traversal escapes are all rejected with clear errors.
- Backwards-compatible: existing unprefixed `{% partial file="footer.md" /%}` references continue to resolve from each site's `_partials/` directory.
- `@refrakt-md/types`: `RefraktConfig.fileRoots`, `Plugin.fileRoots`.
- `@refrakt-md/runes`: `assertFileRootNamespaceAllowed`, plus `LoadedPlugin.fileRoots` / `MergedPluginResult.fileRoots` so adapters can introspect plugin-contributed roots.
- `@refrakt-md/content`: `readFileRoots`, `resolveUserFileRoots`, `mergeFileRoots`, `validateNamespacedReference`, plus the new `fileRoots` option on `SiteLoaderOptions`, `VirtualSiteLoaderOptions`, `LoadContentFromTreeOptions`, and `VirtualRefraktLoaderOptions`.
- `createRefraktLoader` automatically reads `refrakt.config.json#/fileRoots`, merges with plugin roots, and threads the result through the loader. Diagnostics (e.g. shadowed plugin namespaces) print to stderr.
- Page variables: add `$page.dir`, `$page.slug`, `$page.title`, and `$file.path`; rename `$page.filePath` to `$page.path` (breaking).
- `$page.path` — content-root-relative file path, POSIX-normalized (replaces `$page.filePath`)
- `$page.dir` — directory portion of `$page.path` (`""` for content-root pages, no trailing slash)
- `$page.slug` — last segment of `$page.url` (for index pages, the directory name; `""` for the homepage)
- `$page.title` — `$frontmatter.title` when present and non-empty after trimming, else the first H1 in the page AST (depth-first, descending into rune children), else `undefined`
- `$file.path` — project-root-relative source file path, POSIX-normalized (project root is the directory containing `refrakt.config.json`)
- **Breaking:** `$page.filePath` is removed. Authored content that referenced `$page.filePath` must use `$page.path` instead. A grep of the refrakt corpus showed zero usages; external sites that adopted it should rename in the same step they upgrade.
- Adapters (SvelteKit, Eleventy, Editor) now thread the project root through to the content loader so `$file.path` works out of the box. Hosts using `loadContentFromTree` directly can pass `projectRoot` on the options bag; when omitted, `$file.path` falls back to the content-root-relative path.
- Plan plugin: unconditional scan of `plan.dir`, entity registration with `sourceFile` + `extract`, dynamic `plan:` file-root namespace (SPEC-064).
- The plan plugin's `register` pipeline hook now performs an unconditional scan of the project's `plan.dir` after processing site-loaded pages. Every parseable plan entity (`spec`, `work`, `bug`, `decision`, `milestone`) found on disk is registered into the `EntityRegistry`, regardless of whether the file is part of any site's content tree. This is what makes the `{% expand "SPEC-023" /%}` rune (SPEC-066) work for plan content that isn't published to the site.
- `sourceFile` — project-root-relative POSIX path to the source `.md` file.
- `extract` — a closure that returns the top-level plan rune AST node from a freshly-parsed source file, or `null` if the file's structure has been edited away from the expected shape. Consumed by `{% expand %}` for inline substitution.
- Site-load registrations win any duplicate (they have a real `sourceUrl`); the scan skips files whose entity is already in the registry. Files with no parseable plan rune (READMEs, notes) are silently skipped — the filename convention is a hint, not a filter, so files like `arbitrarily-named.md` still register if they contain a valid `{% spec id="..." %}` rune. Duplicate IDs across two plan files surface as an error naming both file paths.
- `sourceFile?: string` — project-root-relative path to the source `.md` file backing the entity. Populated by plugins that scan disk; consumed by content-embedding runes.
- `extract?: (parsedSource) => Node | null` — extracts the entity's top-level AST node from a freshly-parsed source file. Paired with `sourceFile`.
- Runs once per build before any other hook, giving plugins access to the user's config and the ability to register file-root namespaces dynamically (when the right path can't be statically declared on `Plugin.fileRoots`). The plan plugin uses both: it reads `plan.dir` from the config and registers `plan:` pointing at the user's actual plan directory.
- **`Plugin.fileRoots: { plan: '../../plan' }` was NOT added.** That static declaration would point at the wrong directory for npm-installed users (`node_modules/plan/` rather than the user's project-root `plan/`). The plan plugin doesn't ship plan content — users have their own — so the namespace path is fundamentally per-project. Dynamic registration via `configure` is the correct mechanism.
- The `register` hook still emits the existing site-load registrations for plan pages published to a site; the scan is additive.
- Snippet rune: embed a project file as a syntax-highlighted code block (SPEC-062). Core rune; composes transparently inside `{% codegroup %}`, `{% diff %}`, and any future fence-consuming container via pre-resolve.
- **Implementation as AST preprocessor.** Snippet is not a transform-time rune — every `{% snippet %}` tag is replaced with a Markdoc `fence` node before the schema-driven transform runs. The fence carries the file's resolved content, the inferred (or explicit) language, and `data-snippet-source` / `data-snippet-title` / `data-snippet-lines` attributes for downstream tooling.
- By transform time, no snippet tags remain — only fences. Container runes that match `fence` (codegroup, diff, future runes) consume them transparently with no per-rune awareness of snippet. The standalone form's `<figure class="rf-snippet">` chrome is applied by a post-transform wrap step that only fires for `<pre data-snippet-source>` elements _not_ descended from a fence-consuming container output.
- **New `preprocess` pipeline phase.** `PluginPipelineHooks` gains a `preprocess` hook that runs per page on the parsed Markdoc AST before the transform. The `PreprocessContext` extends `PipelineContext` with `projectRoot` and `sandbox` so file-reading preprocessors (snippet, future macros, future build-time include resolvers) have what they need; variables from the transform config aren't available pre-transform. Hook signature:
- Core's `corePipelineHooks` registers the snippet preprocess hook through the existing `createCorePipelineHooks` factory — exercises the hook contract from within core, validating it as a general extension point.
- **Sandbox enforcement** (in `packages/runes/src/lib/read-file.ts`): absolute paths rejected, traversal escapes rejected, symlinks escaping the project root rejected, missing files / directories rejected. All errors produce build errors that name the resolved path and the referencing page; line-range clamps produce warnings.
- **`<pre>` data-attribute pass-through.** The fence node transform (`packages/runes/src/nodes.ts`) now forwards `data-*` attributes from the fence node to the rendered `<pre>`. This is how snippet markers (`data-snippet-source`, etc.) survive the transform so the wrap step can find them.
- **Docs site dogfood.** New page at `site/content/runes/snippet.md` linked from the "Code & Data" sidebar section. The page renders live snippets of actual files in this repository, demonstrates composition with codegroup and diff using real source files, and ends with a recursive view-source-of-itself example via `{% snippet path=$file.path lang="markdoc" /%}` — the snippet docs page literally embeds its own source markdown.
- **Lumina** ships baseline `.rf-snippet` and `.rf-snippet__title` styling.
- Cross-reference resolution: configurable URL patterns, decoupled entity/URL lookup, per-segment encoding, and `data-target-type` propagation (SPEC-065).
- The xref resolver now supports a `xrefs: XrefPattern[]` array in `refrakt.config.json` that maps unresolved IDs to URLs via regex + template. Compiled once per build via `compileXrefPatterns` (exported from `@refrakt-md/runes`).
- 1. **Entity lookup** — find the entity in the registry (exact ID, then name/title). Captures metadata (label, type) regardless of whether a URL is available. 2. **URL resolution** — use the entity's `sourceUrl` if present and non-empty; otherwise iterate `xrefs` patterns, first match wins; otherwise unresolved. 3. **Rendered anchor** carries `data-xref-id`, `data-xref-source="registry"|"pattern"`, and `data-target-type="{entity-type}"` when the entity was matched (drawer / future addressable runes query this).
- `EntityRegistration.sourceUrl` is now optional. Empty strings passed at registration are normalized to `undefined` so plan content registered without a URL (SPEC-064) flows correctly through pattern resolution. The byTypeAndUrl index skips entries without a URL.
- Substituted template values are encoded per URL segment (split on `/`, encode each segment, rejoin) so path-shaped captures like `(?<path>[a-z0-9/-]+)` preserve their slash structure: a pattern matching `docs:guide/intro` now resolves to `.../guide/intro`, not `.../guide%2Fintro`.
- Authors using `corePipelineHooks` directly continue to work unchanged; the new `createCorePipelineHooks({ xrefPatterns })` factory is used by the content loader to inject compiled patterns. `createRefraktLoader` reads `refrakt.config.json#/xrefs` and compiles automatically.
- The old `data-entity-type` / `data-entity-id` attributes on resolved anchors are replaced by `data-target-type` / `data-xref-id`. No production code outside of the resolver itself referenced the old names.
- Expand rune: inline a registered entity's body into the current page (SPEC-066). `{% expand "SPEC-023" /%}` pulls the target entity's content into the host page at an author-chosen heading `level=`, so a single `.md` source can render as its own canonical page and also embed inline elsewhere.
- New generic `data-outline-scope` walkers isolate the embedded content's table-of-contents and namespace its heading IDs, so the embedded outline doesn't collide with the host page's headings or TOC.
- Includes a canonical-link affordance back to the entity's own page.
- Works for plan content that isn't published to the site, via the plan plugin's unconditional entity registration (SPEC-064).
- `@refrakt-md/runes`: `{% expand %}` schema + resolver + expand pipeline; `outline-scope` walkers.
- `@refrakt-md/lumina`: expand CSS (embedded-entity framing + canonical-link affordance).

## v0.14.4 - May 22, 2026

- Framework adapter parity with the SvelteKit reference (SPEC-058) — six capabilities that previously lived only in `@refrakt-md/sveltekit` now ship in working form across `@refrakt-md/astro`, `@refrakt-md/nuxt`, `@refrakt-md/next`, `@refrakt-md/eleventy`, and `@refrakt-md/html`. Application work — no new contracts, no breaking changes.
- **Site-level token-overrides CSS now works in every adapter.** `composeSiteTokensCss` (the generator that turns `theme.presets`, `theme.tokens`, `theme.modes`, and `site.tints` into a stylesheet — SPEC-048 + SPEC-056) moved out of the SvelteKit plugin and into `@refrakt-md/transform/node` as a shared module. The Astro and Nuxt adapters expose it as a Vite virtual module (`virtual:refrakt/site-tokens.css`); Eleventy ships it as a passthrough-managed file; Next.js exposes it through a Server Component helper; the HTML renderer inlines it via a `page-shell` helper. Sites authored on any adapter can now drop tokens into `refrakt.config.json` and skip writing CSS for the common case, just like SvelteKit.
- **SEO meta enrichment from site config in every adapter.** `siteName`, `baseUrl`, `defaultImage`, and `logo` from `refrakt.config.json` now bake into `og:site_name`, absolute `og:url`, image fallback, and WebSite + Organization JSON-LD on every adapter, not just SvelteKit. `SeoToHtmlOptions` threads through the SEO helpers in Astro, Nuxt, Next, Eleventy, and HTML.
- **CSS tree-shaking by used-rune analysis everywhere.** The SvelteKit-only optimisation that emits only the per-rune CSS files for runes actually present in the corpus is now shared via `@refrakt-md/transform/node`'s `used-css` helper. Vite adapters (Astro, Nuxt) get it via a sibling `virtual:refrakt/runes.css` virtual module; non-Vite adapters (Eleventy, Next, HTML) get a `getUsedCssImports` companion. Sites stop shipping the full theme barrel on every framework.
- **Shared pipeline-stats build summary.** The Phase 1/2/3/4 + warnings table that the SvelteKit plugin printed at the end of every build moved into `@refrakt-md/content` and is adopted across every adapter's build path. Eleventy, Astro, Nuxt, and Next now surface the same build summary instead of going silent or inheriting the host framework's default output.
- **`security` and `variables` plugin options surfaced on every non-SvelteKit adapter.** `SecurityPolicy` and Markdoc `$name` variables were SvelteKit-only surfaces even though `loadContent` already accepted them. The Astro `createRefraktLoader`, Nuxt module, Next data helper, Eleventy plugin, and HTML renderer now all forward both options to the loader.
- **Content HMR for non-SvelteKit Vite adapters and Eleventy.** Content HMR (watching the content directory + sandbox examples, invalidating the loader cache on `.md` edits) extends to Astro + Nuxt via Vite `configureServer` and to Eleventy via `addWatchTarget`. The HMR machinery moved from `@refrakt-md/sveltekit` to `@refrakt-md/transform`'s `content-hmr` module so every adapter can reuse it. Next.js intentionally not covered — its dev server already invalidates the loader's import graph when watched files change. The HTML adapter is a static-build helper with no dev server.
- **`template-astro/src/setup.ts` replaced with `createRefraktLoader`.** The Astro starter template's bespoke setup boilerplate folds into a thin `createRefraktLoader` wrapper — the single entry point now handles loader construction, security/variables options, and the new HMR + tokens wiring. Same for the Next.js template's adapter glue.
- **Footer nav two-column mobile rule.** Cosmetic: footer nav drops to two columns on mobile instead of stacking to one, applies to both the auto-columns rendering and the explicit-column variant. Keeps the footer scannable on phone width where one-column footers turn into long scrolls.

## v0.14.3 - May 21, 2026

- Navigation enrichment: build-time slug resolution + richer dropdowns (SPEC-054 + SPEC-055), `{% badge %}` core inline rune, and a docs IA split into separate author and developer handbooks.
- **SPEC-055: build-time slug resolution + active state.** `{% nav %}` slug references now resolve at build time rather than runtime, so the SSR HTML carries fully-resolved `href` attributes and the "multiple items active at once" symptom is gone. Multi-segment slugs (`docs/configuration/plugins`) are the first-class disambiguator when a leaf slug appears in multiple subtrees — ambiguous bare slugs raise a build error pointing at the offending nav with the candidates listed, instead of silently picking the wrong one. Active state is also computed at build time using exact + longest-prefix matching, with the active class stamped into the SSR HTML so there's no client-side flash. Lumina ships dedicated active-state styles; existing site navs migrated in-place to multi-segment slugs where bare slugs collided.
- **SPEC-054: richer dropdowns, column flow, and the strip layout.** `{% nav layout="menubar" %}` now accepts arbitrary block content inside `## groups`, with a position-based intro/footer slot rule: prose or runes appearing _before_ the first list become the panel intro, content appearing _after_ the list becomes the footer. `{% nav layout="columns" %}` gains a `---`-between-sections column-flow rule (each section becomes a column) plus a headingless mode where a flat list renders as a single-column card. A new `{% nav layout="strip" %}` lands for compact secondary link rows — flat by design; warns on `##` headings since grouped strip-like content should use `columns` or `vertical`. `layout="mega"` was explicitly _not_ added — menubar composition covers it via nested `columns` navs in panel slots.
- **`{% badge %}` core inline rune.** New core inline rune for compact metadata pills — sentiment variants (`success`, `warning`, `danger`, `info`, `neutral`), optional `icon` and `count` attributes. Styled with a sentiment-tinted border and background; standalone usage gets a punchier treatment than inline-in-prose. Lives in `packages/runes/src/tags/badge.ts` and `packages/lumina/styles/runes/badge.css`.
- **Auto-enrichment generalised across `auto=true` layouts.** Description and icon resolution (previously only on a subset of layouts) now applies to every `{% nav auto=true %}` invocation — the cross-page pipeline reads `description` and `icon` from each target page's frontmatter and injects them into the rendered nav item. Menubar panels, column navs, and the new strip layout all benefit. Backwards-compatible: omitting frontmatter just renders the title.
- **Mobile nav fix.** The mobile nav panel now docks below the header and is toggled by a single trigger that flips between open and close — the previous separate open/close buttons led to inconsistent state on rotation. The docs sidebar-nav panel offset was restored after it regressed during the menubar work, and the docs toolbar is now sticky on mobile so the breadcrumb stays visible while scrolling.
- **Docs toolbar breadcrumb.** Surfaces the category and current page title — gives the toolbar useful navigation context on deep pages where the URL alone isn't enough.
- **Docs IA split (WORK-238).** The site's docs tree now splits into two handbooks aimed at different audiences. **Docs** (`/docs/*`) is the author handbook — getting started, authoring, configuration, CLI, adapters, MCP. **Extend** (`/extend/*`) is the new developer handbook — rune authoring, plugin authoring, theme authoring, pipeline, security, contributing. Header restructured to five panels (Docs · Runes · Themes · Extend · Project); footer columns updated to match (Learn · Reference · Extend · Project). Old URLs (`/docs/authoring/*`, `/docs/themes/*`, `/docs/plugins/authoring*`, `/docs/security/*`) redirect to their new homes under `/extend/*`. A new author-facing plugin catalog landed at `/docs/configuration/plugins`. Internal cross-doc links, `CLAUDE.md`, and root READMEs swept to the new paths.
- **Hint rune visual cleanup.** Dropped the border on `{% hint %}` — the tinted surface alone separates it from surrounding prose, the extra border was visual noise.

## v0.14.2 - May 20, 2026

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
