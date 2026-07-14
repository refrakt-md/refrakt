{% work id="WORK-492" status="done" priority="high" complexity="complex" milestone="v0.28.0" source="SPEC-117" tags="plan, status, vocabulary, refactor, enums" %}

# Consolidate plan status vocabulary into a single source of truth

Make `enums.ts` the one place that defines status/severity/complexity/priority vocabularies, with derived lifecycle helpers, so consumers stop re-declaring the lists and drift becomes a build failure instead of a latent bug. This lands before the downstream status additions so they inherit the consolidated shape.

## Acceptance Criteria
- [x] `enums.ts` exposes derived `TERMINAL_STATUSES`, `ACHIEVING_STATUSES`, `ACTIONABLE_STATUSES` (per `PlanRuneType`) and `isTerminal` / `isAchieving` / `isActionable` helpers
- [x] `tags/{spec,work,bug,decision,milestone}.ts` import status/severity/complexity/priority value lists from `enums.ts` (no local re-declaration)
- [x] `mcp-bindings.ts` status and severity enums derive from `enums.ts`
- [x] `next.ts`, `status.ts`, `validate.ts` use the `enums.ts` terminal/actionable helpers instead of local `DONE_STATUSES` / `ACTIVE_STATUSES` / `READY_STATUSES` sets
- [x] `render-pipeline.ts` / `index.ts` terminal/resolved sets derive from `TERMINAL_STATUSES`; ordering tables (which carry sort intent) remain but are covered by an exhaustiveness test
- [x] A test asserts every canonical status value has a `config.ts` `sentimentMap` entry and a status-ordering entry (drift fails CI)
- [x] No behavioural change to `plan next` / `status` / `validate` output on the current corpus (pure refactor, verified against snapshots)

## Approach
`enums.ts` grows the derived sets alongside the existing `VALID_*` records. Membership-only consumers import; structure-carrying consumers (sentiment maps, orderings) keep their tables but gain an exhaustiveness test keyed off the canonical list. Fold in the {% ref "WORK-491" /%} fixes structurally if that item hasn't landed yet.

## Dependencies
- {% ref "WORK-491" /%} — the drift fixes become structural once this lands (either order works; if 491 ships first, this generalises it)

## References
- {% ref "SPEC-117" /%} — spec (Vocabulary module, Consumers stop re-declaring vocab)

## Resolution

Completed: 2026-07-09

Branch: `claude/milestone-v0-28-0-llvtfa`
PR: refrakt-md/refrakt#565

### What was done
- `enums.ts` is now canonical: added `TERMINAL_STATUSES`/`ACHIEVING_STATUSES`/`ACTIONABLE_STATUSES`, `isTerminal`/`isAchieving`/`isActionable`, `DONE_STATUS_SET`, `TERMINAL_STATUS_UNION`, and shared `WORK_STATUS_DISPLAY_ORDER`/`BUG_STATUS_DISPLAY_ORDER`.
- Rune schemas, `mcp-bindings.ts`, `next`/`status`/`validate`, `render-pipeline.ts` and `index.ts` orderings all import from `enums.ts`.
- `test/vocabulary.test.ts` asserts every canonical status has a sentiment-map + ordering entry.

### Notes
- Verified byte-identical `plan next`/`status`/`validate` output on the corpus. `DONE_STATUS_SET` is scoped to work+bug (`{done,fixed}`) to preserve the exact dependency-satisfaction semantics; a full achieving-union would have wrongly treated `accepted` specs as satisfied deps.

{% /work %}
