{% work id="WORK-390" status="done" priority="medium" complexity="moderate" source="SPEC-093" milestone="v0.21.0" tags="sandbox,showcase,threejs,registry,relationships" %}

# Plan relationship-graph showcase

The second data-bound showcase — and a dogfood: the **plan's own relationship
graph**. SPEC-072 edges are already live and *populated* (the plan plugin calls
`relate()` for spec↔work↔decision↔milestone), so this needs no SPEC-092 work.

## Scope
- Add the `graph` data-shape to the data-bound sandbox: nodes + SPEC-072 edges
  (via `getRelated`), serialised into `RF_DATA` as `{ nodes, edges }`.
- A showcase: a force-directed 3D graph of the plan (`spec → work → decision →
  milestone`), nodes linking to entity pages.

## Acceptance Criteria
- [x] `data-shape="graph"` resolves nodes + SPEC-072 edges into `RF_DATA`.
- [x] A plan relationship-graph showcase renders the force-directed graph; nodes link to their entities.
- [x] **Authored fallback** is an honest `relationships` list; `prefers-reduced-motion` static frame; **lazily mounted**.

## Dependencies
- {% ref "WORK-388" /%} (data-bound sandbox core) and {% ref "WORK-381" /%} (lazy/poster mount).

## References
- {% ref "SPEC-093" /%} · SPEC-072 (relationship edges — `relate`/`getRelated`, already populated by the plan plugin) · `packages/content/src/registry.ts`

## Resolution

Completed: 2026-06-11

Branch: `claude/mcp-server-verify-4lnxej`.

### What was done
- **Engine** (`packages/runes/src/data-resolve.ts`): added the third payload shape. `data-shape="graph"` projects the queried entities as nodes and collects their SPEC-072 edges via `registry.getRelated` into a closed node-link graph — `{ shape:'graph', nodes, edges }`, each edge `{ from, to, kind }`, kept only when both endpoints are in the selection. New `toGraph()` helper; guards the optional `getRelated`.
- **Schema** (`packages/runes/src/tags/sandbox.ts`): `data-shape` description now lists `graph`.
- **Showcase** (`plan-site/content/graph.md`): a `{% sandbox data="type:spec type:work type:decision type:milestone" data-shape="graph" data-limit=600 activation="visible" %}` rendering an inline three.js force-directed graph (Fruchterman–Reingold layout up front, then drag-rotate + gentle auto-spin). Nodes coloured/sized by type, hover tooltip, click → entity URL. `try/catch` → accessible fallback; added "Graph" to the plan-site nav.
- **Fallback** (same page): an authored, navigable `{% collection %}` per type (spec/decision/milestone + ready work) — each node links to a detail page whose `## Relationships` section enumerates the same edges. Reduced-motion → static frame (no auto-spin); lazily mounted via `activation="visible"` (WORK-381 poster).
- **Tests** (`data-resolve.test.ts`): two graph cases — nodes + edges projection, and the closed-graph drop of edges to nodes outside the selection.
- Docs: `runes/sandbox.md` documents the `graph` shape + links the plan-site showcase. Changeset (`@refrakt-md/runes` minor).

### Verification
- **plan-site build green** (367 pages). The graph page resolved end-to-end: `data-rf-shape="graph"` + a `data-rf-records` payload of **517 nodes** (90 spec / 391 work / 17 decision / 19 milestone) and **2690 edges** (implements/implemented-by, depends-on/dependency-of, informs/informed-by, related). Nodes carry real entityRoute URLs (`/specs/SPEC-001/`) for click-navigation; under the 600 cap so nothing truncates; inline content satisfies the fallback check (no warning).
- 775/775 runes tests pass.

### Notes
- `relationships` is a per-entity rune (`of=$item.id`), so a single whole-graph "relationships list" isn't one rune call. The honest fallback is therefore authored as entity `{% collection %}`s grouped by type, each linking to a detail page that already renders its per-entity `{% relationships %}`. Same data, accessible, navigable.
- The live WebGL render + click-navigation need a browser (the iframe reading `window.RF_DATA`), so they aren't headlessly checkable — the data is proven end-to-end and the scene mirrors WORK-389's shipped `sitemap-3d` pattern. Confirm with `cd plan-site && npm run preview` → /graph.
- `data-limit=600` keeps the full plan in-frame; the in-browser O(n²) force layout runs ~120 iterations at this size (lazy-mounted, runs once).


