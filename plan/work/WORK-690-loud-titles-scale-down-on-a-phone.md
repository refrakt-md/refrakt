{% work id="WORK-690" status="done" priority="medium" complexity="simple" source="SPEC-183" tags="prominence, lumina, mobile, hero, cta" milestone="v0.45.0" pr="refrakt-md/refrakt#745" %}

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

## Resolution

Completed: 2026-10-31

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/lumina/styles/dimensions/surfaces.css`: below 640px of container width (`@container`, the split layout's breakpoint), `display` ramps at 4/3 and `marquee` at 5/3.
- `packages/lumina/styles/runes/hero.css` and `cta.css`: on a phone, `--rf-title-size` steps down to 2.5rem and 2rem, so the plugin runes match.
- `composed-landing-register.test.ts`: a parity test for the phone sizes.
- SPEC-183 D1 amended, and a changeset added.

### Notes
- A container query rather than a media query, so a preview's phone viewport shows the phone size.

{% /work %}
