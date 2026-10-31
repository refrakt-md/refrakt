{% work id="WORK-690" status="in-progress" priority="medium" complexity="simple" source="SPEC-183" tags="prominence, lumina, mobile, hero, cta" milestone="v0.45.0" %}

# Loud titles scale down on a phone

At 3.25rem a `marquee` title cannot fit a long word on a phone: the cover example's "Documentation"
overflows a 390px screen on refrakt.md and staging alike. Found reviewing staging on a phone. Below
640px of container width the two loud steps ramp smaller: `marquee` at 5/3 of the resting size
(2.5rem) and `display` at 4/3 (2rem). The plugin `hero` and `cta` take the same sizes, so the two
sites stay identical until they go live.

## Acceptance Criteria
- [x] Below 640px of container width, `marquee` ramps the title at 5/3 and `display` at 4/3 of the resting size
- [x] The plugin `hero` and `cta` rest at the same sizes on a phone, and the register comparison test asserts it
- [x] The cover example's headline fits a 390px screen
- [x] SPEC-183 D1 records the phone ramp

## References

- {% ref "SPEC-183" /%}: D1.

{% /work %}
