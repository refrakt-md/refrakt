# @refrakt-md/skeleton

## 0.27.0

### Patch Changes

- Updated dependencies [971fa1f]
  - @refrakt-md/types@0.27.0

## 0.26.0

### Minor Changes

- 7988847: **`feature` gains a canonical `layout` axis (grid / list / carousel).** Layout is now a first-class, named vocabulary (`LAYOUT.grid` / `LAYOUT.list` / `LAYOUT.carousel`) shared across runes instead of being inferred from incidental attributes. `feature` reads an explicit `layout=` with transform-level default resolution, and the old `media-position → definitions-grid` coupling is retired in favour of the explicit axis (structure contracts regenerated accordingly). Lumina/skeleton style the grid collapse-reflow off the canonical `[data-layout]` selector, and `layoutMatches()` lets themes and behaviors test layout intent without string-sniffing.
- 7988847: **Carousel is now a shared layout mode any rune can adopt, not a one-off.** `layout="carousel"` is a canonical layout token backed by a shared DOM contract (a `data-name="items"` track whose direct children are the slides) and an attribute-triggered behavior dispatch path: the carousel behavior enhances any block carrying `[data-layout="carousel"]`, lifted out of the gallery to be block-agnostic. A CSS-only `collapse-to` dial lets a grid/list collapse into a carousel at a breakpoint. `feature` (marketing) and `cast` (business) are the first adopters; the shared track + `collapse-to` contract is documented for further runes.
- 7988847: **Reading register: editorial body text via a `reading` axis (`fine` / `ui` / `prose`).** A new body-text classification refines `data-section="body"` as `data-reading`, resolved author `reading=` ▸ rune `defaultReading` ▸ layout/region default ▸ `ui` (the engine emits it, suppressed at the `ui` default so unmarked content stays byte-identical). Lumina interprets `prose` with a theme-owned editorial treatment — capped measure (independent of `width`), paragraph rhythm, and running-text niceties — keyed on `[data-reading]`, not rune-name lists. `dropcap` is generalised to a universal, prose-gated opt-in (honoured only where the body reads as `prose`), with the block editor surfacing its toggle by deriving it from the resolved register via the shared `resolveReading()` + `READING_CAPABILITIES`. The `blog-article` body and editorial runes (`pullquote`, `textblock`, `lore`) default to `prose`; the gallery grows a reading subject guarding the treatment in light + dark.

### Patch Changes

- 693cf13: **Preview toolbar: surface the view toggle separately and hide preview-only controls in code view.** The view-mode toggle (preview ⇄ code) now sits in its own group on the left of the toolbar, visually distinct from the controls that _tune_ the rendered preview. Those preview-only controls — the responsive viewport selector and the theme toggle — are hidden while the code view is active, since they act on a canvas that isn't shown. Their state is retained and reapplied when you switch back to the preview. Toolbar chrome is also tidied: the toolbar sits flush to the canvas edges (no horizontal inset), the left group has no inter-item gap, and the source/code panel is clipped to its rounded corners so the bottom corners round correctly (matching the canvas).
- 63077cb: **Beside layouts collapse on their own column width, not the global viewport.** The shared `split.css` beside→stack collapse (used by card, recipe, hero, feature, step, realm, faction, playlist) moves from `@media` to `@container`, so a media-beside layout now collapses to a stack based on the width actually available to it — its nearest query container (`.rf-page-content` on a page) — rather than the browser viewport. A beside layout embedded in a narrow column (e.g. a docs page beside the sidebar) now collapses when _that column_ is tight. The `data-collapse` breakpoints (sm/md/lg) and the `never` opt-out are unchanged. Additionally, the `preview` rune's viewport frame is now a query container, so container-query-driven layouts (this beside→stack collapse, and carousel `collapse-to`) are faithfully simulated when you narrow the preview's viewport selector.
  - @refrakt-md/types@0.26.0

## 0.25.1

### Patch Changes

