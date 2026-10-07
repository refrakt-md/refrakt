{% work id="WORK-617" status="cancelled" priority="medium" complexity="moderate" source="SPEC-143" milestone="v0.39.0" tags="storytelling,runes,transform,declarative" %}

# `character`, `realm` and `faction` drop their transforms for the slot declaration

The second proving set for {% ref "SPEC-143" /%}: the storytelling entity runes whose
sections arrive as **already-rendered child runes** (`emitTag`). Together with
{% ref "WORK-616" /%} this covers both sides of the `emitTag` split, which is what
proves the mechanism rather than one shape of it.

Same gate (D7): no drift in contracts or the SEO baseline, per rune.

`recipe` is the standing proof that the escape hatch is still needed (D3). It is not
migrated, and it is not bent to fit.

## Sequencing note

{% ref "WORK-612" /%} rewrites the same plugin's registration. The two are
independent; land them sequentially rather than on parallel branches.

## Acceptance Criteria

- [ ] `character`, `realm` and `faction` have no `transform` for the entity rune, and `refrakt contracts --check` plus `npm run seo:baseline:check` report no drift for any of them
- [ ] `buildStoryContent` is deleted, not merely unused
- [ ] `recipe` still has its `transform` and is not contorted to fit (D3)
- [ ] The cross-page pipeline's registry, `extractTitle` and breadcrumb reads produce identical results for storytelling content
- [ ] Each migrated declaration round-trips through `JSON.parse(JSON.stringify(…))` unchanged
- [ ] The total `transform()` line count across the tag files is recorded after the migration, beside {% ref "WORK-616" /%}'s before figure

## Blocked by

- {% ref "WORK-614" /%}

## References

- {% ref "SPEC-143" /%} — D3, D5, D7

## Resolution

Completed: 2026-10-07

Cancelled, not done or superseded, by the repository owner's decision on 2026-10-07.

### Why
`character`, `realm` and `faction` fail SPEC-143's D4 family test ("does every output slot come from exactly one resolved field, wrapped but not restructured?"). This was checked against their real output on `claude/v039-slot-labelling` (refrakt-md/refrakt#668):
- **`realm` / `faction`** emit `<div data-name="scene"><img data-name="sceneImage"></div>`. That is a named node inside a named node, which D2 forbids, and the schema.org `image` row reads `sceneImage`, so it cannot be flattened without moving the SEO baseline. `extractScene` also splits the one `scene` field into either the scene image or extra body prose by node kind (the `pick` capability the spec declined).
- **`character`** filters its rendered portrait with `.tag('img').limit(1)`, so a `![x](placeholder:portrait)` image is dropped today. A plain region would emit it.
- **All three** filter rendered children to the section rune type, and they merge non-section preamble runes into `body` only when there are no sections (and drop them when there are). That is a conditional across two slots. They also set `data-field="section"` on the rendered child runes.

Reproducing them byte for byte would need nesting, `pick`, `filter` and a cross-slot conditional, all of which SPEC-143 rules out (D2, D4, "Capabilities considered, and declined").

### Where it goes
The composed-runes work (SPEC-145 / SPEC-147), which replaces these runes rather than declaring their current transforms. `buildStoryContent` and the storytelling transforms stay until then.

### What SPEC-143 still has
- The mechanism is proven on the resolved-entry (non-`emitTag`) side by WORK-616 alone.
- The `emitTag` side of the D5 split is covered by the mechanism's own tests (`packages/runes/test/slots.test.ts`), not by a migrated production rune.
- The `transform()` line-count after figure is recorded in WORK-616 instead: 129 transforms / 6,385 lines before, 126 / 6,282 after.

### Notes
- The child sub-runes (`character-section`, `realm-section`, `faction-section`) looked like they would fit: an attribute value in a `span`, plus a body region. Not migrated, not filed.

{% /work %}
