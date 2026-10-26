---
'@refrakt-md/runes': minor
'@refrakt-md/skeleton': minor
'@refrakt-md/lumina': minor
---

`section` gains the media split, cover and a media kind (SPEC-160 D2, ADR-041). A titled region with media no longer needs `card`, which draws a surface.

- **Split.** `media-position` (`top | bottom | start | end | cover`), `media-ratio`, `valign` and `collapse` work as on `card`. With `media-position`, a section splits on `---` into a media zone, the content and an optional footer. The header stays in the content column, and an empty leading zone leaves the media out.
- **Opt-in.** Without `media-position`, a section renders exactly as before, and a `---` stays an ordinary rule in its body.
- **Cover.** `media-position="cover"` overlays the content on the media, with `content-place`, `height` and `aspect`, as on `card`.
- **Media kind.** `media` (`portrait | cover | thumbnail | hero | icon`) stamps `data-media` on the media zone, so the media dimension styles it. A portrait is cropped round with no CSS of its own.
- **Card.** `card`'s output does not change.
