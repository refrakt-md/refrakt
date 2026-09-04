---
"@refrakt-md/transform": patch
"@refrakt-md/lumina": patch
---

Describe the universal axes in structure contracts (SPEC-124, WORK-527).

`refrakt contracts` is documented as describing "the complete HTML structure the
identity transform produces for every rune". It did not: across the 132 runes in
the checked-in contract, not one universal axis appeared. A theme author reading
it learned nothing about `[data-elevation]`, `.rf-card--tinted`,
`.rf-hero--has-bg`, `[data-reveal]` or `[data-substrate]` — every one of which
the engine emits and Lumina styles.

Each of the sixteen universal-axis facets now declares its own contract
contribution, so the description is derived from the registry rather than
hand-listed. Vocabularies come from the facets' existing exports
(`ELEVATION_VALUES`, `PROMINENCE_VALUES`, `TINT_TOKENS`, `DENSITY_VALUES`,
`READING_REGISTERS`) — the contract restates nothing.

The output gains two sections:

- A top-level `universalAxes`, in registry order: each axis's inputs and where
  they are read from, its closed vocabulary where the engine owns one, the data
  attributes, custom properties and elements it emits, and the condition under
  which it applies. Selector patterns carry a `{block}` placeholder.
- A per-rune `universalAxes`, carrying only what that rune's config settles —
  resolved defaults, the surface an axis lands on, the block-substituted
  selectors it adds (`.rf-card--tinted`, `.rf-card--has-bg`), and, under
  `unavailable`, the axes its config rules out with the reason.

Stating the axis once and the deviations per rune keeps the file honest without
repeating a near-identical block 132 times.

**Additive only.** Every existing entry in `contracts/structures.json` is
byte-identical, key order included; the new sections sit alongside. The regenerated
file (and Lumina's shipped copy) grow from 86 KB to 185 KB.

`contract-engine-agreement.test.ts` grows from 13 tests to 47, covering the new
claims against the engine's actual output — mutation-checked: an engine change
that stops emitting `data-elevation` leaves `contracts --check` reporting "up to
date (132 runes)" while these tests fail.
