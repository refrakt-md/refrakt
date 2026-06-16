---
"@refrakt-md/skeleton": patch
"@refrakt-md/lumina": patch
"@refrakt-md/behaviors": patch
---

**Fix: `mockup` as a media guest renders correctly (incl. iOS Safari).** A mockup placed in a rune's media zone (cards, bento) now fills its slot instead of capping at its native size, and is inset from the media-zone sides. The upscale is gated to fine-pointer / wide slots, scaled with `transform` rather than `zoom`, and its fill factor is measured in JS (a new `mockup` behaviour) rather than `cqi` — fixing the sizing on iOS Safari.
