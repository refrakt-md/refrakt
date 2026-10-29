{% work id="WORK-661" status="in-progress" priority="high" complexity="complex" source="SPEC-145" tags="runes, composition, universals, chrome, transform" milestone="v0.44.0" %}

# Composed runes paint a nominated chrome carrier, not their empty root

A composed rune's universal attributes land on its own root, which is an empty wrapper around
the primitive it places. `elevation="raised"` there draws a second complete surface around the
first ({% ref "SPEC-145" /%} D14). This item moves the paint group to a carrier: the template's
single top-level rune by default, or the one marked `chrome` (D31). Resolution looks through
nested compositions (D24).

## Acceptance Criteria

- [ ] `elevation`, `substrate`, `reveal` and `tint`'s paint half written on a composed rune land on the carrier, and `width`, `spacing` and `inset` stay on the root (D14)
- [ ] With exactly one top-level placed rune, that rune is the carrier with no marker (D31)
- [ ] A bare `chrome` attribute on a rune the template places nominates it; it is consumed at expansion and appears neither in the placed rune's attributes nor in the rendered HTML (D31)
- [ ] Several top-level runes and no marker is rejected at schema construction, naming the runes and offering both remedies: wrap them in a `section`, or mark one with `chrome` (D14, D31)
- [ ] Marking two runes is rejected naming both, and a placeable rune declaring a `chrome` attribute is reported as a collision (D31)
- [ ] Top-level runes are counted per branch of an expansion-bound conditional (D31). Until D30 is built, an `{% if %}` is counted as written, and the item says so in its resolution
- [ ] Resolution descends through a nested composition to the first rune with a `block`, asserted on a two-level chain where the attribute lands exactly as when written on that rune directly (D24)
- [ ] A composition placing no rune warns and drops the paint group rather than painting its root (D24)
- [ ] The storytelling compositions' comparisons are re-run and show no change, since none sets a paint attribute in its fixtures
- [ ] The composed-runes guide documents the carrier, the marker and the rejection

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

{% /work %}
