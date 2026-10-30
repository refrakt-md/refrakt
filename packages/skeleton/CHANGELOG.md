# @refrakt-md/skeleton

## 0.44.0

### Minor Changes

- 0db1275: `hero` and `cta` can be built as compositions over `section` and `actions` (SPEC-160 D7). The plugin runes are unchanged, and replacing them is a later step. The vocabulary those compositions need moves into shared CSS:

  - **Button size follows `prominence`.** In `actions.css`, an `actions` whose nearest enclosing rune is `prominence="display"` or `"prominent"` gets the large hero-size buttons. Anything else gets the default cta size. Each other rune root clears the size, so a card inside a display section keeps default buttons.
  - **A `section`'s `align` positions its own actions row**, alongside its header.
  - **A cover-mode `section` is a band.** Its height comes from its content and `height` / `aspect`, not from the cover layer's portrait default. With no `content-place`, the content sits mid-band over an evenly darkened scrim. A flush cover section's media has no radius.
  - **Fix:** a centred or end-aligned `section` header is aligned again. Lumina's `margin: 0` had cancelled the skeleton's auto margins.
  - **Fix:** `media-position="end"` keeps a media-first rune's content beside its media, on the first row (`grid-auto-flow: dense`). Before, `section` and `card` put the content on a second row.
  - **A composed rune no longer turns an enum attribute it only forwards into a `data-*` modifier on its root.** For example, `realm`'s `media-position` reaches its `section` but no longer appears on the wrapper. There it had laid the wrapper out as a split, or as a cover well. The value stays in the field bag.

  When `cta` is composed, two leading headings are read as a headline and body, no longer as an eyebrow and a headline (ADR-046).

- 2a3bb70: `testimonial` can be built as a composition over `section` (SPEC-161 D1). The plugin rune is unchanged; replacing it is a later step.

  - **A beside split whose media zone is a portrait** takes the portrait's width rather than half the row, unless `media-ratio` is set.
  - **The lead value of a `lead` block** is emphasised by weight only, upright even when it is a `<cite>`.

- f3b9ca3: New block layout `lead`, beside `bar` and `definition-list` (SPEC-161 D6). It draws a byline: the fields in a column as `data-zone-layout="lead"`, the first marked `data-lead`. The skeleton lays it out and Lumina emphasises the lead and sets the rest smaller and muted. Nothing ranks the values, so a compact container hides none of them.

### Patch Changes

- Updated dependencies [7370042]
- Updated dependencies [69c462c]
  - @refrakt-md/types@0.44.0

## 0.43.0

### Minor Changes

- 514583a: New core rune `{% actions %}`: a row of actions from a plain list of links, with an optional fence as a copyable command line (SPEC-160 D6).

  - **Rank is a data attribute.** Each link item is `<li data-name="action">` with `data-rank="primary"` on the first link of the row and `secondary` on the rest. Themes style the rank, not the list position.
  - **`hero` and `cta` render their buttons through it.** Their actions region is now a nested `data-rune="actions"`. It keeps `rf-hero__actions` / `rf-cta__actions` beside `rf-actions`.
  - **Button CSS lives in `actions.css`** in Lumina and the skeleton. It is no longer copied into `hero.css` and `cta.css`, which now set only `--action-padding`, `--action-font-size` and `--actions-justify`.

  Three visible changes:

  - **The primary button's text follows the colour scheme** (`--rf-color-on-primary`). In dark mode it was white on a near-white fill and barely readable. It now has proper contrast, and the cover hero's override for the same problem is gone.
  - **Narrower selectors.** `hero` and `cta` used to style any list or `nav` inside them as a row of buttons. Only their actions list is styled now.
  - **One primary per row.** "Primary" was the first item of _each_ list, so a hero written as list, fence, list had two primary buttons. It is now the first link of the whole row.

- 514583a: The eyebrow is a section role (WORK-656). Every rune with an eyebrow (`hero`, `cta`, `section`, `card`, `feature`, `pricing`, `reveal`, `tabs`, `accordion`, `steps`) now stamps `data-section="eyebrow"` on it.

  - **The eyebrow's type and its linked pill are styled once**, by `[data-section="eyebrow"]` in the sections dimension: the stretched link in the skeleton, the pill in Lumina. The copies in nine runes, two packages each, are gone. A rune keeps only its own spacing, and `card` keeps a one-step-smaller size.
  - **A linked eyebrow in `card` now renders as a pill**, as it already did in the other nine.
  - `eyebrow` joins the section-role vocabulary (`RuneConfig.sections`). It does not count as a header role, so it does not offer `prominence` on its own.

