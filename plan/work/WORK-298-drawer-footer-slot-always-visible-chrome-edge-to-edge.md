{% work id="WORK-298" status="done" priority="high" complexity="moderate" source="SPEC-078" tags="drawer,lumina,chrome,footer,css" milestone="v0.17.0" %}

# Drawer enhancements — footer slot, always-visible chrome

Foundation work for {% ref "SPEC-078" /%}. The `file-ref` rune and the
`xref preview="drawer"` extension both need a **footer slot on the
drawer rune** and a **flex-column drawer chrome so footer + header stay
pinned while the body scrolls**. Doing this once on the drawer rune
itself unblocks both downstream items and lands a standalone-drawer
enhancement at the same time (authors can now write
`{% drawer %}body --- footer{% /drawer %}` directly).

The **single-block edge-to-edge body styling** that was originally
scoped here was pulled out after preview testing — the
drawer-side `:has(> .rf-codeblock:only-child, …)` selector list
couples the drawer to specific rune class names, which doesn't
generalise (codegroup vs snippet vs chart vs sandbox each have
different scroll-container needs; third-party runes can't extend the
list). A cleaner shape (generic `data-fill` opt-in contract on the
rune side, single generic `:has(> [data-fill]:only-child)` selector on
the host side) is captured in {% ref "SPEC-078" /%}'s Future
extensions and will land in a follow-up spec.

## Acceptance Criteria

- [x] `Drawer` engine config in `packages/runes/src/config.ts` gains a
  `footer` section: `sections: { header: 'header', body: 'body',
  footer: 'footer' }`.
- [x] The drawer schema in `packages/runes/src/tags/drawer.ts` splits
  its body on **top-level `hr`** into body + footer zones (same pattern
  `splitBodyZones` already implements for `collection` /
  `relationships` / `aggregate`). 1 zone → body; 2 → body + footer.
- [x] Lumina drawer CSS makes the drawer a **flex column**: header
  (when present) and footer pin via `flex: 0 0 auto`; body scrolls via
  `flex: 1 1 auto; overflow-y: auto`. Drawer has a sensible `max-height`
  so the scroll context exists.
- [x] Drawer footer (`__footer`) has its own small padding and a subtle
  top divider so it reads as chrome, not body content.
- [x] Standalone-drawer tests in `packages/runes/test/drawer*.test.ts`
  cover: body + footer split via `---`; inline markdoc (links / refs)
  in the footer zone; leading-hr produces empty body + footer with the
  rest; subsequent hrs after the first stay as horizontal rules within
  the footer.
- [x] CSS coverage test passes; `rf-drawer__footer` is in the expected
  selectors set.
- [x] Existing drawer tests still pass; no regression for drawers
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

## Blocks

_Foundation for {% ref "WORK-300" /%} and {% ref "WORK-301" /%} (no upstream dependencies of its own)._

## References

- {% ref "SPEC-078" /%} — Capability 2 (chrome footer + always-visible)
  and Capability 3 (edge-to-edge).
- {% ref "SPEC-060" /%} — the drawer rune; this extends it.

## Resolution

Completed: 2026-05-29

Branch: `claude/spec-078-implementation`

### What was done
- `packages/runes/src/tags/drawer.ts` — schema gains a body-zone split. New helper `splitDrawerBodyZones(Node[])` finds the first top-level `hr` and splits into body + footer node lists. 1 zone → all body; 2+ zones → body + footer. Each segment is transformed separately, the footer wrapped in a `<footer>` element with `data-name="footer"` (engine adds the BEM class). Refs and children spread the footer in conditionally so drawers without a body-zone hr are byte-identical to before.
- `packages/runes/src/config.ts` — Drawer's `sections` map gains `footer: 'footer'`; `editHints.footer = 'none'` keeps the block editor from treating it as inline-editable.
- `packages/lumina/styles/runes/drawer.css` — full rewrite of the dialog-mode chrome. Dialog has the bare base styles (`overflow: hidden`, `max-height: calc(100vh - 2 * gutter)`, etc.), and `display: flex; flex-direction: column` is scoped to `dialog.rf-drawer[open]` so the browser UA's `display: none` for closed dialogs still applies. Header is `flex: 0 0 auto` (sticky positioning dropped — flex handles the pin). Body is `flex: 1 1 auto; overflow-y: auto; min-height: 0`. Footer is `flex: 0 0 auto` with a top divider and `0.875rem` muted text. The `max-height` cap on the dialog gives the body its scroll context. In-flow (no-JS) drawer gets a parallel footer style (top divider + muted text) so authors see the same chrome whether JS enhances or not.
- `packages/runes/test/drawer.test.ts` — 5 new tests cover: no footer when no hr; body+footer split on a single hr; inline markdoc (links) in the footer; leading-hr produces empty body + footer; subsequent hrs after the first stay as horizontal rules within the footer.
- `contracts/structures.json` + `packages/lumina/contracts/structures.json` — regenerated with the new `Drawer.sections.footer`.

### Notes
- **Single-block edge-to-edge body styling pulled out.** Originally scoped here as Capability 3 of {% ref "SPEC-078" /%}, but preview testing surfaced two design problems with the drawer-side approach: (1) the rendered fence wraps in `<div class="rf-codeblock">` so the `:has(> figure.rf-snippet:only-child)` selector never matched in practice, and once fixed to walk the wrapper chain the drawer-side CSS coupled to specific rune class names — (2) which doesn't generalise (codegroup vs snippet vs chart vs sandbox each have different scroll-container shapes; third-party runes can't extend the list). The cleaner shape — a generic `data-fill` opt-in attribute on the rune side, single generic `:has(> [data-fill]:only-child)` selector on the host side — is captured in {% ref "SPEC-078" /%}'s Future extensions and will land in a follow-up spec with cross-rune scope.
- The split-on-first-hr rule is positional and irrevocable for the rest of the drawer body (everything after the first hr is footer). I chose first-hr-wins so authors who want hrs as visual rules inside the body have a clear escape (move them inside a nested rune; bare hrs at the drawer's top level always delimit). Existing drawers in the repo were grepped — none use a top-level hr inside the body — so no migration breakage in the corpus.
- The `display: flex` declaration is scoped to `dialog.rf-drawer[open]` rather than the bare `dialog.rf-drawer`. Without the scope, declaring `display: flex` on the bare element would override the browser UA's `display: none` for closed dialogs — a closed dialog would render as an empty box positioned by the side `inset` rules.
- Dropped the `position: sticky` on the dialog header. Flex layout pins it naturally as a `flex: 0 0 auto` item. Less CSS, fewer edge cases (sticky inside scrolling parents has quirks; flex doesn't).
- `min-height: 0` on the body is the gotcha: without it, a flex column item's default `min-height: auto` keeps the body from shrinking below its content, so `overflow-y: auto` would have nothing to clip. Setting it explicitly lets the body shrink to the dialog's available height, scroll on overflow.
- This work is the foundation — WORK-300 (hoist mechanism) will populate the footer slot programmatically for `preview="drawer"`; WORK-303 (docs) documents the standalone body-zone convention. The slot ships in this commit so authors can use it today without waiting for the rest.

{% /work %}
