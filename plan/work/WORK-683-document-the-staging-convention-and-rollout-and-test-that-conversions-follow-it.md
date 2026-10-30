{% work id="WORK-683" status="in-progress" priority="medium" complexity="simple" source="SPEC-181" tags="runes, composition, staging, rollout, docs, tests" milestone="v0.44.0" %}

# Document the staging convention and rollout, and test that conversions follow it

Every conversion of a plugin rune into a composition is staged until it goes live, and goes
live on its own ({% ref "SPEC-181" /%} D5, D6). Writing that down is not enough to make it
happen, so this item also adds a test that fails when a conversion skips staging.

## Acceptance Criteria

- [ ] `CLAUDE.md` has a section on converting a plugin rune to a composition: stage in `site/staged-runes/<rune>.md` with a `prefer` entry, test against that file, review with `npm run dev:staging`, and go live in a separate work item once the four rollout gates are met
- [ ] The rune authoring docs (`site/content/extend/rune-authoring/`) describe the staging site and the go-live steps
- [ ] A test fails when a composed definition in any test fixture directory has the name of a rune a shipping plugin provides, and its message names `site/staged-runes/` as the place to use
- [ ] The v0.44.0 milestone's "Replacing the plugin runes is a separate step" section and SPEC-147's comparison process point at SPEC-181 for where the comparison is reviewed and how runes go live

## Blocked by

- {% ref "WORK-681" /%}

## References

- {% ref "SPEC-181" /%}: Rollout, D5, D6.

{% /work %}
