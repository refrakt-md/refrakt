{% work id="WORK-336" status="ready" priority="medium" complexity="simple" source="SPEC-084" milestone="v0.19.0" tags="composability,lumina,cleanup" %}

# Audit and rationalize rune context modifiers

Review every declared `contextModifiers` entry across core and plugins, decide
whether the pairing is meaningful, and either style it or remove it. The lone
`KNOWN_MISSING_SELECTORS` context entry — Hero's `feature → in-feature` — is the
first casualty: it has no sensible rendering, so the modifier comes out rather
than getting CSS.

## Acceptance Criteria
- [ ] Every `contextModifiers` entry is inventoried (rune → parent → modifier) with a keep/remove decision recorded.
- [ ] Hero's `feature: 'in-feature'` context modifier is removed from `plugins/marketing/src/config.ts`.
- [ ] `.rf-hero--in-feature` is dropped from `KNOWN_MISSING_SELECTORS`; `css-coverage` passes with no context-modifier carve-outs remaining (or each remaining carve-out has a written justification).
- [ ] Kept modifiers all have CSS coverage.

## Approach
Cross-reference the `contextModifiers` declarations with the styled selectors in
`packages/lumina/styles/runes/*.css` (the composability research already mapped
these). Removing a modifier is a config-only change; the engine stops emitting
the BEM class automatically.

## References
- `packages/runes/src/config.ts`, `plugins/marketing/src/config.ts`, `plugins/design/src/config.ts`
- `packages/lumina/test/css-coverage.test.ts` (KNOWN_MISSING_SELECTORS)

{% /work %}
