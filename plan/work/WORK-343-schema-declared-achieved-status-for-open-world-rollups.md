{% work id="WORK-343" status="draft" priority="low" complexity="moderate" source="SPEC-076" tags="aggregation,runes,open-world,future" %}

# Schema-declared achieved status for open-world rollups

The deferred "option B" from the WORK-296 achievement-status discussion. Today
`plan-progress` computes its achieved subset with a hardcoded union of terminal
statuses (`value="status:/^(done|fixed|accepted|complete)$/"`, decision C). That
is correct and minimal, but it bakes domain knowledge into the plan sugar and
relies on achieved-status **name uniqueness** across types — which holds for the
five first-party plan types but is not guaranteed for a third-party "trackable"
type that introduces its own status lifecycle.

This item makes achievement **self-declared on each rune's schema** so
`aggregate` can derive the achieved set generically, the same open-world way
SPEC-084 handles composability (knowledge lives with the party that has it).

## Why deferred

- The C union covers every first-party case correctly and ships in {% ref "WORK-296" /%}.
- B only pays off once third-party plan-like types with their own status enums exist — no concrete demand yet.
- `sentimentMap` cannot stand in for it: sentiment marks "is this a good state?" not "is this the completed state?" — e.g. milestone marks both `active` and `complete` positive, so positive-sentiment ≠ achieved.

## Acceptance Criteria
- [ ] A status enum can mark its terminal-positive value(s) via an explicit schema marker (e.g. `achievedStatus` / a per-value `terminal: true`), distinct from `sentimentMap`.
- [ ] `aggregate` can derive the achieved subset for a mixed-type query by unioning each type's declared achieved status, with no hardcoded list.
- [ ] `plan-progress` drops its hardcoded union default in favour of the derived set; output is unchanged for the first-party types.
- [ ] A third-party-style type declaring its own achieved status participates in a rollup correctly (test).

## References
- Builds on the C convention in {% ref "WORK-296" /%}
- Status enums + `sentimentMap`: `plugins/plan/src/config.ts`, `plugins/plan/src/tags/*.ts`
- `aggregate` resolver: `packages/runes/src/aggregate-resolve.ts`; {% ref "SPEC-076" /%}
- Mirrors the self-declared / open-world principle of {% ref "SPEC-084" /%}

{% /work %}
