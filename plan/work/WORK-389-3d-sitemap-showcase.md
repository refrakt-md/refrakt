{% work id="WORK-389" status="review" priority="medium" complexity="moderate" source="SPEC-093" milestone="v0.21.0" tags="sandbox,showcase,threejs,registry" %}

# 3D sitemap showcase

The launch showcase for the data-bound sandbox — and the simplest, since the data
already exists: the core `pageTree`. A `data-shape="tree"` sandbox renders the site
as a navigable 3D map (three.js tree/force layout); nodes link to their URLs.

## Acceptance Criteria
- [x] A data-bound sandbox (`data="type:page" data-shape="tree"`) renders the page tree as a 3D sitemap; nodes are clickable to their URLs.
- [x] An **authored fallback** renders the same tree as an honest `collection` (a real, navigable page tree) for no-JS / no-WebGL / screen readers.
- [ ] Honours `prefers-reduced-motion` (static frame) and is **lazily mounted** (poster until in view).
- [x] Pinned three.js; `vite build` green (no SSR/WebGL at build).

## Dependencies
- {% ref "WORK-388" /%} (the data channel + `tree` shape) and {% ref "WORK-381" /%} (lazy/poster mount for the heavy WebGL).

## References
- {% ref "SPEC-093" /%} · core aggregate phase (`pageTree`)

## Resolution

Completed: 2026-06-11

Branch: `claude/work-389-3d-sitemap`.

### What was done
- `site/examples/sitemap-3d/index.html` — a three.js scene that reads `window.RF_DATA.tree`, lays the pages out as a radial tree (depth → radius, leaves spread by angle), renders nodes + edges, supports drag-to-rotate + gentle auto-spin, hover tooltips, and **click-to-navigate** (`window.top.location` → the node's URL). Dark-aware, pinned `three@0.160.0`, `prefers-reduced-motion` → one static frame, try/catch → the accessible fallback.
- `runes/sandbox.md` gains a **"Data binding — window.RF_DATA"** section: documents `data` / `data-shape` / `data-fields` / `data-limit`, the live 3D sitemap of the rune section (`data="type:page url:/runes/*" data-shape="tree"`), and an authored `{% collection %}` fallback over the same query.
- **Bug fix (in WORK-388's `data-resolve.ts`, surfaced here):** page `url`s have no trailing slash but `parentUrl`s do, so `toTree` never nested. Added `stripSlash` normalization; the unit test now uses the real convention and asserts nesting.

### Verification
- Full **sveltekit** site build green; the sandbox emits `data-rf-query`/`data-rf-shape=tree` and the resolved `data-rf-records` payload nests correctly — **60 roots, 9 plugin sections with their rune children nested (50 children)** — and the `collection` fallback renders. This doubles as the cross-adapter (sveltekit) confirmation of WORK-388's resolver.
- `data-resolve.test.ts` green (8); runes build clean.

### Why review, not done
- The actual **3D render + click navigation needs a browser** (window.RF_DATA reaching the iframe — the live test WORK-388 was waiting for). The data is verified end-to-end; the WebGL render isn't headlessly checkable. A glance at `cd site && npm run dev` → /runes/sandbox (the "Data binding" section) confirms it.
- **Lazy-mount deferred:** criterion 3's "lazily mounted (poster until in view)" needs WORK-381 (not yet done). The scene is eager for now — consistent with sandbox.md's other live sandboxes; it'll lazy-mount once WORK-381 lands. (reduced-motion is done.)
- The fallback is a flat navigable `collection` list (collection doesn't render nested trees) — the same data, accessible; a nested-tree fallback would need a new layout.

{% /work %}
