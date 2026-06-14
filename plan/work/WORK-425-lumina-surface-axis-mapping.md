{% work id="WORK-425" status="ready" priority="high" complexity="complex" source="SPEC-107" milestone="v0.23.0" tags="theme,surface,lumina,css" %}

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

## Acceptance Criteria

- [ ] `surfaces.css` no longer enumerates rune names; chrome is selected by `[data-elevation="…"]` (and media-chrome by attribute, not the `:where` rune lists).
- [ ] Per-rune defaults in Lumina's config reproduce the current card/inline/inset/banner appearance (no unintended visual change for unchanged content).
- [ ] `prominence` registers are wired to the type tokens; CSS-coverage tests + structure contracts stay green.

## Dependencies

- Requires {% ref "WORK-423" /%} + {% ref "WORK-424" /%} (the axes + defaults).

## References

- {% ref "SPEC-107" /%} · `packages/lumina/styles/dimensions/surfaces.css` · `packages/lumina/src/config.ts`.

{% /work %}
