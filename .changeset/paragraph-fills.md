---
'@refrakt-md/runes': minor
'@refrakt-md/types': minor
---

A composed rune can read a paragraph into its own values (SPEC-182). A sequence field matching `paragraph` takes an `itemModel`, in the vocabulary list items already use, and matches only a paragraph whose required item fields match. `fills: { author: $name }` names the rune's declared attributes those values supply: they land in the field bag, so meta blocks, `$attrs`, the schema row and registration read them as they read the attribute. The author's attribute always wins; writing both warns `fill-overridden`. A filling field counts as placed, and placing it with a slot as well is rejected (`fill-placed`); a malformed `fills` is `fills-invalid`.
