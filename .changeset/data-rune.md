---
"@refrakt-md/runes": minor
"@refrakt-md/behaviors": minor
---

Add the `data` rune (SPEC-103) — ingest an external tabular source and render it as a table, chart, or datatable.

A preprocess-time `{% data %}` rune reads an external file through the SPEC-113 `ProjectFiles` sandbox and emits a Markdoc `table` node that `chart` and `datatable` consume with **no structural changes** — the emitted table is also the honest no-JS fallback.

- **Formats** — CSV/TSV (RFC-4180 quoting, `delimiter`/`header` knobs) and JSON/NDJSON (`root` locator, `orient` records/values/index, `key-column`, nested objects flattened to dotted headers). `format` is extension-inferred and overridable.
- **Shaping** — build-time `where` (the SPEC-070 `field:value` grammar), `sort`, `columns` (select/order/rename), `limit`/`offset`, all format-agnostic.
- **Typing** — `numeric`/`text` with auto-inference; typed-numeric cells emit a normalized `data-value` (`"$1,200"` → `1200`) that `chart` reads and `datatable` now sorts on.
- **datatable** — its sort comparator now prefers a cell's `data-value` over its text, so human-formatted numbers sort correctly. Purely additive: tables without `data-value` are unchanged, and hand-authored tables can opt in.
- Failures (sandbox escape, missing file, parse error, empty result) render a visible error callout and warn — the build continues.
