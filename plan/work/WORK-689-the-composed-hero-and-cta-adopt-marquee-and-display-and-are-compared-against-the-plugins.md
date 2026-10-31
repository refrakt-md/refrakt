{% work id="WORK-689" status="done" priority="medium" complexity="simple" source="SPEC-183" tags="runes, composition, marketing, hero, cta, staging" milestone="v0.45.0" pr="refrakt-md/refrakt#742,refrakt-md/refrakt#744" %}

# The composed hero and cta adopt marquee and display, and are compared against the plugins

The staged `hero` defaults to `marquee` and the staged `cta` declares `display` (SPEC-183 D1).
Their comparison tests then check that every value the plugin stylesheets set comes from the
register instead (D6). Whatever differences remain are explained, as SPEC-181's review gate
requires.

## Acceptance Criteria
- [x] `site/staged-runes/hero.md` defaults to `prominence: marquee`, and `site/staged-runes/cta.md` declares `prominence: display`
- [x] The comparison tests assert the title size, blurb size, band padding, gradient and button size of each against the plugin rune, through the register's custom properties
- [x] The blurb's measure, and any inline-padding difference, are recorded as explained differences, unless the staging review finds them wrong (D6)
- [x] The composed-runes guide says the composed hero and cta take their header and band from `marquee` and `display`; the plugin reference pages are unchanged until the runes go live
- [x] `refrakt validate --site staging` reports nothing beyond main's, and staging.refrakt.md is reviewed against refrakt.md on the hero and cta pages

## Blocked by

- {% ref "WORK-688" /%}

## References

- {% ref "SPEC-183" /%}
- {% ref "SPEC-181" /%}: the rollout gates.

## Resolution

Completed: 2026-10-31

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `site/staged-runes/hero.md` defaults to `prominence: marquee`, and `site/staged-runes/cta.md` declares `prominence: display`.
- `packages/content/test/composed-landing-register.test.ts` (new) compares each composition against the plugin stylesheet, value by value: title size, blurb size, band padding, gradient and buttons. The hero and cta comparison tests now assert the step.
- The staging review on a phone (#744) found and fixed:
  - `{% bg %}` / `{% tint %}` landing on the composed rune's empty root. They now go to the paint carrier, and `[data-bg]` hosts are positioned.
  - A full-width composed root not moving its gutter onto the carrier.
  - The marquee gradient resolving the section's colours, not the title's (a dark cover title).
  - The section header growing past its column, and stretching a pill eyebrow.
  - A stacked `end` split putting media first.
  - Missing 2rem inline band padding, and phone block padding.
  - The 65ch header measure wrapping a marquee title.
- After #744 the user found no difference between staging.refrakt.md and refrakt.md on the hero pages.

### Notes
- SPEC-183 D2/D4 (the cta's gradient and `text-lg` blurb) and D3/D6 (inline padding, cover-only phone padding, the measure) were amended during the review.
- The blurb's measure is no longer an explained difference: the loud steps put the 40rem measure on the blurb, as the plugins do.

{% /work %}
