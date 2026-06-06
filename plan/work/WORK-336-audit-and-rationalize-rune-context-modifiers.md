{% work id="WORK-336" status="done" priority="medium" complexity="simple" source="SPEC-084" milestone="v0.19.0" tags="composability,lumina,cleanup" %}

# Audit and rationalize rune context modifiers

Review every declared `contextModifiers` entry across core and plugins, decide
whether the pairing is meaningful, and either style it or remove it. The lone
`KNOWN_MISSING_SELECTORS` context entry — Hero's `feature → in-feature` — is the
first casualty: it has no sensible rendering, so the modifier comes out rather
than getting CSS.

## Acceptance Criteria
- [x] Every `contextModifiers` entry is inventoried (rune → parent → modifier) with a keep/remove decision recorded.
- [x] Hero's `feature: 'in-feature'` context modifier is removed from `plugins/marketing/src/config.ts`.
- [x] `.rf-hero--in-feature` is dropped from `KNOWN_MISSING_SELECTORS`; `css-coverage` passes with no context-modifier carve-outs remaining (or each remaining carve-out has a written justification).
- [x] Kept modifiers all have CSS coverage.

## Approach
Cross-reference the `contextModifiers` declarations with the styled selectors in
`packages/lumina/styles/runes/*.css` (the composability research already mapped
these). Removing a modifier is a config-only change; the engine stops emitting
the BEM class automatically.

## References
- `packages/runes/src/config.ts`, `plugins/marketing/src/config.ts`, `plugins/design/src/config.ts`
- `packages/lumina/test/css-coverage.test.ts` (KNOWN_MISSING_SELECTORS)

## Resolution

Completed: 2026-06-05

Branch: `claude/v0.19-composability`

### Inventory (7 contextModifiers — 6 keep, 1 remove)
- **Hint** `{ hero→in-hero, feature→in-feature }` — keep (styled)
- **Showcase** `{ bento-cell→in-bento-cell }` — keep (the bleed pattern)
- **Palette / Typography / Spacing** `{ design-context→in-design-context }` — keep (design-context composes them)
- **Preview (design)** `{ feature→in-feature }` — keep (styled)
- **CTA** `{ hero→in-hero, pricing→in-pricing }` — keep (styled)
- **Feature** `{ hero→in-hero, grid→in-grid }` — keep (styled)
- **Hero** `{ feature→in-feature }` — **REMOVE** (nonsensical; the lone unstyled carve-out)

### What was done
- Removed Hero's `contextModifiers: { feature: 'in-feature' }` from `plugins/marketing/src/config.ts`.
- Dropped `.rf-hero--in-feature` from `KNOWN_MISSING_SELECTORS` in `css-coverage.test.ts` — **no context-modifier carve-outs remain**; every kept modifier has CSS coverage (css-coverage green).
- Regenerated both structure contracts (`contracts/structures.json`, `packages/lumina/contracts/structures.json`).

### Notes
- Full suite green (3065). The one fewer css-coverage test is the dropped `.rf-hero--in-feature` selector.

{% /work %}
