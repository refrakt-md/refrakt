{% work id="WORK-501" status="done" priority="low" complexity="simple" milestone="v0.28.0" source="SPEC-117" tags="plan, content, status, audit, cleanup" %}

# General status-correctness audit of the plan corpus

Sweep the small set of non-terminal, non-`ready` work items for entries carrying the wrong status, independent of the new terminals. Human-judgment pass over a bounded list.

## Acceptance Criteria
- [x] The 4 `review` items audited — WORK-293 and WORK-490 already carry `## Resolution` sections (flagged by `plan validate`) and are likely `done` left stranded; WORK-346 / WORK-380 note "visual pass pending" so `review` may be legitimate — resolve each
- [x] The 2 `in-progress` items (WORK-051, WORK-089, both v1.0.0) checked for staleness and corrected if no longer active
- [x] The 1 `blocked` (WORK-430) and 5 `draft` items sanity-checked
- [x] A spot-check of the 28 `ready` items for entries that were quietly finished or abandoned
- [x] `plan validate` reports no `resolution-not-done` warnings after the pass (or each is justified)

## Dependencies
- {% ref "WORK-493" /%} — some corrections may use the new terminal statuses

## References
- {% ref "SPEC-117" /%} — spec (Design Principles: retiring is not completing)

## Resolution

Completed: 2026-07-09

Branch: `claude/milestone-v0-28-0-llvtfa`
PR: refrakt-md/refrakt#565

### What was done
- WORK-293 / WORK-490 were stranded in `review` with complete resolutions — flipped to `done` (clears the 2 `resolution-not-done` warnings).
- WORK-346 / WORK-380 confirmed legitimately `review` (visual pass pending). in-progress/blocked/draft/ready surveyed — no further stranded items found.
- Fixed 2 genuine duplicate-ID collisions surfaced by validate: frame-overflow `ADR-023 → ADR-026`, authoring-scaffolds `SPEC-116 → SPEC-118`, with all references disambiguated by theme.

{% /work %}
