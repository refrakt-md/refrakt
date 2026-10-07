{% work id="WORK-616" status="in-progress" priority="medium" complexity="moderate" source="SPEC-143" milestone="v0.39.0" tags="plan,runes,transform,declarative" %}

# `work`, `bug` and `decision` drop their transforms for the slot declaration

The first proving set for {% ref "SPEC-143" /%}: the plan entity runes whose sections
arrive as **resolved entries** (no `emitTag`). After {% ref "SPEC-081" /%} they build no
structure; what is left is properties, `title` → `header`, `description` → `blurb`
(omitted when empty), `sections` → `body`. That is exactly what the slot declaration
expresses.

## The gate (SPEC-143 D7)

Per rune, `refrakt contracts --check` and `npm run seo:baseline:check` report **no
diff**. If a declarative form does not reproduce the transform's output byte for
byte, the gap is in the mechanism ({% ref "WORK-614" /%}), and the mechanism is what
changes, never the output.

Record the total `transform()` line count across the tag files before this item
starts. {% ref "WORK-617" /%} records the after figure.

## Acceptance Criteria

- [ ] The total `transform()` line count across the tag files is recorded before the migration, in this item's resolution
- [ ] `work`, `bug` and `decision` have no `transform`, and `refrakt contracts --check` plus `npm run seo:baseline:check` report no drift for any of them
- [ ] `buildSections` is deleted, not merely unused
- [ ] The cross-page pipeline's registry, `extractTitle` and breadcrumb reads produce identical results for plan content
- [ ] Each migrated declaration round-trips through `JSON.parse(JSON.stringify(…))` unchanged

## Blocked by

- {% ref "WORK-614" /%}

## References

- {% ref "SPEC-143" /%} — "The complex end — `work`", D4, D7

{% /work %}
