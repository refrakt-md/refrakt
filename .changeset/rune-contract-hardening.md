---
"@refrakt-md/transform": minor
---

Harden the rune output contract (SPEC-081 + SPEC-082).

- **Declarative structure assembly (SPEC-081).** A recursive `layout` field assembles a rune's output tree from flat, named `data-name` slots the transform emits — wrappers, headers, and grouping are described in config rather than built imperatively in each rune's `transform`/`postTransform`. All first-party runes (recipe, howto, character, realm, faction, event, playlist, symbol, budget, embed, diagram, sandbox, mockup, comparison, …) migrated to flat-emit + `layout`, removing most `postTransform` structure-building.
- **Typed node data channel (SPEC-082).** Rune field data now rides a single typed `data-rune-fields` JSON bag (camelCase keys) instead of per-field `<meta data-field>` children. The engine reads modifiers/metaFields/field-consumers from the bag and strips it from the final output, so rune HTML is markedly cleaner. Schema.org/RDFa SEO metadata is emitted inline and kept separate from the data channel.
- **Chart seam.** `chart` keeps the authored `<table>` as the single source of truth and emits an `<rf-chart>` custom element that renders an SVG (bar/line) on the client; the table remains as the no-JS fallback.

Contracts now surface the layout skeleton; `projection.group`/`projection.relocate` are deprecated in favour of placing slots directly in the `layout` tree.
