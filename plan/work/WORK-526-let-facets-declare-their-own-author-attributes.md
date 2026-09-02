{% work id="WORK-526" status="done" priority="low" complexity="simple" source="SPEC-124" tags="engine, transform, refactor" milestone="v0.30.1" pr="refrakt-md/refrakt#586" %}

# Let facets declare their own author attributes

`transformRune` still strips consumed author attributes from pass-through output using a **fixed list** naming eight facet-owned axes:

```ts
const { width: _w, spacing: _s, inset: _i, elevation: _e, prominence: _p,
        reveal: _rv, stagger: _st, density: _d, ... } = tag.attributes;
```

So adding an axis with a fixed attribute name still means editing `engine.ts` — which contradicts {% ref "SPEC-124" /%}'s claim that a new axis is a file plus a registry entry. This is the last such coupling.

## Acceptance Criteria

- [x] `Facet` gains a static `attributes?: readonly string[]` declaration — the author attributes that facet owns
- [x] `width`, `spacing`, `inset`, `elevation`, `prominence`, `motion` (reveal + stagger) and `density` each declare their own
- [x] The engine strips the union of every registered facet's `attributes`, plus `data-rune` / `data-rune-fields`, plus the config-modifier facet's dynamic `stripAttrs`
- [x] The fixed destructure in `transformRune` is gone, along with the NOTE comment marking it
- [x] All 630 pre-existing transform tests pass **unmodified**
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

The reason this needs a *static* declaration rather than the existing `FacetResult.stripAttrs` channel is subtle and worth stating: these attributes must be stripped **even when the facet resolves to nothing**. `width="content"` is suppressed (the facet returns `null`) but the attribute must still not reach the output. A per-instance result channel cannot express that; `stripAttrs` stays for the config-modifier facet, whose attribute names come from config and so cannot be static.

Deliberately split out of {% ref "WORK-523" /%} rather than folded into it — that item was the riskiest migration in the milestone (every rune goes through the modifier loop), and widening it for a mechanical cleanup would have been a poor trade.

## Blocked by
- {% ref "WORK-523" /%}

## References

- {% ref "SPEC-124" /%} — facet registry (the spec this work item realizes)
- {% ref "WORK-523" /%} — the migration that introduced `stripAttrs` and left this residue

## Resolution

Completed: 2026-09-02

Branch: `claude/transform-package-refactor-7mxi8a`

### What was done

- `packages/transform/src/facets/types.ts` — `Facet.attributes`, a static declaration of the author attribute names a facet owns.
- `packages/transform/src/facets/{box,elevation,prominence,motion,density}.ts` — each declares its own: `width`, `spacing`, `inset`, `elevation`, `prominence`, `reveal` + `stagger`, `density`.
- `packages/transform/src/facets/index.ts` — `FACET_ATTRIBUTES`, the union derived once at module load.
- `packages/transform/src/engine.ts` — the fixed destructure and its NOTE comment are gone; pass-through now filters on `FACET_ATTRIBUTES` plus the config-modifier facet's dynamic `stripAttrs`, with only `data-rune` / `data-rune-fields` named directly.
- `packages/transform/test/facets/registry.test.ts` — 10 tests covering the derived set, registry ordering invariants (every facet after its declared dependencies, no duplicate names), and stripping including the resolved-to-nothing case.

### Notes

**Static, not a result field.** These attributes must be stripped even when the facet resolves to nothing: `width="content"` is suppressed — no axis, no class — but must not reach the rendered element. A per-instance channel cannot express that, which is why `stripAttrs` alone was insufficient and why this was split out of {% ref "WORK-523" /%} rather than folded in.

**An asymmetry found and deliberately preserved.** Checking the pre-change behaviour attribute-by-attribute before touching anything showed that `reading` and `dropcap` reach the rendered element today, unlike the other eight. Both are consumed and re-expressed as `data-reading` / `data-dropcap` on the body section, so the raw attributes surviving looks like an oversight — but removing them is a behaviour change, and this item is a mechanical cleanup. They are excluded from `FACET_ATTRIBUTES` and pinned by a test recording *why*, so the exclusion does not read as arbitrary. Worth its own item if it should be fixed.

**A flake, unidentified.** The first full-suite run reported 1 failure; it cleared before I captured which test, and three subsequent full runs were green at 4012. The same container produced a `plugins/plan` timeout flake earlier in this milestone, so it is plausibly the same timing sensitivity — but I cannot name it, so it is recorded rather than dismissed.

Behaviour verified attribute-by-attribute against the pre-change baseline, including an unrecognised attribute still passing through untouched. All 630 pre-existing transform tests pass unmodified.

{% /work %}
