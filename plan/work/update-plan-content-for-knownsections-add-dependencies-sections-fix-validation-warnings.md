{% work id="WORK-132" status="draft" priority="medium" complexity="moderate" source="SPEC-037" tags="plan, content" %}

# Update plan content for knownSections: add Dependencies sections, fix validation warnings

Once knownSections land (WORK-024) and scanner integration ships (WORK-129), the validator will surface new section-level warnings and the `next` command will distinguish Dependencies refs from informational refs. Existing plan content needs a pass to take advantage of this and resolve any new warnings.

## Acceptance Criteria

- [ ] Work items that have blocking refs in `## References` move those to a `## Dependencies` section (so the `next` command treats them as blockers under the new section-aware logic)
- [ ] Work items in `ready`+ status without `## Acceptance Criteria` either get criteria added or are demoted to `draft`
- [ ] Confirmed+ bugs without `## Steps to Reproduce`, `## Expected`, or `## Actual` sections get those sections added where feasible
- [ ] Accepted decisions without `## Context` or `## Decision` sections get those sections added where feasible
- [ ] `npx refrakt plan validate` produces no new section-related warnings after the content pass
- [ ] Informational refs (context, related reading) remain in `## References` — only actual prerequisites move to `## Dependencies`

## Approach

Run `npx refrakt plan validate` after WORK-129 ships to get the full list of new warnings. Triage each one — some files just need a heading rename or a section split, others may need real content added. For historical done items, it's acceptable to leave warnings rather than backfilling sections that serve no ongoing purpose.

## Dependencies

- {% ref "WORK-024" /%} — knownSections framework support and plan rune declarations
- {% ref "WORK-129" /%} — scanner integration that enables section-aware validation and blocking

## References

- {% ref "SPEC-037" /%} — Plan Package Hardening

{% /work %}
