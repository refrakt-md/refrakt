{% spec id="SPEC-162" status="draft" tags="runes, composition, primitives, budget, core, metadata" %}

# Amount and tally primitives, and budget as a composition

## Summary

`budget` is a core rune with a 477-line transform (`packages/runes/src/tags/budget.ts`). It
reads `##` categories of `- Label: amount` items, marks estimated categories, totals everything,
and divides by a duration for a per-day rate. None of that is about travel.

The first draft of this spec moved all of it into one `ledger` primitive. Taking ledger apart
shows that most of it is structure, which a composition can already express. Only two things
genuinely need code:

- **reading and formatting one value**: an amount;
- **arithmetic across values**: a total.

So this spec adds two small core primitives, `amount` and `tally`. `ledger` becomes a
composition over them, and `budget` a composition over `ledger`. The row, which an earlier
discussion proposed as a primitive, is the one part that never needed code: item extraction
already reads it.

This also resolves one of the three native runes {% ref "ADR-042" /%} left open. Budget's
duration/currency bar is metadata declared in a native rune's config. As a composition, that
metadata belongs to its definition.

## What budget does today, and what each part needs

| Job | Today | Needs code? | Under this spec |
|---|---|---|---|
| Header (eyebrow, title, blurb) | first heading and its paragraphs | no | `section`'s header ({% ref "SPEC-160" /%}) |
| Categories from `##` | `convertBudgetChildren` | no | a sections `each` |
| Rows from `- Hotel: ¥15000` | `DESCRIPTION_AMOUNT_PATTERN` | no | item extraction (`itemModel`), as palette's rows ({% ref "SPEC-165" /%} D5) |
| Rows inside categories | hand-built | no | one level of nested `each` (SPEC-165 D6) |
| Estimate marker in a heading | `parseEstimate` | no, for the form in use | `headingExtract` with an optional pattern (D5) |
| Reading an amount: symbols, separators, ranges | `parseAmount` | **yes** | `amount` (D1) |
| Formatting an amount by locale | `formatBudgetAmount` | **yes** | `amount` (D1) |
| Subtotals, total, per-day rate | inline sums | **yes** | `tally` (D2) |
| `variant` (`detailed` or `summary`) | a modifier | no | a composition attribute |
| Duration and currency bar | `metaFields` and `blocks` in `baseConfig` | no | definition-owned fields (SPEC-145 D28) |

Two facts make the migration safe:

- **Budget emits no structured data.** The SEO baseline records `budget` with an empty `jsonLd`
  (`contracts/seo-baseline/baseline.json`; WORK-567 dropped its `ItemList`). The reachability
  problems that gate `recipe`, `event` and `pricing` ({% ref "SPEC-146" /%}) do not apply.
- **The imperative residue is small and generic.** {% ref "SPEC-161" /%} D3's rule applies: a
  primitive may own imperative code; a composition may not.

## Decisions

### D1 — `amount` is a core value primitive

```md
{% amount value="¥15,000" /%}
{% amount value="€100–200" /%}
{% amount value="19" currency="USD" /%}
```

`amount` is the counterpart of `color` and `font` (SPEC-165): it reads one value and emits one
value element.

- **It reads** a currency symbol or code, grouping separators, and a range (`100–200`, with an
  en dash or a hyphen). `currency` names the currency when the value does not.
- **It emits** `<data value="15000" data-currency="JPY" data-meta-type="quantity">¥15,000</data>`.
  A range emits `data-low` and `data-high`, and its `value` is empty, because a range has no
  single value.
- **It formats** by locale, through budget's existing currency path (`formatBudgetAmount`,
  moved and renamed), and through {% ref "ADR-043" /%}'s `formats` once that exists.
- **A value it cannot read** reports `amount-invalid`, naming the text, and is rendered as the
  author wrote it, with no `data-value`.
