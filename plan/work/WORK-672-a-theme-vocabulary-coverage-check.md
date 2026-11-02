{% work id="WORK-672" status="done" priority="medium" complexity="moderate" source="ADR-043" tags="theme, vocabulary, css, coverage, tooling, lumina" milestone="v0.46.0" pr="refrakt-md/refrakt#754" %}

# A theme vocabulary coverage check

A theme that configures no rune cannot promise each rune looks right. It needs to cover the
vocabulary instead ({% ref "ADR-043" /%} decision 5). Lumina's coverage test
(`packages/lumina/test/css-coverage.test.ts`) checks BEM selectors derived from rune configs; it
does not check vocabulary values.

## Acceptance Criteria

- [x] A check reports, for every vocabulary value, whether a theme styles it or leaves it to the base stylesheet: each `metaType`, sentiment, zone layout (`bar`, `definition-list`, `lead`, `ladder` as they land), section role, media kind and universal-axis value
- [x] The vocabulary list is derived from the registries that define it, not restated, so a new value appears in the report without editing the check
- [x] It runs for Lumina in the test suite, and its gaps are recorded as known sets that may only shrink, as the selector coverage test does
- [x] It is available to third-party themes, through `refrakt` tooling, as part of a theme's definition of done beside `refrakt contracts --check`
- [x] The theme-authoring docs describe it

## References

- {% ref "ADR-043" /%}: decision 5.
- {% ref "ADR-044" /%}: the plugin half of the same coverage, {% ref "WORK-673" /%}.

## Resolution

Completed: 2026-11-02

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/transform/src/vocabulary.ts` (new):
  - constants `META_TYPES`, `RENDERED_META_TYPES`, `SENTIMENTS`, `LAYOUT_PRIMITIVES`, which `types.ts` now derives `MetaType`, `Sentiment` and `LayoutPrimitive` from;
  - `vocabularyEntries`, `cssSelectors` and `vocabularyCoverage` (theme / base / none).
- `packages/runes/src/vocabulary.ts` (new): `themeVocabulary()` / `themeVocabularyDimensions()` assembled from:
  - those constants, plus the `{% group %}` layouts (`GROUP_LAYOUTS_LIST`) and `SEQUENCE_VALUES`;
  - `SECTION_ROLES` and `section`'s `mediaKinds`, now exported;
  - every universal axis's data attributes from `UNIVERSAL_AXIS_FACETS`, with each facet's values or the attribute's `matches`.
- `packages/lumina/test/vocabulary-coverage.test.ts`: the Lumina run, with a shrink-only `KNOWN_UNSTYLED` set giving reasons.
- `packages/transform/test/vocabulary.test.ts`.
- CLI: `refrakt theme coverage` (`commands/theme-coverage.ts`, wired in `bin.ts`); skeleton is found as the base through `node_modules`.
- Docs: `docs/cli/theme-tools.md` (the command), `theme-authoring/overview.md` ("Covering the vocabulary"), and the `cli-overview` row.

### Notes
- Lumina today: 105 values. 86 theme, 6 base, 13 unstyled, mostly defaults.
- Real gap found and recorded, not fixed: the cover axis's `data-scrim` and `data-scrim-type` versus Lumina's scrim rules on bg's `data-scrim-dir`, where bg's `data-scrim` means a type. A follow-up should reconcile the two.
- Glyph concepts (ADR-043 lists them) are not a dimension yet: no registry names them.

{% /work %}