- 422fee5: `{% link %}` now wraps blocks, and linked cards and bento cells are reachable by keyboard and screen readers (SPEC-160 D8).

  - **Linked cards and bento cells are real links now.** Their whole-card `href` overlay used to be `aria-hidden="true" tabindex="-1"`, so a keyboard or screen-reader user could not reach it. It is now a focusable link with one tab stop per card, named by the card's title (`aria-labelledby`), with a visible focus ring in Lumina.
  - **`{% link %}` around blocks makes the whole region a link.**
    - With nothing interactive inside, the region is wrapped in a real `<a data-link="wrap">`.
    - With links or controls inside, a stretched `<a data-link="stretch">` is laid over the region instead, so no `<a>` is nested.
    - The choice is made in the identity transform, so it sees links that `postProcess` adds.
    - The link is named by `aria-label` when given, else by the content's title.
    - An empty `href` leaves the content unlinked.
    - It adds no `data-rune`, so structured data inside it still publishes.
  - **Unchanged:** the inline form, `{% link href=… %}text{% /link %}` in a line of text, renders a plain `<a>` as before.
  - **Shared CSS.** The stretched-link positioning moved from `card.css` and `bento.css` into a shared `dimensions/link.css` keyed on `data-link`, so it works around any rune.

- 4e18e29: The `data-field="content-section"` attribute is gone from every rune root (SPEC-133). Nothing read it. It came from `property: 'contentSection'` in 28 transforms, which are now cleaned up.

  - **Removed outright:** the `documents` and `Page` exports of `@refrakt-md/runes`. The `Page` document node was never registered by any Markdoc config, and it compared the attribute with the wrong casing, so it never ran. The `PageSection` config entry and `page-section.css` in Lumina and the skeleton went with it.
  - **Deprecated:** `property` on `createComponentRenderable` and on an `emits` declaration is still accepted, so a plugin that passes it keeps type-checking, but it is ignored and renders nothing. It is removed in the release after this one.

- 1a1d991: `section` gains the media split, cover and a media kind (SPEC-160 D2, ADR-041). A titled region with media no longer needs `card`, which draws a surface.

  - **Split.** `media-position` (`top | bottom | start | end | cover`), `media-ratio`, `valign` and `collapse` work as on `card`. With `media-position`, a section splits on `---` into a media zone, the content and an optional footer. The header stays in the content column, and an empty leading zone leaves the media out.
  - **Opt-in.** Without `media-position`, a section renders exactly as before, and a `---` stays an ordinary rule in its body.
  - **Cover.** `media-position="cover"` overlays the content on the media, with `content-place`, `height` and `aspect`, as on `card`.
  - **Media kind.** `media` (`portrait | cover | thumbnail | hero | icon`) stamps `data-media` on the media zone, so the media dimension styles it. A portrait is cropped round with no CSS of its own.
  - **Card.** `card`'s output does not change.

### Patch Changes

- @refrakt-md/types@0.43.0

## 0.42.0

### Patch Changes

- Updated dependencies [b77f7be]
  - @refrakt-md/types@0.42.0

## 0.41.3

### Patch Changes

- @refrakt-md/types@0.41.3

## 0.41.2

### Patch Changes

- 2153967: Lumina styles a changelog release's title after its version, with a muted middle dot drawn in CSS (not announced by screen readers). Bold text in a release is a small-caps badge only when it leads a list item (`- **Added** …`); bold in a summary paragraph or a hint inside a release now stays ordinary bold instead of turning into uppercase small text.
- 49d4f93: The drawer scroll lock now sets `overflow: hidden` only on `<html>`, not on `<body>`. On iOS Safari, locking both left the sticky site header trailing behind page scrolling after a drawer had been opened, until the page was reloaded (BUG-044). Scrolling inside a drawer's body also no longer chains to the page.
  - @refrakt-md/types@0.41.2

## 0.41.1

### Patch Changes

- @refrakt-md/types@0.41.1

## 0.41.0

### Patch Changes

- Updated dependencies [640494a]
- Updated dependencies [90d5a05]
  - @refrakt-md/types@0.41.0

## 0.40.0

### Patch Changes

- Updated dependencies [1f4aee2]
  - @refrakt-md/types@0.40.0

