{% work id="WORK-488" status="done" priority="medium" complexity="simple" source="SPEC-103" milestone="v0.27.0" tags="runes,data,docs" %}

# `data` rune — docs page

The author-facing documentation for {% ref "SPEC-103" /%}: the `data` rune with CSV + JSON
examples, the chart/datatable composition story, and the build-time-vs-runtime distinction so
authors reach for the right layer.

## Scope

- **Reference** — all knobs (`src`, `format`, `delimiter`, `header`, `root`, `orient`, `key-column`, `columns`, `where`, `sort`, `limit`/`offset`, `numeric`/`text`), grouped core / csv-tsv / json / shared.
- **Examples** — CSV → chart, nested JSON → table (plucked + filtered + sorted), object-map JSON → datatable (the SPEC-103 worked examples).
- **Composition + build-time/runtime line** — `data` shapes at build time (deterministic, defines the no-JS table); `datatable` filters at runtime. Draw the line so authors don't reach for the wrong layer. Note `data-value` is the typed channel both chart and datatable honour.
- Cross-link the SQLite later-tier note (deferred) and the {% ref "SPEC-113" /%} sandbox / `ProjectFiles` boundary.

## Acceptance Criteria

- [x] A `data` docs page documents all knobs with CSV + JSON examples and the chart/datatable composition story.
- [x] The build-time-vs-runtime distinction (vs `datatable`) is explained.
- [x] SQLite is documented as a later adapter tier with its read-only / no-extension / no-`ATTACH` sandbox requirements (implementation deferred to its own work item).

## Dependencies

- {% ref "WORK-417" /%}, {% ref "WORK-486" /%} — the rune + adapters the docs describe.

## References

- {% ref "SPEC-103" /%} — knobs, worked examples, composition, SQLite later-tier.

## Resolution

Completed: 2026-07-09

Branch: `claude/spec-103-data-rune`

### What was done
- New author-facing page `site/content/runes/data.md` (Code & Data), mirroring the snippet-page style:
  - Live CSV examples (backed by a committed `site/examples/revenue.csv`): bare table, CSV → chart, CSV → searchable/sortable datatable — all rendered by the real build.
  - Shaping section (`where`/`sort`/`columns`/`limit`/`offset`) with a live example; the typing + `data-value` channel explained (auto-inference, `numeric`/`text`, how chart + datatable honour it).
  - JSON/NDJSON: `root`/`orient`/`key-column`/dotted paths + the SPEC-103 worked examples (nested JSON, object-map → datatable, NDJSON).
  - Build-time-vs-runtime table drawing the `data` (bakes the no-JS table) vs `datatable` (runtime view) line.
  - Format-inference table; the error-callout behaviour; the SQLite later-tier note with its read-only / no-extension / no-`ATTACH` sandbox requirements (deferred); grouped attributes reference (core / csv-tsv / json / shared); See-also cross-links (chart, datatable, snippet, hosted-builds/ProjectFiles).
- Registered `data` in the runes nav (`runes/_layout.md`).

### Notes
- Verified with a full `vite build`: the `/runes/data` page renders live tables + a chart with `data-value` attributes present and zero error callouts.

{% /work %}
