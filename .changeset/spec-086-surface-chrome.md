---
"@refrakt-md/runes": minor
"@refrakt-md/transform": minor
"@refrakt-md/lumina": minor
"@refrakt-md/types": minor
---

SPEC-086 surface chrome. Adds a universal `elevation` attribute (self-surface
`box-shadow` on the `--rf-shadow-*` scale), a `frames` preset registry with the
`frame` attribute and inline `frame-*` facets (modelled on `bg`), `RuneConfig.frameTarget`
routing (media zone vs self) with a build warning when unresolved, and a shared
frame CSS layer (silhouette drop-shadow, displacement/peek, oversize, place,
anchor). `showcase` collapses into the frame model as `frameTarget: 'self'`; its
`shadow`/`bleed`/`offset`/`aspect`/`place` attributes are deprecated aliases for
`frame-*` facets (warn for one minor, then removed), with breakout retained. The
`offset` named scale is completed (`none|sm|md|lg|xl`) and its raw-length
fallthrough closed.