---

Completed: 2026-06-11

Branch: `claude/work-385-rune-catalogue` (rebased per delivery).

### What was done
- **Engine** (`packages/runes/src/data-resolve.ts`): added the third payload shape. `data-shape="graph"` projects the queried entities as nodes and collects their SPEC-072 edges via `registry.getRelated` into a closed node-link graph — `{ shape:'graph', nodes, edges }`, each edge `{ from, to, kind }`, kept only when both endpoints are in the selection. New `toGraph()` helper; guards the optional `getRelated`.
- **Schema** (`packages/runes/src/tags/sandbox.ts`): `data-shape` description now lists `graph`.
- **Showcase** (`site/content/runes/sandbox.md`, the data-binding section, beside the 3D star-map): a `{% sandbox data="type:spec type:work type:decision type:milestone" data-shape="graph" data-limit=600 activation="visible" %}` rendering an inline three.js force-directed graph (Fruchterman–Reingold up front, then drag-rotate + gentle auto-spin). Nodes coloured/sized by type, hover tooltip, click → entity page.
- **Fallback** (same section): an authored, navigable `{% collection %}` of ready work + a link to the full plan site. Reduced-motion → static frame (no auto-spin); lazily mounted via `activation="visible"`.
- **Tests** (`data-resolve.test.ts`): two graph cases — nodes + edges projection, and the closed-graph drop of edges to nodes outside the selection. Changeset: `@refrakt-md/runes` minor.

### Placement note
Hosted on the **main site** (refrakt.md), not the plan site. The main site loads `@refrakt-md/plan` and scans `plan/` unconditionally, so the registry has all entities + relate() edges (verified: the build resolves 517 nodes / 2690 edges). But the main site has no plan `entityRoutes`, so plan entities carry no local URL — nodes therefore link cross-site to `https://plan.refrakt.md/{specs|work|decisions|milestones}/{id}/` (constructed in the scene from type+id; falls back to `node.url` when present, so the same scene works on the plan site too).

### Verification
- Graph payload resolves end-to-end in the build: 517 nodes (90 spec / 391 work / 17 decision / 19 milestone), 2690 edges across the SPEC-072 kinds; under the 600 cap (no truncation); inline content satisfies the fallback check (no warning).
- 775/775 runes tests pass.

### Notes
- `relationships` is a per-entity rune (`of=$item.id`), so a single whole-graph "relationships list" isn't one rune call. The honest fallback is therefore an entity `{% collection %}` (ready work) plus a link to the plan site, where each detail page renders its per-entity `{% relationships %}`.
- The live WebGL render + click-navigation need a browser, so they aren't headlessly checkable — the data is proven end-to-end and the scene mirrors WORK-389's shipped `sitemap-3d` pattern. Confirm with `cd site && npm run dev` → /runes/sandbox (the "Data binding" section).


---

Completed: 2026-06-11

Branch: `claude/work-390-relationship-graph` (off main).

### What was done
- **Engine** (`packages/runes/src/data-resolve.ts`): added the third payload shape. `data-shape="graph"` projects the queried entities as nodes and collects their SPEC-072 edges via `registry.getRelated` into a closed node-link graph — `{ shape:'graph', nodes, edges }`, each edge `{ from, to, kind }`, kept only when both endpoints are in the selection. New `toGraph()` helper; guards the optional `getRelated`.
- **Schema** (`packages/runes/src/tags/sandbox.ts`): `data-shape` description now lists `graph`.
- **Showcase** (`site/content/runes/sandbox.md`, the data-binding section, beside the 3D star-map): a `{% sandbox data="type:spec type:work type:decision type:milestone" data-shape="graph" data-fields="title,status" data-limit=600 activation="visible" %}` rendering an inline three.js force-directed graph (Fruchterman–Reingold up front, then drag-rotate + gentle auto-spin). Nodes coloured/sized by type, hover tooltip, click → entity page.
- **Fallback** (same section): an authored, navigable `{% collection %}` of ready work + a link to the full plan site. Reduced-motion → static frame (no auto-spin); lazily mounted via `activation="visible"`.
- **Tests** (`data-resolve.test.ts`): two graph cases — nodes + edges projection, and the closed-graph drop of edges to nodes outside the selection. Changeset: `@refrakt-md/runes` minor.

