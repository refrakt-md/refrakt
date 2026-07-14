{% spec id="SPEC-117" status="accepted" tags="plan, status, vocabulary, ai-workflow" %}

# Plan status vocabulary consolidation and terminal work states

Give work items an honest way to be retired, and make the status vocabulary a real single source of truth so it stops silently drifting apart across the CLI, MCP server, schemas, and renderer.

## Problem

Two related gaps, one structural and one a missing feature.

**Work items have no honest terminal state for "not going to happen".** Work statuses are `draft | ready | in-progress | review | done | blocked | pending`. When a work item is abandoned or replaced, the only options are marking it `done` — which lies to every rollup, the milestone progress bar, and {% ref "SPEC-049" /%}'s traceability chain — or deleting the file, which loses the reasoning trail. `spec` and `decision` runes already carry `superseded`; `bug` has `wontfix` and `duplicate`; only `work` (the most numerous entity type) has nowhere to record a deliberate stop.

**The "single source of truth" for status vocab is not single.** `plugins/plan/src/commands/enums.ts` opens with a comment asserting it is the one place that defines the constrained vocabularies so "the three commands can never drift apart." In practice the value lists are re-declared across at least eight more files:

- `tags/{spec,work,bug,decision,milestone}.ts` — each schema hard-codes its own `statusValues` array
- `config.ts` — per-entity `sentimentMap`s re-list status and severity keys
- `mcp-bindings.ts` — `STATUS_VALUES`, `SEVERITY_VALUES`, `PRIORITY_VALUES` re-declared for the MCP input schemas
- `render-pipeline.ts` — status ordering table, per-type status order, and terminal/resolved sets, all hand-maintained (and duplicated again in `index.ts`)
- `next.ts` / `status.ts` / `validate.ts` — `DONE_STATUSES`, `ACTIVE_STATUSES`, `READY_STATUSES` sets
- `tags/plan-progress.ts` — the achieved-status-per-type map

Adding one status value means editing all of them, and the derived sets (terminal, actionable, done) are maintained by hand with no check that they stay coherent with the canonical list.

**This has already caused live bugs — a regression of what {% ref "SPEC-037" /%} / WORK-127 fixed once.** The MCP server (added after that fix, in {% ref "SPEC-043" /%}) hard-coded its own copies of the vocab and they have since diverged from `enums.ts`:

| Location | Drift | Effect |
|---|---|---|
| `mcp-bindings.ts` `STATUS_VALUES` | omits `pending` | `plan.update` MCP tool — which CLAUDE.md instructs agents to **prefer over the CLI** — rejects the valid `pending` status |
| `mcp-bindings.ts` `SEVERITY_VALUES` | has `trivial`, canonical is `cosmetic` | MCP rejects the valid `cosmetic` and accepts `trivial`, which `plan validate` then flags. The tool's own description string one line below correctly says `cosmetic`. |
| `config.ts` bug `sentimentMap` | keys `trivial`, not `cosmetic` | a valid `cosmetic` bug gets no severity sentiment styling |
| `config.ts` work `sentimentMap` | omits `pending` | `pending` work items fall back to default (neutral) styling only |

The canonical spec, {% ref "SPEC-021" /%} (`accepted`), also predates these changes: it lists work statuses without `pending` and its status-badge table predates the {% ref "SPEC-049" /%} lifecycle additions.

-----

## Design Principles

**One canonical list, everything else derives or is checked against it.** Value sets that carry only membership (which statuses exist per type) should be *imported* from `enums.ts`, not re-typed. Sets that carry extra structure — sentiment, sort order, terminal-ness — can't be pure derivations, but they must be keyed off the canonical list and covered by a test that fails the moment a canonical value has no entry. Drift becomes a build failure, not a latent bug.

**Terminal is a property, not a hard-coded list.** Today "is this item finished / resolved / not-actionable" is answered by a different hand-written set in each consumer (`DONE_STATUSES`, `RESOLVED_STATUSES`, the render ordering's terminal tail). Promote these to named, derived helpers on the vocabulary module (`isTerminal`, `isActionable`, `isDone`) so `next`, `status`, `validate`, `plan-progress`, and the renderer all ask the same question the same way.

**Retiring is not completing.** `cancelled` and `superseded` are terminal but must never count as achievement. They are excluded from milestone progress numerators, from `done`-based rollups, and from the actionable pool `plan next` draws from — but they *are* allowed to carry a `## Resolution` explaining the retirement, without the "resolution on non-terminal item" warning firing.

**Mirror existing vocabulary, don't invent parallel words.** `superseded` already means the same thing on `spec` and `decision`; reuse it verbatim on `work` rather than coining a synonym. `cancelled` (British spelling, matching the codebase's `-ised`/`-our` house style seen throughout the plan prose) is the deliberate-stop counterpart.

