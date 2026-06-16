# @refrakt-md/skeleton

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
