---
'@refrakt-md/transform': minor
'@refrakt-md/runes': minor
'@refrakt-md/marketing': minor
'@refrakt-md/skeleton': minor
'@refrakt-md/lumina': minor
---

`{% link %}` now wraps blocks, and linked cards and bento cells are reachable by keyboard and screen readers (SPEC-160 D8).

- **Linked cards and bento cells are real links now.** Their whole-card `href` overlay used to be `aria-hidden="true" tabindex="-1"`, so a keyboard or screen-reader user could not reach it. It is now a focusable link with one tab stop per card, named by the card's title (`aria-labelledby`), with a visible focus ring in Lumina.
- **`{% link %}` around blocks makes the whole region a link.**
  - With nothing interactive inside, the region is wrapped in a real `<a data-link="wrap">`.
  - With links or controls inside, a stretched `<a data-link="stretch">` is laid over the region instead, so no `<a>` is nested.
  - The choice is made in the identity transform, so it sees links that `postProcess` adds.
  - The link is named by `aria-label` when given, else by the content's title.
  - An empty `href` leaves the content unlinked.
  - It adds no `data-rune`, so structured data inside it still publishes.
- **Unchanged:** the inline form, `{% link href=… %}text{% /link %}` in a line of text, renders a plain `<a>` as before.
- **Shared CSS.** The stretched-link positioning moved from `card.css` and `bento.css` into a shared `dimensions/link.css` keyed on `data-link`, so it works around any rune.
