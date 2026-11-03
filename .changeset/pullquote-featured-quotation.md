---
'@refrakt-md/runes': minor
'@refrakt-md/transform': minor
'@refrakt-md/skeleton': minor
'@refrakt-md/lumina': minor
---

`pullquote` is the featured quotation, with its attribution (SPEC-185 D2, D4, D6, D9).

- **The markup.** A pull quote renders as `<figure data-quote="featured">` holding the authored `<blockquote>`, never a second one around it. With `excerpt=true` it is a pull quote proper: an `<aside aria-hidden="true" data-quote="excerpt">` holding the same figure, so a screen reader does not read the passage twice.
- **The attribution.** A `**Name** — Source` paragraph after the quote is read with it and rendered as a `<figcaption>`, the name in `<cite>`. The source is optional.
- **`quote`** is an alias of `pullquote`.
- **`prominence`** applies to a featured quotation or an excerpt. A rune opens it by declaring the `featured-quotation` capability in `provides`; Lumina ramps the quote's size from its resting size, as it ramps a header's title.
- **`variant` is deprecated**, with a warning: its values named looks. `accent` maps to `tint="subtle"` and `prominence="prominent"`; `default` and `editorial` map to nothing. `align` stays.
- **Lumina styles the role**, `[data-quote="featured"]` and `[data-quote="excerpt"]`, with the quotation glyph above the quote at its size: the same glyph a plain quotation carries, now shared as `--rf-glyph-quote`. `pullquote.css` keeps placement only (alignment, floats, a tinted panel).
