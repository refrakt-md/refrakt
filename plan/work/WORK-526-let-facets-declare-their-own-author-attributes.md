{% work id="WORK-526" status="ready" priority="low" complexity="simple" source="SPEC-124" tags="engine, transform, refactor" milestone="v0.30.1" %}

# Let facets declare their own author attributes

`transformRune` still strips consumed author attributes from pass-through output using a **fixed list** naming eight facet-owned axes:

```ts
const { width: _w, spacing: _s, inset: _i, elevation: _e, prominence: _p,
        reveal: _rv, stagger: _st, density: _d, ... } = tag.attributes;
```

So adding an axis with a fixed attribute name still means editing `engine.ts` — which contradicts {% ref "SPEC-124" /%}'s claim that a new axis is a file plus a registry entry. This is the last such coupling.

## Acceptance Criteria

- [ ] `Facet` gains a static `attributes?: readonly string[]` declaration — the author attributes that facet owns
- [ ] `width`, `spacing`, `inset`, `elevation`, `prominence`, `motion` (reveal + stagger) and `density` each declare their own
- [ ] The engine strips the union of every registered facet's `attributes`, plus `data-rune` / `data-rune-fields`, plus the config-modifier facet's dynamic `stripAttrs`
- [ ] The fixed destructure in `transformRune` is gone, along with the NOTE comment marking it
- [ ] All 630 pre-existing transform tests pass **unmodified**
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

The reason this needs a *static* declaration rather than the existing `FacetResult.stripAttrs` channel is subtle and worth stating: these attributes must be stripped **even when the facet resolves to nothing**. `width="content"` is suppressed (the facet returns `null`) but the attribute must still not reach the output. A per-instance result channel cannot express that; `stripAttrs` stays for the config-modifier facet, whose attribute names come from config and so cannot be static.

Deliberately split out of {% ref "WORK-523" /%} rather than folded into it — that item was the riskiest migration in the milestone (every rune goes through the modifier loop), and widening it for a mechanical cleanup would have been a poor trade.

## Blocked by
- {% ref "WORK-523" /%}

## References

- {% ref "SPEC-124" /%} — facet registry (the spec this work item realizes)
- {% ref "WORK-523" /%} — the migration that introduced `stripAttrs` and left this residue

{% /work %}