**Scope stays on `work` + the refactor.** Spec statuses (`implemented`, `shipped`) and ADR `rejected` are already designed in {% ref "SPEC-049" /%}; this spec does not touch them. It adds only the `work` terminal states, plus the consolidation that both specs benefit from.

-----

## Surface

### New `work` statuses

| Status | Meaning | Transition trigger |
|---|---|---|
| `cancelled` | Deliberately not going to be done. The work is no longer wanted. | Manual flip from any non-`done` state. Body/resolution should record why. |
| `superseded` | Replaced by another work item that does the job differently. | Manual flip, paired with a `supersedes` attribute pointing at the replacement. |

Existing work statuses (`draft | ready | in-progress | review | done | blocked | pending`) are unchanged. Both new values are **terminal** and **non-achieving**: they end the item's lifecycle without counting as completed work.

### New `work` attribute

| Attribute | Cardinality | Format | Notes |
|---|---|---|---|
| `supersedes` | single-valued | entity ID (`WORK-xxx`) | Mirrors the existing `supersedes` on `spec` / `decision`. Optional in general; **expected when** `status="superseded"` (validator warns if absent). Produces a `superseded-by` / `supersedes` relationship edge. |

`milestone` is intentionally left alone in this spec — a `cancelled` milestone is plausible but rarer, and folding it in would widen the blast radius of the vocab refactor without a concrete demand. Tracked in Open Questions.

### Vocabulary module (`enums.ts`) becomes canonical

`enums.ts` gains, alongside the existing `VALID_*` records, a set of derived helpers that every consumer imports instead of re-declaring:

- `TERMINAL_STATUSES: Record<PlanRuneType, ReadonlySet<string>>` — e.g. work → `{done, cancelled, superseded}`, bug → `{fixed, wontfix, duplicate}`, spec → `{accepted, implemented, shipped, superseded, deprecated}` (the last three from SPEC-049 once it lands), decision → `{accepted, superseded, deprecated, rejected}`, milestone → `{complete}`
- `ACHIEVING_STATUSES` — the terminal subset that counts as success (work → `{done}`, bug → `{fixed}`, milestone → `{complete}`, …). Drives `plan-progress` numerators and milestone rollups.
- `ACTIONABLE_STATUSES` — what `plan next` draws from (work → `{ready}`, bug → `{confirmed}`)
- helper predicates `isTerminal(type, status)`, `isAchieving(type, status)`, `isActionable(type, status)`

### Consumers stop re-declaring vocab

| File | Change |
|---|---|
| `tags/{spec,work,bug,decision,milestone}.ts` | `statusValues` (and severity/complexity/priority) import from `enums.ts` instead of local arrays |
| `mcp-bindings.ts` | `STATUS_VALUES`, `SEVERITY_VALUES`, `PRIORITY_VALUES` derive from `enums.ts`; the per-type `status` enum for `plan.update` becomes type-aware rather than one flat list |
| `next.ts`, `status.ts`, `validate.ts` | `DONE_STATUSES` / `ACTIVE_STATUSES` / `READY_STATUSES` replaced by the `enums.ts` helpers |
| `render-pipeline.ts`, `index.ts` | terminal/resolved sets derive from `TERMINAL_STATUSES`; the ordering tables stay (they carry sort intent) but are covered by an exhaustiveness test |
| `config.ts`, `tags/plan-progress.ts` | `sentimentMap`s and the achieved-status map stay (they carry sentiment/label intent) but a test asserts every canonical value has an entry |

### Drift-bug fixes (fold in with the refactor)

