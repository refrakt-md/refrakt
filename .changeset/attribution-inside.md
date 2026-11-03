---
'@refrakt-md/types': minor
'@refrakt-md/runes': minor
'@refrakt-md/lumina': minor
---

An attribution inside a blockquote is read as its last line (SPEC-185 D6).

- **The inside form.** A blockquote whose last paragraph is `— **Name**, Source` is attributed: the leading dash marks it, so a quote ending in bold text is not misread. A plain quotation so attributed renders as `<figure data-quote="quotation">` with its `<figcaption>`, the name in `<cite>`.
- **`pullquote` and the epigraph** accept either form, the paragraph after the quote or its last line, and render one `<figcaption>`. With both, the paragraph after the quote is the caption.
- **Item models take `prefix`**: the text a paragraph record must open with. A composition declares the inside form on its `blockquote` field as a nested model's `position: last` paragraph with `prefix: '^\s*[—–]\s*$'`. `insideAttributionItemModel` and `splitInsideAttribution` are exported from the attribution module.
- An `itemModel` in a composition now rejects keys other than `fields` and `prefix`.
