---
"@refrakt-md/transform": patch
---

Migrate the config-modifier loop to facets and retire the seeding scaffolding
(SPEC-124, WORK-523).

Steps 1, 1b and 1c of `transformRune` — the generic `config.modifiers` loop,
context modifiers and static modifiers — move into
`packages/transform/src/facets/modifiers.ts`. This is the last structural
migration: **no rune axis resolves inline any more.**

`modifiers` is registered first, so its axes are visible to every other facet
through `ctx.axis()`. That retires the final two seeded values
(`media-position` and `content-place`), and with them the whole seeding
mechanism: `FacetInput.seedAxes`, `orderFacets`'s `seeded` option and the
`SEEDED_AXES` list are all gone. Every `after` now names a real registered
facet, so the registry's dependency graph is complete rather than partly
scaffolded.

One new channel: **`FacetResult.stripAttrs`**, author *attribute* names a facet
consumed, removed from pass-through output. Distinct from `consumes`, which
claims `<meta data-field>` children. The config-modifier facet needs it because
its attribute names come from the rune's own config and so cannot be a fixed
list.

`FacetContext` also gains `fields` — the parsed SPEC-082 `data-rune-fields`
bag, parsed once by the engine rather than per facet.

Internal only: no public API changes, and no change to rendered output. The 630
pre-existing transform tests pass unmodified, including the value-mapping,
variants, fields and context-modifier suites.

`engine.ts` is down to 1391 lines from 2223 before the facet work began — a 37%
reduction. Every numbered step that remains (2–9) is assembly pipeline, which
SPEC-124 scopes out explicitly.

Known residue, tracked as WORK-526: the engine still strips a **fixed list** of
eight facet-owned attribute names from pass-through output. Generalising that
needs a static `Facet.attributes` declaration, because those must be stripped
even when the facet resolves to nothing (`width="content"`), which a
per-instance result channel cannot express. Left out of this change rather than
widening the riskiest migration in the milestone.
