{% work id="WORK-342" status="done" priority="medium" complexity="moderate" source="SPEC-021" milestone="v0.19.0" tags="plan,aggregation,composability,runes" %}

# Modernize plan card-sugars to compose with the bar rune

The plan sugars `backlog`, `decision-log`, and `plan-activity` lower to
`collection` with bespoke card/table bodies that predate the `bar` rune. Rebuild
their default bodies to compose from `bar` and give `backlog` a `layout`
passthrough — while keeping the rollup faithful when the query mixes entity
types.

## Design

**Card item = card with a `bar` header.** Each item renders as a `card` whose
header is a `bar`: the **identifier** on the left, the **status** badge on the
right. Body keeps title/description. The header is universal across every plan
type by construction.

**`layout` passthrough.** `backlog` accepts a `layout` attribute forwarded to the
underlying `collection` (`cards` default, plus `table`/`list`). Table columns for
a mixed set are **Identifier · Type · Status** (+ Title).

**Heterogeneity rule — uniform layouts project only universal fields.** A mixed
set (work + bug + spec, maybe milestone) cannot show type-specific fields
(`priority`, `severity`) uniformly, so:

- Universal fields = **identifier** (`id`, or `name` for milestone — normalized
  to `id || name`), **status**, and **type**.
- A **type chip** (cards) / **Type column** (table) appears **only when the set
  is mixed** (>1 type) — no noise on a single-type backlog.
- Richer, type-specific fields are shown only when the set is homogeneous:
  either **scoped to one type** (`show="work"`) or **grouped by type**
  (`group="type"`, where each group is homogeneous). Ragged per-row columns are
  explicitly out of scope.

**Default scope stays actionable.** `backlog` defaults to `work,bug`. Authors may
widen to `spec`/`milestone`, at which point the universal projection applies
automatically. Arbitrary heterogeneous queries remain the job of raw
`collection`.

## Acceptance Criteria
- [x] `backlog`'s default item body is a `card` with a `bar` header (identifier left, status badge right); body retains title/description.
- [x] `backlog` accepts a `layout` attribute (`cards` default, `table`, `list`) forwarded to `collection`.
- [x] A shared **identifier** projection (`id || name`) is introduced so milestones slot into the universal shape; reusable by `collection`/`aggregate`.
- [x] When the set is mixed, a type chip (cards) / Type column (table) appears; when single-type, it is omitted.
- [x] Single-type or `group="type"` queries may project type-specific fields; mixed sets fall back to the universal three.
- [x] Default scope remains `work,bug`; widening to other types renders via universal projection.
- [x] `decision-log` / `plan-activity` adopt the `bar`-header card where it improves them; bespoke CSS that the composition replaces is dropped.
- [x] Tests cover: default actionable cards, `layout="table"`, a mixed-type set (universal projection + type indicator), a single-type set (no type indicator), and an author override.

## Approach
Keep `collection` as the query engine; only the default body source changes. The
bar header is authored markdoc placed in the card's header zone — a concrete
instance of the SPEC-084 composability story (a `bar` composed inside a `card`).
`bar` needs a spread/space-between alignment for the id↔badge split; add it if
the bar rune doesn't already express it. The identifier helper belongs with the
collection/aggregate field machinery so all rollups share it.

## References
- `plugins/plan/src/tags/backlog.ts`, `decision-log.ts`, `plan-activity.ts`
- `bar` rune + `packages/lumina/styles/runes/bar.css`; `card` header zone
- `packages/runes/src/collection-resolve.ts` (layout + field projection)
- Relates to {% ref "WORK-296" /%}, {% ref "WORK-343" /%}; composes per {% ref "SPEC-084" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/v0.19.0-rollups-2`

### What was done
- `packages/runes/src/collection-helpers.ts`: `entityIdentifier(e)` = `id || name`; `projectItem(e, opts)` gains `identifier`, `sentiment` (per-entity status sentiment, WORK-357), and `mixed`.
- `packages/runes/src/collection-resolve.ts`: compute `mixed` (set spans >1 type AND not grouped by type) and thread `{ mixed, sentiments }` into `renderBody`/`renderHeadingTable` → `projectItem`.
- `plugins/plan/src/tags/backlog.ts`: composed default bodies — a `card` whose top strip is a `bar` (identifier + a `{% if $item.mixed %}` type chip, left; sentiment-coloured status `badge`, right) for cards/list, and a heading-column body (Identifier · Type · Status · Title) for table; new `layout` attribute (`cards` default) forwarded to collection. A single-type backlog also surfaces its key field (work→priority, bug→severity) gated on the value.
- `plugins/plan/test/backlog.test.ts`: 8 tests (lowering of the default/table bodies + layout/show; end-to-end card+bar+coloured-badge, mixed→type-chip vs single→none, table columns + milestone `name` identifier).
- `site/content/runes/plan/backlog.md`: rewrote the stale "Output structure" + added `layout` + a table example.

### Notes
- Verified in the site build: 43 backlog cards each render a bar header + a sentiment-coloured status badge; a single-type bug backlog surfaces severity; the table example renders Identifier/Type/Status/Title with a milestone's `name` as its identifier.
- Type-specific richness is keyed off an explicit single-type `show` (the query is known at transform time). A `group="type"` query stays universal (the group heading conveys the type); per-group type-specific fields would need body conditionals — a possible follow-up.
- `decision-log` / `plan-activity` were evaluated and **deliberately left as tables** (they read well that way) — no bar-header card, no CSS to drop.

{% /work %}
