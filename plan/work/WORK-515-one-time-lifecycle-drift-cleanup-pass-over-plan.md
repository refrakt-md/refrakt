{% work id="WORK-515" status="ready" priority="medium" complexity="simple" source="SPEC-119" tags="plan, validation, migration" milestone="v0.30.0" %}

# One-time lifecycle-drift cleanup pass over plan/

Run the new drift checks against refrakt's own `plan/` and clear the accumulated drift, so the checks land on a clean repo and can gate CI without a wall of pre-existing warnings. {% ref "SPEC-119" /%}'s motivating audit already found **38 `draft` specs whose linked work was 100% `done`** plus **32 `accepted` specs** never advanced to `implemented`/`shipped`, along with stale `blocked` items and milestones left `active`/`complete` out of step with their members. This is the "land alongside a one-time migration pass so the repo starts clean" step from the spec's recommendation.

## Acceptance Criteria
- [ ] `plan validate` reports **zero** lifecycle-drift warnings (`spec-status-lag`, `spec-status-ahead`, `released-in-without-shipped`, `stale-blocked`, `milestone-complete-with-open-work`) against refrakt's `plan/` after the pass
- [ ] Drifted specs are advanced to the correct terminal state (`implemented`, or `shipped` with `released-in` where a release actually shipped them) — assertions capped at `implemented`; `shipped`/`released-in` chosen by human judgement, never inferred
- [ ] Specs whose linked work is entirely `cancelled`/`superseded` are retired (not advanced to `implemented`) — verified by hand, not by the drift-toward-done check
- [ ] Stale `blocked` work items are moved to their correct status; `complete`/`active` milestones are reconciled with their members
- [ ] All status changes are made via the plan CLI (`plan update`), not by hand-editing entity files
- [ ] `plan validate --strict` passes on `plan/` at the end of the pass

## Approach

Sequence after {% ref "WORK-513" /%} and {% ref "WORK-514" /%} so the checks exist to enumerate the drift: run `plan validate`, work the list, re-run until clean. This is a content/status migration — no code changes — but it doubles as the real-world noise check the spec's open question calls for. Where a warning turns out to be a false positive rather than genuine drift, that's a finding to feed back into the check's predicate (WORK-513/514), not something to silence by mis-statusing an entity.

## Blocked by
- {% ref "WORK-513" /%}
- {% ref "WORK-514" /%}

## References

- {% ref "SPEC-119" /%} — lifecycle-drift validation; the audit numbers and the "one-time migration pass" recommendation
- {% ref "SPEC-049" /%} — spec lifecycle states (`implemented`/`shipped`, `released-in`) applied during the pass

{% /work %}
