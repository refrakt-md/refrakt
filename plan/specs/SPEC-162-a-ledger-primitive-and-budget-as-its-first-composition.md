{% spec id="SPEC-162" status="draft" tags="runes, composition, primitives, budget, core, metadata" %}

# A ledger primitive, and budget as its first composition

`budget` is a core rune with a 477-line transform (`packages/runes/src/tags/budget.ts`). It
cannot be a composition today, because almost everything it does is text parsing and arithmetic.
None of that work is about travel: it reads rows of labelled amounts and totals them. This spec
moves that work into a core primitive, `ledger`, and makes `budget` a thin composition over
`section` and `ledger`.

It also settles one of the three native runes {% ref "ADR-042" /%} left open. Budget's
duration/currency bar is metadata declared in a native rune's config. As a composition, that
metadata belongs to its definition.

## What budget does today

| Step | How | Composable today? |
|---|---|---|
| Header (eyebrow, title, blurb) | the first heading and its paragraphs | yes, `section`'s header ({% ref "SPEC-160" /%}) |
| Categories | each `##` becomes a `budget-category` (`convertBudgetChildren`, via `headingsToList`) | yes, a `sections` content model |
| "Estimate" categories | heading text ending `(estimate)` / `(est.)`, or `~Label~`, or `~~Label~~` (`parseEstimate`) | no: parses heading text |
| Line items | `- Hotel in Shinjuku: ¥15000`, split by `DESCRIPTION_AMOUNT_PATTERN` | no: regex on item text |
| Amounts | currency symbols stripped; `100–200` becomes **150**, the midpoint (`parseAmount`) | no |
| Subtotals, grand total | sums over line items and categories | no |
| Per day | `duration="5 days"` parsed to days (days, weeks ×7, months ×30), total ÷ days | no |
| Currency formatting | a symbol table, or `Intl.NumberFormat` for a non-English locale (SPEC-035) | no |
| `variant` | `detailed` or `summary` | yes, a modifier |
| Duration and currency bar | `metaFields` + `blocks.meta` (`bar`) in `baseConfig` | yes, frontmatter `metaFields` |

Two facts make budget a better candidate than its size suggests:

- **It emits no structured data.** The SEO baseline records `budget` with an empty `jsonLd`
  (`contracts/seo-baseline/baseline.json`: WORK-567 dropped its `ItemList`). The per-property
  reachability problems that gate `recipe`, `event` and `pricing` ({% ref "SPEC-146" /%}) do not
  apply.
- **Its imperative residue is a single job:** reading labelled amounts and doing arithmetic on
  them. {% ref "SPEC-161" /%} D3's rule applies: a primitive may own imperative code, and only a
  composition must be declarative.

## Decisions

### D1 — `ledger` is a core primitive for labelled amounts with totals

A ledger is rows of labelled amounts, optionally grouped, with subtotals and a total. Budgets,
invoices, quotes, cost breakdowns, timesheets and nutrition per serving are all ledgers. The
primitive owns exactly budget's imperative half, with the travel vocabulary removed:

- **rows**: list items of the form `Label: amount` (D2);
- **groups**: `##` headings inside the ledger become groups, each with a subtotal. A heading
  marked approximate (D3) marks its group approximate;
- **amounts**: plain numbers or currency, parsed once, formatted through budget's existing
  locale path (`formatBudgetAmount`, renamed);
- **totals**: a subtotal per group and a grand total;
- **a rate**: `per="5 days"` divides the total and renders "per day" (D5).

Attributes: `currency`, `per`, `show-per`, `variant` (`detailed` | `summary`), `ranges` (D4).

### D2 — the row syntax is `Label: amount`, where the amount is the trailing number

A row is a list item whose text ends in an amount: an optional currency symbol or code, then a
number, an optional range, and optional grouping separators. Everything before the last `:` is
the label. An item with no trailing amount is a row with a label and no amount, as budget
renders it today.

This collides on its face with `deflist`'s `**Term:** value`. The two are distinguished by what
they key on: `deflist` requires a **bold** term ending in `:`, and `ledger` requires a
**numeric** tail. Neither reads the other's rows, and the authoring guide says so in one line.

**Open question:** whether `ledger` should also accept a two-column table (`| Label | Amount |`).
Tables suit long ledgers and imports. The list form is what every existing budget page uses, so
it is the default and the only form required for D6.

### D3 — "approximate" is the general form of budget's "estimate"

Budget marks a category as an estimate by heading text: `(estimate)`, `(est.)`, `~Label~` or
`~~Label~~`. The marker is not travel-specific, since any ledger can contain guessed figures, so
`ledger` keeps the same four markers and calls the state *approximate*: `data-approximate` on the
group, with the marker text stripped from the label. A group that is approximate makes the total
approximate too, which today's budget does not show; the total gains `data-approximate` when any
group has it.

### D4 — a range is shown as a range; the midpoint is opt-in

Today `€100–200` counts as `€150`. That is a budgeting convention, not a fact about the amount.
`ledger` keeps the range:

- a row shows `€100–200`;
- a subtotal or total over ranged rows is itself a range: low bounds and high bounds are
  summed separately;
- `ranges="midpoint"` restores today's behaviour, totalling at the midpoint.

`budget` passes `ranges="midpoint"`, so its numbers do not change in this migration. Whether
budget should switch to showing ranges is a separate, visible change.

### D5 — the rate is a divisor with a unit

