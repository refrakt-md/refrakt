{% work id="WORK-069" status="done" priority="medium" complexity="moderate" tags="transform, lumina, css, dimensions" milestone="v0.9.0" source="SPEC-025" %}

# Universal Checklist Styling

> Ref: SPEC-025 (Universal Theming Dimensions — Checklist section)

Depends on: WORK-059 (Metadata Structure Entry — for `data-checked` attribute emission pattern)

## Summary

Implement the universal checklist dimension: detect `[x]`/`[ ]`/`[>]`/`[-]` checkbox markers in list items during the identity transform, emit `data-checked` attributes, and write universal Lumina CSS. This replaces per-rune checkbox styling duplication (plot beats, comparison rows) and adds visual checkbox treatment to runes that currently lack it (work/bug acceptance criteria).

## Acceptance Criteria

- [x] Identity transform detects checkbox markers (`[x]`, `[ ]`, `[>]`, `[-]`) at the start of list item text content
- [x] Detected markers are stripped from rendered text output
- [x] `data-checked` attribute emitted on `<li>` elements with values: `checked`, `unchecked`, `active`, `skipped`
- [x] Optional `checklist: true` flag on `RuneConfig` enables detection on all lists within a rune (not just standard task list items)
- [x] Lumina CSS: `[data-checked]` base rules (padding, indicator position), `[data-checked="checked"]` (success colour, muted text), `[data-checked="unchecked"]` (empty indicator), `[data-checked="active"]` (primary colour, emphasis ring), `[data-checked="skipped"]` (muted, strikethrough)
- [x] Density interaction CSS: compact shrinks indicators, minimal hides text
- [x] Plot beats emit `data-checked` alongside existing BEM status modifiers — existing dot/timeline styling preserved via BEM specificity
- [x] Work/bug acceptance criteria lists get checkbox indicators without any schema changes
- [x] Comparison check/cross rows get `data-checked` alongside existing row-type styling
- [x] CSS coverage tests updated for all new `[data-checked]` selectors
- [x] `ThemeConfig` / `RuneConfig` types updated with optional `checklist` field

## Approach

### Transform layer (`packages/transform/`)

Add checkbox marker detection to the identity transform's list item processing in `engine.ts`. When walking list items, check if the first text node starts with a marker pattern (`/^\[(x|>|\s|-)\]\s*/`). If found, strip the marker text and set `data-checked` on the `<li>` element.

The detection should run for all list items by default — checkbox markers in Markdown are an intentional authoring pattern, so false positives are unlikely. The `checklist: true` config flag is for documentation/discoverability rather than gating.

### Rune migration

- **Plot**: The beat content model already extracts markers and maps them to status modifiers. Add a `postTransform` step or adjust the engine to also emit `data-checked` when the status modifier is set. The existing BEM classes (`.rf-beat--complete`, etc.) continue providing the dot/timeline visual; universal checklist rules provide text-level treatment.
- **Comparison**: The `detectRowType` function already identifies check/cross rows. Map these to `data-checked="checked"` / `data-checked="unchecked"` on the output elements.
- **Work/Bug**: No schema changes needed. The identity transform processes body content list items generically, so acceptance criteria lists get `data-checked` automatically.

### Lumina CSS (`packages/lumina/styles/dimensions/checklist.css`)

Write ~6 rules matching the CSS in SPEC-025's Checklist section. Import in `packages/lumina/index.css`. Use design tokens throughout.

### Types (`packages/transform/src/types.ts`)

Add optional `checklist?: boolean` to `RuneConfig`.

## References

- SPEC-025 (Universal Theming Dimensions — Checklist section)
- WORK-067 (Lumina Universal Dimension CSS — sibling work item)

{% /work %}
