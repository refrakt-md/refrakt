{% work id="WORK-425" status="done" priority="high" complexity="complex" source="SPEC-107" milestone="v0.23.0" tags="theme,surface,lumina,css" %}

# Lumina: map the axes + retire the static surface groups

Paint the {% ref "SPEC-107" /%} axes in Lumina and **retire the rune-name lists** in
`surfaces.css` — the last cross-rune file that enumerates runes ({% ref "SPEC-094" /%} §8).

## Scope

- Map each `data-elevation` rung to a chrome bundle (fill / border / radius / shadow) via
  low-specificity attribute selectors — the rung's shadow is the rune surface's *resting*
  `box-shadow` depth, kept distinct from `frame-shadow`'s per-guest `drop-shadow`
  ({% ref "SPEC-107" /%} §1); map each `data-prominence` value to a header type register
  (using the v0.22.0 type tokens).
- Set Lumina's per-rune `defaultElevation` / `defaultProminence` (and `defaultWidth` where a
  rune was a `banner`) so today's appearance is preserved: card-bucket runes → `raised`/`flat`,
  inline → `flush`, inset → `sunken`, banner → `flush` + `width: full`.
- Replace the four `surfaces.css` rune-name buckets (and the two nested `:where(.rf-card, …)`
  media-chrome lists) with `[data-elevation]` / `[data-prominence]` selectors.
- **Seam with WORK-438:** this produces the *attribute-keyed* `surfaces.css` (the content
  transform — rune-names → `[data-elevation]`). It does **not** introduce `@layer`s; the
  skeleton/skin layering of that file belongs to the re-bucketing (WORK-438), which consumes
  this output. 425 hands 438 an already-attribute-keyed file.

## Acceptance Criteria

- [x] `surfaces.css` no longer enumerates rune names; chrome is selected by `[data-elevation="…"]` (and media-chrome by attribute, not the `:where` rune lists).
- [x] Per-rune defaults in Lumina's config reproduce the current card/inline/inset/banner appearance (no unintended visual change for unchanged content).
- [x] `prominence` registers are wired to the type tokens; CSS-coverage tests + structure contracts stay green.

## Dependencies

- Requires {% ref "WORK-423" /%} + {% ref "WORK-424" /%} (the axes + defaults).

## References

- {% ref "SPEC-107" /%} · `packages/lumina/styles/dimensions/surfaces.css` · `packages/lumina/src/config.ts`.

## Resolution

Completed: 2026-06-15

Branch: `claude/refrakt-theme-system-analysis-9whpoq` (v0.23.0 Batch 2)

### What was done
- **Per-rune surface defaults (Option A — defaults live in each rune's home config, not the theme).** Added `defaultElevation` across core `packages/runes/src/config.ts` (CodeGroup/Embed/Gallery/Figure/Reveal/Form/Budget → `flat`; Chart/Diagram → `sunken`; Hint/Details/Sidenote/Conversation/Annotate/PullQuote/TextBlock/Nav/Breadcrumb/TableOfContents/DataTable → `flush`) and the 8 content plugins (card-bucket runes → `flat`; banner runes hero/cta/feature/steps/bento/storyboard/map → `flush`). Verified in the static gallery: `flat` ×134, `flush` ×73, `sunken` ×10 all emit from defaults (gallery transforms with base+plugins, so Option A is gallery-visible without a browser).
- **`surfaces.css` is now rune-name-free.** Retired the four rune-name buckets (card/inline/banner/inset) and both media `:where` lists; chrome is selected by `[data-elevation="flat|sunken|raised|floating|overlay"]` (surface fill/border/radius/padding + resting shadow rungs) and `[data-prominence="quiet|prominent|display"]` (title type register via `--rf-title-size`). The chart/diagram media-guest reset is keyed on `[data-section="media"] > [data-elevation="sunken"]`.
- **Media-chrome by attribute.** The shared media-slot border + recessed well is `[data-elevation="flat"] [data-section="media"]:not([data-media="portrait"])` — the `data-media` discriminator excludes character/testimonial floated avatars exactly as the old rune list did. The hand-rolled `card` / `bento-cell` surfaces (which sit outside the elevation axis — bento-cell's bg is intentionally zero-specificity for per-cell tints) carry the same media chrome from their own CSS files; the juxtapose media-guest reset moved to `juxtapose.css`.
- Removed the dead SPEC-086 `[data-elevation=none|sm|md|lg]` shadow rules from `base/attributes.css` (the engine maps those deprecated aliases onto the ladder before they reach the DOM, so they never matched).
- Made the CSS-coverage summary elevation-aware: a block with a per-rune `defaultElevation`/`defaultProminence` is styled by the axis dimension, so it counts as covered (coverage back to 93%, 176/176).

### Verification
- `packages/transform` elevation+prominence suites green; full package suites green (2885 tests across transform/runes/lumina/content/svelte/cli/ai/plugins).
- CSS coverage 109/117 (93%) ≥ threshold; structure contracts `--check` clean (root-axis attributes aren't captured by contracts, so no drift).

### Notes / decisions
- **Appearance preserved by construction.** The old bucket padding `var(--rune-padding, xl|sm|md)` only ever hit the fallback when `--rune-padding` was unset — but every rune with a density already sets it, so the effective padding was always `--rune-padding`. The new `flush`/`flat`/`sunken` rules reproduce that exactly; no per-rune padding additions were needed.
- **Deliberately did NOT add `width: full` to steps/bento/storyboard/map.** The scope bullet said "banner → flush + width:full", but those four are currently content-width (only hero/cta/feature carry `width:full`). Making them full-bleed would be a visual change, violating the "no unintended change" AC — so they got `flush` only. hero/cta/feature keep their existing `width:full`. Flag for review if full-bleed banners were actually intended.
- Visual parity is by-construction (identical chrome + padding values); a capture-then-compare run on the WORK-409 harness should confirm once a browser env is available.
- Filed WORK-441 (gallery should load the assembled theme config via `assembleThemeConfig`, like the site) — not a blocker here since base defaults render in the gallery, but needed before theme-level surface overrides are visible in the regression net.
- Hands WORK-438 an already-attribute-keyed `surfaces.css` (no `@layer`s introduced — that's 438's job).

{% /work %}
