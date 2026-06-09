{% work id="WORK-342" status="in-progress" priority="medium" complexity="moderate" source="SPEC-021" milestone="v0.19.0" tags="plan,aggregation,composability,runes" %}

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
- [ ] `backlog`'s default item body is a `card` with a `bar` header (identifier left, status badge right); body retains title/description.
- [ ] `backlog` accepts a `layout` attribute (`cards` default, `table`, `list`) forwarded to `collection`.
- [ ] A shared **identifier** projection (`id || name`) is introduced so milestones slot into the universal shape; reusable by `collection`/`aggregate`.
- [ ] When the set is mixed, a type chip (cards) / Type column (table) appears; when single-type, it is omitted.
- [ ] Single-type or `group="type"` queries may project type-specific fields; mixed sets fall back to the universal three.
- [ ] Default scope remains `work,bug`; widening to other types renders via universal projection.
- [ ] `decision-log` / `plan-activity` adopt the `bar`-header card where it improves them; bespoke CSS that the composition replaces is dropped.
- [ ] Tests cover: default actionable cards, `layout="table"`, a mixed-type set (universal projection + type indicator), a single-type set (no type indicator), and an author override.

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

{% /work %}