`per` takes a count and a unit: `5 days`, `2 weeks`, `1 month`, parsed as budget does today
(weeks ×7, months ×30, days by default). The ledger renders `total ÷ count` labelled by unit
("per day"), localised through the existing `core.budget.perDay` key, renamed into the ledger's
namespace. A unit the ledger does not know renders no rate and reports a `ledger-rate-unit`
warning, rather than guessing.

### D6 — budget becomes a composition over `section` and `ledger`

```md
---
tag: section
description: A trip or project budget, with categories, totals and a per-day rate.
attributes:
  currency:   { type: string, default: USD, description: "Currency code or symbol." }
  duration:   { type: string, description: "Budget duration for the per-day rate, e.g. \"5 days\"." }
  showPerDay: { type: boolean, default: true }
  variant:    { type: string, matches: [detailed, summary], default: detailed }
content:
  type: sequence
  fields:
    eyebrow:  { match: paragraph, optional: true }
    headline: { match: heading, optional: true }
    blurb:    { match: paragraph, optional: true }
    body:     { match: any, optional: true, greedy: true }
metaFields:
  duration: { metaType: category, condition: duration }
  currency: { metaType: category, condition: currency }
blocks:
  meta: { fields: [duration, { field: currency, align: end }], layout: bar }
---

{% section %}
{% metablock name="meta" /%}
{% slot name="eyebrow" /%}
{% slot name="headline" /%}
{% slot name="blurb" /%}

{% ledger currency=$attrs.currency per=$attrs.duration show-per=$attrs.showPerDay variant=$attrs.variant ranges="midpoint" %}
{% slot name="body" /%}
{% /ledger %}
{% /section %}
```

It stays a core rune, defined as a string in a TypeScript module, which SPEC-160 D3 measured to
work. Whether it moves to `places` beside `itinerary` and `event` is a separate question. Moving
it would make a core rune disappear for sites that do not load `places`.

Its metadata bar becomes definition-owned under ADR-042: one of the three native runes that ADR
left open is resolved.

### D7 — the ledger renders through the shared vocabulary

Budget hand-builds its classes today: `rf-budget-category__header`, `__label`, `__subtotal`,
`rf-budget__total`, `rf-budget__per-day`. A theme can style a ledger without knowing what it is
only if its output speaks the vocabulary:

- each row is a label/value pair in the `definition-list` layout (`data-zone-layout`), the
  amount carrying `data-meta-type="quantity"`;
- a group is a `<section>` whose heading carries the label and whose subtotal is a row marked
  `data-role="subtotal"`;
- the total and the rate are rows marked `data-role="total"` and `data-role="rate"`;
- `data-approximate` (D3) and `data-range` (D4) mark values a theme may want to soften.

So `packages/lumina/styles/runes/budget.css` (134 lines) is replaced by a `ledger.css` keyed on
these attributes, and the `rf-budget*` element classes go. As with `hero` and `cta`
({% ref "SPEC-160" /%} D7), that is a migration note for third-party themes.

### D8 — the migration is compared, not assumed

The composed `budget` is compared against today's on its rune fixture
(`packages/runes/fixtures/budget.md`), the SEO baseline fixture
(`contracts/seo-baseline/fixtures/budget.md`), `packages/runes/test/budget.test.ts`, and the two
examples on `site/content/runes/budget.md`.
The comparison checks that:

- every amount, subtotal, total and per-day figure is identical (D4's `ranges="midpoint"`);
- the estimate markers produce approximate groups with the same labels;
- the JSON-LD stays empty, and the SEO baseline does not move.

The structure contract changes (D7), and that diff is reviewed. The plugin-era rune is removed
only after the comparison is recorded, as {% ref "SPEC-147" /%} D2 did for storytelling.

## Not in scope

- Changing budget's numbers, for example showing ranges by default (D4).
- Moving budget out of core (D6).
- `pricing`'s tiers. A tier lists line items but does not total them, so it is not a ledger;
  {% ref "SPEC-161" /%} D4 stands.

## Open questions

- **The name.** `ledger` reads as accounting; `tally` and `breakdown` are the alternatives. The
  name has to suit a nutrition table or a timesheet as well as a budget.
- **Table input** (D2).
- **Non-currency units.** A timesheet totals hours, and a duration total would want the duration
  formatter, not a number formatter. A `unit` attribute (`currency` | `number` | `duration`) is
  the obvious shape. It is not needed for budget, so it waits for a second consumer.

## Acceptance Criteria

- [ ] `{% ledger %}` exists as a core rune: rows, groups with subtotals, a total, a rate, approximate groups and ranges, rendered through the vocabulary in D7
- [ ] `ranges="midpoint"` reproduces today's budget arithmetic exactly, asserted against the existing fixtures
- [ ] `budget` is a composition over `section` and `ledger`, defined in core, with its duration/currency bar as definition-owned metadata
- [ ] Every figure in budget's fixtures and site examples is unchanged; the SEO baseline does not move; the contract diff is reviewed
- [ ] Lumina's `budget.css` is replaced by `ledger.css` keyed on the vocabulary, and the theme migration note lists the removed `rf-budget*` classes
- [ ] ADR-042's follow-up records `budget` as resolved

## References

- {% ref "ADR-042" /%}: metadata belongs to a rune's definition; budget was one of its three open cases.
- {% ref "SPEC-160" /%}: `section`, and D3's measurement that a core rune can ship as a composition.
- {% ref "SPEC-161" /%} D3: a primitive may own imperative code; a composition may not.
- {% ref "ADR-036" /%}: why aggregation belongs in a named primitive, not an expression language.

{% /spec %}
