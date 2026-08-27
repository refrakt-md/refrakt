---
"@refrakt-md/transform": patch
---

Migrate frame chrome (SPEC-086) and substrate fills (SPEC-087) to facets
(SPEC-124, WORK-522).

Both axes resolve early against the rune tag but apply late, to a surface
chosen at resolve time — the rune root, or the `[data-section="media"]` zone
that does not exist until the children are assembled. They are the canonical
two-phase facets, and the second real exercise of `postAssemble` after cover.

Internal only: no public API changes, and no change to rendered output.
Attribute order, inline-style declaration order and warning text are all
byte-identical, and the 630 pre-existing transform tests pass unmodified.

Three interface extensions this migration required, none of which the earlier
axes needed:

- **`FacetContext.theme`** — facets can now resolve a named preset. `frame`
  reads the theme's frame registry; `tints` and `backgrounds` are declared
  alongside it for the tint and background axes that follow.
- **`FacetResult.carry`** — private scratch handed from a facet's `resolve` to
  its own `postAssemble`, for resolved work that is neither emitted nor
  expressible as a string. The alternative is re-resolving in the second phase,
  which duplicates work and lets the two phases disagree.
- **`postAssemble` returns diagnostics** instead of `void` — a `media`-target
  chrome that finds no media zone is only detectable against the assembled
  tree, and routing that through the console directly would bypass the
  collector's dedupe and make it untestable.

`engine.ts` is down to 1889 lines from 2223 before the facet work began, and
the `1g` / `1h` / `6c` sub-steps are gone.