- 35d7658: Fix mobile docs layout where the secondary toolbar covered the top of the open side-nav panel, hiding its first link. The nav panel's `top` override had the same specificity as the base `.rf-mobile-panel` rule and lost on import order, so the panel docked under the site header instead of the toolbar. The override is now a two-class selector that wins regardless of order, and the toolbar is pinned to a known height the panel offsets against exactly.
- 35d7658: Fix steps rune forcing `display: block` on every `<strong>`. The title rule was scoped to `.rf-step strong`, which caught all inline bold in step body text and broke it onto its own line. It now targets only the leading title bold (`.rf-step__content > p:first-child > strong:first-child`), so inline bold renders inline.
  - @refrakt-md/types@0.25.1

## 0.25.0

### Patch Changes

- Updated dependencies [3a3ddf3]
  - @refrakt-md/types@0.25.0

## 0.24.6

### Patch Changes

- Updated dependencies [2ce7a17]
  - @refrakt-md/types@0.24.6

## 0.24.5

### Patch Changes

- c68d84f: **Fixed the gap that could appear between a sticky header and the bar below it while scrolling.** Layout headers (`.rf-header`, `.rf-docs-header`, `.rf-blog-header`) now pin their height to `--rf-header-height` instead of being content-driven, so the sticky offsets that dock below them — the docs mobile toolbar and the mobile nav panel — line up exactly with the header bottom. Previously a header that rendered shorter than the assumed `3.5rem` left a strip where page content scrolled through between the two bars (and a taller one overlapped). The docs toolbar also hard-coded the `3.5rem` literal rather than reading the token, so layout overrides like the blog layout's `4.25rem` never reached it; all offsets now derive from `--rf-header-height`. Sites whose header needs to be taller should set `--rf-header-height` on their layout root.
  - @refrakt-md/types@0.24.5

## 0.24.4

### Patch Changes

- @refrakt-md/types@0.24.4

## 0.24.3

### Patch Changes

- e85a0f0: Add a `guestFit` media-host axis so a theme declares whether a rune frames its media-zone guests or leaves them alone. `RuneConfig.guestFit: 'clip' | 'bleed'` (default `clip`) is emitted by the engine as `data-guest-fit` on the media zone, a sibling to `data-guest-posture`.

  This fixes rich guests (`sandbox`, `codegroup`, `juxtapose`) being given rounded corners in bare section hosts like `hero` and `feature`: those now declare `guestFit: 'bleed'`, so a rune guest keeps its own chrome (its natural radius/border) instead of being masked by the slot — while leaf images still frame to the slot. Framed wells (`card`, `bento-cell`, …) keep `clip` and are unchanged, still merging a guest into the well as one surface. The shared rule replaces the per-host CSS so any rune can opt into either behavior from config.

  `guestFit` also drives the displace containment default: a displaced guest now defaults to `peek` (cropped) in a clip host and `bleed` (spills) in a bleed host, so a hero no longer needs `frame-displace-mode="bleed"` spelled out (an explicit mode still overrides). The hero-specific media-zone unclip is retired in favour of the shared `data-guest-fit="bleed"` rule; the guest-intrinsic opt-outs (`preview`, `juxtapose`, displaced `showcase`) are unchanged.

  A bleed host no longer clips its rune guest at all (not just on displace), so a guest's own drop-shadow is no longer cropped into the corner gaps left by its rounding — which showed as darker corners behind, e.g., a codegroup in a hero.

  - @refrakt-md/types@0.24.3

## 0.24.2

### Patch Changes

- @refrakt-md/types@0.24.2

## 0.24.1

### Patch Changes

