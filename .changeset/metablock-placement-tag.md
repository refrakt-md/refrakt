---
'@refrakt-md/runes': minor
'@refrakt-md/transform': minor
---

A composed rune's template can place a declared meta block with `{% metablock name="…" /%}` (SPEC-145 D7). A composed rune has no `layout`, so until now a definition could declare `metaFields` and `blocks` in full and get nothing rendered. The tag marks where the block goes. The engine fills it from the rune's own config and values, anywhere in its template's subtree, using the same renderer `layout` projection uses, so the block renders identically and a theme's `blocks` override reaches it unchanged.

The tag is template vocabulary only: on a page it is an undefined tag. Each of these is rejected when the definition is built, naming the block: a name that matches no declared block, a block placed twice, and a placement inside an `each` slot. A block whose fields all resolve empty emits nothing.

Every attribute a `metaFields` entry reads is now a modifier of the generated config, so it also renders as a `data-*` attribute, as on a tree-owning rune. `METABLOCK_ATTR` and `METABLOCK_OWNER_ATTR` are exported from `@refrakt-md/transform`. No shipped rune is composed, so existing output is unchanged.
