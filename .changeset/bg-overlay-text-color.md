---
'@refrakt-md/transform': patch
'@refrakt-md/lumina': patch
---

**Text stays readable over a background.** A `{% bg %}` with `overlay="dark"` or `overlay="light"` now switches the rune's text to light or dark to match, as a scrim already did, unless a tint has set the color scheme. Over a scrim or a dark or light wash, Lumina shows muted text (a blurb) at full strength, as it does on a cover, so it no longer fades into the photo.
