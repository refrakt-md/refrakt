{% work id="WORK-678" status="done" priority="medium" complexity="moderate" source="SPEC-161,SPEC-156" tags="runes, composition, marketing, steps, sequence, section" milestone="v0.45.0" pr="refrakt-md/refrakt#750" %}

# steps is a composition over section and a ladder

`steps` is a `section` with a numbered sequence of steps, each a `section` with a split
({% ref "SPEC-161" /%} D5). Its numbering needs a ladder, which {% ref "WORK-676" /%} and
{% ref "WORK-677" /%} provide, and SPEC-169 D4's example is the template.

## Acceptance Criteria

- [x] A composed `steps` definition declares `sequence: numbered` and `defaults: { elevation: flush }`, and places its steps in a numbered ladder, accepting both an ordered list and step headings (SPEC-169 D4)
- [x] Its numbers are DOM nodes ({% ref "WORK-583" /%}), not CSS counters
- [x] A step written as a list item with no heading renders as body ({% ref "ADR-046" /%})
- [x] Rendered beside the plugin `steps` for every gallery fixture, light and dark; every difference is listed and explained
- [x] The plugin `steps` is unchanged; replacing it is a later step

## Blocked by

- {% ref "WORK-677" /%}
- {% ref "WORK-583" /%}
- {% ref "WORK-663" /%}: definition `defaults` (v0.44.0)

## References

- {% ref "SPEC-161" /%}: D5.
- {% ref "SPEC-169" /%}: D4.

## Resolution

Completed: 2026-11-02

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `site/staged-runes/steps.md`: `sequence: numbered` and `defaults: { elevation: flush }`. It places a `section` holding the header slot and a `steps` ladder over `items` (list) and `sections` (headings). Each step is a `section header="none" media-position="bottom" media="cover"`; a heading step's `### $each.heading` is placed in the item, above it.
- It replaces `packages/runes/test/fixtures/composed/steps.md`. `composition-models.test.ts` and the guide snippet read the staged file. The `NOT_YET_STAGED` entry is removed, and `refrakt.config.json` staging gains `"steps": "__project__"`.
- `packages/content/test/composed-steps.test.ts` covers the definition, DOM ordinals, list/heading equivalence, ADR-046 body, the `---` split, and every difference across five cells.
- Lumina `dimensions/sequence.css`: a numbered ladder gets `margin: 0`, items padded 0.625rem, the item's heading flush (0 / 0.375rem), and `p` at `text-sm` / relaxed.

### Visual review
- The page's two examples were built on main and staging, then screenshotted in light and dark at 1280px and 390px. All 8 pairs are pixel-identical.

### Differences (asserted)
- The root is a block-less `div` around a flush `section`; there are no `rf-steps*`/`rf-step*` classes.
- Each step is a `section` in the ladder's `li`, not an `li` that is the `step` rune.
- A step heading is an `<h3>` above its section. The author's level is not kept, and the heading is never put in the media zone, which the plugin does when a step splits on `---`. A heading written in the section is dropped by its media zone.
- A lone paragraph before the steps is body, not a blurb (ADR-046).

### Notes
- `howto`, `recipe` and plugin `steps` each repeat the same step rhythm, now also on the numbered ladder. Folding the native copies into it is a candidate follow-up.

{% /work %}
