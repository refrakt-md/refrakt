---
'@refrakt-md/runes': minor
'@refrakt-md/transform': minor
---

`section` accepts `guest-fit="clip | bleed"` (default `clip`), stamped as `data-guest-fit` on its media zone (SPEC-160 D7). The native `hero` and `feature` keep `guestFit` in their config; an attribute lets compositions placing the same `section` choose different fits. A displaced guest's default `frame-displace-mode` and the `frame-overflow="bleed"` check read the resolved value.
