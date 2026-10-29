{% work id="WORK-661" status="done" priority="high" complexity="complex" source="SPEC-145" tags="runes, composition, universals, chrome, transform" milestone="v0.44.0" pr="refrakt-md/refrakt#732" %}

# Composed runes paint a nominated chrome carrier, not their empty root

A composed rune's universal attributes land on its own root, which is an empty wrapper around
the primitive it places. `elevation="raised"` there draws a second complete surface around the
first ({% ref "SPEC-145" /%} D14). This item moves the paint group to a carrier: the template's
single top-level rune by default, or the one marked `chrome` (D31). Resolution looks through
nested compositions (D24).

## Acceptance Criteria

- [x] `elevation`, `substrate`, `reveal` and `tint`'s paint half written on a composed rune land on the carrier, and `width`, `spacing` and `inset` stay on the root (D14)
- [x] With exactly one top-level placed rune, that rune is the carrier with no marker (D31)
- [x] A bare `chrome` attribute on a rune the template places nominates it; it is consumed at expansion and appears neither in the placed rune's attributes nor in the rendered HTML (D31)
- [x] Several top-level runes and no marker is rejected at schema construction, naming the runes and offering both remedies: wrap them in a `section`, or mark one with `chrome` (D14, D31)
- [x] Marking two runes is rejected naming both, and a placeable rune declaring a `chrome` attribute is reported as a collision (D31)
- [x] Top-level runes are counted per branch of an expansion-bound conditional (D31). Until D30 is built, an `{% if %}` is counted as written, and the item says so in its resolution
- [x] Resolution descends through a nested composition to the first rune with a `block`, asserted on a two-level chain where the attribute lands exactly as when written on that rune directly (D24)
- [x] A composition placing no rune warns and drops the paint group rather than painting its root (D24)
- [x] The storytelling compositions' comparisons are re-run and show no change, since none sets a paint attribute in its fixtures
- [x] The composed-runes guide documents the carrier, the marker and the rejection

## Approach

Expansion already knows the composed rune's attributes, because it substitutes `$attrs.*`
(`packages/runes/src/lib/composition.ts`, `expand`). The expected route moves each paint-group
attribute off the root and writes it onto the carrier tag as an ordinary attribute. The carrier
then receives it exactly as if the author had written it there, which is D24's test, and an
inner composition's own expansion moves it again. D31 states this as the expected route, not a
requirement.

The paint group is hard-coded here. {% ref "WORK-662" /%} turns it into a property of each axis.

## References

- {% ref "SPEC-145" /%}: D14, D24, D31.

## Resolution

Completed: 2026-10-29

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/runes/src/lib/composition-placement.ts` (new): carrier nomination (single top-level rune, or the bare `chrome` marker), the D31 rejections (`chrome-ambiguous`, `chrome-marked-twice`, `chrome-invalid`, `chrome-collision`), and moving each universal attribute onto its target template node.
- `packages/runes/src/lib/composition.ts`: template runes collected during the construction walk; `normaliseEach` also rewrites a bare `chrome` on any tag; `substituteNode` strips `chrome` and writes the moved attributes onto the target; `rootAttributes` gives the root what stays.
- `packages/runes/src/lib/index.ts`: a composition's root forwards and injects only root-placed universals; validate warns `composition-no-carrier` when a paint attribute has nowhere to land.
- Tests: `packages/runes/test/composition-carrier.test.ts`. Existing tests updated for `tint` landing on the carrier and the `dossier` fixture gaining `chrome`.
- Docs: "Where universal attributes land" and the four error codes in `site/content/extend/rune-authoring/composed-runes.md`.

### Notes
- D30 is not built, so an `{% if %}` is counted as written: a rune inside one counts as placed at the top level. Per-branch counting follows D30.
- `tint` moves to the carrier whole (tokens and background). A tinted composed rune therefore loses the top-level full-width breakout Lumina gives tinted blocks.
- A rune placed inside an `each` slot counts as several top-level regions, and cannot be marked.
- The storytelling comparisons (rendered output, JSON-LD) are unchanged; only the attribute-set assertions moved.

{% /work %}
