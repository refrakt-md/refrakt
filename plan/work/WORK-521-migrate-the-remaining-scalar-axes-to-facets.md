{% work id="WORK-521" status="ready" priority="medium" complexity="moderate" source="SPEC-124" tags="engine, transform, refactor" milestone="v0.31.0" %}

# Migrate the remaining scalar axes to facets

Move the remaining lettered sub-steps of `transformRune` into facets: `density` (1e), `width` / `spacing` / `inset` (1f), `reading` and `dropcap` (1f-bis), `content-measure`, and `reveal` / `stagger`. Individually these are small; together they are most of what remains between step 1 and step 2, and clearing them is what lets the lettered numbering go away.

## Acceptance Criteria

- [ ] `density`, `width`, `spacing`, `inset`, `reading`, `dropcap`, `content-measure` and `motion` (reveal + stagger) are facets
- [ ] `dropcap` declares `after: ['reading']`, replacing the current adjacency-only guarantee, and keeps its off-register warn
- [ ] `density` continues to resolve author attribute ▸ parent `childDensity` ▸ rune default ▸ `full`, reading the parent rune's config through the facet context
- [ ] `motion` keeps `data-reveal` / `data-stagger` emission and the `--rf-reveal-index` stamping on cascade items — the latter via `postAssemble`, since it walks assembled children
- [ ] `width`, `spacing` and `inset` keep their default-suppression rules (`content`, `default`) so unmarked output stays byte-identical
- [ ] No lettered sub-steps (`1b`…`1h`) remain in `transformRune`
- [ ] All 630 pre-existing transform tests pass **unmodified**
- [ ] Unit tests cover each axis's default resolution and suppression rules, and the `reading` → `dropcap` gate
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

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

{% /work %}
