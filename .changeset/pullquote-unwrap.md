---
'@refrakt-md/runes': patch
'@refrakt-md/lumina': patch
---

`pullquote` no longer nests a quotation in a quotation. When its content is a blockquote, the pull quote is the one `<blockquote>`: it takes the authored blockquote's paragraphs and its attributes, so a schema `property` on it (a testimonial's `reviewBody`) lands on the pull quote. Lumina's reset for the inner blockquote is removed; the pull quote renders the same.
