{% work id="WORK-617" status="ready" priority="medium" complexity="moderate" source="SPEC-143" milestone="v0.39.0" tags="storytelling,runes,transform,declarative" %}

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

{% /work %}
