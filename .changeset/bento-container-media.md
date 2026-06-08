---
"@refrakt-md/marketing": patch
"@refrakt-md/lumina": patch
---

Bento media/responsive fixes:

- **Container-query responsiveness** — the bento grid is now a query container
  (`container-type: inline-size`) and its progressive-reduction/collapse rules use
  `@container` instead of `@media`, so it reduces columns and stacks based on its
  own width. Grids in doc previews, sidebars, or narrow tracks now break correctly
  instead of only at viewport breakpoints.
- **Unwrap paragraph-wrapped images** — images in a bento cell's media (and body)
  zone are unwrapped from their `<p>`, so the media zone holds a bare `<img>` and
  layouts size it directly.
- **Neutralize the global media-zone block margin** — `[data-section="media"]` no
  longer applies a `var(--rf-spacing-sm)` top/bottom margin that misaligned media
  in flex/beside layouts; media spacing now comes from each layout. Affects all
  media zones (card, recipe, realm, faction, split, bento).
