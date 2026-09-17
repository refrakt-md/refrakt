---
"@refrakt-md/runes": minor
"@refrakt-md/places": minor
"@refrakt-md/docs": patch
---

An entity with no properties is not emitted (WORK-567, SPEC-130 D4)

Seven runes declared a schema.org type and no property mapping at all, each
publishing `{"@context": …, "@type": "Dataset"}` and nothing more. A type
assertion with nothing attached tells a consumer nothing; it is noise in every
channel that reads it.

`collectJsonLd` now drops an entity that resolves to a bare `@type`, and never
nests a bare child into its parent. Enforcing it in the collector rather than
per rune keeps it enforced: a rune that declares a type and forgets the mapping
loses the entity instead of quietly joining the seven.

**Six of the seven lost the type**, with the reason recorded at each call site:

- `gallery` (`ImageGallery`) — the images are plain markdown pictures with
  nothing naming them; `image`/`associatedMedia` needs each typed as an
  `ImageObject`.
- `data-table` (`Dataset`) — no headline to supply a `name`, no `distribution`
  to point at; its properties are all interaction config.
- `budget` and `itinerary` (`ItemList`) — the children carry real data, but
  `itemListElement` needs them typed, and neither a cost breakdown nor a
  day-by-day plan is a ranked list to begin with.
- `map` (`Place`) — a type error rather than a thin entity: a map showing three
  landmarks is not itself a place. The name and description belong to the
  `map-pin` children.
- `blog` (`Blog`) — this belongs to the page, not the rune. Its `posts`
  container is empty at transform time and `name`/`url`/`blogPost` are
  page-level facts.

`symbol` kept `TechArticle` and gained a real mapping — `name` from the symbol's
own heading, `description` from the lead paragraph.

**If you consume structured data from those six runes**, there is now nothing
where an empty type assertion used to be. Dropping the type also removes the
`typeof` from the rendered HTML, so the RDFa channel goes quiet with the JSON-LD
rather than keeping a bare assertion in the markup.
