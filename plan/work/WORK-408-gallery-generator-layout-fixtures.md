{% work id="WORK-408" status="pending" priority="medium" complexity="moderate" source="SPEC-094" milestone="v0.22.0" tags="theme,cli,gallery,layouts,tooling" %}

# Gallery generator — layout fixtures

Extend the gallery generator ({% ref "WORK-407" /%}) to a second subject class: **layout
fixtures** — representative sample pages rendered through each `LayoutConfig` so page chrome
(header, nav, sidebar, TOC, mobile panel, footer) is visually covered. Chrome carries as much of
a theme's identity as runes, and the skeleton/skin extraction touches `styles/layouts/*`, so this
is what lets the harness guarantee hold for chrome, not just content blocks.

## Scope

- Render the existing layouts (`default`, `docs`, `blog-article`, `plan`) via `renderPage` over a **synthetic multi-page context** so computed chrome (breadcrumb, TOC, nav tree, prev/next from the aggregate phase) populates.
- Emit per-layout artifacts suitable for **multi-viewport** capture (mobile / tablet / desktop).
- Default pre-enhancement chrome state is the baseline; enhanced states (mobile menu open) are an optional follow-on, out of scope here.

## Acceptance Criteria

- [ ] The generator emits a fixture per existing layout, with computed chrome populated from a synthetic content set.
- [ ] Fixtures render correctly at mobile / tablet / desktop widths.
- [ ] Output is deterministic and theme-agnostic, consistent with the rune gallery.

## Dependencies

- Builds on {% ref "WORK-407" /%} (shared generator command).

## References

- {% ref "SPEC-094" /%} · `packages/transform/src/layouts.ts` · `packages/html/src/render.ts` · `packages/lumina/styles/layouts/*`.

{% /work %}
