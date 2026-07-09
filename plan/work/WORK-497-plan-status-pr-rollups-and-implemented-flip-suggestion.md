{% work id="WORK-497" status="draft" priority="medium" complexity="moderate" milestone="v0.28.0" source="SPEC-049" tags="plan, status, traceability, rollup" %}

# plan status PR rollups and implemented-flip suggestion

Surface the traceability data structurally so missing PRs and ready-to-flip specs are visible without grepping prose.

## Acceptance Criteria
- [ ] `plan status` includes a per-spec "PRs" rollup listing the unique (deduped) PRs across its `implemented-by` work items
- [ ] `plan status` suggests the `implemented` flip when every `implemented-by` work item of an `accepted` spec is `done`
- [ ] Rollups dedupe when one PR closes multiple work items
- [ ] `--format json` output includes the rollup data
- [ ] Tests cover the rollup, dedupe, and flip-suggestion logic

## Dependencies
- {% ref "WORK-495" /%} — the `implemented` status the flip suggests
- {% ref "WORK-496" /%} — the `pr` attribute the rollup aggregates

## References
- {% ref "SPEC-049" /%} — spec (CLI / MCP changes, Design Principles: carrot before stick)

{% /work %}
