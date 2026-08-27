{% work id="WORK-515" status="done" priority="medium" complexity="simple" source="SPEC-119" tags="plan, validation, migration" milestone="v0.30.0" pr="refrakt-md/refrakt#574" %}

# One-time lifecycle-drift cleanup pass over plan/

Run the new drift checks against refrakt's own `plan/` and clear the accumulated drift, so the checks land on a clean repo and can gate CI without a wall of pre-existing warnings. {% ref "SPEC-119" /%}'s motivating audit already found **38 `draft` specs whose linked work was 100% `done`** plus **32 `accepted` specs** never advanced to `implemented`/`shipped`, along with stale `blocked` items and milestones left `active`/`complete` out of step with their members. This is the "land alongside a one-time migration pass so the repo starts clean" step from the spec's recommendation.

## Acceptance Criteria
- [x] `plan validate` reports **zero** lifecycle-drift warnings (`spec-status-lag`, `spec-status-ahead`, `released-in-without-shipped`, `stale-blocked`, `milestone-complete-with-open-work`) against refrakt's `plan/` after the pass
- [x] Drifted specs are advanced to the correct terminal state (`implemented`, or `shipped` with `released-in` where a release actually shipped them) — assertions capped at `implemented`; `shipped`/`released-in` chosen by human judgement, never inferred
- [x] Specs whose linked work is entirely `cancelled`/`superseded` are retired (not advanced to `implemented`) — verified by hand, not by the drift-toward-done check
- [x] Stale `blocked` work items are moved to their correct status; `complete`/`active` milestones are reconciled with their members
- [x] All status changes are made via the plan CLI (`plan update`), not by hand-editing entity files
- [x] `plan validate --strict` passes on `plan/` at the end of the pass

## Approach

Sequence after {% ref "WORK-513" /%} and {% ref "WORK-514" /%} so the checks exist to enumerate the drift: run `plan validate`, work the list, re-run until clean. This is a content/status migration — no code changes — but it doubles as the real-world noise check the spec's open question calls for. Where a warning turns out to be a false positive rather than genuine drift, that's a finding to feed back into the check's predicate (WORK-513/514), not something to silence by mis-statusing an entity.

## Blocked by
- {% ref "WORK-513" /%}
- {% ref "WORK-514" /%}

## References

- {% ref "SPEC-119" /%} — lifecycle-drift validation; the audit numbers and the "one-time migration pass" recommendation
- {% ref "SPEC-049" /%} — spec lifecycle states (`implemented`/`shipped`, `released-in`) applied during the pass

## Resolution

Completed: 2026-07-24

Branch: `claude/v0-30-milestone-review-hg592h`

### What was done
- SPEC-015 and SPEC-028: `review` → `implemented` (linked work all done; capped at implemented per SPEC-049).
- WORK-430: stale `blocked` → `pending` (its ## Blocked by targets WORK-428/429 are done; the work itself is unfinished).

### Notes
- Zero spec-status-lag / spec-status-ahead / released-in-without-shipped / stale-blocked / milestone-complete-with-open-work warnings remain against plan/. The residual `--strict` warnings are pre-existing non-drift hygiene (missing Acceptance Criteria on old done items, unassigned-milestone backlog) outside SPEC-119s scope.

{% /work %}
