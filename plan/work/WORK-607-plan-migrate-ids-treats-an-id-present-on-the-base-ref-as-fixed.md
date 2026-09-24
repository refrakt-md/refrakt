{% work id="WORK-607" status="ready" priority="medium" complexity="simple" milestone="v0.38.0" source="SPEC-135" tags="plan,cli,migrate,ids" %}

# `plan migrate ids` treats an ID present on the base ref as fixed

`runMigrateIds` sorts colliding claimants by path and keeps the first
(`plugins/plan/src/commands/migrate-ids.ts:165`), so on a branch it can renumber
the entity already on `main` and leave the local draft holding the ID.

The safety argument in the code — that it only acts when nothing references the
ID — rests on a check that reads **plan files only**
(`migrate-ids.ts:170-182`). Plan IDs are referenced from four published
CHANGELOGs (runes 130, transform 120, lumina 80, content 51), where a renumber
is permanent and invisible.

## Acceptance Criteria

- [ ] With a base ref available, an ID reachable on that ref is never the one renumbered; the branch-local claimant moves
- [ ] With no base ref, more than one claimant and no way to tell which is published is a refusal that says so, rather than a pick by filename
- [ ] The refusal and the renumber both name which claimant was treated as published, and why
- [ ] A test covers the branch case: local draft and base-ref entity colliding, base-ref entity untouched
- [ ] The existing `picks which file moves deterministically` test still passes, or is replaced by one asserting *which* file moves
- [ ] `plan validate --against <ref>` behaviour is unchanged

## Approach

`plan validate --against <ref>` already establishes the fact this needs, so the
plumbing exists — the base ref just is not consulted here.

The asymmetry is the whole fix: an ID **on the base ref** is already distributed
(merged commits, PR bodies, changelogs, other branches in flight) and
renumbering it invalidates references the tool cannot see or fix. An ID **only on
the branch** has been seen by nobody.

Path-sort is worse than a coin flip today because it correlates with the slug.
In the instance that surfaced this, the local draft won the keep slot purely
because `collapse-the-rune-transform-boilerplate` sorts before
`pluggable-query-engines-for-the-field-value-grammar`.

A narrower fix — refuse whenever more than one claimant exists and no base ref
was given — is strictly safer than today and needs no new plumbing. It is the
fallback, not the whole answer: the base-ref case is the one that actually
happens.

## References

- {% ref "BUG-026" /%} — the bug this fixes
- {% ref "SPEC-135" /%} — duplicate-ID detection, prevention and resolution; D8
- {% ref "WORK-582" /%} — the work item that built `migrate ids` and `validate --against`

{% /work %}
