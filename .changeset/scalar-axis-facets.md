---
"@refrakt-md/transform": patch
---

Migrate the remaining scalar axes to facets (SPEC-124, WORK-521).

`density`, `width`, `spacing`, `inset`, `content-measure`, `reading`,
`dropcap` and `motion` (reveal + stagger) move out of steps 1e–1f-bis of
`transformRune` into `packages/transform/src/facets/`.

Two constraints that previously held only by accident are now declared:

- **`dropcap` declares `after: ['reading']`.** The capability gate reads the
  resolved register, which worked because the two blocks happened to sit five
  lines apart. It is now a registry constraint the driver enforces.
- **Registry order reproduces the original emission sequence.** Class order,
  `modifierValues` key insertion order and inline-style declaration order are
  all part of the output, and all now follow from one ordered list rather than
  from where statements happen to fall in an 800-line function.

That second point **fixes the one benign output difference** introduced when
tint migrated: `--tinted` is back before `--width` / `--spacing` / `--inset` in
the class attribute, where it has always been. Output is byte-identical again.

Three axes publish facet **state** rather than emitted axes, because the engine
owns their emission point: `reading` and `dropcap` are applied to the body
section during child assembly, and `data-density` is unconditional at a fixed
position. `density` is also the first axis to read config other than its own —
it inherits a parent's `childDensity` — so `FacetContext` now carries
`parentConfig`, the resolved parent config rather than the rune registry, so a
facet cannot reach arbitrarily into the rune graph.

Internal only: no public API changes. The 630 pre-existing transform tests pass
unmodified, including the density, reading, reveal-stagger and content-measure
suites.

`engine.ts` is down to 1463 lines from 2223 before the facet work began — a 34%
reduction. Only steps 1, 1b and 1c (the generic config-modifier loop) still
resolve inline; they migrate under WORK-523.
