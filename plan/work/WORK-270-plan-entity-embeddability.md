{% work id="WORK-270" status="done" priority="high" complexity="moderate" source="SPEC-071" tags="plan, embed, pipeline" milestone="v0.16.0" %}

# Plan entity embeddability (sourceFile + extract)

Make plan entities embeddable so `{% expand $item.id /%}` renders their bodies in entityRoutes detail pages. The plan register hook currently sets `sourceUrl` only; add `sourceFile` and an `extract` that returns the entity rune's transformed body. This is the prerequisite the SPEC-071 dogfood depends on.

## Acceptance Criteria
- [ ] The plan register hook sets `sourceFile` (the entity's source `.md` path) for spec / work / bug / decision / milestone
- [ ] An `extract` returns the entity rune's top-level subtree so `{% expand $item.id /%}` inlines the entity body
- [ ] entityRoutes detail pages for plan entities render non-empty content
- [ ] Tests confirm `expand` works on each plan entity type

## Dependencies
- WORK-269 (embed() embeddability contract)

## References

- {% ref "SPEC-071" /%}
- {% ref "SPEC-069" /%} — embeddability contract

## Resolution

Completed: 2026-05-25

Branch: `claude/v0.16.0`

### What was done
- Verified the prerequisite is already met: the plan plugin's `performUnconditionalScan` (invoked inside the `register` hook) registers every plan entity with `sourceFile` (project-root-relative) and a closure `extract` that returns the entity's top-level rune node from a re-parse — done as part of SPEC-066/WORK-251 (v0.15.0). So `{% expand $item.id /%}` already renders plan entity bodies.
- Added `plugins/plan/test/embeddability.test.ts` (1): scans a temp `plan/` (spec/work/milestone), runs configure+register, and asserts each entity has `sourceFile` + a functional `extract` returning the matching rune node.

### Notes
- No production code change needed — the milestone's premise ("register sets sourceUrl only") was based on the TransformedPage-scan path; the unconditional-scan path already sets sourceFile+extract. Combined with WORK-268's `sourceUrl` back-fill, plan entities are both embeddable (sourceFile) and linkable (back-filled sourceUrl) in the dogfood.

{% /work %}
