---
'@refrakt-md/runes': minor
'@refrakt-md/lumina': minor
---

An attributed blockquote opening a page or a section is an epigraph (SPEC-185 D5).

- **In a section.** `section`'s header grammar gains an optional epigraph after the blurb: a blockquote with a `**Name** — Source` paragraph after it, read together. Every rune composed over `section` reads it the same way; `header="headline"` reads none.
- **At the start of a page.** A blockquote opening a page's content, or directly after its `#` title, with an attribution after it, is the page's epigraph.
- **Only with an attribution.** Without one the blockquote stays a quotation, and a lone attribution after a headline stays the blurb. A heading inside a body does not open an epigraph.
- An epigraph renders as `<figure data-quote="epigraph">` with the `<figcaption>`, and Lumina styles the role: quieter than the text, set toward the end of the line, centred under a centred header.
- The attribution reader is shared by every role (`attributionItemModel`, `readAttribution`, `renderAttribution`, `renderAttributedQuote` in `lib/attribution.ts`).
