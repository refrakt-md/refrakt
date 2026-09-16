---
"@refrakt-md/runes": minor
"@refrakt-md/content": minor
"@refrakt-md/transform": minor
"@refrakt-md/cli": minor
---

Declare a rune's schema.org mapping as a table (SPEC-130, WORK-561/563/565/566)

A rune's structured data used to be built by hand inside its `transform()`:
`schemaOrgType: 'Product'` here, a `schema: { name: someLocalTag }` there, a
`<span typeof="Person">` assembled from filtered children somewhere else. No
tool could see any of it, because it only existed as JavaScript that had already
run — and JSON-LD is the one output nobody looks at, since a page renders
identically whether its structured data is right or ruined.

A rune now declares `schema:` on `createContentModelSchema` as data, and an
applier resolves it against the rendered tree:

```ts
export const eventSchema = {
  type: 'Event',
  properties: { headline: 'name', blurb: 'description', date: 'startDate' },
  entities: {
    location: { type: 'Place', property: 'location', properties: { location: 'name' } },
  },
} as const;
```

Sources resolve by name, and the lookup is attribute-agnostic: a `data-name` and
a `data-field` are equally findable, so a node moving between `properties` and
`refs` never breaks a table. A source that exists only as an attribute value is
rebuilt from the `data-rune-fields` bag; the rendered HTML is never relocated to
suit the schema.

New to the public surface:

- **`schema` is an identity field.** A theme may restructure and re-decorate a
  rune; it may not restate what the rune asserts about a site's content by
  changing how it looks (ADR-028).
- **Declared lists always serialise as arrays.** `lists: ['track']` fixes the
  shape of a collection property regardless of how many items an author wrote —
  previously a one-item collection emitted an object and a two-item one an
  array, so every consumer had to handle both.
- **Every source is addressable.** Roughly 20 nodes the schema reached only as
  anonymous local variables or array positions now carry names.
- **`refrakt inspect <rune>`, `refrakt contracts` and `refrakt reference` all
  print the resolved row.** Nothing validates a table against schema.org —
  refrakt ships no ontology — so visibility replaces validation, and a wrong row
  is caught by a reviewer reading it. What *is* checked: a source matching no
  emitted node, no field-bag entry and no declared attribute is flagged, because
  that property is silently absent from the published graph.

**SEO is now harvested after the cross-page pipeline**, not during per-page
transform. `{% breadcrumb auto=true %}` resolves its ancestors in a
`postProcess` hook, so before this its JSON-LD was harvested from a tree that
did not yet have them — the rendered RDFa and the published JSON-LD disagreed on
every auto breadcrumb.

Also new: `contracts/seo-baseline/baseline.json`, a committed record of the
structured data every rune emits, so a schema change is reviewed as a diff.
