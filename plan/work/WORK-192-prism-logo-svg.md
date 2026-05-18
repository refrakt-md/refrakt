{% work id="WORK-192" status="done" priority="medium" complexity="small" tags="branding, logo, svg" source="SPEC-050" milestone="v0.14.0" %}

# Author the canonical prism SVG asset

Produce the canonical SVG for refrakt's new prism mark — V2 (filled apex) with golden-ratio cuts, stroke width 3, round caps and joins, ready to use as the brand mark across favicons, site header, and any future surfaces. The geometry is fully specified in {% ref "SPEC-050" /%}; this work item is the production of the asset file(s) and the build-time integration.

## Acceptance Criteria

- [x] SVG file lives at `packages/lumina/assets/logo/prism.svg`
- [x] Geometry matches {% ref "SPEC-050" /%}: outer triangle `(10, 16) → (90, 16) → (50, 86)`; cuts at top-x `20.19, 30.37, 40.56`; apex fill `(40.56, 16) → (90, 16) → (65.28, 59.26)`
- [x] Stroke width: `3`. Stroke linecap: `round`. Stroke linejoin: `round`.
- [x] SVG uses `currentColor` for stroke and fill so it inherits whatever colour the surrounding context provides — works on dark navy, on neutral, on cream without per-context files. An embedded `:where(svg)` rule (0-specificity) provides a `prefers-color-scheme`-aware fallback colour so the same file also works as a standalone favicon where there's no CSS context to inherit from.
- [x] `aria-label="refrakt"` and `role="img"` for accessibility; decorative uses can override with `aria-hidden="true"`
- [x] ViewBox `0 0 100 100`, no width/height attributes (lets CSS size it)
- [x] Source SVG is hand-authored and human-readable (no exporter cruft); the file is committed as written
- [x] Lumina exposes the asset via the package's `exports` map (`./assets/logo/prism.svg` and `./assets/*` patterns) so downstream sites can import it directly from `@refrakt-md/lumina`

## Approach

The SVG itself is small — a closed-path outer triangle, three line segments for the cuts, and a closed filled triangle for the apex. The spec contains the exact coordinates.

Decision worth capturing during implementation: does this file ship as a static asset, or as a component? For favicons it must be a file (consumed by the browser); for the header it can be either. Lean: ship as a file AND export a tiny Svelte component that inlines it, so both consumption paths work.

The `currentColor` choice matters — it means the same SVG works against dark navy (today's site) and the neutral-default surface (post-{% ref "WORK-200" /%}) without per-mode variants. The stroke and fill both reference `currentColor`; CSS or the parent element controls the actual colour.

## Dependencies

None. This is independent work and can run in parallel with SPEC-048 implementation.

## References

- {% ref "SPEC-050" /%} — full geometry, decision rationale, and previews
- `site/static/` or wherever the current logo lives — file to identify and eventually replace

{% /work %}
