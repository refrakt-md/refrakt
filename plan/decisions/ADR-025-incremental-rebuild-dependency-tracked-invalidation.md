{% decision id="ADR-025" status="proposed" date="2026-06-25" source="SPEC-113" tags="pipeline,incremental,performance,architecture,hosted,registry" %}

# Incremental rebuild: dependency-tracked invalidation with the registry as firewall

## Context

Today every build is a full build. `processContentTree` re-parses and
re-transforms **every** page on every call (`packages/content/src/site.ts`, the
`for (const page of tree.pages())` loop), and `runPipeline`
(`packages/content/src/pipeline.ts`) re-runs all three cross-page phases —
register → aggregate → post-process — over the entire page array. There is no
memoization, no dirty-tracking, and no dependency graph anywhere in the pipeline.

This is fine for CLI builds of a docs site, and {% ref "SPEC-113" /%}
deliberately keeps it that way. But the hosted product (a GitHub app that
re-renders a tenant's repo on push) makes the cost visible: a one-character edit
to one file triggers a whole-site recompute. {% ref "SPEC-113" /%}'s warm-map /
incremental-*fetch* path makes re-reading cheap, but it explicitly does **not**
make re-*building* cheap — recompute stays whole-corpus. At some site size or
rebuild-latency threshold we will want per-file incremental rebuild.

We are not building that engine now. This ADR records **how to think about it**
so that the {% ref "SPEC-113" /%}-era work is shaped to enable it cheaply,
rather than forcing an expensive retrofit later.

### Local dev HMR is the second beneficiary

The hosted product is not the only consumer. The Vite adapters' content HMR has
the *same* whole-corpus shape today. On any `.md` save, `setupContentHmr`
(`packages/transform/src/content-hmr.ts`) calls `invalidateSite()` — which nulls
the loader's single memoized `Promise<Site>` (`packages/content/src/loader.ts`;
the cache is binary, no per-page granularity) — and sends a blanket
`full-reload`. The next SSR request re-reads the entire content dir, re-parses
and re-transforms every page, and re-runs register → aggregate → post-process
over the whole corpus. So a single keystroke-save costs a full rebuild; it is the
*local* analog of the hosted single-file-webhook case. An incremental engine
therefore pays off **twice** — hosted rebuild latency *and* local dev DX — and
unlocks a second-order HMR win: knowing the dirty cut lets the adapter send a
**scoped** reload (only the routes whose output actually changed) instead of the
blanket `full-reload` it is forced into today precisely *because* any edit can,
in principle, move any other page's output.

### The dependency structure (read from the code)

The pipeline already *is* a DAG; its phase boundaries are the edges.

- **A page's renderable** depends on: its own source bytes; its layout chain
  (the `_layout.md` cascade up the directory tree); every partial it references
  (`{% partial %}`, incl. namespaced `fileRoots`); every file it reads via
  snippet / `data` / sandbox `src`; site-wide config / icons / variables; **and**
  — the awkward one — for `expand` / `collection`, the *rendered content of
  other entities* it embeds.
- **The registry** is a fold over all pages: each page contributes its entities
  independently.
- **Aggregated data** (`pageTree`, `breadcrumbPaths`, `headingIndex`, …) depends
  on the *whole* registry.
- **`postProcess(page)`** depends on the page's renderable plus the slices of
  aggregated data it consumes.

### The key property: the registry is the firewall

When page X changes there are three escalating blast radii, and the registry is
what distinguishes them:

- **Tier 0 — content-only, no registry delta** (typo, prose edit). Re-transform
  X, diff the entities X *contributes* against the prior build. Identical → stop.
  Blast radius: **one page.** The common case.
- **Tier 1 — registry changed, aggregate stable.** X added / renamed / reordered
  an entity, but the aggregated *outputs* are unchanged or move in a slice few
  pages read. Re-run aggregate, diff its outputs, re-run `postProcess` only for
  pages whose consumed slice moved. Blast radius: **bounded.**
- **Tier 2 — structural** (new / deleted / moved page, layout edit). A layout
  edit invalidates every page under that directory subtree; a new page can shift
  `pageTree` / breadcrumbs globally. Blast radius: **wide, but scoped by a
  reverse index.**

If a change does not perturb the registry, aggregate and every other page are
untouched. That firewall is what makes incrementality tractable.

### The one edge below the registry

`expand` / `collection` pull *other entities' rendered content* into a page at
preprocess / transform time. So page A's **output** depends on page B's
**source**, directly — not via the registry summary. A naive "registry is the
firewall" model misses this: editing B's body (Tier 0 for B) must still
invalidate A. The per-page read-set therefore has to include "entities embedded
via expand / collection," not just files on disk.

## Options Considered

