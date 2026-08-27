---
"@refrakt-md/transform": patch
---

Migrate the tint axis to a facet (SPEC-124, WORK-519).

SPEC-053 tint resolution — named-definition lookup, inline `tint-<token>`
overrides, `lockMode`, dark-mode tokens, the `--tint-*` custom properties and
the `data-tint` / `data-color-scheme` / `data-tint-dark` markers — moves out of
step 1d of `transformRune` into `packages/transform/src/facets/tint.ts`, which
owns `TINT_TOKENS`.

Tint publishes the resolved colour scheme as facet **state** rather than as an
emitted axis (the attribute is set directly). That lets `cover` — which now
declares `after: ['tint']` — tell whether the scheme has already been claimed
instead of clobbering it, replacing what was a seeded read of the engine's
internal `tintDataAttrs` bag.

Internal only: no public API changes. Rendered output is unchanged **except**
for one benign difference: the `--tinted` BEM modifier now appears *after*
`--width` / `--spacing` / `--inset` in the class attribute, where it used to
come before them. The facet pass runs at a fixed point that sits after those
still-inline axes. Class order within a `class` attribute has no effect on CSS
matching or specificity, and no test pinned it — but it is an output
difference, so it is recorded here rather than described as byte-identical.
It resolves itself when width/spacing/inset migrate under WORK-521.

Everything else is byte-identical, including inline-style declaration order
(tint registers first, so its `--tint-*` declarations still lead), and the 630
pre-existing transform tests pass unmodified.
