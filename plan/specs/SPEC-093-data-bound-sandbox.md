{% spec id="SPEC-093" status="draft" source="ADR-017" tags="registry,sandbox,visualization,pipeline,collection,a11y" %}

# Data-bound sandbox

Let a `sandbox` be **fed data from the registry**: bind a query, resolve it at build
time, and inject the JSON result into the iframe so author code (three.js, d3,
canvas — anything) can render it. The registry's **third render target** after
`collection` (HTML) and `aggregate`/`chart` (SVG): bring your own renderer.
Realises {% ref "ADR-017" /%}; builds on the SPEC-070 query grammar, pairs with
{% ref "SPEC-092" /%} (richer queryable entities) and SPEC-072 (relationship edges).

Target: v0.21.0.

## Overview

A sandbox gains an optional **data binding**. At build, the pipeline runs the query
against the registry (reusing the `collection-resolve` path and the field-match
grammar), serializes the result, and bakes it into the iframe as a global. The
mechanism is the one already proven for design tokens (`data-design-tokens` →
`JSON.parse` inside the iframe, `packages/behaviors/src/elements/sandbox.ts`) — no
new transport.

A data binding **requires** a fallback (below); the 3D/canvas view is progressive
enhancement over an honest representation.

## Binding syntax

```markdoc
{% sandbox src="sitemap-3d" data="type:page" /%}
```

- **`data`** — a SPEC-070 field-match query (`type:`, `filter` clauses, `sort`,
  `limit`). The pipeline resolves it to an array of entity records.
- Optional **`data-fields`** — project only the named `data` fields into the payload
  (keeps it lean; mirrors `collection`'s `fields`).
- Optional **`data-shape`** — `flat` (default, the entity array) or `tree`
  (nest by `parentUrl` — the page-tree shape the core aggregate phase already
  builds) or `graph` (nodes + SPEC-072 edges, for node-link layouts).

## Build-time resolution + injection

- A resolve step (sibling to `collection-resolve`) runs in the post-process phase,
  evaluates the query, and projects each record to a plain, serializable object
  (`id`, `type`, `url`, plus the projected `data` fields). Functions
  (`extract`/`embed`) are dropped.
- The result is attached to the sandbox element (e.g. `data-rf-records`), and the
  iframe srcdoc exposes it as a documented global — `window.RF_DATA` — plus an inert
  `<script type="application/json" id="rf-data">…</script>` for no-module access.
- **Payload bounds:** a configurable cap (records / serialized bytes); exceeding it
  is a build warning and the payload is truncated, so a runaway query can't bloat
  the page.

## Iframe-side contract

```js
// Inside the sandbox:
const data = window.RF_DATA;            // resolved at build, frozen
// data.records: [{ id, type, url, data: {...} }]
// data.tree / data.edges present when data-shape requests them
```

Stable, documented, framework-agnostic. `RF_DATA` is also available alongside the
design-token and theme globals the sandbox already injects, so a visualization can
match the palette.

## Mandatory fallback (progressive enhancement)

A data-bound sandbox MUST render a fallback for the same query when WebGL/JS is
unavailable or `prefers-reduced-motion: reduce` is set. Two ways:

- **Authored** — a `{% collection %}`/`{% aggregate %}` with the same query placed
  in the sandbox's fallback slot, OR
- **Auto** — the engine emits a default `collection` list/tree for the bound query
  when no fallback is authored.

The build **warns** if a data-bound sandbox has neither an authored nor an
auto-fallback path. The visualization is never the only representation.

## Showcase use cases (v0.21.0 demos)

- **3D sitemap** — `data="type:page" data-shape="tree"` → the core `pageTree` fed to
  a three.js tree/force layout; nodes link to their URLs. Fallback: a `collection`
  page tree.
- **Relationship graph** — `data-shape="graph"` over SPEC-072 edges → a force-directed
  node-link graph (plan `spec → work → decision → milestone`; or, post
  {% ref "SPEC-092" /%}, `rune → plugin`). Fallback: a `relationships` list.
- Further: a `places` globe (lat/long points), a milestone timeline helix.

## Guardrails

- **Static snapshot** — data is build-time; re-renders on rebuild.
- **Bounded payload** — `filter`/`limit`/`data-fields` + the hard cap.
- **Lazy mount** — heavy WebGL defers via WORK-381 (sandbox lazy/poster); pair them.
- **Reduced motion** — fallback (or a static frame) under `prefers-reduced-motion`.
- **Security** — first-party registry data serialized as JSON is safe; the CDN
  import for the renderer follows the existing sandbox security tiers.

## Non-goals

- Runtime/live data (no server round-trips) — build-time snapshot only.
- A built-in 3D/graph renderer — authors bring their own (three.js, d3); refrakt
  ships the data channel, not the visualizations.
- Two-way interaction back into the registry — read-only projection.

## Acceptance Criteria

- [ ] A `sandbox` accepts a `data` query (SPEC-070 grammar) resolved at build via the
  shared resolve path; the projected, serializable result is injected as
  `window.RF_DATA` (+ a JSON `<script>`), alongside the existing token/theme globals.
- [ ] `data-fields` projects a subset; `data-shape` supports `flat` | `tree` | `graph`
  (graph consuming SPEC-072 edges).
- [ ] Payload exceeding the configured cap warns and truncates.
- [ ] A data-bound sandbox without a fallback (authored or auto) warns; the
  documented fallback renders the same query as a `collection`/`aggregate`.
- [ ] Docs + a working showcase: the 3D sitemap and/or the relationship graph, each
  with its honest fallback.

## References

- {% ref "ADR-017" /%} — the decision (third render target, mandatory fallback, prior art).
- SPEC-070 — the field-match grammar and `collection`/`aggregate`.
- {% ref "SPEC-092" /%} — frontmatter entities (richer data to visualize).
- WORK-381 — sandbox lazy/poster activation (deferred mount for heavy WebGL).
- `packages/behaviors/src/elements/sandbox.ts` (token injection rail), `collection-resolve.ts`.

{% /spec %}
