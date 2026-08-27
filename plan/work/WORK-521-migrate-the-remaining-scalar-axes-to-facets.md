{% work id="WORK-521" status="done" priority="medium" complexity="moderate" source="SPEC-124" tags="engine, transform, refactor" milestone="v0.30.1" pr="refrakt-md/refrakt#583" %}

# Migrate the remaining scalar axes to facets

Move the remaining lettered sub-steps of `transformRune` into facets: `density` (1e), `width` / `spacing` / `inset` (1f), `reading` and `dropcap` (1f-bis), `content-measure`, and `reveal` / `stagger`. Individually these are small; together they are most of what remains between step 1 and step 2, and clearing them is what lets the lettered numbering go away.

## Acceptance Criteria

- [x] `density`, `width`, `spacing`, `inset`, `reading`, `dropcap`, `content-measure` and `motion` (reveal + stagger) are facets
- [x] `dropcap` declares `after: ['reading']`, replacing the current adjacency-only guarantee, and keeps its off-register warn
- [x] `density` continues to resolve author attribute ▸ parent `childDensity` ▸ rune default ▸ `full`, reading the parent rune's config through the facet context
- [x] `motion` keeps `data-reveal` / `data-stagger` emission and the `--rf-reveal-index` stamping on cascade items — the latter via `postAssemble`, since it walks assembled children
- [x] `width`, `spacing` and `inset` keep their default-suppression rules (`content`, `default`) so unmarked output stays byte-identical
- [ ] No lettered sub-steps (`1b`…`1h`) remain in `transformRune`
- [x] All 630 pre-existing transform tests pass **unmodified**
- [x] Unit tests cover each axis's default resolution and suppression rules, and the `reading` → `dropcap` gate
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

These are the axes the {% ref "WORK-517" /%} pattern was designed for, so most are a direct port. Three need care.

`density` reads the *parent* rune's `childDensity`, so the facet context must expose the parent config lookup — the first facet to need more than the current rune's own config.

`stagger` stamps an index on cascade items in document order, which is a children walk and therefore `postAssemble`, not `resolve`.

`content-measure` is config-derived rather than author-driven (`config.contentMeasure === 'anchored'`), a reminder that not every axis reads an attribute.

Each facet takes its vocabulary with it — `READING_REGISTERS` and `READING_CAPABILITIES` already live in `reading.ts` and can stay there, re-exported by the facet rather than duplicated.

## Blocked by
- {% ref "WORK-518" /%}

## References

- {% ref "SPEC-124" /%} — facet registry (the spec this work item realizes)
- {% ref "SPEC-108" /%} — reading register and the dropcap capability gate
- {% ref "SPEC-105" /%} — scroll-reveal motion and stagger indices
- {% ref "SPEC-025" /%} — the universal theming dimensions these axes belong to

## Resolution

Completed: 2026-08-27

Branch: `claude/transform-package-refactor-7mxi8a`

### What was done

- `packages/transform/src/facets/box.ts` — `width`, `content-measure`, `spacing`, `inset`. Grouped in one module because they are the same family and each is a handful of lines; they remain separate facets so the registry still orders them individually.
- `packages/transform/src/facets/density.ts` — the density axis and `DENSITY_VALUES`.
- `packages/transform/src/facets/reading.ts` — `reading` and `dropcap`, re-exporting the vocabulary from `../reading.ts` rather than duplicating it.
- `packages/transform/src/facets/motion.ts` — `reveal` / `stagger` plus `stampStaggerIndex`, whose index stamping runs in `postAssemble`.
- `packages/transform/src/facets/types.ts` — added `FacetContext.parentConfig`.
- `packages/transform/src/engine.ts` — steps 1e, 1f, 1f-bis, the reveal/stagger block and step 7c all gone. Down to 1463 lines from 2223 before the facet work began.
- `packages/transform/test/facets/scalars.test.ts` — 38 tests covering default suppression per axis, the reading→dropcap gate, density inheritance precedence and stagger stamping.

### Notes

**Ordering is now a list, not an accident.** Registry order reproduces the original emission sequence, so class order, `modifierValues` key insertion order and inline-style declaration order all follow from one ordered declaration. That also **fixes the benign output difference WORK-519 introduced**: `--tinted` is back ahead of `--width`/`--spacing`/`--inset`, and output is byte-identical again.

**`dropcap` declares `after: ['reading']`** — the capability gate reads the resolved register, a constraint that previously held only because the two blocks sat five lines apart.

**Three axes publish state rather than emitted axes**, because the engine owns their emission point: `reading` and `dropcap` are applied to the body section during child assembly, and `data-density` is unconditional at a fixed position. `density` is also the first axis to read config other than its own, so `FacetContext` gained `parentConfig` — the resolved parent config rather than the rune registry, so a facet cannot reach arbitrarily into the rune graph for one lookup.

**A mistake worth recording.** Extracting `stampStaggerIndex` I first rewrote it from memory and got it wrong three ways: dropped the `data-field` match, mutated in place instead of replacing the array element, and invented a rune-boundary check that does not exist. Caught by diffing against the original before running anything; the committed version is verbatim. None of the three would have been caught by the suite — the `data-field` path has no direct coverage — which is the argument for copying rather than retyping during a behaviour-preserving move.

### Criterion left unchecked

"No lettered sub-steps (`1b`…`1h`) remain in `transformRune`" is **not** satisfied: `1b` (context modifiers) and `1c` (static modifiers) remain, and both are explicitly {% ref "WORK-523" /%}'s scope — its own criteria name steps 1, 1b and 1c. The criterion was mis-scoped when written; everything in this item's actual scope (1d–1h) is cleared. Left unchecked rather than reworded, so the overlap stays visible.

{% /work %}
