{% work id="WORK-486" status="ready" priority="high" complexity="moderate" source="SPEC-103" milestone="v0.27.0" tags="runes,data,json,ndjson,pipeline" %}

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

- [ ] JSON adapter supports `root`, `orient` (`records`/`values` auto-detected, `index` + `key-column`), and dotted column paths, reducing to `{ headers, rows }`.
- [ ] NDJSON adapter parses line-delimited records to the same shape.
- [ ] Shared projection/typing/`data-value`/emitter from {% ref "WORK-417" /%} run unchanged over JSON/NDJSON output; chart + datatable composition covered by tests.
- [ ] `format` inference recognizes `.json` / `.ndjson`, overridable.

## Dependencies

- {% ref "WORK-417" /%} — the adapter contract, projection/typing core, table emitter, and preprocess wiring.

## References

- {% ref "SPEC-103" /%} — JSON adapter specifics + the `{ headers, rows }` contract.

{% /work %}
