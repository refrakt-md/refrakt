{% work id="WORK-527" status="done" priority="medium" complexity="moderate" source="SPEC-124" tags="engine, transform, contracts, dx" milestone="v0.30.1" pr="refrakt-md/refrakt#588" %}

# Universal axes are absent from structure contracts

`refrakt contracts` is documented as describing "the complete HTML structure the identity transform produces for every rune". It does not. Measured across the checked-in `contracts/structures.json` (132 runes), **not one universal axis appears**:

```
grep -c "has-bg|--tinted|data-elevation|data-prominence|data-reveal|--frame-|data-substrate|data-width"
→ 0
```

All 139 modifier names in the contract are rune-specific config modifiers (`action`, `activity`, `address`, …). A theme author reading the contract learns nothing about `.rf-card--tinted`, `[data-elevation]`, `.rf-hero--has-bg`, `[data-reveal]` or `[data-substrate]` — every one of which the engine emits and Lumina styles.

Surfaced while investigating {% ref "WORK-525" /%}, which assumed the contract described facet output and found it described almost none of it.

## Acceptance Criteria

- [x] Each universal-axis facet declares its contract contribution: the selectors and data attributes it can emit, and the closed vocabulary where it has one
- [x] `generateStructureContract` includes a universal-axis section per rune, derived from the registry rather than hand-listed
- [x] The vocabularies come from the facets' existing exports (`ELEVATION_VALUES`, `PROMINENCE_VALUES`, `TINT_TOKENS`, `DENSITY_VALUES`, `READING_REGISTERS`) rather than being restated
- [x] Axes gated on config (`prominence` needs a page-section header; `frame`/`substrate` need a target) are described as conditional, not as universally available
- [x] `contracts/structures.json` is regenerated; the diff is **additive only** — no existing entry changes
- [x] `contract-engine-agreement.test.ts` is extended to cover the new claims
- [x] The CSS coverage tests and `refrakt inspect --audit` are checked for interactions, since both reason about which selectors exist
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

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

## Resolution

Completed: 2026-09-04

Completed: 2026-09-04

Branch: `claude/transform-package-refactor-7mxi8a`

### What was done

- **`packages/transform/src/facets/describe.ts`** — `UniversalAxisFacet`, plus the two contract shapes it produces: `UniversalAxisContract` (the registry's own description of an axis, config-independent, with `{block}` placeholders in selector patterns) and `RuneAxisContract` (only what one rune's config settles).
- **Sixteen facet modules** — each universal axis now exports its own `*Axis: UniversalAxisFacet` beside the `Facet` that emits it: `tint`, `width`, `content-measure`, `spacing`, `inset`, `density`, `reading`, `dropcap`, `elevation`, `prominence`, `motion`, `content-place`, `cover`, `frame`, `substrate`, `bg`. Vocabularies are the facets' existing exports — `ELEVATION_VALUES`, `PROMINENCE_VALUES`, `TINT_TOKENS`, `DENSITY_VALUES`, `READING_REGISTERS` — so the contract restates nothing.
- **`facets/index.ts`** — `UNIVERSAL_AXIS_FACETS`, ordered to match `ORDERED_FACETS`. Also corrected a stale registry comment left by WORK-523 that still claimed tint/density/width/reading/motion/bg "resolve inline".
- **`packages/transform/src/contracts.ts`** — a top-level `universalAxes` (16 entries) and a per-rune `universalAxes` with `axes` / `unavailable`.
- **`contracts/structures.json`** + **`packages/lumina/contracts/structures.json`** regenerated: 86 KB → 185 KB, 4,224 → 7,924 lines.
- **`site/content/docs/cli/theme-tools.md`** — the doc that made the over-promise this item is premised on now documents both sections.

### The design question the item flagged: conditionality

Two mechanisms, matching the two kinds of gate:

- **Universal but conditional** (`prominence` needs a header; `tint`'s class needs resolved colour tokens; `bg`'s layer needs something to draw) → a `condition` string on the top-level entry, following the `elements[].condition` precedent rather than inventing a second shape.
- **Ruled out by *this rune's* config** → a line in that rune's `unavailable`, with the reason.

There are 686 unavailability entries across the catalog — 111 runes can never carry `data-reading`, 111 never `data-dropcap`, 129 never `content-place`, 124 never `cover`, 119 never `frame`, 92 never `data-prominence`. That volume is why `unavailable` is a flat `axis → reason` map rather than a map of objects.

### Why the description is split in two

Emitting the full axis description on all 132 runes would have roughly tripled the file with content identical except for a block name. The axis is stated once at the top level; each rune records only its deviations — defaults, targets, and the concrete block-substituted selectors (`.rf-card--tinted`, `.rf-card--has-bg`) the original complaint named. An axis absent from both a rune's `axes` and its `unavailable` behaves exactly as the top-level entry describes.

### Additive-only, verified structurally

Not by eye: strip `universalAxes` from the regenerated file and the entire `runes` subtree is byte-identical to the previous commit, key order included, as are `$schema`, `description` and `prefix`. The only `-` lines in the JSON diff are `]` → `],` where a key was appended after an existing one.

### Verification

- `contract-engine-agreement.test.ts`: **13 → 47 tests**. Vocabularies round-tripped through the engine, `{block}`/`{value}` patterns substituted and matched, axes asserted to land on their declared target rather than the root, and every recorded `unavailable` driven through the engine with its inputs set.
- **Mutation-checked**, the same way WORK-525 was: an engine change that stops emitting `data-elevation` leaves `refrakt contracts --check` reporting `OK: up to date (132 runes)` while these tests fail.
- `facets/registry.test.ts`: 3 tests pinning `UNIVERSAL_AXIS_FACETS` against the facet registry — coverage, no strays, and matching order. Adding a facet without describing it now fails instead of silently reopening the blind spot.
- CSS coverage tests and `refrakt inspect --audit` checked for interaction: neither reads `structures.json` (both derive from config), so both are unaffected. Verified green regardless.
- All 630 pre-existing transform tests pass unmodified — the only `-` lines in the test diff are two import statements and a doc comment, all extended rather than changed.
- `npm run build`, `contracts --check` on both copies, full suite green at 4055 (was 4018).

### A finding from the new tests

The generic "every recorded unavailability is honest" test first failed on `cover`/`Chip`: `data-scrim` present despite cover mode being unavailable. Not a bug — `scrim` is an input to **both** `cover` (which marks the rune root) and `bg` (which builds a scrim *element* carrying `data-scrim`), so a tree-wide attribute scan cannot attribute it to one facet. The check is now scoped to the root for axes that declare a `target`; the child-surface half is covered by the targeted `reading`/`dropcap`/`frame` tests. Recorded in a comment rather than worked around silently.

### Deliberately not published

The `motion` axis declares no `values`. The `reveal` vocabulary (`none|fade|slide|scale|blur`) lives in the schema layer's `matches`, not in the engine, which passes any value through; restating it here would create a second source of truth the contract cannot keep honest. Same for `width`/`spacing`/`inset`, where the engine genuinely enforces no closed set — the absence of `values` there is accurate, not an omission.

{% /work %}
