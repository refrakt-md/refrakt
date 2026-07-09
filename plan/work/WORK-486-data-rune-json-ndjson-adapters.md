{% work id="WORK-486" status="done" priority="high" complexity="moderate" source="SPEC-103" milestone="v0.27.0" tags="runes,data,json,ndjson,pipeline" %}

# `data` rune — JSON + NDJSON adapters

The JSON-family adapters for {% ref "SPEC-103" /%}, on top of the {% ref "WORK-417" /%} adapter
contract + projection core. JSON is not inherently tabular, so its adapter owns the three knobs
CSV doesn't; NDJSON is line-delimited records. Both reduce to the shared `{ headers, rows }`
shape and are indistinguishable downstream.

## Scope

- **JSON adapter** — `root` (dotted path / JSON Pointer to the array or map; defaults to the document when already an array); `orient` (`records` default + `values`, auto-detected via `element[0]` object-vs-array; `index` explicit, with `key-column` naming the synthesized key column); dotted column paths in `columns` to pluck nested fields.
- **NDJSON adapter** — parse line-delimited JSON records into `{ headers, rows }` (union of record keys → headers).
- **Reuse** — both feed the same projection + typing + `data-value` emission + table emitter from {% ref "WORK-417" /%}; no new downstream code.
- **Tests** — `root`/`orient`/`key-column`/dotted-path cases; NDJSON parsing; a nested-JSON → datatable and an object-map JSON → chart composition.

## Acceptance Criteria

- [x] JSON adapter supports `root`, `orient` (`records`/`values` auto-detected, `index` + `key-column`), and dotted column paths, reducing to `{ headers, rows }`.
- [x] NDJSON adapter parses line-delimited records to the same shape.
- [x] Shared projection/typing/`data-value`/emitter from {% ref "WORK-417" /%} run unchanged over JSON/NDJSON output; chart + datatable composition covered by tests.
- [x] `format` inference recognizes `.json` / `.ndjson`, overridable.

## Dependencies

- {% ref "WORK-417" /%} — the adapter contract, projection/typing core, table emitter, and preprocess wiring.

## References

- {% ref "SPEC-103" /%} — JSON adapter specifics + the `{ headers, rows }` contract.

## Resolution

Completed: 2026-07-09

Branch: `claude/spec-103-data-rune`

### What was done
- `data-adapters.ts` — JSON + NDJSON adapters on the WORK-417 `{ headers, rows }` contract:
  - `jsonAdapter(raw, { root, orient, keyColumn })` — `root` locator (dotted path **or** JSON Pointer, defaults to the document); `orient` `records` (default) / `values` auto-detected via `element[0]` object-vs-array, `index` explicit with `key-column` naming the synthesized key column; nested objects flattened into **dotted headers** (`geo.country`) so `columns` plucks them by exact match with no downstream change; array leaves comma-join.
  - `ndjsonAdapter(raw)` — line-delimited records → union-of-keys headers; blank lines skipped; malformed lines error with the line number.
  - Shared `recordsToTable` (flatten + first-seen header union) backs JSON records/index and NDJSON.
- `data-pipeline.ts` — `runAdapter` now dispatches `json`/`ndjson` (replacing the WORK-417 stub), threading `root`/`orient`/`key-column` attrs (with `ctx.variables` resolution).

### Notes
- Everything after the adapter is unchanged: projection (`where`/`sort`/`columns`/`limit`/`offset`), typing + `data-value`, and the table emitter run identically over JSON/NDJSON — JSON is indistinguishable from CSV downstream, as the spec requires.
- Tests: 16 new adapter cases (root dotted + pointer, records/values/index auto-detect, dotted flattening, key-column default, NDJSON incl. line-number errors) and 5 end-to-end rune cases (nested JSON→table filtered/sorted/typed, object-map→datatable, NDJSON, object-map→chart with `data-value`, invalid-JSON callout). Full runes suite green (928 tests).

{% /work %}
