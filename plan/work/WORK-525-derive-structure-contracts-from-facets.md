{% work id="WORK-525" status="pending" priority="high" complexity="complex" source="SPEC-122" tags="engine, transform, contracts, refactor" milestone="v0.30.0" %}

# Derive structure contracts from facets

`packages/transform/src/contracts.ts` independently re-derives what the identity transform emits, from config — it imports `types`, `helpers` and `merge`, and never the engine. So `refrakt contracts --check` validates the contracts file against *its own* derivation, not against engine output: any engine change contracts does not mirror produces confidently wrong contracts while CI stays green. Now that the axes are facets, investigate whether each facet can declare its own contract contribution and collapse the two implementations into one.

This is the spec's principal open question, and it may not pan out. Time-box the investigation and record the answer either way.

## Acceptance Criteria

- [ ] A `describe(config)` method (or equivalent) is prototyped on at least three facets of differing shape — a scalar (`elevation`), a config-gated one (`prominence`), and one that emits structure (`bg`)
- [ ] The prototype establishes whether facet-declared contributions can reproduce the current contract output for those runes byte-for-byte
- [ ] If viable: `contracts.ts` derives per-axis sections from the registry rather than re-implementing them, and `refrakt contracts --check` produces an unchanged `contracts/structures.json` across all 132 runes
- [ ] If not viable: the finding is recorded on this item with the specific reason, and a narrower mitigation is filed (e.g. a test that diffs contract output against engine output for a fixture corpus)
- [ ] Either outcome leaves `refrakt contracts --check` green and the 630 pre-existing transform tests unmodified
- [ ] `npm run build` and the full repo suite pass

## Approach

The obstacle is that contracts are **static**: they describe what a rune *can* emit given only its config, with no instance to transform. `describe` therefore cannot delegate to `resolve` — it is a genuinely separate method that can drift from `resolve` exactly as `contracts.ts` drifts from the engine today. Whether it is an improvement depends on whether co-locating the two in one file makes drift visible enough to matter. That is a judgement call the prototype should inform rather than assume.

A cheaper fallback, if `describe` proves unconvincing: keep the two implementations but add a test that runs a fixture corpus through both the engine and the contract generator and asserts they agree. That converts a silent divergence into a failing test without restructuring anything, and may be the better value for the effort.

Sequenced last because the answer depends on the full facet set existing, and on `seedAxes` being gone — a partly-seeded registry cannot describe the axes still resolved inline.

## Blocked by
- {% ref "WORK-523" /%}

## References

- {% ref "SPEC-122" /%} — facet registry (the spec this work item realizes)
- {% ref "SPEC-028" /%} — rune output standards, which the contracts encode

{% /work %}
