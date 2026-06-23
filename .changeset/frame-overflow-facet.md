---
"@refrakt-md/runes": patch
"@refrakt-md/transform": patch
"@refrakt-md/behaviors": patch
"@refrakt-md/lumina": patch
---

Add the `frame-overflow: clip | bleed` media-frame facet (SPEC-116, WORK-444). A guest whose content is wider than its frame — a fixed-width or naturally wide component — is clipped at the rounded inset edge by default; `frame-overflow="bleed"` instead runs an overflowing guest's inline-end out to the layout edge on a narrow viewport and squares those corners, so it reads as cropped by the screen.

It's a universal frame facet (host/slot-set), resolved onto the media zone as `data-frame-overflow`, and gated by a runtime per-guest `data-overflowing` signal — the guest reports the fact (the `sandbox` measures its iframe with hysteresis), the host decides the policy. It's meaningful only on a bleed host (hero/feature); on a clip host (card/bento-cell) the media well crops the over-width, so it's a no-op and emits a build warning. The bleed reaches a layout-owned boundary (`--rf-bleed-room-end`, default the page gutter), never the raw viewport, so a chrome'd layout can cap it at the content row. v1 is collapsed-viewport, inline-end only; direction (via `frame-anchor`) and side-by-side are deferred.
