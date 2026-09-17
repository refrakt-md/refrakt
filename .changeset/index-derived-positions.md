---
"@refrakt-md/runes": minor
"@refrakt-md/business": minor
---

Generate breadcrumb and timeline positions from a declared index (WORK-571)

`breadcrumb` and `timeline` used to walk their children and push a
`<meta property="position">` into each. Both now declare
`generated: { position: 'index' }` and the applier produces it — the one
generator in the vocabulary, used by exactly these two runes.

**`position` is now a string.** The generator emits `String(index + 1)`, so the
RDFa attribute and the JSON-LD say the same thing. Before this the meta carried
a *number*, which the JSON-LD collector passed through verbatim while the
rendered markup stringified it — the two channels disagreed on every breadcrumb
and every timeline. If you read `position` out of a page's JSON-LD, compare it
as a string or coerce it.

**`itemListElement` is a declared list**, so a one-item breadcrumb trail or a
one-entry timeline emits an array rather than a bare object, as `pricing`'s
`offers` already did.

`{% breadcrumb auto=true %}` is built from a pipeline hook rather than a Markdoc
schema, so the wrapper that normally applies a rune's table cannot reach it. The
hook now calls the applier itself, which means both breadcrumb paths publish
from the *same* table instead of from a declaration and a hand-written copy that
can drift apart.