- **It works anywhere**: in a row, a heading, a table cell or a sentence ("costs
  {% amount value="€40" /%} a night").

It also replaces SPEC-161 D4's proposed `{% price %}` rune: a price is an amount (see D7).

### D2 — `tally` is a core container primitive that totals the amounts inside it

```md
{% tally %}
…any content containing amounts…
{% /tally %}
```

- **It renders its children, then sums every `amount` element inside them** by reading
  `data-value`, `data-low` and `data-high`. It sums nothing else, so a number in prose is never
  counted.
- **It appends a total** in the shared vocabulary: a row marked `data-role="total"`, holding an
  `amount` element. Inside a `deflist`, it is a `deflist` row; elsewhere, a block.
- **A tally inside a tally is a subtotal.** The inner tally's total is marked
  `data-role="subtotal"`, and the outer tally sums the amounts once, not the subtotals as well.
- **Ranges:** a range among the amounts makes the total a range, with lows and highs summed
  separately. `ranges="midpoint"` totals each range at its midpoint instead (D4).
- **`approximate`** marks the total `data-approximate`, and an approximate inner tally makes
  the outer total approximate too.
- **`per`** divides the total and appends a rate row (`data-role="rate"`). It takes a count
  and a unit, `5 days`, `2 weeks` or `1 month`, parsed as budget does today (weeks ×7, months
  ×30, days by default). A unit it does not know renders no rate and reports
  `tally-rate-unit`, rather than guessing.
- **`show-rate`** (default `true`) omits the rate row without dropping `per`.
- **`detail="totals"`** marks the tally `data-detail="totals"`, and the base stylesheet hides
  every row that is not a subtotal, total or rate. The rows are still rendered and summed;
  only their display changes. Hiding them with a template `{% if %}` would drop them from the
  sum.
- **Mixed currencies** in one tally report `tally-currency-mixed`, and no total is drawn.
- **Labels** ("Total", "per day") are translated through {% ref "SPEC-145" /%} D29's keys,
  under `core.tally.*`. The native `core.budget.perDay` key is kept as an alias for one release.

`tally` totals whatever it wraps: a list, a definition list, or a table column. An invoice
written as a Markdown table gets a total by wrapping it in `{% tally %}`.

### D3 — `ledger` is a composition over `section`, `deflist`, `amount` and `tally`

```md
---
tag: section
attributes:
  currency: { type: string, description: "Currency code or symbol." }
  per:      { type: string, description: "Divisor for a rate, e.g. \"5 days\"." }
  showRate: { type: boolean, default: true }
  ranges:   { type: string, matches: [range, midpoint], default: range }
  detail:   { type: string, matches: [items, totals], default: items }
content:
  type: sections
  sectionHeading: heading:2
  emitAttributes: { heading: $heading, estimate: $estimate }
  headingExtract:
    fields:
      - { name: estimate, match: text, pattern: "\\((estimate|est\\.)\\)\\s*$", optional: true }
  sectionModel:
    type: sequence
    fields:
      items:
        match: list
        itemModel:
          fields:
            - { name: label, match: text, pattern: "^(.+)\\s*:\\s*(?=[^:]*\\d)" }
            - { name: value, match: text, pattern: remainder, optional: true }
        emitTag: span
        emitAttributes: { label: $label, value: $value }
---

{% tally per=$attrs.per show-rate=$attrs.showRate ranges=$attrs.ranges detail=$attrs.detail %}
{% slot name="sections" each %}
## {% $each.heading %}

{% tally approximate=$each.estimate %}
{% deflist %}
{% slot name="items" each %}
- **{% $each.label %}:** {% amount value=$each.value currency=$attrs.currency /%}
{% /slot %}
{% /deflist %}
{% /tally %}
{% /slot %}
{% /tally %}
```

Its prerequisites are already recorded elsewhere:

- {% ref "BUG-038" /%}: YAML `itemModel` patterns are compiled;
- SPEC-165 D6: one level of nested `each`;
- the estimate marker removed from the displayed heading (D5).

`ledger` is generic: invoices, quotes, cost breakdowns. It stays in core beside its primitives.

### D4 — a range is shown as a range; the midpoint is opt-in

Today `€100–200` counts as `€150`. That is a budgeting convention, not a fact about the amount.

- `amount` always shows the range as written.
- `tally` totals ranges as ranges by default.
- `ranges="midpoint"` restores today's arithmetic.

`budget` passes `ranges="midpoint"`, so its numbers do not change in this migration. Whether
budget should switch to showing ranges is a separate, visible change.

### D5 — "approximate" is the general form of budget's "estimate"

Budget marks a category as an estimate in four ways (`parseEstimate`): `(estimate)` or `(est.)`
at the end of the heading, `~Label~`, or `~~Label~~`. Only `(estimate)` is used on the site
(`site/content/runes/budget.md:91`).

- `ledger` keeps the parenthesised forms through `headingExtract`. The marker is removed from
  the displayed heading, and the group's tally is marked `approximate`.
- The tilde forms are dropped. `~~Label~~` is detected today by finding a strikethrough node in
  the heading, which a text pattern cannot see. A codemod rewrites any tilde form to
  `(estimate)`, and `content-unmatched` reports any that are missed. D8 records the change.

Today's budget does not show that the grand total is approximate when a category is. Under D2
it does, which D8 also records as a visible change.

### D6 — budget becomes a composition over `ledger`

```md
---
tag: section
description: A trip or project budget, with categories, totals and a per-day rate.
attributes:
  currency:   { type: string, default: USD, description: "Currency code or symbol." }
  duration:   { type: string, description: "Budget duration for the per-day rate, e.g. \"5 days\"." }
  showPerDay: { type: boolean, default: true }
  variant:    { type: string, matches: [detailed, summary], default: detailed }
  detail:     { type: string, matches: [items, totals], default: items }
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
---

{% section %}
{% bar %}
{% field name="duration" /%}
{% field name="currency" /%}
{% /bar %}
{% slot name="eyebrow" /%}
{% slot name="headline" /%}
{% slot name="blurb" /%}

{% ledger currency=$attrs.currency per=$attrs.duration showRate=$attrs.showPerDay ranges="midpoint" detail=$attrs.detail %}
{% slot name="body" /%}
{% /ledger %}
{% /section %}
```

- The metadata bar is placed with `{% field %}` (SPEC-145 D28), so the bar's empty items drop
  out when there is no duration.
- `showPerDay` passes through as `ledger`'s `showRate`.
- `variant="summary"` today is a modifier that CSS reads to hide the line items. It becomes
  `detail="totals"`, a generic `tally` setting the base stylesheet understands, so no theme needs
  to know `budget`. `variant` stays accepted for one release and maps `summary` to
  `detail="totals"`, with a deprecation report.
- It stays a core rune, defined as a string in a TypeScript module, which SPEC-160 D3 measured
  to work. Whether it moves to `places` beside `itinerary` and `event` is a separate question;
  moving it would make a core rune disappear for sites that do not load `places`.
- Its metadata becomes definition-owned under ADR-042, resolving one of that decision's three
  open native runes.

### D7 — `amount` replaces SPEC-161 D4's `{% price %}`

SPEC-161 D4 proposed a small `{% price %}` rune to format a tier's authored price. A price is an
amount, so `tier` uses `{% amount value=$attrs.price currency=$attrs.currency /%}`.

- The published `Offer` price still comes from the attributes, through the field bag (SPEC-145
  D28's "the bag is the record"), never from the rendered element.
- `amount`'s reading of a currency from the value fixes the defect SPEC-161 D4 records: `29 kr`
  is no longer published as USD.
- `amount` could display the `## Pro — $19` heading shorthand, but it cannot publish it,
  because the value would come from the tree, not the bag. SPEC-161 D4's conclusion about the
  shorthand stands.

### D8 — the output uses the vocabulary, and the migration is compared, not assumed

Budget hand-builds its classes today: `rf-budget-category__header`, `__label`, `__subtotal`,
`rf-budget__total`, `rf-budget__per-day`. Under this spec its output is:

- rows as `deflist` rows (`data-zone-layout="definition-list"`);
- each value an `amount` element (`data-meta-type="quantity"`, `data-value`);
- totals, subtotals and the rate as rows marked `data-role="total"`, `"subtotal"` and `"rate"`;
- `data-approximate` and `data-low`/`data-high` on values a theme may want to soften.

So `packages/lumina/styles/runes/budget.css` (134 lines) is replaced by vocabulary rules for
`data-role` and `data-approximate`, and the `rf-budget*` classes go. As with `hero` and `cta`
(SPEC-160 D7), that is a migration note for third-party themes.

The composed `budget` is compared against today's on:

- its rune fixture (`packages/runes/fixtures/budget.md`);
- the SEO baseline fixture (`contracts/seo-baseline/fixtures/budget.md`);
- `packages/runes/test/budget.test.ts`;
- the examples on `site/content/runes/budget.md`.

The comparison checks that:

- every amount, subtotal, total and per-day figure is identical (D4's `ranges="midpoint"`);
- `(estimate)` categories are approximate groups with the same labels;
- the JSON-LD stays empty, and the SEO baseline does not move.

Expected visible changes, recorded rather than avoided:

- the grand total is marked approximate when any category is (D5);
- the tilde estimate markers are gone (D5);
- the structure contract changes (this decision).

The native rune is removed only after the comparison is recorded, as {% ref "SPEC-147" /%} D2
did for storytelling.

## Not in scope

- Changing budget's numbers, for example showing ranges by default (D4).
- Moving budget out of core (D6).
- `pricing`'s tiers as ledgers. A tier lists features but does not total them; SPEC-161 D4
  stands, with `amount` for the price (D7).

## Open questions

- **Units other than money.** A timesheet totals hours, and nutrition totals grams. The obvious
  shape is `amount` with `unit` (`currency`, `number`, `duration`), formatted by the matching
  formatter, and `tally` refusing to mix units as it refuses to mix currencies. It is not
  needed for budget, so it waits for a second consumer.
- **Table input.** `tally` already totals a table column of amounts. Whether `ledger` should
  also accept a two-column table as an alternative to the list is left open.
- **The name `ledger`.** It reads as accounting; `breakdown` is the alternative.

## Acceptance Criteria

- [ ] `{% amount %}` exists as a core rune: reads symbols, codes, separators and ranges; emits a value element with `data-value` (or `data-low`/`data-high`) and `data-currency`; formats by locale; reports `amount-invalid` for text it cannot read
- [ ] `{% tally %}` exists as a core rune: sums only `amount` elements inside it; appends a total, subtotal and rate in the vocabulary; nests as subtotals without double counting; handles ranges and `ranges="midpoint"`; propagates `approximate`; supports `show-rate` and `detail="totals"`; reports `tally-rate-unit` and `tally-currency-mixed`
- [ ] With `detail="totals"`, line rows are still summed and only hidden by the base stylesheet, asserted against a fixture whose total includes them
- [ ] `tally` totals a Markdown table column of amounts, asserted in a test
- [ ] `ledger` is a core composition over `section`, `deflist`, `amount` and `tally`; BUG-038 and SPEC-165 D6 are its stated prerequisites
- [ ] `budget` is a core composition over `ledger`, with its duration/currency bar placed by `{% field %}` as definition-owned metadata; `variant="summary"` maps to `detail="totals"` for one release, with a deprecation report
- [ ] Every figure in budget's fixtures and site examples is unchanged; the SEO baseline does not move; the visible changes in D8 are recorded
- [ ] A codemod rewrites tilde estimate markers to `(estimate)`, and `content-unmatched` reports any missed
- [ ] `tier` (SPEC-161 D4) uses `amount` for its price; `29 kr` publishes `SEK` through the authored attributes
- [ ] Lumina's `budget.css` is replaced by vocabulary rules, and the theme migration note lists the removed `rf-budget*` classes
- [ ] ADR-042's follow-up records `budget` as resolved

## References

- {% ref "ADR-042" /%}: metadata belongs to a rune's definition; budget was one of its three open cases.
- {% ref "ADR-043" /%}: `formats`, which `amount` will read.
- {% ref "SPEC-160" /%}: `section`, and D3's measurement that a core rune can ship as a composition.
- {% ref "SPEC-161" /%}: D3, a primitive may own imperative code; D4, the price `amount` replaces.
- {% ref "SPEC-165" /%}: `color` and `font`, the other value primitives; D5's item extraction and D6's nested `each`.
- {% ref "SPEC-145" /%}: D28's `{% field %}` and "the bag is the record"; D29's translated labels.
- {% ref "BUG-038" /%}: YAML `itemModel` patterns, which `ledger` depends on.
- {% ref "ADR-036" /%}: why aggregation belongs in a named primitive, not an expression language.

{% /spec %}
