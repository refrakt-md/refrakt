{% bug id="BUG-045" status="reported" severity="minor" source="SPEC-066" tags="seo, structured-data, expand, drawer, pipeline" %}

# Embedded content's structured data is published again on every page that embeds it

Found from reading the code while designing {% ref "SPEC-178" /%}. Not yet reproduced.

`{% expand %}` and `ref preview="drawer"` inline another entity's content into the current page.
The expand pass re-transforms the entity's source AST with the site's full config
(`packages/runes/src/expand-pipeline.ts`), so any rune inside it emits its `typeof` and
`property` markers as it would on its own page. Drawers are hoisted into the same page
renderable.

JSON-LD is harvested after `postProcess`, deliberately (`packages/content/src/site.ts`, the
`extractSeo` loop after the pipeline). `collectJsonLd` walks the whole renderable for `typeof`.
So the embedded entity's structured data would be published on the embedding page too. A page
that embeds a recipe would claim a second `Recipe`.

It does not happen today, which is why it is minor. The only embeddable entities are plan
entities (`sourceFile` + `extract` in `plugins/plan/src/pipeline.ts`), and plan runes emit no
structured data. It becomes real when:

- an embedded plan entity contains a rune with a schema row in its body;
- a plugin registers `embed` or `extract` for an entity with a schema row;
- a composed rune becomes embeddable ({% ref "SPEC-178" /%}).

## Steps to Reproduce

1. On a site with `@refrakt-md/learning` installed, write a plan spec whose body contains a rune
   with a schema row, outside a code fence, for example a `{% recipe %}`.
2. On a site page, write `{% expand "SPEC-…" /%}` for it.
3. Build and read the page's JSON-LD.

## Expected

The embedding page publishes only its own structured data. The embedded entity's data is
published once, on its canonical page.

## Actual (expected from the code)

The embedding page's JSON-LD includes the embedded rune's entity.

## Acceptance Criteria

- [ ] The steps above are reproduced in a test, or the bug is closed with the reason it does not occur
- [ ] Content inlined by `expand` and by drawer previews carries no `typeof` / `property` markers into the host page's harvest
- [ ] A canonical link to the embedded entity's own page is kept, so the data is still reachable where it is published
- [ ] The SEO baseline does not move

## Environment

- `main` at v0.41.2

{% /bug %}
