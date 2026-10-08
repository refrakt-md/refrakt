---
'@refrakt-md/runes': minor
'@refrakt-md/content': minor
---

`data-owner` and `data-slot` now survive a primitive's transform, ahead of composed runes (SPEC-145 D10a). The page pipeline declares both attributes once, when it assembles the Markdoc config, on every node and tag schema. No rune declares them itself, so authoring tools do not offer them. The schema-table resolvers admit a node by `data-owner` plus `data-slot`, and a primitive's own `data-name` on that node still resolves for the primitive. `releaseOwnedNodes` strips `data-owner` and keeps `data-slot`. Nothing sets the markers yet, so rendered output and structured data are unchanged.

New exports from `@refrakt-md/runes`: `declareSlotMarkers`, `declareSlotMarkersOnNodes`, `OWNER_ATTR`, `SLOT_ATTR`.