- ce700c2: **Frame displacement gains a `bleed` mode and a longer offset ramp; bg gradients accept `transparent` and `name/alpha` stops; spacing-attribute overrides now win cleanly.**

  - **`frame-displace-mode="bleed"`** — a second rendering model for `frame-displace`. `peek` (default) keeps the existing `transform: translate()` behaviour where a displaced media guest is cropped by its zone — correct for card / bento-cell. `bleed` puts a negative margin on the media zone so following layout pulls up and the guest extends past the host's edge with no gap above — useful for a hero or cta whose media should overflow downward.
  - **Hero unclip** — when a hero's media zone contains a displaced guest (`data-displace` on the zone itself or on a child rune), the zone now opts out of `overflow: hidden` so the spill is actually visible. Card / bento-cell continue to clip into peeks; only section-like hosts unclip.
  - **Extended `frame-offset` ramp** — adds `2xl` (4rem), `3xl` (6rem), `4xl` (8rem). Non-linear by design: `sm`–`xl` still ride the block-spacing tokens for peek granularity inside a card; `2xl`+ jumps to section-spacing so a bleed-mode displacement can clear a section's `padding-block` and have visible overhang.
  - **`bg` gradient stops accept `transparent`** — `{% bg gradient="to-br" from="transparent" to="primary" %}` emits the literal CSS keyword, so a token-driven gradient can fade in or out without falling back to a raw-CSS preset.
  - **`bg` gradient stops accept `name/alpha` shorthand** — Tailwind-style. `to="primary/0.5"` (decimal) or `to="primary/50"` (percent) compiles to `color-mix(in srgb, var(--rf-color-primary) 50%, transparent)`. Theme-aware: the colour still tracks `tint`.
  - **`spacing="flush" | "tight" | …` overrides** — the universal-margin default selector in `dimensions/surfaces.css` was at specificity (0,3,0) because of its `:not([data-rune] [data-rune])` clause, beating the `[data-rune][data-spacing="…"]` attribute rules (0,2,0). Wrapping the default in `:where()` zeros its specificity so `spacing` (and per-rune / per-instance) overrides now win cleanly.
  - **`sandbox` loses its hand-rolled `border-radius`** — sandbox now inherits whatever radius its host provides (or none), and the in-preview `border-radius: 0` workaround is dropped.

- 50db743: **Fix `height="fill"` on sandbox; bump juxtapose container radius to `lg` for consistency.**

  - **`sandbox height="fill"` now actually fills the host.** The behaviour set the iframe to `height: 100%`, but the `.rf-sandbox` host itself was auto-height, so the iframe's 100% resolved against an undefined containing block and collapsed to the 150px fallback. This only worked in cover media (`media-position="cover"`) where the host was positioned absolutely with `inset: 0`. Any other context — a card with `frame-aspect`, a hero with a media zone, a parent that owns its height some other way — silently produced a 150px iframe. Skeleton now sets `.rf-sandbox[data-height="fill"] { height: 100% }` so the host claims its container's height and the iframe's `100%` means what it says.
  - **`juxtapose` panels container radius `md` → `lg`.** A standalone juxtapose now matches the container-radius tier used by card / hero / bento-cell (`--rf-radius-lg`). The existing media-zone-guest override (`--rf-radius-media`) still wins when a juxtapose is dropped into a card's media well, so it never out-rounds its host.
  - @refrakt-md/types@0.24.1

## 0.24.0

### Minor Changes

- dd2d955: **Live sandbox guests in the `bg` backdrop layer (SPEC-104).** A surface can now carry **both** an animated backdrop **and** a positioned subject media — the visualiser is the `bg`, the image/code/embed stays an in-flow media guest, so they stop competing for the single media zone.

  - `bg` gains an optional body holding one bare `sandbox`: it's transformed normally (the real rune runs, with file resolution + sanitisation), tagged `data-bg-guest`, and the engine relocates it into the bg layer (a sibling of `bg-video`, above the boot frame, below overlay/scrim). A chromed guest (`video`/`audio`/`figure`) is rejected with a build warning.
  - A new **backdrop posture** (`data-guest-posture="backdrop"`): the guest is mounted and running but pointer-inert; the sandbox is forced to `height="fill"` + eager activation, **not** mounted under `prefers-reduced-motion` (the boot frame stands in), and suspended off-screen / on a hidden tab.
  - A **named `sandbox` bg preset** (`BgPresetDefinition.sandbox`, project-level `backgrounds` config) applies a reusable scene by name (`bg="midnight-waves"`) like any other preset, resolved at transform time and memoised per scene.

### Patch Changes

