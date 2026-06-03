---
"@refrakt-md/transform": minor
---

Remove the legacy `slots` + `structure` assembly shim from the identity transform engine (SPEC-079 phase 3).

**Breaking for third-party themes/plugins that still declare `RuneConfig.slots`.** Every first-party rune migrated to the SPEC-080 `metaFields` + `blocks` + `layout` model across v0.17.0, and the deprecation warning shipped for a full minor release. This release removes:

- `RuneConfig.slots` (the ordered slot-name array) and the slot-based assembly path in the engine.
- `StructureEntry.slot` and `StructureEntry.order` — only meaningful under slot assembly.
- The automatic universal `.rf-badge` class the shim applied to every meta-typed `StructureEntry`. A `StructureEntry` that should render as a chip must now set its own `class` via `attrs`. The `data-meta-type` / `data-meta-sentiment` attributes are unchanged.

The `structure`-only before/after assembly (icons/badges injected around content) is **unchanged** — only the slot vocabulary is gone.

**Migration:** move slot ordering into a `layout` tree and project metadata through `metaFields` + `blocks`. See the SPEC-079 migration notes in the theme-authoring docs (`config-api`, `dimensions`).
