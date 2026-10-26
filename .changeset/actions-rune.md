---
'@refrakt-md/runes': minor
'@refrakt-md/marketing': minor
'@refrakt-md/skeleton': minor
'@refrakt-md/lumina': minor
---

New core rune `{% actions %}`: a row of actions from a plain list of links, with an optional fence as a copyable command line (SPEC-160 D6).

- **Rank is a data attribute.** Each link item is `<li data-name="action">` with `data-rank="primary"` on the first link of the row and `secondary` on the rest. Themes style the rank, not the list position.
- **`hero` and `cta` render their buttons through it.** Their actions region is now a nested `data-rune="actions"`. It keeps `rf-hero__actions` / `rf-cta__actions` beside `rf-actions`.
- **Button CSS lives in `actions.css`** in Lumina and the skeleton. It is no longer copied into `hero.css` and `cta.css`, which now set only `--action-padding`, `--action-font-size` and `--actions-justify`.

Three visible changes:

- **The primary button's text follows the colour scheme** (`--rf-color-on-primary`). In dark mode it was white on a near-white fill and barely readable. It now has proper contrast, and the cover hero's override for the same problem is gone.
- **Narrower selectors.** `hero` and `cta` used to style any list or `nav` inside them as a row of buttons. Only their actions list is styled now.
- **One primary per row.** "Primary" was the first item of *each* list, so a hero written as list, fence, list had two primary buttons. It is now the first link of the whole row.
