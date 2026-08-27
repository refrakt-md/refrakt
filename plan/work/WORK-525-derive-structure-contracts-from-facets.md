{% work id="WORK-525" status="done" priority="high" complexity="complex" source="SPEC-124" tags="engine, transform, contracts, refactor" milestone="v0.30.1" pr="refrakt-md/refrakt#585" %}

# Derive structure contracts from facets

`packages/transform/src/contracts.ts` independently re-derives what the identity transform emits, from config — it imports `types`, `helpers` and `merge`, and never the engine. So `refrakt contracts --check` validates the contracts file against *its own* derivation, not against engine output: any engine change contracts does not mirror produces confidently wrong contracts while CI stays green. Now that the axes are facets, investigate whether each facet can declare its own contract contribution and collapse the two implementations into one.

This is the spec's principal open question, and it may not pan out. Time-box the investigation and record the answer either way.

## Acceptance Criteria

- [x] A `describe(config)` method (or equivalent) is prototyped on at least three facets of differing shape — a scalar (`elevation`), a config-gated one (`prominence`), and one that emits structure (`bg`)
- [x] The prototype establishes whether facet-declared contributions can reproduce the current contract output for those runes byte-for-byte
- [x] If viable: `contracts.ts` derives per-axis sections from the registry rather than re-implementing them, and `refrakt contracts --check` produces an unchanged `contracts/structures.json` across all 132 runes
- [x] If not viable: the finding is recorded on this item with the specific reason, and a narrower mitigation is filed (e.g. a test that diffs contract output against engine output for a fixture corpus)
- [x] Either outcome leaves `refrakt contracts --check` green and the 630 pre-existing transform tests unmodified
- [x] `npm run build` and the full repo suite pass

## Approach

The obstacle is that contracts are **static**: they describe what a rune *can* emit given only its config, with no instance to transform. `describe` therefore cannot delegate to `resolve` — it is a genuinely separate method that can drift from `resolve` exactly as `contracts.ts` drifts from the engine today. Whether it is an improvement depends on whether co-locating the two in one file makes drift visible enough to matter. That is a judgement call the prototype should inform rather than assume.

A cheaper fallback, if `describe` proves unconvincing: keep the two implementations but add a test that runs a fixture corpus through both the engine and the contract generator and asserts they agree. That converts a silent divergence into a failing test without restructuring anything, and may be the better value for the effort.

Sequenced last because the answer depends on the full facet set existing, and on `seedAxes` being gone — a partly-seeded registry cannot describe the axes still resolved inline.

## Blocked by
- {% ref "WORK-523" /%}

## References

- {% ref "SPEC-124" /%} — facet registry (the spec this work item realizes)
- {% ref "SPEC-028" /%} — rune output standards, which the contracts encode

## Resolution

Completed: 2026-08-27

Branch: `claude/transform-package-refactor-7mxi8a`

### The answer

**Yes, `describe()` is viable — and it is not what matters.** Both halves of that are the finding.

### What was measured first

Before building anything, the premise was checked against the actual contract. Across the checked-in `structures.json` (132 runes), **not one universal axis appears**: zero occurrences of `has-bg`, `--tinted`, `data-elevation`, `data-prominence`, `data-reveal`, `--frame-`, `data-substrate`, `data-width`. All 139 modifier names are rune-specific config modifiers.

So 13 of 16 facets have nothing to contribute to the contract. The overlap is exactly the three config-modifier facets; everything else the contract describes (`elements`, `inlineStyles`, `childOrder`, `projection`) comes from the assembly pipeline, which SPEC-124 scopes out and no facet will own.

### What was done

- `packages/transform/src/facets/describe.ts` — `FacetContract` and `DescribableFacet`.
- `packages/transform/src/facets/modifiers.ts` — `describe(config, block)` on the three modifier facets.
- `packages/transform/src/contracts.ts` — consumes `DESCRIBABLE_FACETS` in place of its own modifier-family derivation. Down to 373 lines from 400. Contract output byte-identical across all 132 runes.
- `packages/transform/test/contract-engine-agreement.test.ts` — 13 tests transforming runes and asserting the engine's output matches what the contract promised.

### Why the test, not `describe()`, is the deliverable

`describe` is necessarily a separate function from `resolve`: a contract has no rune instance to transform. Co-locating them makes drift visible to a reader; it does **not** make it detectable by CI. That was precisely the risk the spec flagged, and `describe()` alone does not retire it.

The agreement test does. **Proven by mutation**: with the engine changed to stop emitting BEM modifier classes, `refrakt contracts --check` still reports "up to date (132 runes)" while the new test fails. That is the exact blind spot — `--check` compares the generator against itself — now closed and demonstrated closed.

Worth recording: the first mutation attempt tested the wrong direction. Changing the *generator* does make `--check` fail, because the file is checked in. Only an *engine*-side change is invisible to it. The demonstration had to be redone.

### What the investigation surfaced

`refrakt contracts` is documented as describing "the complete HTML structure the identity transform produces for every rune", and omits every universal axis. A theme author reading it learns nothing about `.rf-card--tinted`, `[data-elevation]`, `.rf-hero--has-bg` or `[data-reveal]`.

That is a larger gap than the duplication this item set out to fix, and it is cheap now that each facet owns and exports its vocabulary — a side effect of the migration rather than a goal of it. Filed as {% ref "WORK-527" /%}, not folded in here: it changes contract output, and this item's criteria required that output unchanged.

### Scope

The agreement test covers claims verifiable without authoring content. The `elements` / `inlineStyles` / `childOrder` sections describe assembly and need a real fixture corpus; that is noted in the test's header rather than faked.

All 630 pre-existing transform tests pass unmodified.

{% /work %}