- `mcp-bindings.ts` accepts `pending` (work) and `cosmetic` (bug severity), rejects `trivial` — automatic once it derives from `enums.ts`
- `config.ts` bug `sentimentMap` keys `cosmetic` not `trivial`; work `sentimentMap` gains `pending`
- new work terminals get sentiment entries: `cancelled` / `superseded` → `caution` or muted (matching the existing muted treatment for `wontfix` / `superseded` / `deprecated` in {% ref "SPEC-021" /%}'s badge table)

### Validation

| Check | Severity |
|---|---|
| `superseded` work item with no `supersedes` attribute | warning |
| `supersedes` pointing at an unknown entity ID | warning (reuses existing ref-resolution check) |
| `## Resolution` present on `cancelled` / `superseded` work | **allowed** (today it warns on any non-`done` item — carve out the terminals) |
| Exhaustiveness: every canonical status has a sentiment-map and ordering entry | test failure (CI) |

### Documentation

- {% ref "SPEC-021" /%} status-badge table and the `work` attribute table updated to include `pending`, `cancelled`, `superseded`, and the `supersedes` attribute
- `plan/CLAUDE.md` and the `plan init` CLAUDE.md template note when to use `cancelled` vs `superseded` vs deleting a file
- site docs page under `site/content/docs/plan/` (or the SPEC-049 lifecycle page, if it lands first) describes the terminal work states

-----

## Migration

No data migration is required — the change is additive (new statuses, new optional attribute) and the refactor is internal. Existing files remain valid.

Optional follow-up: a scan for work items currently marked `done` whose resolution body says "cancelled", "superseded", "won't do", or "obsolete" could surface candidates for re-classification, but this is advisory-only and not part of the core deliverable.

-----

## Acceptance Criteria

- [ ] `work` rune accepts `cancelled` and `superseded` status values (schema, `enums.ts`, and MCP input schema)
- [ ] `work` rune accepts an optional single-valued `supersedes` attribute referencing an entity ID
- [ ] `enums.ts` exposes derived `TERMINAL_STATUSES`, `ACHIEVING_STATUSES`, `ACTIONABLE_STATUSES` and `isTerminal` / `isAchieving` / `isActionable` helpers
- [ ] `tags/*.ts` status/severity/complexity/priority value lists import from `enums.ts` (no local re-declaration)
- [ ] `mcp-bindings.ts` status and severity enums derive from `enums.ts`; `plan.update` accepts `pending` and `cosmetic` and rejects `trivial`
- [ ] `next.ts`, `status.ts`, `validate.ts` use the `enums.ts` terminal/actionable helpers instead of local sets
- [ ] `render-pipeline.ts` / `index.ts` terminal sets derive from `enums.ts`; new terminals sort into the terminal tail of status orderings
- [ ] `config.ts` bug `sentimentMap` keys `cosmetic`; work `sentimentMap` includes `pending`, `cancelled`, `superseded`
- [ ] `cancelled` / `superseded` work items are excluded from `plan next`, from milestone progress numerators, and from `plan-progress` achieved counts
- [ ] `plan validate` warns on `superseded` work without `supersedes`, and does not warn about a `## Resolution` on a `cancelled` / `superseded` item
- [ ] A test asserts every canonical status value has a `sentimentMap` entry and a status-ordering entry (drift becomes a build failure)
- [ ] {% ref "SPEC-021" /%} work attribute + status-badge tables updated; `plan/CLAUDE.md` and the `plan init` template document the new terminals

-----

## Open Questions

**`cancelled` on other entity types.** A `cancelled` milestone or a `cancelled`/`withdrawn` spec are conceivable. Deferred: milestone abandonment is rare, and specs already have `deprecated`/`superseded`. Revisit if demand appears — the vocab module makes adding one per-type value cheap once consolidation lands.

**`superseded` vs `duplicate` for work.** A work item that turns out to duplicate another is arguably `superseded` (pointing at the survivor). Not adding a separate `duplicate` for work in v1 — `superseded` + `supersedes` covers it. Bug keeps its own `duplicate` since bug triage leans on it heavily.

**Ordering of the refactor vs SPEC-049.** {% ref "SPEC-049" /%} also adds statuses (`implemented`, `shipped`, `rejected`). Whichever lands first should add its values to the canonical `enums.ts` shape; the second inherits the consolidation for free. If SPEC-049 ships first without the refactor, it will re-touch the same eight files — a mild argument for sequencing this spec's consolidation first, then SPEC-049 on top.

**Type-aware MCP status enum.** Making `plan.update`'s `status` enum vary by `type` is more correct but complicates the JSON Schema (a single flat enum is simpler for clients). Recommend a union of all valid statuses at the schema level plus server-side per-type validation via the existing `assertValidAttrs`, rather than a conditional schema.

{% /spec %}
