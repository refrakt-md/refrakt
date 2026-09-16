{% work id="WORK-567" status="done" priority="medium" complexity="moderate" source="SPEC-130" tags="runes,schema-org,seo" milestone="v0.35.0" %}

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

- [x] Each of the seven runes either declares at least one property or stops emitting a type
- [x] The decision per rune is recorded with a reason, not left implicit in the diff
- [x] No entity with zero properties is emitted anywhere in the catalog, enforced by the mechanism rather than by convention (D4)
- [x] Every removal is visible as a diff against {% ref "WORK-562" /%}'s baseline — seven entities disappearing in one reviewable commit
- [x] Any rune that gains a mapping has that mapping reviewed through `refrakt inspect` (per {% ref "WORK-566" /%}), not by reading the transform
- [x] `defineRune({ schemaOrgType })` entries for these runes go with them

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

## Resolution

Completed: 2026-09-16

Branch: `claude/v0.35-parallel-feasibility-eia5le`

### What was done

**D4 in the collector, not rune by rune** — `packages/runes/src/seo.ts`: `walkForTypeof`
now drops an entity that resolves to a bare `@type`. Placed *after* the child
recursion, for the same reason `forceDeclaredLists` is: an entity whose only
content is a nested entity is not bare, and asking earlier would find the
property absent and drop a populated graph. The top-level slot is still claimed
before the recursion so surviving entities keep their document position, and the
bare one is spliced back out by identity. The nested append moved after the
recursion too, so a bare child is never attached to its parent.

**Six runes lost the type.** Each carries the reason inline at the
`createComponentRenderable` call:

- `gallery` (`ImageGallery`) — the pictures are plain markdown images with
  nothing naming them; `image`/`associatedMedia` needs each one typed as an
  `ImageObject`, a retype-and-wrap job rather than a flat mapping. `caption`
  would supply a `name`, but a named collection that lists none of its contents
  is the same empty claim with a label on it.
- `data-table` (`Dataset`) — no headline slot to supply a `name`, no
  `distribution` to point at; its five properties are all interaction config.
- `budget` (`ItemList`) — categories and line items carry real data, but
  `itemListElement` needs them typed, and a cost breakdown is not a ranked list
  to begin with.
- `itinerary` (`ItemList`) — same: days and stops reach a list only once each
  day is a `ListItem` and each stop something like a `TouristAttraction`.
- `map` (`Place`) — a type error rather than a thin entity. A map showing three
  landmarks is not itself a place; the `name`/`description` in the output belong
  to the `map-pin` children.
- `blog` (`Blog`) — the second look the work item asked for, and the answer was
  the one it anticipated: this belongs to the page, not the rune. The `posts`
  container is empty at transform time (the cross-page pipeline fills it), the
  rune's own properties are query config, and `name`/`url`/`blogPost` are
  page-level facts SPEC-130 puts out of scope.

**`symbol` kept its type and gained a mapping** — `symbolSchema` in
`plugins/docs/src/tags/symbol.ts`: `headline → name` (the symbol's own name, what
a reader searches for), `blurb → description`. Deliberately unmapped: `body`,
which would push a code fence, a parameter list and a blockquote into one
`description` string, and `lang`/`since`, whose schema.org homes belong to
`SoftwareSourceCode` rather than an article about it. Reviewed through
`refrakt inspect symbol --site main`, which first flagged `blurb` as
unresolvable — the rune's own snippet prescribes a lead paragraph that its
`defineRune` fixture omitted, so the fixture gained one and the review surface
now exercises both rows.

**Baseline** — `npm run seo:baseline`: six entities gone, `symbol` gains
`name` + `description`, nothing else moved. Fixture notes rewritten to say what
each rune decided and why; `DELIBERATELY_SILENT` added to
`scripts/generate-seo-baseline.mjs` so the six keep their fixtures and the
silence is *recorded* rather than absent.

**Tests** — the three corpus guards inverted: "a bare entity for exactly the
seven Group A runes" became "no bare entity anywhere (D4)"; the per-fixture
emission and RDFa checks now expect the six to be empty. Six unit tests in
`packages/runes/test/seo.test.ts` cover the collector's rule directly, including
the two ordering traps. `schema-table.test.ts`'s D6 fixtures needed real child
properties — bare placeholder children are now dropped before they can be
promoted, so the old fixtures measured D4 instead of D6. `plugins/places`' map
test and `packages/runes`' datatable test asserted exactly the noise this
removes, and now assert its absence.

### Notes
- The dropped `typeof` takes the RDFa channel with it, so the markup no longer
  carries a bare assertion either — visible in the baseline's `annotations`.
- Both committed copies of `contracts/structures.json` regenerated; the only
  change is `symbol`'s new `schemaOrg` row.
- Full suite green (4545 tests), `format:check` clean, both drift checks pass.

{% /work %}
