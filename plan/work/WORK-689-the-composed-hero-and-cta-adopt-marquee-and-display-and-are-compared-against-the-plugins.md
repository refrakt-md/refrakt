{% work id="WORK-689" status="ready" priority="medium" complexity="simple" source="SPEC-183" tags="runes, composition, marketing, hero, cta, staging" milestone="v0.45.0" %}

# The composed hero and cta adopt marquee and display, and are compared against the plugins

The staged `hero` defaults to `marquee` and the staged `cta` declares `display` (SPEC-183 D1).
Their comparison tests then check that every value the plugin stylesheets set comes from the
register instead (D6). Whatever differences remain are explained, as SPEC-181's review gate
requires.

## Acceptance Criteria
- [ ] `site/staged-runes/hero.md` defaults to `prominence: marquee`, and `site/staged-runes/cta.md` declares `prominence: display`
- [ ] The comparison tests assert the title size, blurb size, band padding, gradient and button size of each against the plugin rune, through the register's custom properties
- [ ] The blurb's measure, and any inline-padding difference, are recorded as explained differences, unless the staging review finds them wrong (D6)
- [ ] The composed-runes guide's hero/cta examples and the hero and cta reference pages mention `marquee`
- [ ] `refrakt validate --site staging` reports nothing beyond main's, and staging.refrakt.md is reviewed against refrakt.md on the hero and cta pages

## Blocked by

- {% ref "WORK-688" /%}

## References

- {% ref "SPEC-183" /%}
- {% ref "SPEC-181" /%}: the rollout gates.

{% /work %}
