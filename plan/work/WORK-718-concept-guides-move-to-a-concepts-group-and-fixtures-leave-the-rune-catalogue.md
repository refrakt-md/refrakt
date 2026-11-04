{% work id="WORK-718" status="ready" priority="medium" complexity="simple" source="SPEC-193" tags="docs, nav, concepts, redirects" milestone="v0.49.0" %}

# Concept guides move to a Concepts group, and fixtures leave the rune catalogue

SPEC-193 D7. surfaces, media-guests, image-schemes and motion are concept guides in the rune
catalogue; plan/examples is a fixture page; plan/cli documents a CLI.

## Acceptance Criteria
- [ ] A Concepts group in the docs nav holds surfaces, media-guests, image-schemes and motion, with page-sections and tint moved from Authoring
- [ ] The moved pages keep their URLs working through redirects, and every link to them is updated
- [ ] plan/examples is no longer a published page in the rune section; the examples still render their data
- [ ] plan/cli moves to `docs/cli/` and documents `plan migrate` and `validate --against`
- [ ] The rune nav's Essentials group holds only the catalogue

## Blocked by
- {% ref "WORK-711" /%}

## References
- {% ref "SPEC-193" /%}: D7.

{% /work %}
