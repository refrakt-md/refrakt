{% work id="WORK-420" status="pending" priority="medium" complexity="moderate" source="SPEC-106" milestone="v0.22.0" tags="image,placeholder,runes,authoring" %}

# `placeholder:` image-src resolver

`![Portrait](placeholder:portrait)` resolves to a generated, theme-tinted inline SVG
placeholder sized to the named shape — deterministic, offline, screenshot-stable.

## Scope

- Register a `placeholder:<shape>` resolver (via {% ref "WORK-418" /%}) emitting a generated
  inline `<svg>` for each shape: `cover` (16:9), `square`, `portrait` (3:4), `wide`, `banner`,
  `avatar` (round), `thumbnail`.
- The SVG is a neutral scene (e.g. horizon + sun) at the shape's aspect ratio, drawn with theme
  tokens (`var(--rf-color-surface)`/`--rf-color-muted`/`--rf-color-border`) so it tracks tint +
  dark mode. Deterministic (no randomness).
- Unknown shape → fall back to `cover` + dev warning. `alt` → accessible label.

## Acceptance Criteria

- [ ] `placeholder:<shape>` emits a deterministic, token-tinted inline SVG for each documented shape, at the correct aspect ratio.
- [ ] Output adapts to light/dark via tokens (no hardcoded colours); identical across runs.
- [ ] Unknown shape falls back to `cover` with a dev warning; tests cover shapes + fallback.

## Dependencies

- Requires {% ref "WORK-418" /%} (the scheme registry).

## References

- {% ref "SPEC-106" /%}.

{% /work %}
