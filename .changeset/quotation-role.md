---
'@refrakt-md/runes': minor
'@refrakt-md/transform': minor
'@refrakt-md/lumina': minor
'@refrakt-md/skeleton': patch
'@refrakt-md/learning': patch
'@refrakt-md/marketing': patch
---

A quotation carries its role, and a theme styles the role, not the `blockquote` element (SPEC-185 D3).

- **The marker.** The core `blockquote` node marks a plain `>` as `data-quote="quotation"`. A rune that reinterprets `>` takes the marker off what it renders (`withoutQuoteRole`): a recipe's tips, a testimonial's quote, a pull quote. `QUOTE_ROLES` (quotation, featured, excerpt, epigraph) joins the theme vocabulary.
- **Lumina.** The global `blockquote` rule becomes `[data-quote="quotation"]`. A quotation in the `ui` reading register is set quieter. An unmarked blockquote gets a minimal zero-specificity fallback. The testimonial's glyph reset is gone, with nothing left to undo.
- **Visible changes:**
  - a recipe tip no longer shows the quotation glyph over its text;
  - a pull quote shows its own large glyph instead of the quotation icon's.

**For theme authors:** a rule on `blockquote` now reaches tips and pull quotes as well as quotations. Style the role with `[data-quote="quotation"]`.
