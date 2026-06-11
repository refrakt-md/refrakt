{% decision id="ADR-017" status="accepted" date="2026-06-11" source="SPEC-070" tags="registry,sandbox,visualization,pipeline,architecture" %}

# Data-bound sandboxes: registry-fed visualizations

## Context

The registry can already drive content rendering — `collection` projects entities
to **HTML** (lists/grids/tables), `aggregate`/`chart` project them to **SVG**. What
it cannot do is drive **arbitrary client-side rendering**: a 3D sitemap, a
force-directed relationship graph, a globe of `places` entities — anything that
needs WebGL/canvas and a custom renderer.

The `sandbox` rune is the obvious render surface (it already runs three.js, see the
WORK-382 showcase), but a sandbox iframe is **isolated** — it cannot reach the
registry at runtime. So the question is purely: *how does build-time registry data
get into the iframe?*

Investigation of the sandbox data-flow (`packages/behaviors/src/elements/sandbox.ts`,
`packages/runes/src/tags/sandbox.ts`):

- Sandbox content is captured as **raw source text** (line-range extraction), not
  Markdoc-processed — so `{% $data %}` interpolation into the JS is *not* available.
- **But JSON injection host→iframe is already proven**: design tokens ride across as
  a `data-design-tokens` attribute that the iframe `JSON.parse`s
  (`sandbox.ts:80`), and there is a `postMessage` channel. The rail exists; nothing
  wires *registry query results* onto it.

So the missing primitive is small and well-precedented: a **build-time data channel
from a registry query into the sandbox**.

## Options Considered

1. **Data-bound sandbox — build-time query → JSON injected into the iframe
   (chosen).** A sandbox binds a registry query (SPEC-070 grammar); the pipeline
   resolves it at build (as `collection-resolve` does today), serializes the result
   to JSON, and bakes it into the iframe as a global. Author JS reads it and
   renders. Static snapshot, fits the build-time/static-rendering model, reuses the
   design-token injection rail.

2. **Runtime `postMessage` from the host.** The host page (which has the data)
   posts it to the iframe after load. *Rejected as primary.* Requires the data
   client-side on the host, a handshake, and breaks the clean static-snapshot model;
   keep `postMessage` for the existing tier-3 cross-origin case only.

3. **Hardcode data into the sandbox JS.** *Rejected.* Not "fed from the registry" —
   it drifts and defeats the point.

## Decision

Add a **data-bound sandbox**: a sandbox may bind a registry query; the pipeline
resolves it at build time and injects the JSON result into the iframe, where author
code (three.js or anything) reads it and renders.

1. **Third render target.** Frame it explicitly as the registry's third output:
   HTML (`collection`) · SVG (`aggregate`/`chart`) · **arbitrary client-side
   (data-bound sandbox)** — bring your own renderer.

2. **Reuse the injection rail.** Serialize via the same mechanism design tokens use
   (a data attribute / inline `<script type="application/json">`), exposed to the
   iframe as a documented global. No new transport.

3. **Progressive enhancement is mandatory, not optional.** A data-bound sandbox
   MUST be paired with a non-WebGL fallback — the same query rendered as a
   `collection`/`aggregate`. The visualization is enhancement over an honest
   representation; no-JS, no-WebGL, screen readers, and `prefers-reduced-motion` get
   the real thing. This is the house ethos (the same progressive-enhancement model
   the behaviours layer already follows) and the line that keeps this from being a
   gimmick.

4. **Bounded, static snapshot.** Data is resolved per build (fine for docs);
   queries carry `filter`/`limit` so the serialized payload can't bloat the page.

5. **Leans on lazy mount.** Heavy WebGL on a content page wants deferred
   activation — this is exactly the parked WORK-381 (sandbox lazy/poster), now a
   first-class dependency.

## Rationale

- **Small, well-precedented primitive.** The hard part (host→iframe JSON) is already
  solved for design tokens; this is wiring query results onto the same rail.
- **General, not bespoke.** Any registry data + any renderer — the 3D sitemap and
  relationship graph are showcases, not special cases. It composes with
  {% ref "SPEC-092" /%} (richer entity data to visualize) and SPEC-072 (the typed
  edges a graph needs).
- **Honest by construction.** The mandatory fallback makes the exotic safe — you
  never trade accessibility for spectacle.

## Consequences

- Companion spec **SPEC-093** defines the binding syntax, the build-time resolve +
  injection, the iframe-side global contract, the fallback requirement, and the
  guardrails (payload bounds, reduced-motion, lazy mount).
- **Strong pairing with {% ref "SPEC-092" /%}** (frontmatter-declared entities):
  richer queryable data (runes, tags, relationships) is what makes the
  visualizations worth building. Both sit in the v0.21.0 milestone.
- Depends on the existing field-match grammar (SPEC-070) and the relationship graph
  (SPEC-072) for graph use cases; consumes WORK-381 (lazy mount).
- Showcase use cases for the milestone: a 3D sitemap from the core `pageTree`, and a
  relationship graph from SPEC-072 edges.

{% /decision %}
