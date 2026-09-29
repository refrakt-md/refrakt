{% spec id="SPEC-152" status="draft" tags="runes, composition, plan, plugins, feasibility, dx" %}

# Plan plugin composition audit

## Summary

Sixth plugin audited against {% ref "SPEC-145" /%}, and it produces an outcome none of the
previous five did. The plan plugin **stays** — its pipeline is the one
{% ref "SPEC-144" /%} D5 excludes permanently — and yet almost every rune in it is
composable, four of them are already compositions in all but name, and five more repeat
one layout verbatim.

So the result is neither retire nor stay-as-is:

> **Deduplication inside a plugin that stays.**

That is the most broadly applicable finding of the series, because `design`
({% ref "SPEC-150" /%}) and `marketing` ({% ref "SPEC-151" /%}) also stay, and both have
internal duplication composition would collapse without touching what keeps them alive.

## The views are already compositions, by their own documentation

Four of the five view runes describe themselves as sugar that lowers to a primitive:

| Rune | Its own doc comment |
|---|---|
| `backlog` | *"thin sugar for a `collection` query over plan work + bug items. **Lowers to a `collection`-shaped renderable** so the shared `resolveCollections` resolver handles selection, sorting, and per-item rendering."* |
| `decision-log` | *"thin sugar for a `collection` query over plan decisions, sorted newest-first. Lowers to a `collection`-shaped renderable…"* |
| `plan-activity` | *"thin sugar for a `collection` query over all plan entity types, sorted by recent modification. Lowers to a `collection`-shaped renderable…"* |
| `plan-progress` | *"thin sugar that **composes one `aggregate` per entity type**, so each type gets its OWN progress bar + status badges… The counting still lives entirely in [the resolver]."* |

`plan-history` is the exception: it reads git data and is not sugar over anything.

**This is the strongest existing evidence that composition is a wanted capability rather
than a speculative one.** It has been hand-rolled four times, in one plugin, by the same
author, with the intent stated in the comments. And `plan-progress` is a *repeated*
composition — one `aggregate` per type — which is precisely SPEC-145's `each` slot pattern
written imperatively.

## The document shape is written out five times, verbatim

`Spec`, `Work`, `Bug` and `Decision` share this **identically**:

```ts
blocks: {
  eyebrow:  { fields: ['id', { field: 'status', align: 'end' }], layout: 'bar' },
  metadata: { fields: [ …the only thing that varies… ],          layout: 'definition-list' },
  tags:     { fields: ['tags'],                                   layout: 'bar' },
},
layout: { root: ['eyebrow', 'title', 'blurb', 'metadata', 'tags', 'body'] },
provides: ['prose'],
editHints: { body: 'none' },
```

`Milestone` is the same minus `tags`, with `name` leading the eyebrow instead of `id` —
which tracks the filename convention, since milestones are named rather than ID'd
(`v1.0.0.md`).

**The only variation across five runes is which fields land in the metadata
definition-list:**

| Rune | Metadata fields |
|---|---|
| `spec` | `version`, `supersedes`, `released-in`, `created`, `modified` |
| `work` | `priority`, `complexity`, `assignee`, `milestone`, `source`, … |
| `bug` | `severity`, `assignee`, `milestone`, `source`, `pr`, `created`, `modified` |
| `decision` | `date`, `supersedes`, `source`, `created`, `modified` |
| `milestone` | `target`, `created`, `modified` |

That is exactly the domain difference and nothing else. `layout.root` is byte-identical
four ways; the `eyebrow` and `tags` blocks are byte-identical four ways.

## The primitive already exists — `section` plus `metablock`

`section` is *"a generic page section: an eyebrow/headline/blurb header above arbitrary
body content"* — four of the six slots. The other two are `blocks`, and
{% ref "SPEC-145" /%} D7 established that a composed rune places a declared block with
`{% metablock %}`:

```md
{% section %}
{% metablock name="eyebrow" /%}
{% slot name="title" /%}
{% slot name="blurb" /%}

{% metablock name="metadata" /%}
{% metablock name="tags" /%}

{% slot name="body" /%}
{% /section %}
```

**No new primitive is needed**, and this is {% ref "SPEC-145" /%} D18's `card` finding in
a second shape: the primitive exists, the layout is duplicated N times, composition
consolidates it. Two independent instances make it a pattern rather than a coincidence —
`card` for media-split surfaces, `section` for document surfaces.

## The runes themselves are the cleanest set audited

| Check | Result |
|---|---|
| Custom content models | **none** |
| `postTransform` | **none** |
| Schema tables | **none** — so {% ref "SPEC-148" /%}'s five-path method does not apply, as in {% ref "SPEC-150" /%} |
| `checklist` | already declarative, `Work` and `Bug` |
| Behaviours / component overrides | none |
| `requiresParent` | none |

Nothing imperative remains in the runes but their transforms, which is what composition
replaces. On the rune axis alone, plan is more composable than any plugin audited.

## And the plugin stays anyway

