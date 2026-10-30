---
'@refrakt-md/transform': minor
'@refrakt-md/runes': minor
'@refrakt-md/lumina': minor
---

`prominence` gains a fifth step, `marquee`, above `display`: a landing page's opening band (SPEC-183). Each step now sizes the whole header, not just its title, and Lumina publishes the values as custom properties a theme can retune.

- **`marquee`** ramps the title to 13/6 of the resting size (3.25rem from the default).
- **The blurb grows** from `prominent` up: `text-lg` at `prominent` and `display`, `text-xl` at `marquee`. The header's gaps widen with it.
- **A flush band at `display` or `marquee` takes a band's padding**: 3.5rem / 3rem and 7rem / 6.5rem, less on narrow screens. A cover band moves it onto the overlaid content.
- **Lumina draws `display` and `marquee` titles as a gradient.** It is dropped under forced colours and never reaches a nested rune's title.
- **Large buttons now come with `marquee` only.** A `display` or `prominent` section's actions take the default size.
