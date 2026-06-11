{% work id="WORK-389" status="ready" priority="medium" complexity="moderate" source="SPEC-093" milestone="v0.21.0" tags="sandbox,showcase,threejs,registry" %}

# 3D sitemap showcase

The launch showcase for the data-bound sandbox — and the simplest, since the data
already exists: the core `pageTree`. A `data-shape="tree"` sandbox renders the site
as a navigable 3D map (three.js tree/force layout); nodes link to their URLs.

## Acceptance Criteria
- [ ] A data-bound sandbox (`data="type:page" data-shape="tree"`) renders the page tree as a 3D sitemap; nodes are clickable to their URLs.
- [ ] An **authored fallback** renders the same tree as an honest `collection` (a real, navigable page tree) for no-JS / no-WebGL / screen readers.
- [ ] Honours `prefers-reduced-motion` (static frame) and is **lazily mounted** (poster until in view).
- [ ] Pinned three.js; `vite build` green (no SSR/WebGL at build).

## Dependencies
- {% ref "WORK-388" /%} (the data channel + `tree` shape) and {% ref "WORK-381" /%} (lazy/poster mount for the heavy WebGL).

## References
- {% ref "SPEC-093" /%} · core aggregate phase (`pageTree`)

{% /work %}