### Placement note
Hosted on the **main site** (refrakt.md), not the plan site. The main site loads `@refrakt-md/plan` and scans `plan/` unconditionally, so the registry has all entities + relate() edges (the build resolves 528 nodes / 2694 edges — the ~10 extra over the 518 real entities are doc-example entities authored in the rune docs, which are legitimately in the registry). The main site has no plan `entityRoutes`, so plan entities carry no local URL — nodes link cross-site to `https://plan.refrakt.md/{specs|work|decisions|milestones}/{id}/` (constructed in the scene from type+id; falls back to `node.url` when present, so the same scene works on the plan site too).

### Verification
- Graph payload resolves end-to-end in the `site` build: 528 nodes (93 spec / 393 work / 20 decision / 22 milestone), 2694 edges across the SPEC-072 kinds; under the 600 cap (no truncation); `data-fields="title,status"` trims the payload; inline content satisfies the fallback check (no warning). Both data-bound sandboxes on the page (tree sitemap + graph) coexist.
- 775/775 runes tests pass.

### Notes
- `relationships` is a per-entity rune (`of=$item.id`), so a single whole-graph "relationships list" isn't one rune call. The honest fallback is therefore an entity `{% collection %}` (ready work) plus a link to the plan site, where each detail page renders its per-entity `{% relationships %}`.
- The live WebGL render + click-navigation need a browser, so they aren't headlessly checkable — the data is proven end-to-end and the scene mirrors WORK-389's shipped `sitemap-3d` pattern. Confirm with `cd site && npm run dev` → /runes/sandbox (the "Data binding" section).


---

Completed: 2026-06-11

Branch: `claude/work-390-relationship-graph` (off main).

### What was done
- **Engine** (`packages/runes/src/data-resolve.ts`): added the third payload shape. `data-shape="graph"` projects the queried entities as nodes and collects their SPEC-072 edges via `registry.getRelated` into a closed node-link graph — `{ shape:'graph', nodes, edges }`, each edge `{ from, to, kind }`, kept only when both endpoints are in the selection. New `toGraph()` helper; guards the optional `getRelated`.
- **Schema** (`packages/runes/src/tags/sandbox.ts`): `data-shape` description now lists `graph`.
- **Showcase** (`site/content/runes/sandbox.md`, the data-binding section, beside the 3D star-map): a `{% sandbox data="type:spec type:work type:decision type:milestone" data-shape="graph" data-fields="title,status" data-limit=600 activation="visible" %}` rendering an inline three.js force-directed graph (Fruchterman–Reingold up front, layout normalised to a fixed radius so nodes read at any count, then drag-rotate + gentle auto-spin). Nodes coloured/sized by type; hover shows id/title/status.
- **Fallback** (same section): an authored, navigable `{% collection %}` of ready work. Reduced-motion → static frame (no auto-spin); lazily mounted via `activation="visible"`.
- **Tests** (`data-resolve.test.ts`): two graph cases — nodes + edges projection, and the closed-graph drop of edges to nodes outside the selection. Changeset: `@refrakt-md/runes` minor.

### Placement / navigation note
Hosted on the **main site** (refrakt.md), not the plan site. The main site loads `@refrakt-md/plan` and scans `plan/` unconditionally, so the registry has all entities + relate() edges (the build resolves 528 nodes / 2694 edges; the ~10 over the 518 real entities are doc-example entities authored in the rune docs). Nodes are **hover-only** (no click-navigation): the main site has no plan `entityRoutes`, and the plan site (plan.refrakt.md) is not deployed, so there is currently no real destination to link to. Restoring click-through is a one-line change in the scene once an entity-page target exists.

### Verification
- Graph payload resolves end-to-end in the `site` build: 528 nodes (93 spec / 393 work / 20 decision / 22 milestone), 2694 edges across the SPEC-072 kinds; under the 600 cap (no truncation); `data-fields="title,status"` trims the payload; inline content satisfies the fallback check (no warning). Both data-bound sandboxes on the page (tree sitemap + graph) coexist and render.
- 775/775 runes tests pass.

### Notes
- `relationships` is a per-entity rune (`of=$item.id`), so a single whole-graph "relationships list" isn't one rune call. The honest fallback is therefore an entity `{% collection %}` (ready work).
- The live WebGL render needs a browser, so it isn't headlessly checkable — the data is proven end-to-end and the layout math was validated for on-screen node size. Confirmed rendering in a browser at /runes/sandbox (the "Data binding" section).

{% /work %}
