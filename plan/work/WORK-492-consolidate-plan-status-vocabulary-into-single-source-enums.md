{% work id="WORK-492" status="ready" priority="high" complexity="complex" milestone="v0.28.0" source="SPEC-117" tags="plan, status, vocabulary, refactor, enums" %}

# Consolidate plan status vocabulary into a single source of truth

Make `enums.ts` the one place that defines status/severity/complexity/priority vocabularies, with derived lifecycle helpers, so consumers stop re-declaring the lists and drift becomes a build failure instead of a latent bug. This lands before the downstream status additions so they inherit the consolidated shape.

## Acceptance Criteria
- [ ] `enums.ts` exposes derived `TERMINAL_STATUSES`, `ACHIEVING_STATUSES`, `ACTIONABLE_STATUSES` (per `PlanRuneType`) and `isTerminal` / `isAchieving` / `isActionable` helpers
- [ ] `tags/{spec,work,bug,decision,milestone}.ts` import status/severity/complexity/priority value lists from `enums.ts` (no local re-declaration)
- [ ] `mcp-bindings.ts` status and severity enums derive from `enums.ts`
- [ ] `next.ts`, `status.ts`, `validate.ts` use the `enums.ts` terminal/actionable helpers instead of local `DONE_STATUSES` / `ACTIVE_STATUSES` / `READY_STATUSES` sets
- [ ] `render-pipeline.ts` / `index.ts` terminal/resolved sets derive from `TERMINAL_STATUSES`; ordering tables (which carry sort intent) remain but are covered by an exhaustiveness test
- [ ] A test asserts every canonical status value has a `config.ts` `sentimentMap` entry and a status-ordering entry (drift fails CI)
- [ ] No behavioural change to `plan next` / `status` / `validate` output on the current corpus (pure refactor, verified against snapshots)

## Approach
`enums.ts` grows the derived sets alongside the existing `VALID_*` records. Membership-only consumers import; structure-carrying consumers (sentiment maps, orderings) keep their tables but gain an exhaustiveness test keyed off the canonical list. Fold in the {% ref "WORK-491" /%} fixes structurally if that item hasn't landed yet.

## Dependencies
- {% ref "WORK-491" /%} — the drift fixes become structural once this lands (either order works; if 491 ships first, this generalises it)

## References
- {% ref "SPEC-117" /%} — spec (Vocabulary module, Consumers stop re-declaring vocab)

{% /work %}
