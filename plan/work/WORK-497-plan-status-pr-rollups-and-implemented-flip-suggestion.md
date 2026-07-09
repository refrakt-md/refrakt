{% work id="WORK-497" status="done" priority="medium" complexity="moderate" milestone="v0.28.0" source="SPEC-049" tags="plan, status, traceability, rollup" pr="refrakt-md/refrakt#565" %}

# plan status PR rollups and implemented-flip suggestion

Surface the traceability data structurally so missing PRs and ready-to-flip specs are visible without grepping prose.

## Acceptance Criteria
- [x] `plan status` includes a per-spec "PRs" rollup listing the unique (deduped) PRs across its `implemented-by` work items
- [x] `plan status` suggests the `implemented` flip when every `implemented-by` work item of an `accepted` spec is `done`
- [x] Rollups dedupe when one PR closes multiple work items
- [x] `--format json` output includes the rollup data
- [x] Tests cover the rollup, dedupe, and flip-suggestion logic

## Dependencies
- {% ref "WORK-495" /%} — the `implemented` status the flip suggests
- {% ref "WORK-496" /%} — the `pr` attribute the rollup aggregates

## References
- {% ref "SPEC-049" /%} — spec (CLI / MCP changes, Design Principles: carrot before stick)

## Resolution

Completed: 2026-07-09

Branch: `claude/milestone-v0-28-0-llvtfa`
PR: refrakt-md/refrakt#565

### What was done
- `plan status` builds per-spec rollups (deduped PRs across implemented-by work) + `implemented`-flip suggestions; surfaced in text + JSON. `pr` attribute wins over legacy `PR:` line.

{% /work %}
