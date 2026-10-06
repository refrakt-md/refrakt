---
'@refrakt-md/runes': patch
'@refrakt-md/marketing': patch
'@refrakt-md/design': patch
'@refrakt-md/learning': patch
'@refrakt-md/storytelling': patch
'@refrakt-md/business': patch
'@refrakt-md/places': patch
'@refrakt-md/media': patch
'@refrakt-md/plan': patch
---

Simplify rune transforms: optional slots and shared text helpers (WORK-600, WORK-601)

- `properties` and `refs` on `createComponentRenderable` now accept `null` as well
  as `undefined`; both are skipped. The 52 `...(x ? { k: x } : {})` guards inside
  slot literals are now plain `k: x`.
- `extractText(node)` (concatenated text of an AST node) is exported from
  `@refrakt-md/runes` and replaces six identical local copies. Three plugin-local
  text helpers on rendered trees now use the exported `textContent`.

Rendered output is unchanged.
