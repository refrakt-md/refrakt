{% work id="WORK-574" status="ready" priority="low" complexity="trivial" source="SPEC-130" tags="runes,schema-org,seo" %}

# Declare the four retype-and-wrap collections as lists (D6)

`accordion`'s `mainEntity`, `how-to`'s `step` and `tool`, and `recipe`'s
`recipeIngredient` and `recipeInstructions` are collections that still serialise
as a bare object when they hold one item and an array when they hold two.

Every other collection in the catalog has been declared: `pricing`'s `offers`,
`playlist`'s `track` / `hasPart`, `breadcrumb`'s and `timeline`'s
`itemListElement`. These five are the remainder.

## Why they were left out

{% ref "WORK-570" /%} migrated these four runes, and its whole evidence was an
**empty diff** — byte-for-byte identical HTML and a JSON-LD baseline that did not
move. Declaring a list changes a one-question accordion's `mainEntity` from an
object to an array, which would have put a deliberate output change inside a
refactor whose correctness argument is "nothing changed".

So it is a separate change, on purpose, and a small one.

## Acceptance Criteria

- [ ] `accordionSchema` declares `lists: ['mainEntity']`
- [ ] `howToSchema` declares `lists: ['step', 'tool']`
- [ ] `recipeSchema` declares `lists: ['recipeIngredient', 'recipeInstructions']`
- [ ] The `accordion.single`, `howto.single` and `recipe.single` fixtures move from `pending` to `declared` in the baseline's D6 guard, and `pending` is then empty
- [ ] The baseline diff shows exactly the shape change on those fixtures and nothing else

## Approach

The guard in `scripts/generate-seo-baseline.test.mjs` already splits its pairs
into `declared` and `pending`; this empties the second list. When it is empty,
delete the split and assert the single rule — every collection is an array —
since at that point there is no exception left to describe.

## References

- {% ref "SPEC-130" /%} — D6
- {% ref "WORK-570" /%} — why these five were held back
- {% ref "WORK-565" /%} — `lists:` and `forceDeclaredLists`

{% /work %}
