{% work id="WORK-527" status="ready" priority="medium" complexity="moderate" source="SPEC-124" tags="engine, transform, contracts, dx" milestone="v0.30.1" %}

# Universal axes are absent from structure contracts

`refrakt contracts` is documented as describing "the complete HTML structure the identity transform produces for every rune". It does not. Measured across the checked-in `contracts/structures.json` (132 runes), **not one universal axis appears**:

```
grep -c "has-bg|--tinted|data-elevation|data-prominence|data-reveal|--frame-|data-substrate|data-width"
→ 0
```

All 139 modifier names in the contract are rune-specific config modifiers (`action`, `activity`, `address`, …). A theme author reading the contract learns nothing about `.rf-card--tinted`, `[data-elevation]`, `.rf-hero--has-bg`, `[data-reveal]` or `[data-substrate]` — every one of which the engine emits and Lumina styles.

Surfaced while investigating {% ref "WORK-525" /%}, which assumed the contract described facet output and found it described almost none of it.

## Acceptance Criteria

- [ ] Each universal-axis facet declares its contract contribution: the selectors and data attributes it can emit, and the closed vocabulary where it has one
- [ ] `generateStructureContract` includes a universal-axis section per rune, derived from the registry rather than hand-listed
- [ ] The vocabularies come from the facets' existing exports (`ELEVATION_VALUES`, `PROMINENCE_VALUES`, `TINT_TOKENS`, `DENSITY_VALUES`, `READING_REGISTERS`) rather than being restated
- [ ] Axes gated on config (`prominence` needs a page-section header; `frame`/`substrate` need a target) are described as conditional, not as universally available
- [ ] `contracts/structures.json` is regenerated; the diff is **additive only** — no existing entry changes
- [ ] `contract-engine-agreement.test.ts` is extended to cover the new claims
- [ ] The CSS coverage tests and `refrakt inspect --audit` are checked for interactions, since both reason about which selectors exist
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

Now cheap, because each facet already owns and exports its vocabulary — that was a side effect of the SPEC-124 migration, not a goal of it.

The one genuine design question is **conditionality**. `data-elevation` can appear on any rune, but `.rf-card--tinted` only when a tint resolves, and `data-prominence` only on a rune with a page-section header. A flat "these selectors exist" list would over-promise. Describing an axis as conditional-on-config is the honest shape, and it is what the existing `elements` entries already do with their `condition` field — follow that precedent rather than inventing a second one.

This **changes the contract output**, which is why it was not folded into {% ref "WORK-525" /%}: that item's criteria required an unchanged `structures.json`. Additive-only keeps it reviewable — every existing entry should be byte-identical, with new sections alongside.

## Blocked by
- {% ref "WORK-525" /%}

## References

- {% ref "SPEC-124" /%} — facet registry; the migration that gave each axis an exported vocabulary
- {% ref "WORK-525" /%} — the investigation that surfaced this
- {% ref "SPEC-028" /%} — rune output standards, which the contracts encode

{% /work %}