## 0.39.0

### Patch Changes

- 8a272a4: `{% figure %}` keeps everything in its body and captions it (BUG-028)

  A figure used to emit only its images and its caption. Any other child, such as
  a fenced code block, a table, a nested rune, or a second paragraph, was
  transformed and then dropped without a warning, so a figure wrapping a code
  block rendered a caption under nothing. Figure is now a general captioned
  container. Every child is kept in the order it was written. Media (an image, a
  video, a `placeholder:` or `icon:` image) is still the figure's media slot and
  is unwrapped from its paragraph as before. The caption still comes from the
  `caption` attribute or the first paragraph without an image, and still renders
  last. A figure holding only images renders exactly as it did.

  The structured data follows the content. A figure whose body is only media is
  still an `ImageObject` with `contentUrl` and `caption`. A figure holding
  anything else now publishes no schema.org type and no properties, where it used
  to claim `ImageObject` regardless, even with no image in it. Calling a captioned
  code block an image was a false statement in the page's JSON-LD and RDFa.

  The rule lives in figure's schema table. Tables gain `byField`, which selects a
  row from a value the rune's transform records in its field bag, for a type that
  depends on what the content is rather than on an attribute. `refrakt inspect`,
  `refrakt contracts` and `refrakt reference` show it.

  Lumina's and the skeleton's figure image and caption rules now apply only to the
  figure's own children. An image inside a nested rune in a figure body keeps its
  own styling.

  - @refrakt-md/types@0.39.0

## 0.38.0

### Patch Changes

- @refrakt-md/types@0.38.0

## 0.37.0

### Patch Changes

- Updated dependencies [f88f959]
- Updated dependencies [172b29b]
  - @refrakt-md/types@0.37.0

## 0.36.0

### Patch Changes

- @refrakt-md/types@0.36.0

## 0.35.0

### Minor Changes

- f1908a3: Style runes by BEM class, not the schema.org channel (WORK-564, BUG-015)

  Fourteen CSS rules across Lumina and Skeleton selected on `[property=…]` — the
  RDFa attribute the structured-data channel writes. That coupled a rune's
  appearance to what it asserts about its content, so renaming a schema.org
  property would unstyle a rune, and four of the rules were already dead because a
  `property` had moved years ago.

  All fourteen now select on the `data-name`-derived BEM element class instead
  (`.rf-lore__title`, `.rf-plot__title`, and so on). Where a rule had a live
  `meta[property]` half and a dead `span[property]` half, the dead half is gone
  and the live one kept. A CSS coverage assertion walks every stylesheet under
  `packages/` and `plugins/` and fails on any `[property…]` selector, so the
  coupling cannot come back.

  **Two defects this surfaced**, both of the kind a dead selector hides:

  - `.rf-lore__title` and `.rf-plot__title` pinned `font-size`, which overrode the
    prominence chain — `{% plot prominence="display" %}` had been inert. The
    declarations are removed; `sections.css` already supplies the resting value.
  - A `schema="none"` test passed vacuously: `stripSchemaOrg` has exactly one
    caller (`accordion`), so the attribute does nothing on `pricing`.

  **If you override Lumina or Skeleton CSS** and your selectors mention
  `[property=…]` on a rune's children, they no longer match the shipped markup's
  intent — switch to the BEM element class. If you relied on `.rf-lore__title` or
  `.rf-plot__title` carrying a fixed `font-size`, set it yourself or use the
  `prominence` axis, which now works.

### Patch Changes

- @refrakt-md/types@0.35.0

## 0.34.0

### Patch Changes

- Updated dependencies [7c2b184]
- Updated dependencies [e8f9d54]
  - @refrakt-md/types@0.34.0

## 0.33.0

### Patch Changes

- Updated dependencies [d9b9417]
  - @refrakt-md/types@0.33.0

## 0.32.0

### Patch Changes

- @refrakt-md/types@0.32.0

## 0.31.0

### Patch Changes

- @refrakt-md/types@0.31.0

## 0.30.1

### Patch Changes

- @refrakt-md/types@0.30.1

## 0.30.0

### Patch Changes

- @refrakt-md/types@0.30.0

## 0.29.0

### Patch Changes

- Updated dependencies [9a4e4b9]
  - @refrakt-md/types@0.29.0

## 0.28.0

### Patch Changes

- @refrakt-md/types@0.28.0

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
