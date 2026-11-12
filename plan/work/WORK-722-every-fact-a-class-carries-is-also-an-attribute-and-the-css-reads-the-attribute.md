{% work id="WORK-722" status="done" priority="high" complexity="moderate" source="SPEC-196" tags="transform, engine, attributes, lumina, css, contracts" milestone="v0.50.0" pr="refrakt-md/refrakt#789" %}

# Every fact a class carries is also an attribute, and the CSS reads the attribute

{% ref "SPEC-196" /%} D5. Before classes become optional, each fact only a class carries today
gets a data attribute, and the engine emits both. The measurement in D5 found two such facts:

- **Context modifiers** (`rf-card--in-recipe`). 9 runes declare them (`hint` in `hero` and
  `feature`, `actions` in `bar`, `showcase` in `bento-cell`, three design runes in
  `design-context`, `preview` and `feature`), and Lumina and the skeleton use them in 31
  selectors. The parent's `data-rune` is on an ancestor, but no selector says "the nearest
  enclosing rune". Every suffix is exactly `in-` plus the parent's name, so `data-in="<parent>"`
  carries it.
- **`--tinted`**, which differs from `data-tint` only for an unknown tint name or `tint="custom"`
  with no tokens. It gets `data-tinted=""`, a presence flag following the `data-tint-dark=""`
  convention. No CSS uses the class today (0 selectors).

Two more class-only facts need no new attribute:

- **Static modifiers** are already said by attributes in every first-party use:
  `data-rune="featured-tier"` and `data-media-position="cover"` / `data-cover-scope`. Their 14
  selectors (9 `section--cover`, always beside `[data-media-position="cover"]`, and 5
  `tier--featured`) move to the attributes. The field is deprecated ({% ref "SPEC-194" /%} D5).
- **The ordinal** already has `data-name="ordinal"`, and no CSS uses its class.

## Acceptance Criteria

- [x] The context-modifier facet sets `data-in="<parent rune>"` on every element it gives a context-modifier class, and keeps the class
- [x] The tint facet sets `data-tinted=""` wherever it adds `--tinted`, and keeps the class
- [x] The 31 context-modifier selectors in Lumina and the skeleton select `[data-in="…"]` instead of the class
- [x] The 14 static-modifier selectors select the attributes that already say the same fact
- [x] `staticModifiers` is marked deprecated in `packages/transform/src/types.ts`, pointing at SPEC-196 D5
- [x] Engine tests cover `data-in` (including a rune nested in a parent it does not declare, which gets none) and `data-tinted` (set, and absent for `tint="custom"` with no tokens)
- [x] Both contract copies (`contracts/structures.json`, `packages/lumina/contracts/structures.json`) are regenerated and record the new attributes
- [x] The CSS coverage test passes, with its expectations updated for selectors that moved to attributes
- [x] `npm run seo:baseline:check` passes, or the baseline is regenerated and its diff shows only the new attributes

## Approach

- The facets are `packages/transform/src/facets/modifiers.ts` (context and static modifiers) and
  `facets/tint.ts`. Emit the attribute in the same place the class is added, so the two cannot
  diverge.
- `data-in` holds the parent's `data-rune` name, the same key `contextModifiers` already uses. The
  value is the declared parent, not every ancestor: it says what the class said and no more.
- The names were checked free in D5: `data-in` and `data-tinted` appear nowhere in packages or
  plugins (`data-parent` is taken by `realm`).
- Use `refrakt inspect` on `actions` inside `bar` and on `showcase` inside `bento-cell` to see both
  outputs before moving their CSS. Those two hold 17 of the 31 selectors.
- A selector change keeps its specificity in mind: `.rf-actions--in-bar` and
  `.rf-actions[data-in="bar"]` differ, so check the rules that relied on the old weight.

## References

- {% ref "SPEC-196" /%} D5, and "What exists, measured".
- {% ref "SPEC-194" /%} D5: the config fields kept and deprecated.
- {% ref "ADR-048" /%}: implementation order, step 1.

## Resolution

Completed: 2026-11-09

Branch: `claude/rune-composition-layout-convention-hkqrzx`

### What was done
- `packages/transform/src/facets/modifiers.ts`: the context-modifiers facet sets `data-in="<parent>"` beside the `--in-<parent>` class, only for the declared parent. Its contract description gains `attributeSelector`; the static-modifiers facet is documented as deprecated.
- `packages/transform/src/facets/tint.ts`: `data-tinted=""` wherever `--tinted` is added; the axis contract lists it.
- `packages/transform/src/types.ts`: `staticModifiers` marked `@deprecated` (SPEC-196 D5 / SPEC-194 D5); `contextModifiers` doc points at `data-in`. `contracts.ts` and `facets/describe.ts` carry `attributeSelector`.
- Lumina and skeleton CSS: 31 context-modifier selectors now select `[data-in]`, 14 static-modifier selectors select `data-rune="featured-tier"` / `data-media-position="cover"`.
- `packages/lumina/test/css-coverage.test.ts`: context modifiers count as covered by `.block[data-in="parent"]` (bare or `:where()`), plus new tests that fail on CSS selecting a context- or static-modifier class (variant deltas included). `vocabulary-coverage.test.ts` records `[data-tinted]` as intentionally unstyled.
- `packages/cli`: `inspect --audit` expects `[data-in="parent"]` and no static-modifier classes; `scaffold-css` writes the attribute form and no static stubs.
- `packages/transform/test/context-modifiers.test.ts`: `data-in` and `data-tinted` tests.
- Contracts regenerated (both copies). Docs updated: `css.md`, `config-api.md`, `output-contract.md`, `composability.md`, `theme-authoring/overview.md`, `runes/actions.md`. Changeset: transform minor, lumina/skeleton/cli patch.

### Notes
- Every retargeted selector wraps the new attribute in `:where()` so specificity is unchanged. Two places depend on it: the frost scrim (`lumina/styles/dimensions/cover.css`) beats the section band scrim by exactly one attribute, and `.rf-tier:hover` must keep beating the featured tier's shadow. A plain `.rf-x[data-in]` would have tied or reversed both.
- The contract field is named `attributeSelector`, not `dataAttribute`, because elsewhere in the contract `dataAttribute` holds an attribute name, not a selector.
- The SEO baseline did not change: no fixture nests a context-modified rune or resolves a tint.

{% /work %}
