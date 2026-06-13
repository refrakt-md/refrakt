{% work id="WORK-420" status="done" priority="medium" complexity="moderate" source="SPEC-106" milestone="v0.22.0" tags="image,placeholder,runes,authoring" %}

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

- [x] `placeholder:<shape>` emits a deterministic, token-tinted inline SVG for each documented shape, at the correct aspect ratio.
- [x] Output adapts to light/dark via tokens (no hardcoded colours); identical across runs.
- [x] Unknown shape falls back to `cover` with a dev warning; tests cover shapes + fallback.

## Dependencies

- Requires {% ref "WORK-418" /%} (the scheme registry).

## References

- {% ref "SPEC-106" /%}.

## Resolution

Completed: 2026-06-13

Branch: `claude/spec-106-image-src-schemes`

### What was done
- Added `packages/runes/src/lib/placeholder.ts` — `placeholderSvg(shape, { label })` builds a deterministic inline-SVG Tag tree for each shape: `cover` (16:9), `wide` (12:5), `banner` (3:1), `square`, `portrait` (3:4), `thumbnail` (4:3), `avatar` (round). Rectangular shapes draw a neutral horizon scene (sun + hill + frame); avatar draws a person silhouette + ring. Coordinates are rounded for stable output.
- All fills reference theme tokens (`var(--rf-color-surface|muted|border)`), so placeholders track tint + dark mode; no hardcoded colours.
- `alt` → `role="img"` + `aria-label`; empty `alt` → `aria-hidden="true"` (decorative).
- Registered the `placeholder:<shape>` scheme in `image-schemes.ts`; unknown shape `console.warn`s and falls back to `cover`.
- Added `packages/lumina/styles/runes/placeholder.css` (`.rf-placeholder` responsive base + round avatar) and imported it in `index.css`.
- Tests cover every shape (token-only colours, a11y label), determinism, the cover fallback + warning, and the decorative empty-alt case.

### Notes
- The SVG carries `width="100%"` and relies on its viewBox for aspect, so browsers compute height from the ratio.

{% /work %}
