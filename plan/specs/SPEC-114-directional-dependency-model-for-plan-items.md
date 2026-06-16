{% spec id="SPEC-114" status="draft" tags="plan,dependencies,validation,scanner,dx,model" %}

# Directional dependency model for plan items

Plan work/bug items express dependencies as free prose refs inside an undirected
`## Dependencies` section. The validator's cycle check treats **every** `{% ref %}` to a
work/bug item — anywhere in the entity, including the `References` section, the `> Ref:` source
line, and the narrative body — as a dependency edge, and the edges carry no direction. The
result is **88 false-positive `circular-dependency` errors** across ~35 mostly-`done` items:
any two items that mention each other form a "cycle," even when the real relationship is a
clean one-way "A is blocked by B." This spec introduces a **directed** dependency model so cycle
detection becomes meaningful and the false positives disappear without rewriting history.

## Problem evidence

Measured against the current code:

- **`checkCircularDeps` uses all refs.** `packages/.../plugins/plan/src/commands/validate.ts`
  builds its adjacency map from `e.refs.filter(r => workBugIds.has(r))` — the entity's *entire*
  ref set, not just dependency refs. A prose mention like "this unblocks {% ref "WORK-049" /%}"
  becomes a graph edge.
- **The scanner already scopes refs but the validator ignores it.** `scanner-core.ts` produces
  `scopedRefs: { id, section }[]` and `KNOWN_SECTIONS.work` already maps
  `'Dependencies': ['deps', 'depends on', 'blocked by', 'requires']`. The data to do better
  exists; `checkCircularDeps` just doesn't consume it. (`pipeline.ts` already reads
  `entity.scopedRefs` for dependency rollups — the validator is the straggler.)
- **No direction is captured.** `Dependencies` collapses "blocked by" and "requires" into one
  undirected bucket. Worse, in practice the section is used in *both* senses: WORK-007's
  `## Dependencies` lists WORK-010 to say "the glossary rune *collects from me*" — an
  **incoming** relationship — while most items use it for "I **depend on** X" (outgoing). An
  undirected edge can't tell these apart, so the graph has spurious 2-cycles.
- **The cycles are historical.** Nearly every item in a reported cycle is `status="done"`. These
  are not live scheduling deadlocks; they are an artifact of the model, surfaced as `error`.

## Design

### 1. Directed dependency sections

Replace the single undirected `Dependencies` section with two **canonical, directed** sections
for `work` and `bug` types, extending the existing `KNOWN_SECTIONS` alias machinery:

| Canonical section | Aliases | Edge semantics |
|-------------------|---------|----------------|
| **`Blocked by`** | `depends on`, `requires`, `deps`, `needs` | This item → each ref (this item depends on / waits for the ref) |
| **`Blocks`** | `unblocks`, `enables`, `required by` | Each ref → this item (the ref depends on this item) |

Both normalise into a single directed edge set `A → B` meaning **"A is blocked by B"** (A cannot
proceed until B is done). `Blocks` entries are simply recorded with the direction reversed at
scan time, so the graph has one canonical orientation regardless of which side authored the link.

`Dependencies` is retained as a **deprecated alias of `Blocked by`** for backwards compatibility
(see Migration), so legacy content keeps parsing; new content uses the directed names.

### 2. Scanner: emit typed dependency edges

`extractScopedRefs` already tags each ref with its canonical section. Add a derived
`dependencies: { id: string; direction: 'blocked-by' | 'blocks' }[]` (or equivalent) to
`PlanEntity`, computed from `scopedRefs` whose section resolves to `Blocked by`/`Blocks`. Refs in
`References`, the source line, and the narrative body are **excluded** — they are not dependency
edges. This is the single source of truth the validator and `pipeline.ts` dependency rollups both
consume.

### 3. Validator: cycle detection on the directed graph

`checkCircularDeps` builds its adjacency map from the typed dependency edges (normalised to the
`A → B = "A blocked by B"` orientation), **not** from `e.refs`. A cycle in this graph is now a
genuine logical contradiction (a real dependency deadlock) and is correctly reported as an
`error`. The 88 prose-induced false positives vanish because prose refs are no longer edges and
the two-directional ambiguity is resolved.

### 4. Migration

A `refrakt plan migrate dependencies` subcommand (sibling of the existing
`migrate filenames`), dry-run by default with `--apply`/`--git`:

- Rename `## Dependencies` headings to `## Blocked by` (the dominant reading).
- **Flag, don't auto-flip, ambiguous entries.** Entries whose prose indicates the *reverse*
  direction ("collects from me", "unblocked by this", "required by") are reported for manual
  review rather than silently rewritten — direction inference from prose is not reliable enough
  to automate. The migration report lists each for a human to move to `## Blocks` or reword.

### 5. Docs

Update `CLAUDE.md` (the Plan section's rune-syntax + workflow notes) and the plan-plugin authoring
docs to describe `Blocked by` / `Blocks`, the directed semantics, and the migration command.

## Acceptance criteria

- `KNOWN_SECTIONS.work`/`.bug` define directed `Blocked by` and `Blocks` sections with aliases;
  `Dependencies` is retained as a deprecated alias of `Blocked by`.
- `PlanEntity` carries typed, directed dependency edges derived only from those sections.
- `checkCircularDeps` builds its graph from the typed edges, not `e.refs`; prose/`References`/
  source-line refs no longer create edges.
- Running `plan validate` on the current corpus reports **0** `circular-dependency` errors;
  any genuine deadlock (constructed in a test fixture) is still caught.
- `refrakt plan migrate dependencies` renames legacy sections, runs dry by default, and reports
  (does not auto-flip) reverse-direction entries for manual review.
- `pipeline.ts` dependency rollups consume the same typed edges (no second source of truth).
- Docs (`CLAUDE.md` + plan-plugin authoring) describe the directed model and migration.

## Non-goals

- No new top-level rune attribute for dependencies — they remain section-authored.
- No scheduling/ordering engine or "what's next" changes beyond the rollup already in
  `pipeline.ts` consuming the typed edges.
- The migration does **not** attempt automatic direction inference from prose.

## Summary

The mechanism is small and mostly already present: the scanner scopes refs by section today;
this spec adds two directed section names, derives typed edges from them, points the cycle check
at those edges instead of the raw ref set, and ships a guarded migration for the ~274 existing
`## Dependencies` sections. The payoff is a dependency graph that means what it says — and a
plan that validates clean.

{% /spec %}
