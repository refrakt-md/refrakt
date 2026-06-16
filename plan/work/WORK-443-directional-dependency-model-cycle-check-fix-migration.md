{% work id="WORK-443" status="ready" priority="medium" complexity="moderate" source="SPEC-114" tags="plan,dependencies,validation,scanner" %}

# Directional dependency model + cycle-check fix + migration

Implement {% ref "SPEC-114" /%}: give plan work/bug dependencies a direction so the validator's
cycle detection stops firing on prose cross-references. Today `checkCircularDeps` builds its graph
from every `{% ref %}` in an entity (`e.refs`) with no direction, producing 88 false-positive
`circular-dependency` errors across ~35 mostly-`done` items.

## Acceptance Criteria
- [ ] `KNOWN_SECTIONS` (work + bug) defines directed `Blocked by` and `Blocks` sections with aliases; `Dependencies` retained as a deprecated alias of `Blocked by`
- [ ] `PlanEntity` carries typed, directed dependency edges derived only from those sections (not the raw ref set)
- [ ] `checkCircularDeps` builds its adjacency map from the typed edges; prose / `References` / source-line refs no longer create edges
- [ ] `plan validate` on the current corpus reports 0 `circular-dependency` errors
- [ ] A test fixture with a genuine directed deadlock is still reported as an error
- [ ] `refrakt plan migrate dependencies` renames legacy `## Dependencies` sections (dry-run default, `--apply`/`--git`) and reports — without auto-flipping — reverse-direction entries for manual review
- [ ] `pipeline.ts` dependency rollups consume the same typed edges (single source of truth)
- [ ] Docs updated: `CLAUDE.md` Plan section + plan-plugin authoring docs describe the directed model and migration command

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

{% /work %}
