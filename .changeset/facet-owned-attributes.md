---
"@refrakt-md/transform": patch
---

Let facets declare their own author attributes (SPEC-124, WORK-526).

`transformRune` stripped consumed author attributes from pass-through output
using a fixed list naming eight facet-owned axes, so adding an axis with a
fixed attribute name still meant editing `engine.ts` — the last coupling
contradicting SPEC-124's claim that a new axis is a file plus a registry entry.

`Facet` now carries a static `attributes` declaration, and the engine strips
`FACET_ATTRIBUTES` — derived once from the registry — alongside the
config-modifier facet's dynamic `stripAttrs`.

The declaration is static rather than a `FacetResult` field because these
attributes must be stripped **even when the facet resolves to nothing**:
`width="content"` is suppressed (no axis, no class) but must not reach the
rendered element. A per-instance channel cannot express that.

Internal only: no public API changes, and pass-through behaviour is unchanged.

One asymmetry is deliberately **preserved**, and now pinned by a test that says
so: `reading` and `dropcap` reach the rendered element today, unlike every
other axis attribute. It looks like an oversight — both are consumed and
re-expressed as `data-reading` / `data-dropcap` on the body section — but
removing them is a behaviour change and belongs in its own item, not in a
mechanical cleanup.
