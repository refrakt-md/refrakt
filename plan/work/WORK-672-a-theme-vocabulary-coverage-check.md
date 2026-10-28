{% work id="WORK-672" status="ready" priority="medium" complexity="moderate" source="ADR-043" tags="theme, vocabulary, css, coverage, tooling, lumina" %}

# A theme vocabulary coverage check

A theme that configures no rune cannot promise each rune looks right. It needs to cover the
vocabulary instead ({% ref "ADR-043" /%} decision 5). Lumina's coverage test
(`packages/lumina/test/css-coverage.test.ts`) checks BEM selectors derived from rune configs; it
does not check vocabulary values.

## Acceptance Criteria

- [ ] A check reports, for every vocabulary value, whether a theme styles it or leaves it to the base stylesheet: each `metaType`, sentiment, zone layout (`bar`, `definition-list`, `lead`, `ladder` as they land), section role, media kind and universal-axis value
- [ ] The vocabulary list is derived from the registries that define it, not restated, so a new value appears in the report without editing the check
- [ ] It runs for Lumina in the test suite, and its gaps are recorded as known sets that may only shrink, as the selector coverage test does
- [ ] It is available to third-party themes, through `refrakt` tooling, as part of a theme's definition of done beside `refrakt contracts --check`
- [ ] The theme-authoring docs describe it

## References

- {% ref "ADR-043" /%}: decision 5.
- {% ref "ADR-044" /%}: the plugin half of the same coverage, {% ref "WORK-673" /%}.

{% /work %}
