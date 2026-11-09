{% work id="WORK-722" status="ready" priority="high" complexity="moderate" source="SPEC-196" tags="transform, engine, attributes, lumina, css, contracts" milestone="v0.50.0" %}

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

- [ ] The context-modifier facet sets `data-in="<parent rune>"` on every element it gives a context-modifier class, and keeps the class
- [ ] The tint facet sets `data-tinted=""` wherever it adds `--tinted`, and keeps the class
- [ ] The 31 context-modifier selectors in Lumina and the skeleton select `[data-in="…"]` instead of the class
- [ ] The 14 static-modifier selectors select the attributes that already say the same fact
- [ ] `staticModifiers` is marked deprecated in `packages/transform/src/types.ts`, pointing at SPEC-196 D5
- [ ] Engine tests cover `data-in` (including a rune nested in a parent it does not declare, which gets none) and `data-tinted` (set, and absent for `tint="custom"` with no tokens)
- [ ] Both contract copies (`contracts/structures.json`, `packages/lumina/contracts/structures.json`) are regenerated and record the new attributes
- [ ] The CSS coverage test passes, with its expectations updated for selectors that moved to attributes
- [ ] `npm run seo:baseline:check` passes, or the baseline is regenerated and its diff shows only the new attributes

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

{% /work %}