1. **Dependency-tracked invalidation, registry-as-firewall (chosen as the target
   architecture).** Record each page's read-set, hash outputs, and recompute the
   minimal dirty cut across the existing phase DAG, using the registry as the
   coarse firewall and per-slice aggregate edges as the fine one. Matches the
   pipeline's actual shape; degrades gracefully (a missing edge over-invalidates,
   never under-invalidates).

2. **Fine-grained query memoization (salsa / rustc-style) from day one.**
   *Rejected as the starting point.* The theoretically clean model (pure
   functions keyed by inputs, invalidated by recorded reads) is the right *shape*
   but the wrong *amount of machinery* to introduce now — it would require
   threading a tracking context through Markdoc transform internals we don't own.
   We adopt its shape (recorded reads + hashed outputs), not its framework.

3. **Output-level caching only** (skip re-emitting unchanged HTML; recompute the
   pipeline regardless). *Rejected as insufficient.* Saves downstream
   render/upload but not the pipeline CPU that actually dominates at scale.
   Useful as an orthogonal add-on, not as the answer.

4. **Do nothing; rely on whole-corpus recompute + incremental fetch.** *Rejected
   as the long-term answer, accepted as the current state.* Adequate until
   rebuild latency hurts — which is exactly the threshold this ADR exists to be
   ready for.

## Decision

Adopt **dependency-tracked invalidation with the registry as firewall** as the
target architecture for incremental rebuild, and **defer building the engine**.
Commit now only to the groundwork that is expensive to retrofit:

1. **Route every read through the `ProjectFiles` seam ({% ref "SPEC-113" /%}),
   then make reads recordable.** A `recordingProjectFiles(inner, onRead)` wrapper
   captures the per-page dependency set for free — *this is the load-bearing
   reason the seam enables incrementality*. It is not about async; it is about
   centralizing I/O so reads can be tracked at all. While I/O is scattered across
   `node:fs` in `read-file.ts`, the sandbox hooks, and `file-roots.ts`, a page's
   read-set cannot be captured.

2. **Capture the AST-derived dependencies** the recording provider can't see:
   referenced partials, the layout chain, and `expand` / `collection` embed
   targets. Emit the full per-page read-set as a side-output of a normal build.
   This gives us the dependency graph *as data* before anything consumes it.

3. **Make outputs hashable.** Post-serialize renderables are already plain
   `{$$mdtype}` objects (JSON-hashable); registry entries likewise. A per-page
   content-hash manifest is the substrate for "did this actually change."

4. **Thread an optional `{ priorBuild, dirtySet }` through `processContentTree` /
   `runPipeline`** as an additive signature, with full build as
   `dirtySet = ALL`. No behaviour change yet — just the capability seam.

The actual optimizations — the registry-diff firewall (Tier 0/1), then
fine-grained aggregate→postProcess slice edges (Tier 3) — land later, in their
own spec, on top of data we have been collecting all along.

## Rationale

- **The seam pays for itself twice.** {% ref "SPEC-113" /%} already centralizes
  I/O for hosting and security; making that one choke point *recordable* is the
  whole prerequisite for incrementality, at near-zero marginal cost. Retrofitting
  read-tracking onto scattered `node:fs` calls later would be far more expensive.
- **The pipeline's existing phases are the dependency graph.** We are not
  inventing structure; we are refusing to recompute nodes whose inputs are
  unchanged. The registry firewall falls straight out of the register→aggregate
  boundary that already exists.
- **Graceful degradation.** A missing or coarse dependency edge causes
  *over*-invalidation (a needless recompute), never *under*-invalidation (a stale
  page). So the system is correct from the first coarse cut and only gets faster
  as edges sharpen.
- **Proven shape.** Gatsby's incremental builds are the direct analog — its
  GraphQL data layer is our registry, its page queries are our postProcess
  consumers, and it recomputes the minimal set by tracking which pages touch
  which nodes. The query-memoization literature (salsa / rustc) is the theory
  underneath; we borrow the shape (recorded reads + hashed outputs + a dirty
  cut), not the framework.

## Consequences

- **Shapes {% ref "SPEC-113" /%} work, doesn't expand its scope.** The only
  concrete near-term ask is that the seam expose a recording wrapper point and
  that a build can emit per-page read-sets. {% ref "SPEC-113" /%}'s "no
  incremental rebuild" non-goal links here for the deferred remainder.
- **A future `incremental-rebuild` spec** owns the engine: the dirty-cut
  algorithm, the registry diff, the reverse indexes (partial→pages,
  layout-dir→pages, embed-target→pages), and the `priorBuild` cache format.
- **The `expand` / `collection` below-the-registry edge** is the known sharp
  corner; the future spec must treat embed targets as first-class dependencies,
  not rely on the registry summary alone.
- **Orthogonal output-level caching** (skip re-emitting unchanged HTML) can be
  added independently for the hosted render/upload path without waiting on the
  engine.

{% /decision %}
