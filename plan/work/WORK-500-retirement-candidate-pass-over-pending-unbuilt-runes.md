{% work id="WORK-500" status="draft" priority="low" complexity="simple" milestone="v0.28.0" source="SPEC-117" tags="plan, content, status, audit, cleanup" %}

# Retirement-candidate pass over pending unbuilt runes

Once `cancelled` / `superseded` exist, review the plan corpus for items that should be retired rather than left dangling. The main pool is the 13 `pending` work items, all sourced from {% ref "SPEC-008" /%} (unbuilt runes): `stat`, `math`, `concept`, `exercise`, `glossary`, `objective`, `prerequisite`, `quiz`, `partner`, `job`, `album`, `artist`, `video`. A reviewed, per-item judgment pass — not an automated flip.

## Acceptance Criteria
- [ ] Each of the 13 `pending` SPEC-008 work items reviewed and either flipped to `cancelled` (won't build), `superseded` (replaced — with `supersedes`), or deliberately kept `pending` with a note on why it's still live
- [ ] The `future`-tagged draft items (e.g. WORK-343, WORK-354) reviewed for the same treatment
- [ ] Any flip records a short rationale in the item body / resolution
- [ ] {% ref "SPEC-008" /%} status reassessed (still `review`) in light of the outcome — accepted, or itself deprecated/superseded if the whole unbuilt-rune set is abandoned
- [ ] `plan validate` and `plan status` remain clean after the pass

## Dependencies
- {% ref "WORK-493" /%} — the `cancelled` / `superseded` statuses this pass uses

## References
- {% ref "SPEC-117" /%} — spec (Migration: optional follow-up)
- {% ref "SPEC-008" /%} — the source of the pending items

{% /work %}
