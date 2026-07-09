{% work id="WORK-443" status="done" priority="medium" complexity="moderate" source="SPEC-114" tags="plan,dependencies,validation,scanner" milestone="v0.28.0" pr="refrakt-md/refrakt#565" %}

# Directional dependency model + cycle-check fix + migration

Implement {% ref "SPEC-114" /%}: give plan work/bug dependencies a direction so the validator's
cycle detection stops firing on prose cross-references. Today `checkCircularDeps` builds its graph
from every `{% ref %}` in an entity (`e.refs`) with no direction, producing 88 false-positive
`circular-dependency` errors across ~35 mostly-`done` items.

## Acceptance Criteria
- [x] `KNOWN_SECTIONS` (work + bug) defines directed `Blocked by` and `Blocks` sections with aliases; `Dependencies` retained as a deprecated alias of `Blocked by`
- [x] `PlanEntity` carries typed, directed dependency edges derived only from those sections (not the raw ref set)
- [x] `checkCircularDeps` builds its adjacency map from the typed edges; prose / `References` / source-line refs no longer create edges
- [x] `plan validate` on the current corpus reports 0 `circular-dependency` errors
- [x] A test fixture with a genuine directed deadlock is still reported as an error
- [x] `refrakt plan migrate dependencies` renames legacy `## Dependencies` sections (dry-run default, `--apply`/`--git`) and reports — without auto-flipping — reverse-direction entries for manual review
- [x] `pipeline.ts` dependency rollups consume the same typed edges (single source of truth)
- [x] Docs updated: `CLAUDE.md` Plan section + plan-plugin authoring docs describe the directed model and migration command

## Approach
The scanner already produces `scopedRefs: { id, section }[]` and `KNOWN_SECTIONS` already maps a
`Dependencies` section with a `blocked by` alias — the plumbing is mostly present. The work:

1. **scanner-core.ts** — add `Blocked by` / `Blocks` canonical sections + aliases; derive a typed
   `dependencies` array (normalised to `A → B = "A blocked by B"`) on `PlanEntity` from
   `scopedRefs`, reversing `Blocks` entries.
2. **validate.ts** — repoint `checkCircularDeps` from `e.refs` to the typed edges.
3. **pipeline.ts** — switch the existing `scopedRefs` dependency rollup to the typed edges.
4. **migrate** — add a `dependencies` subcommand alongside `migrate filenames`.
5. **docs** — `CLAUDE.md` + authoring docs.

## References
- {% ref "SPEC-114" /%} — the spec
- {% ref "WORK-132" /%} — earlier work that added the `## Dependencies` sections this supersedes

## Resolution

Completed: 2026-07-09

Branch: `claude/milestone-v0-28-0-llvtfa`
PR: refrakt-md/refrakt#565

### What was done
- scanner-core: directed `Blocked by` / `Blocks` sections (+ aliases); `Dependencies` retained as deprecated alias. Typed `dependencies` edges on `PlanEntity`; `buildBlockedByAdjacency` normaliser.
- validate `checkCircularDeps`, `next`, render-pipeline, and pipeline rollups all consume the typed edges. Corpus: 88 → 0 circular errors.
- `refrakt plan migrate dependencies` (CLI + MCP) renames legacy headings and flags reverse entries for manual review.
- Corrected 3 genuinely reverse-modelled items (WORK-007/185/298) → `## Blocks`. Versioned the scan cache.

### Notes
- Docs in CLAUDE.md + plan workflow. Did not mass-run the migration on the 324 legacy `## Dependencies` headings — the alias keeps them parsing and a bulk rename would be noise; the 3 that formed real cycles were fixed by hand.

{% /work %}
