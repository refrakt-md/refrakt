{% work id="WORK-567" status="ready" priority="medium" complexity="moderate" source="SPEC-130" tags="runes,schema-org,seo" milestone="v0.35.0" %}

# Group A — seven runes that assert a type and describe nothing

`gallery`, `data-table`, `budget`, `itinerary`, `map`, `symbol` and `blog`
declare a `schemaOrgType` and no property mapping at all. Each either gains a
real mapping or stops emitting a type.

Apply D4: **a row that resolves to a bare `@type` emits nothing.**

## What they publish today

```json
{ "@context": "https://schema.org", "@type": "Dataset" }
{ "@context": "https://schema.org", "@type": "ItemList" }
```

A `Dataset` with no `name`, `description` or `distribution`; an `ItemList` with
no `itemListElement`. Verified by running `extractSeo` directly over `gallery`,
`data-table`, `budget`, `itinerary` and `map`; `symbol` and `blog` carry no
`schema:` map either, so nothing stamps a `property` inside them.

These are not *wrong* the way a podcast typed as a music playlist is wrong. They
are noise in every consumer that reads them.

## Acceptance Criteria

- [ ] Each of the seven runes either declares at least one property or stops emitting a type
- [ ] The decision per rune is recorded with a reason, not left implicit in the diff
- [ ] No entity with zero properties is emitted anywhere in the catalog, enforced by the mechanism rather than by convention (D4)
- [ ] Every removal is visible as a diff against {% ref "WORK-562" /%}'s baseline — seven entities disappearing in one reviewable commit
- [ ] Any rune that gains a mapping has that mapping reviewed through `refrakt inspect` (per {% ref "WORK-566" /%}), not by reading the transform
- [ ] `defineRune({ schemaOrgType })` entries for these runes go with them

## Approach

**The forcing function is the point.** The imperative form let this question be
skipped for years — `schemaOrgType: 'Dataset'` costs one line and looks like
work being done. The table makes "write the mapping or lose the type" the only
two options, which is the right pressure.

Expect the honest answer for most of them to be *lose the type*. A `gallery` of
images is a plausible `ImageGallery` but only if it says what images; a
`data-table` is a plausible `Dataset` but only with a `distribution`. Where the
content genuinely carries the properties, map them; where it does not, removing
the assertion is the improvement, not the compromise.

`blog` is the one worth a second look, since it is the closest to page-level
schema and page-level schema is explicitly out of scope for
{% ref "SPEC-130" /%} — `WebSite` and `Organization` entities are built in
`seoToHtml` and the Next/Nuxt head helpers, not from runes. If `blog`'s right
answer turns out to be "this belongs to the page, not the rune", record that and
drop the type here rather than inventing a rune-level mapping to keep it.

## Blocked by

- {% ref "WORK-565" /%}
- {% ref "WORK-566" /%}

## References

- {% ref "SPEC-130" /%} — "Group A", D4, and the page-level non-goal
- {% ref "WORK-562" /%} — the baseline these removals are read against

{% /work %}
