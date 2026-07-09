{% work id="WORK-487" status="done" priority="medium" complexity="simple" source="SPEC-103" milestone="v0.27.0" tags="behaviors,datatable,data,sort" %}

# `datatable` — `data-value`-aware sort

The one host-side change {% ref "SPEC-103" /%} takes for typing: extend the datatable sort
comparator to prefer a cell's `data-value` over its `textContent`, mirroring what `chart`
already does (`cell.dataset.value ?? textContent`). This is what lets `data`'s `numeric` typing
produce correct sorts of human-formatted numbers (currency, thousands separators, units) — and
it equally fixes **hand-authored** tables, so it is a general improvement, not a `data`-specific
hack.

## Scope

- **Sort comparator** — in `packages/behaviors/src/behaviors/datatable.ts`, read each sortable cell's value as `data-value ?? textContent` when building the row model (the comparator currently uses `localeCompare(…, { numeric: true })` on text only). When `data-value` is present and numeric, sort numerically; otherwise fall back to the existing natural-string collation.
- **No markup churn** — purely additive; tables without `data-value` sort exactly as today.
- **Tests** — a table with `data-value` on a currency-formatted column sorts by the numeric value, not the formatted text; a plain table's sort is unchanged.

## Acceptance Criteria

- [x] The datatable sort comparator prefers `data-value` over `textContent`, sorting numerically when the value is numeric.
- [x] Tables without `data-value` sort identically to current behaviour (regression test).
- [x] A `data`-generated table with typed columns (currency / thousands separators) sorts correctly.

## Dependencies

- None — independent of the `data` rune (it also benefits hand-authored tables). Pairs with the SPEC-103 `data` work to complete the typing story, but blocks nothing.

## References

- {% ref "SPEC-103" /%} — *Typing & the `data-value` channel*.
- `packages/behaviors/src/behaviors/datatable.ts` (sort comparator) · `packages/behaviors/src/elements/chart.ts` (`cellValue = dataset.value ?? textContent`, the pattern mirrored).

## Resolution

Completed: 2026-07-09

Branch: `claude/spec-103-data-rune`

### What was done
- `packages/behaviors/src/behaviors/datatable.ts` — the sort comparator now prefers a cell's `data-value` over its text, mirroring `chart`'s `dataset.value ?? textContent`:
  - `RowData` gains a per-cell `dataValues: (string | null)[]` captured from `td.getAttribute('data-value')` (alongside `cells`, which still drives search + the string collation).
  - The comparator uses a numeric diff **only when both cells have a numeric `data-value`**; otherwise it falls back to the exact `localeCompare(…, { numeric: true })` on cell text — so tables without `data-value` are byte-for-byte unchanged.
- Tests: a currency column with `data-value` sorts by the real number (asc + desc), and a no-`data-value` numeric-text column keeps natural collation (regression).

### Notes
- Purely additive, no markup churn. This is the single host-side change SPEC-103 takes, and it equally fixes hand-authored tables that opt into `data-value`.
- Full behaviors suite green (217 tests).

{% /work %}
