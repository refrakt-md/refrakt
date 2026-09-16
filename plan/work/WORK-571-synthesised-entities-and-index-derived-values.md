{% work id="WORK-571" status="ready" priority="medium" complexity="moderate" source="SPEC-130" tags="runes,schema-org,seo,pipeline" milestone="v0.35.0" %}

# Synthesised entities and index-derived values

The last two Group C shapes. `testimonial` and `event` build entity spans by
hand from text pulled out of other tags; `breadcrumb` and `timeline` emit
positions from a loop index. Both become declarations.

Closes Group C, and with it the migration.

## Synthesised entities — already prototyped

`testimonial` builds a `<span typeof="Person">` from
`authorNameTag.children.filter(…)`; `event` builds a `Place` from
`attrs.location`. Naming the invented span is pointless, because under the table
the applier is what creates it. What matters is that the *sources* are
addressable, and they already are.

```ts
export const testimonialSchema = {
  type: 'Review',
  properties: { quote: 'reviewBody' },
  entities: {
    author: { type: 'Person', property: 'author',
              properties: { 'author-name': 'name', 'author-role': 'jobTitle' } },
    rating: { type: 'Rating', property: 'reviewRating',
              properties: { rating: 'ratingValue' } },
  },
} as const;
```

{% ref "SPEC-130" /%}'s prototype converted both: `testimonial` reproduced its
JSON-LD **byte-identical**, `event` identical under the normalised comparison,
differing only in key order because rebuilt carriers are appended last. So this
half is the best-understood work in the milestone — it is the case that settled
the mechanism's design.

`testimonial`'s `rating` is the one to watch. Its meta *is* dropped by
`createComponentRenderable` once the rune stops declaring `schema:`, and the
applier recovers the value from `data-rune-fields`. That path is exercised here
for real rather than in a prototype.

## Index-derived values — one keyword, and a live hole

`position: 'index'`. A value that exists nowhere in the content has to be
generated, and the vocabulary is closed: `index` is the only generator anywhere
in the codebase, used by exactly two runes.

`breadcrumb` is the harder one, and not because of the index. It is built by
`buildAutoBreadcrumb` from a **`postProcess` hook**, not from a Markdoc schema,
so the `createContentModelSchema` wrapper cannot reach it. D8: the hook calls
the applier directly. One call site, and it keeps "not half of each"
exceptionless rather than carving out the one emitter that happens to live in a
pipeline phase.

That only means anything because {% ref "WORK-563" /%} moved the harvest —
before it, `{% breadcrumb auto=true %}` contributed nothing to the JSON-LD no
matter what the hook emitted.

## Acceptance Criteria

- [ ] `testimonial` and `event` declare `entities:` tables and stop synthesising entity spans in their transforms
- [ ] Both reproduce {% ref "WORK-562" /%}'s baseline — `testimonial` exactly, `event` under the normalised comparison
- [ ] `testimonial`'s existing `jobTitle: ", CTO at Acme"` comma defect is either preserved deliberately or fixed deliberately, and the choice is stated — it must not change by accident
- [ ] `breadcrumb` and `timeline` declare `position: 'index'` instead of emitting positions from the loop
- [ ] `buildAutoBreadcrumb`'s `postProcess` hook applies its resolved row through the same applier, not a hand-written mapping (D8)
- [ ] `breadcrumb` emits `String(index + 1)` so the RDFa and the JSON-LD agree on `position` — a string in one and a number in the other is a drift the invariant would otherwise have to tolerate (D8)
- [ ] The page-level two-point invariant passes for a page using `{% breadcrumb auto=true %}`
- [ ] `event`'s `location` resolves by name rather than being duplicated into a `Place` span by hand
- [ ] After this item, no rune passes `schemaOrgType` or a `schema:` map to `createComponentRenderable`, and no transform mutates `attributes.typeof` — the imperative form is fully migrated, not half of each

## Approach

The last criterion is the milestone's closing condition, and it is worth
checking mechanically rather than by inspection: a test that walks the catalog
and fails on any surviving `schemaOrgType:`, `schema:` or
`attributes.typeof = …` is cheap and makes "fully migrated" a fact rather than a
claim.

Do the two shapes in either order — they are independent — but `breadcrumb`
last, since it is the one that spans the pipeline and is easiest to verify once
everything else is quiet.

`timeline` and `timeline-entry` split across items ({% ref "WORK-568" /%} has
the entry), and so do `breadcrumb` and `breadcrumb-item`. A child entity is
never declared without the property that holds it, so each pair has to end up
coherent even though it lands in two commits. Land the parent second and check
the pair together.

## Blocked by

- {% ref "WORK-563" /%}
- {% ref "WORK-565" /%}

## References

- {% ref "SPEC-130" /%} — "Prototype: the `entities:` shape, measured", Group C shapes 2 and 3, D8
- {% ref "WORK-563" /%} — the harvest move that makes the `postProcess` hook's output reachable
- `packages/runes/src/config.ts` — `buildAutoBreadcrumb`

{% /work %}
