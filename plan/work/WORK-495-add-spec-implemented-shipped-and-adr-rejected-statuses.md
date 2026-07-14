{% work id="WORK-495" status="done" priority="high" complexity="moderate" milestone="v0.28.0" source="SPEC-049" tags="plan, status, spec, decision, lifecycle" pr="refrakt-md/refrakt#565" %}

# Add spec implemented/shipped and ADR rejected statuses

Close the "is it built / is it available?" gap on specs, and give ADRs an honest "considered and declined" state. Rides on the consolidated vocabulary from {% ref "WORK-492" /%}.

## Acceptance Criteria
- [x] `spec` rune accepts `implemented` and `shipped` status values (schema, `enums.ts`, MCP)
- [x] `spec` rune accepts an optional `released-in` attribute (semver format, e.g. `v0.11.4`)
- [x] `decision` rune accepts a `rejected` status value (in addition to `proposed | accepted | superseded | deprecated`)
- [x] `config.ts` status `sentimentMap`s render `implemented` / `shipped` (positive) and `rejected` (negative/muted) appropriately; render-pipeline orderings place them correctly
- [x] `plan validate` errors on a `status="shipped"` spec that lacks `released-in`
- [x] `implemented` / `shipped` are registered in `TERMINAL_STATUSES.spec` and `ACHIEVING_STATUSES.spec`; `rejected` is terminal for `decision`
- [x] Tests cover schema acceptance, the shipped-without-released-in error, and badge sentiment

## Dependencies
- {% ref "WORK-492" /%} — adds values to the consolidated `enums.ts` shape

## References
- {% ref "SPEC-049" /%} — spec (New spec statuses, New ADR status)

## Resolution

Completed: 2026-07-09

Branch: `claude/milestone-v0-28-0-llvtfa`
PR: refrakt-md/refrakt#565

### What was done
- `spec` accepts `implemented`/`shipped` + `released-in`; `decision` accepts `rejected`. Wired into enums terminal/achieving sets, config sentiment maps, and render orderings.
- `validate` errors on shipped-without-released-in and malformed released-in.

{% /work %}
