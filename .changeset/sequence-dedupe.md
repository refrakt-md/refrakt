---
'@refrakt-md/skeleton': patch
'@refrakt-md/lumina': patch
---

`howto`, `recipe`, `steps` and `track` no longer hand-roll a counter the `sequence` dimension already provides (BUG-024). A theme rule on `[data-sequence="numbered"] > li` now reaches all four; before, it was ignored on `howto` and `recipe`. Visible in Lumina: `howto` and `recipe` step numbers get the dimension's filled circle (as `steps` already had), and the three runes' compact items take the dimension's compact indent.
