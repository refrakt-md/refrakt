{% work id="WORK-607" status="done" priority="medium" complexity="simple" milestone="v0.38.0" source="SPEC-135" tags="plan,cli,migrate,ids" pr="refrakt-md/refrakt#659" %}

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

- [x] With a base ref available, an ID reachable on that ref is never the one renumbered; the branch-local claimant moves
- [x] With no base ref, more than one claimant and no way to tell which is published is a refusal that says so, rather than a pick by filename
- [x] The refusal and the renumber both name which claimant was treated as published, and why
- [x] A test covers the branch case: local draft and base-ref entity colliding, base-ref entity untouched
- [x] The existing `picks which file moves deterministically` test still passes, or is replaced by one asserting *which* file moves
- [x] `plan validate --against <ref>` behaviour is unchanged

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

## Resolution

Completed: 2026-10-06

Branch: `claude/v0-37-post-release-plan-dc3va1`

### What was done
- `plugins/plan/src/commands/migrate-ids.ts`: `MigrateIdsOptions.base` ({ ref, files: id → plan-relative path }). `choosePublished` decides the keeper: the claimant at the base's path; if the ID is not on the base, the first by path (nobody has seen either); refuse when the base holds the ID at a path no claimant has, or when no base is given. `PlannedRenumber.kept` / `RefusedRenumber.kept` carry `{ file, why }`.
- `plugins/plan/src/commands/against.ts`: `baseClaimants()` — `readRefIds` re-keyed to plan-relative paths, so `validate --against` and `migrate ids --against` read the base identically.
- `plugins/plan/src/cli-plugin.ts`: `migrate ids --against <ref>` (unreadable ref is an error, not a fallback); prints the `kept` line on renumbers and refusals; `validate --against`'s hint now names `migrate ids --against <ref> --apply --git`.
- `plugins/plan/test/migrate-ids.test.ts`: existing renumber tests run against a base; the "deterministic" test is replaced by one asserting which file keeps the ID; new tests for the branch case (draft sorts first, still moves, base file byte-identical), no-ref refusal, not-on-base pick, renamed-base refusal. All five fail on the old code.
- `CLAUDE.md`: `--against` on migrate ids and the base-ref rule.

### Notes
- **Behaviour change:** without `--against`, a collision is now refused rather than resolved by filename (the item's fallback criterion).
- Verified end to end in a scratch git repo: no ref → refusal naming `--against`; `--against main` → draft moves with the reason; bad ref → loud error.
- MCP's `plan.migrate` does not expose `ids`, so nothing there changed.

{% /work %}
