---
"@refrakt-md/runes": minor
---

Carry universal attribute records in `serializeRune`, and filter internal attributes by prefix

`SerializedRune.attributes.universalAvailable` is new: the universal attributes a rune carries, grouped by axis and with their full records (type, `matches`, description). `attributes.universal` remains a bare name list, which was enough for the CLI's one-line summary and not enough for anything rendering them — `own` and `base` carried full records while universals carried none.

Grouped by axis to match `universalUnavailable`, so both halves of the universal story have the same shape rather than one being flat and the other keyed.

Attributes prefixed `__` are now filtered from every reference output. `HIDDEN_ATTRIBUTES` is keyed `rune.attribute`, so hiding `__deferred-body` that way needed a new entry each time a rune opted into `deferBody` — added silently, or not at all. The two also mean different things: `feature.split` is a real attribute we choose not to document, while a `__` attribute was never author-facing.
