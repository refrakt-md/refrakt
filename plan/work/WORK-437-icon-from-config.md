{% work id="WORK-437" status="ready" priority="medium" complexity="simple" source="SPEC-094" milestone="v0.23.0" tags="theme,icons,css,skeleton-skin,config" %}

# Icon-from-config: lift embedded data-URI glyphs out of CSS

The "content, not CSS" finding from the {% ref "WORK-410" /%} spike ({% ref "SPEC-094" /%} §8's
icon-from-config): rune CSS embeds glyph shapes as `data:image/svg+xml` mask-images. Move them to
the theme icon registry so a theme swaps glyph sets without touching CSS.

## Scope

- The embedded mask-image data-URIs (repo-wide: **9 occurrences across 2 files** — `hint`,
  `accordion`) move into the theme icon registry (`config.icons`, the same source the
  `{% icon %}` rune + `icon:` scheme use).
- The skeleton's `::before` reads a CSS custom property (e.g. `mask-image: var(--rf-hint-icon)`)
  fed from config, instead of hard-coding the glyph (see the spike's `icons.json`).
- A theme overriding the icon group re-glyphs the hint/accordion without CSS edits.

## Acceptance Criteria

- [ ] No `data:image/svg+xml` mask-image glyphs remain in `hint`/`accordion` CSS; the glyphs come from the icon registry, surfaced via a CSS custom property the skeleton reads.
- [ ] Overriding the icon group in theme config re-glyphs the affected runes with no CSS change; tests cover the wiring.

## Dependencies

- Independent; best landed alongside the surface-axis work ({% ref "WORK-423" /%}) since both remove rune-name / embedded-data debt.

## References

- {% ref "SPEC-094" /%} §8 (icon-from-config) · {% ref "WORK-410" /%} FINDINGS §4 + `spike/skeleton-skin/icons.json` · `packages/lumina/styles/runes/{hint,accordion}.css`.

{% /work %}
