---
"@refrakt-md/plan": minor
---

Consolidate the plan status vocabulary and add terminal work states (SPEC-117).

`plugins/plan/src/commands/enums.ts` is now the single source of truth for status/severity/priority/complexity vocabularies. Consumers (rune schemas, MCP input schemas, `next`/`status`/`validate`, the renderer, and `theme.orderings`) import from it instead of re-declaring value lists, and an exhaustiveness test fails CI if a canonical status ever lacks a sentiment-map or ordering entry.

- **New terminal work states** — `cancelled` (deliberately dropped) and `superseded` (replaced, paired with a new `supersedes="WORK-xxx"` attribute). Both are terminal but non-achieving: excluded from `plan next`, milestone progress numerators, and `plan-progress` achieved counts. `superseded` produces a `supersedes` / `superseded-by` relationship edge.
- **Derived lifecycle helpers** — `TERMINAL_STATUSES`, `ACHIEVING_STATUSES`, `ACTIONABLE_STATUSES` and `isTerminal` / `isAchieving` / `isActionable`, so every consumer asks the same lifecycle question the same way.
- **Validation** — `plan validate` warns on a `superseded` work item without `supersedes` (or with an unresolvable one), and no longer warns about a `## Resolution` on a `cancelled` / `superseded` item (terminal items may record why they were retired).
- **Drift fixes** — the MCP `plan.update` tool now accepts `pending` (work) and `cosmetic` (bug severity) and rejects `trivial`, because its enums derive from `enums.ts` rather than a hand-maintained copy that had drifted (a regression of the WORK-127 / SPEC-037 fix).
