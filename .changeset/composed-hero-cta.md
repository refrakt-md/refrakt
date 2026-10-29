---
'@refrakt-md/runes': minor
'@refrakt-md/skeleton': minor
'@refrakt-md/lumina': minor
---

`hero` and `cta` can be built as compositions over `section` and `actions` (SPEC-160 D7). The plugin runes are unchanged, and replacing them is a later step. The vocabulary those compositions need moves into shared CSS:

- **Button size follows `prominence`.** In `actions.css`, an `actions` whose nearest enclosing rune is `prominence="display"` or `"prominent"` gets the large hero-size buttons. Anything else gets the default cta size. Each other rune root clears the size, so a card inside a display section keeps default buttons.
- **A `section`'s `align` positions its own actions row**, alongside its header.
- **A cover-mode `section` is a band.** Its height comes from its content and `height` / `aspect`, not from the cover layer's portrait default. With no `content-place`, the content sits mid-band over an evenly darkened scrim. A flush cover section's media has no radius.
- **Fix:** a centred or end-aligned `section` header is aligned again. Lumina's `margin: 0` had cancelled the skeleton's auto margins.
- **Fix:** `media-position="end"` keeps a media-first rune's content beside its media, on the first row (`grid-auto-flow: dense`). Before, `section` and `card` put the content on a second row.
- **A composed rune no longer turns an enum attribute it only forwards into a `data-*` modifier on its root.** For example, `realm`'s `media-position` reaches its `section` but no longer appears on the wrapper. There it had laid the wrapper out as a split, or as a cover well. The value stays in the field bag.

When `cta` is composed, two leading headings are read as a headline and body, no longer as an eyebrow and a headline (ADR-046).
