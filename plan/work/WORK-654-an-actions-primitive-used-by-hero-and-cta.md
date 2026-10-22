{% work id="WORK-654" status="draft" priority="medium" complexity="moderate" source="SPEC-160,SPEC-169" tags="runes, primitives, marketing, lumina, composition" milestone="v0.43.0" %}

# An actions primitive, used by hero and cta

Buttons are a convention, not a primitive. `hero` and `cta` render links through `linkItem`,
and Lumina draws the first as primary and the rest as outlined by list position, with the CSS
duplicated in `hero.css` and `cta.css`. No other rune can get buttons without copying both.
`{% actions %}` makes it a core rune ({% ref "SPEC-160" /%} D6).

## Acceptance Criteria

- [ ] `{% actions %}` is a core rune that takes a list of links, and optionally fences, and renders each link as `data-name="action"` with `data-rank="primary"` for the first and `secondary` for the rest
- [ ] A fence renders as a `command` block, as in `hero` today
- [ ] Lumina's button CSS moves from `hero.css` and `cta.css` into `actions.css`, styled by rank, not list position
- [ ] `hero` and `cta`, still plugin runes, render their actions through it with no visual change, checked in the gallery
- [ ] A composed `hero` fixture over `section` with a delimited content model renders its media and content zones and wraps its actions list in `{% actions %}` (the fixture {% ref "SPEC-169" /%} D1 specifies)
- [ ] Contracts are regenerated on both copies and the diff reviewed

## Approach

Rank stays positional, as today (SPEC-160 D6's default). Authorable rank is left for when a rune
needs it.

## Blocked by

- {% ref "WORK-652" /%}: the `hero` fixture needs `section`'s split
- {% ref "WORK-646" /%}: the `hero` fixture needs the delimited model

## References

- {% ref "SPEC-160" /%}: D6.
- {% ref "SPEC-169" /%}: D1's acceptance fixture.

{% /work %}
