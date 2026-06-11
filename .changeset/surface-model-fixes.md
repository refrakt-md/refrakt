---
"@refrakt-md/lumina": patch
"@refrakt-md/transform": patch
---

Surface model fixes, found and fixed while building the surface documentation:

- **Cover scrims** now clip to the media zone's rounded corners; a centred `content-place` emits a radial scrim (`farthest-side`) that reaches the box edges instead of leaving the sides of a wide aspect uncovered; dark-tint scrim support.
- **Frame** — displaced / oversized peeks clip correctly at the media zone and carry across the mobile breakpoint; `frame-shadow` rides the guest's silhouette on a `figure`.
- **Substrate** — the `cross` pattern redraws crisply at any device-pixel-ratio; `substrate-target="media"` routing.
- **Media-zone guests** (chart, diagram, map) drop their own double chrome and inherit the slot surface; a `map` card gains a slot aspect.
- **`bg`** stacks content above the background layer and clips to the rounded surface.
