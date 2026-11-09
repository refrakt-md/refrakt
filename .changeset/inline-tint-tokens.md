---
'@refrakt-md/runes': patch
'@refrakt-md/transform': patch
---

**Inline tint tokens fixed.** A `{% tint %}` child rune now reads the six tokens the tint axis applies — `bg`, `surface`, `text`, `muted`, `primary`, `border` — the same names a named tint in theme config uses. It used to read an older list, so `text` and `muted` were dropped and `background`, `secondary` and `accent` were emitted under names nothing applied. `background` still works as an alias of `bg`, with a warning; `secondary` and `accent` are ignored, so write `text` or `primary` instead. `TINT_TOKENS` from `@refrakt-md/runes` is now the same list, and `@refrakt-md/transform` exports it.
