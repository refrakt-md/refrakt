{% work id="WORK-061" status="ready" priority="high" complexity="moderate" tags="lumina, css, metadata" milestone="v0.9.0" %}

# Lumina Generic Metadata CSS

> Ref: SPEC-024 (Metadata System — Theme CSS), SPEC-026 (Lumina Theme — Sentiment Colours)

Depends on: WORK-059 (Metadata Dimensions on StructureEntry)

## Summary

Write the ~18 generic CSS rules in Lumina that style every metadata badge across every rune using the `data-meta-type`, `data-meta-sentiment`, and `data-meta-rank` attribute selectors. This replaces dozens of per-rune badge CSS rules with a universal set.

## Acceptance Criteria

- [ ] Lumina includes CSS rules for all 6 meta types: status (coloured pill with dot), category (outlined chip), quantity (bold tabular number), temporal (icon-prefixed value), tag (flat muted label), id (monospace)
- [ ] Lumina includes CSS rules for all 4 sentiments: positive → success colour, negative → danger colour, caution → warning colour, neutral → muted colour
- [ ] Lumina includes CSS rules for both ranks: primary (full size), secondary (smaller + faded)
- [ ] Sentiment colours adapt to dark mode via existing Lumina colour token definitions
- [ ] `--meta-color` and `--meta-font-size` custom properties cascade correctly from sentiment/rank to type rules
- [ ] CSS coverage tests updated to expect the new `[data-meta-*]` selectors
- [ ] Per-rune badge CSS that is now redundant is identified (removal can be done incrementally in a follow-up)

## Approach

Create `packages/lumina/styles/dimensions/metadata.css` (or similar) with the CSS from SPEC-024's Theme CSS section. Import it in `packages/lumina/index.css`. Verify that badges render correctly for a sample of runes using the dev site. The per-rune badge CSS can coexist with the generic metadata CSS during migration — both target different selectors, so there's no conflict.

## References

- SPEC-024 (Metadata System — Theme CSS, Dark Mode)
- SPEC-026 (Lumina Theme — Sentiment Colours)

{% /work %}
