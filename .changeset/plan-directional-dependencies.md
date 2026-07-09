---
"@refrakt-md/plan": minor
---

Give plan dependencies a direction so cycle detection means what it says (SPEC-114).

- **Directed sections** — `work` and `bug` gain canonical `## Blocked by` (this item waits for the ref) and `## Blocks` (the ref waits for this item) sections, each with aliases. `## Dependencies` is retained as a deprecated alias of `Blocked by`, so legacy content keeps parsing.
- **Typed edges** — `PlanEntity` carries a directed `dependencies` array derived *only* from those sections. Prose `{% ref %}` mentions, `## References`, and the source line are no longer dependency edges.
- **Meaningful cycle detection** — `checkCircularDeps` builds its graph from the typed edges (normalised to "A is blocked by B"), not the raw ref set. This clears the 88 false-positive `circular-dependency` errors that any two items mentioning each other used to produce, while a genuine directed deadlock is still caught. `plan next` and the pipeline dependency rollups consume the same typed edges — one source of truth.
- **`refrakt plan migrate dependencies`** — renames legacy `## Dependencies` headings to `## Blocked by` (dry-run by default; `--apply`/`--git`) and flags — without auto-flipping — entries whose prose reads like the reverse direction, for manual review.
- **Docs** — CLAUDE.md and the plan workflow docs describe the directed model, the section aliases, and the migration.

The scan cache is versioned so upgrading discards a stale cache whose entities predate the typed `dependencies` field.