- d77cd41: **Fix: `preview` no longer bleeds to the viewport edge inside a `feature` (default layout).** The WORK-438 skeleton/skin split promoted the in-feature breakout `.rf-preview--in-feature { margin-inline: calc(-1 * var(--rf-content-gutter)) }` into `@layer skeleton`, where it lost to Lumina's skin rule `.rf-preview { margin: 2rem 0 }` (skin beats skeleton regardless of specificity), nullifying the breakout. The bleed is moved back to `@layer skin`, where it again wins over the base margin by specificity and fires together with the canvas border-radius reset at the `@container (max-width: 1280px)` breakpoint. Docs-layout previews were unaffected (they bleed via the canvas de-chrome, not the in-feature root margin).
- dd2d955: **Fix: `mockup` as a media guest renders correctly (incl. iOS Safari).** A mockup placed in a rune's media zone (cards, bento) now fills its slot instead of capping at its native size, and is inset from the media-zone sides. The upscale is gated to fine-pointer / wide slots, scaled with `transform` rather than `zoom`, and its fill factor is measured in JS (a new `mockup` behaviour) rather than `cqi` — fixing the sizing on iOS Safari.
- Updated dependencies [dd2d955]
  - @refrakt-md/types@0.24.0

## 0.23.0

### Minor Changes

- c772e4b: **New `@refrakt-md/skeleton` package + cascade-layer infrastructure (SPEC-094 §3).** Stands up the skeleton/skin split: a dedicated, independently-versioned package that ships `@layer skeleton` and the `@layer skeleton, skin;` order declaration, plus the token-name contract (the `TokenContract` type + layer-name constants, re-exported so the contract has one home). A breaking structural change bumps _this_ package, not a skin.

  - **Lumina** now depends on `@refrakt-md/skeleton` and imports it first, so the layer order is declared before any layer content. Lumina's own CSS is currently unlayered (it wins over the empty skeleton layer, so rendered output is unchanged); the per-file `@layer skin` re-bucketing that fills the skeleton layer lands in a follow-up.
  - **The SvelteKit loader** emits the `@refrakt-md/skeleton` import before any theme CSS in both dev and build modes — the order-declaration-first guarantee that lets a theme's `@layer skin` win over `@layer skeleton` with ordinary selectors and **no `!important`**, regardless of import order.

  **Icon-from-config (SPEC-094 §8).** Embedded `data:image/svg+xml` mask-image glyphs are lifted out of `hint` and `accordion` CSS into the theme icon registry (`config.icons`). The token generator surfaces them as `--rf-icon-<group>-<name>` mask custom properties, and the rune CSS reads those via `var()`. A theme re-glyphs the hint icons / accordion chevron by editing config alone — no CSS change.

- e048fe3: **Skeleton/skin re-bucketing — the skeleton layer is now filled (SPEC-094 §3, WORK-438).** The follow-up promised by the skeleton-package infrastructure change: Lumina's framework-agnostic _structure_ is moved out of `@layer skin` into `@refrakt-md/skeleton`'s `@layer skeleton`, group by group and strictly bottom-up (foundation → dimensions → layouts → runes).

  - **`@refrakt-md/skeleton`** now ships the structural CSS for ~81 runes plus the shared dimension layers (state, media, cover, metadata, sections, checklist, sequence, guest-posture) and the page-shell layouts (default, docs, blog, mobile, on-this-page, search, theme-toggle, version-switcher, plan, split). Each file is imported with `layer(skeleton)`, so the cut line — `display` / `grid-*` / `flex-*` / `position` / `inset` / `z-index` / `overflow` / sizing / zone resets / disclosure mechanisms — lives in one framework-agnostic package.
  - **Lumina** keeps only the skin remainder (colour, border, radius, shadow, font, and spacing _values_), which wins over the skeleton layer purely by cascade-layer order — ordinary single-class/attribute selectors, no `!important`. Rendered output is unchanged: the split is a re-bucketing, verified declaration-for-declaration against the pre-split CSS.

  This is what makes a second theme a token file + skin rather than a fork: the structure is now shared infrastructure, and a skin overrides only the aesthetic deltas.

### Patch Changes

- @refrakt-md/types@0.23.0
