{% work id="WORK-298" status="ready" priority="high" complexity="moderate" source="SPEC-078" tags="drawer,lumina,chrome,footer,css" milestone="v0.17.0" %}

# Drawer enhancements — footer slot, always-visible chrome, single-block edge-to-edge

Foundation work for {% ref "SPEC-078" /%}. The `file-ref` rune and the
`xref preview="drawer"` extension both need a **footer slot on the
drawer rune**, a **flex-column drawer chrome so footer + header stay
pinned while the body scrolls**, and the **single-code-block
edge-to-edge body styling** so a `preview="drawer"` snippet fills the
drawer without "code-in-a-box" chrome competition. Doing this once on
the drawer rune itself unblocks both downstream items and lands a
standalone-drawer enhancement at the same time (authors can now write
`{% drawer %}body --- footer{% /drawer %}` directly).

## Acceptance Criteria

- [ ] `Drawer` engine config in `packages/runes/src/config.ts` gains a
  `footer` section: `sections: { header: 'header', body: 'body',
  footer: 'footer' }`.
- [ ] The drawer schema in `packages/runes/src/tags/drawer.ts` splits
  its body on **top-level `hr`** into body + footer zones (same pattern
  `splitBodyZones` already implements for `collection` /
  `relationships` / `aggregate`). 1 zone → body; 2 → body + footer.
- [ ] Lumina drawer CSS makes the drawer a **flex column**: header
  (when present) and footer pin via `flex: 0 0 auto`; body scrolls via
  `flex: 1 1 auto; overflow-y: auto`. Drawer has a sensible `max-height`
  so the scroll context exists.
- [ ] Drawer footer (`__footer`) has its own small padding and a subtle
  top divider so it reads as chrome, not body content.
- [ ] **Single-block edge-to-edge** styling triggers when the drawer
  body contains exactly one code-block child — `:has(>
  figure.rf-snippet:only-child)` or `:has(> pre:only-child)`. Body
  padding zeroes, inner border-radius / border / margin strip, so the
  drawer's own corners shape the code.
- [ ] A figcaption inside a snippet figure (the "source label") keeps
  its own small padding so it doesn't kiss the drawer edge.
- [ ] Standalone-drawer tests in `packages/runes/test/drawer*.test.ts`
  cover: body + footer split via `---`; long body scrolls inside
  drawer with footer pinned; single-code-block drawer fills
  edge-to-edge; figcaption padding survives.
- [ ] CSS coverage test passes; `rf-drawer__footer` is in the expected
  selectors set.
- [ ] Existing drawer tests still pass; no regression for drawers
  without a footer zone.

## Approach

Three small additions on the drawer rune:

1. **Engine config + schema**: add the `footer` section to the rune
   config, and have the schema body parse use the existing
   `splitBodyZones` helper from `collection-helpers.ts`. Map the second
   zone (when present) to `data-name="footer"` so the engine adds the
   `rf-drawer__footer` BEM class automatically. 1-zone body keeps
   today's semantics (everything is body).
2. **Lumina drawer CSS**: rewrite as flex-column. Pin header + footer
   with `flex: 0 0 auto`; body is `flex: 1 1 auto; overflow-y: auto`.
   Drawer's `max-height` caps the scroll context.
3. **Edge-to-edge styling**: a `:has(> figure.rf-snippet:only-child),
   :has(> pre:only-child)` selector on `__body` zeros padding and
   strips the inner block's border-radius / border / outer margin.
   Tested in isolation today so the rest of {% ref "SPEC-078" /%}
   doesn't have to re-prove it.

The body-zone split is the same machinery `card` uses, so authors
already know the shape. CSS coverage gets one new selector
(`rf-drawer__footer`). No behavioral change for existing standalone
drawers without a `---`.

## Dependencies

_None — foundation for {% ref "WORK-300" /%} and {% ref "WORK-301" /%}._

## References

- {% ref "SPEC-078" /%} — Capability 2 (chrome footer + always-visible)
  and Capability 3 (edge-to-edge).
- {% ref "SPEC-060" /%} — the drawer rune; this extends it.

{% /work %}
