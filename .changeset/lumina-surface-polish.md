---
"@refrakt-md/lumina": patch
---

Surface/media polish:

- More generous vertical spacing (`--rf-spacing-md`) between a top media banner
  and the content below it, in card/recipe/bento and on mobile stacks.
- A `code-group` nested in a media zone now rounds at the media radius tier so
  its border lines up with the zone's clip instead of the larger container
  radius.
- Dark-mode code background was a near-neutral grey that clashed with the warm
  `surface`; it's been warmed to the surface hue (`#1e1c19`, also applied to the
  derived `--rf-syntax-background`).
- A `card` with no `href` no longer shows a hover background — the hover is now
  gated on the presence of the stretched card link.
- The semantic `--rf-radius-container` / `--rf-radius-media` / `--rf-media-margin`
  aliases moved from the generated token contract into the styles layer (they
  reference the scale rather than holding raw values).
