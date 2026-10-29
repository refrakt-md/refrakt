{% work id="WORK-662" status="in-progress" priority="high" complexity="moderate" source="SPEC-145" tags="runes, composition, universals, transform, facets" milestone="v0.44.0" %}

# Every universal axis declares where it lands on a composed rune

{% ref "WORK-661" /%} places D14's eight attributes. The registry has twelve axes, and
`prominence`, `reading`, `dropcap`, `frame`, `bg` and `stagger` have no placement: on a composed
root they are dropped with a warning, do nothing, or paint the empty wrapper. `scrim` is placed
wrongly, on the media slot's owner, when the registry files it under `bg` ({% ref "SPEC-145" /%}
D33).

## Acceptance Criteria

- [ ] `UniversalAxisFacet` carries a placement (`root`, `carrier`, or a role: `header`, `prose-body`, `media`), every registered axis declares one, and a test fails on an axis with none
- [ ] The paint group of WORK-661 is read from the placements rather than a list in the composition code
- [ ] An axis is placed whole: every attribute it owns in `AXIS_ATTRIBUTES` lands on the same rune, `tint`'s D14 split aside
- [ ] `prominence` lands on the placed rune owning a header role, `reading` and `dropcap` on the one declaring `prose` and owning `body`, and `frame` on the one owning media or naming a `frameTarget`; the carrier wins when it owns the role
- [ ] A `prominence` on a composition placing one `section` scales its title exactly as on a `section` written directly
- [ ] A composed rune offers a role-bound axis only when an owner resolves: `reference` omits it otherwise and `inspect` and `contracts` give the reason
- [ ] `scrim` lands with `bg` on the carrier; a composition with a background, a scrim and no media is accepted, and a cover-mode rune that is not the carrier draws a warning naming both
- [ ] Contracts are regenerated on both copies; composed entries' universal availability changes and every change is explained

## Blocked by

- {% ref "WORK-661" /%}

## References

- {% ref "SPEC-145" /%}: D33.
- {% ref "SPEC-125" /%}: schema narrowing, which applicability feeds.
- WORK-536: why `scrim` belongs to `bg`.

{% /work %}
