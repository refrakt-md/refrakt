# @refrakt-md/skeleton

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