{% ref "SPEC-144" /%} D5 excludes plan's pipeline permanently, and not as a phasing
decision: 1,120 lines with a `configure` hook, module-level state, an unconditional
filesystem scan outside any site's content tree, dependency edges parsed from prose H2
sections, and `Blocks` edges belonging to a file that does not own the entity. No
declaration expresses any of that, and D5 records that forcing it would either grow the
vocabulary into a language or produce a declaration that lies.

So the plugin's reason to exist is untouched by whether its runes are compositions. Which
is the point.

## The `metaFields` identity question, now with teeth

{% ref "SPEC-143" /%} carries this as an open question: `metaFields` is **not** in
`IDENTITY_FIELDS`, so a theme may override a field's `metaType` — and `metaType` both
selects chip-versus-bare rendering *and* is described as the field's "domain semantics".

On a first-party rune that is a reviewed override. Here it is the whole rune: **a composed
plan entity's entire differentiation is its `metaFields` and `blocks`.** A theme retyping
`status` from `status` to `category` would not be restyling a plan document — it would be
changing what a work item's status *means*, on five runes whose only distinguishing
feature is that manifest.

This is the first audit where that question decides something, and it should be settled
before plan's runes are composed rather than after.

## Decisions

### D1 — the outcome is deduplication, not retirement

The plan plugin stays (D5 of {% ref "SPEC-144" /%}). Composing its runes collapses five
identical layouts into one shape plus five field lists, and retires four hand-rolled
"lowerings". Neither reduces the plugin's reason to exist.

### D2 — `section` is the document primitive, as `card` is the media primitive

Recorded as a pair with {% ref "SPEC-145" /%} D18. Two independent instances of *the
primitive exists and the layout is duplicated* make it a pattern worth naming in the
authoring guide: **before writing a rune's `layout`, check whether a primitive already
emits that shape.**

### D3 — the four "thin sugar" runes are the migration's first candidates

They already state their intent, already delegate their work to a resolver, and already
have fixtures. Converting them is the lowest-risk composition work available anywhere in
the repo, and `plan-progress` additionally exercises the `each` pattern.

### D4 — `metaFields`' identity status is a prerequisite here, not an open question

SPEC-143 may carry it as open in general; for this plugin it blocks. A composed plan rune
whose distinguishing manifest a theme can rewrite is not the same rune.

### D5 — `plan-history` is out of scope

It reads git data rather than page content. Not a misfiled capability in the sense
{% ref "SPEC-147" /%} and {% ref "SPEC-148" /%} found — it is domain-appropriate, it just
is not sugar over a primitive and has no composition path.

## Implementation notes, deliberately not yet work items

1. **Settle `metaFields`' identity status** (D4). Prerequisite.
2. **Compose the four sugar views** — `backlog`, `decision-log`, `plan-activity`,
   `plan-progress`. Lowest-risk composition work in the repo, and the only set whose
   authors already documented the intent.
3. **Compose the five entity runes** over `section` + `metablock`, once
   {% ref "SPEC-145" /%} D7's placement tag exists. The shared shape becomes one template;
   the five metadata field lists stay per-rune.
4. **Leave the pipeline and `plan-history` alone.**

## Non-goals

- Retiring `plugins/plan/` — it stays, permanently, on its pipeline (D1)
- Declaring any part of plan's pipeline ({% ref "SPEC-144" /%} D5)
- Composing `plan-history` (D5)
- Changing the plan authoring CLI, plan file format, or `{% ref %}` resolution
- Auditing `learning`, `media` and `docs`

## Acceptance Criteria

- [ ] `metaFields`' identity status is decided and recorded before any plan rune is composed (D4)
- [ ] The four sugar views exist as compositions, emitting the same `collection-*` / `aggregate` metas their hand-rolled forms emit, asserted against the resolver's output rather than the markup
- [ ] `plan-progress` composed exercises the `each` pattern, producing one aggregate per entity type with per-type ratios preserved
- [ ] The five entity runes share one composition template, with only their metadata field lists differing, and `plan validate` output is unchanged across the plan corpus
- [ ] `milestone`'s eyebrow leads with `name` rather than `id`, preserved in the shared template rather than special-cased in code
- [ ] `Work` and `Bug` keep their `checklist` detection, verified on an acceptance-criteria list with all four markers
- [ ] `plugins/plan/src/pipeline.ts` is untouched, and the plan corpus produces an identical registry before and after
- [ ] The authoring guide states D2's rule — check for a primitive emitting the shape before writing a `layout`

## References

- {% ref "SPEC-145" /%} — composed runes; D7's `metablock` placement and D18's `card` counterpart to this spec's `section` finding
- {% ref "SPEC-144" /%} — entity registration; D5 permanently excludes this plugin's pipeline
- {% ref "SPEC-143" /%} — the `metaFields` identity question this audit gives teeth
- {% ref "SPEC-150" /%} — the design audit; the other plugin that stays, and the schema-table precondition this audit also meets
- {% ref "SPEC-151" /%} — the marketing audit; the third plugin that stays, with its own internal duplication
- {% ref "SPEC-072" /%} — the `collection` / `aggregate` resolvers the four sugar views already lower to

{% /spec %}
