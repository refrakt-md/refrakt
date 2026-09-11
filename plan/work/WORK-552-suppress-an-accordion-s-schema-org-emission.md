{% work id="WORK-552" status="in-progress" priority="medium" complexity="simple" source="SPEC-130" milestone="v0.33.0" tags="runes,seo,schema-org" %}

# Suppress an accordion's schema.org emission

`{% accordion schema="none" %}` emits no structured data — not on the accordion,
not on its items.

Narrow on purpose. The general answer is {% ref "SPEC-130" /%}; this is the one
value that is needed now, and `"none"` stays valid under whatever that spec
settles, so shipping it forecloses nothing.

## Why now

{% ref "WORK-548" /%} renders each rune's universal axes as accordion items. An
axis is not a frequently asked question, and `accordion` emits
`typeof="FAQPage"` with each item a `Question` — roughly **970 fabricated
`Question` entries** across 88 rune pages, live today.

## Why only `"none"`

`FAQPage` is a leaf in schema.org's hierarchy, so there is no subtype to narrow
to. Any other type is a branch switch, and accordion emits schema at two levels:

```ts
// accordion root
schemaOrgType: 'FAQPage',  schema: { mainEntity: items }
// each accordion-item
schemaOrgType: 'Question', schema: { name: nameTag, acceptedAnswer: bodyDivs }
```

`ItemList` would need `itemListElement` on the root *and* `ListItem` with
different properties on each child. A value on the parent cannot reach the
child's transform. Making that expressible is exactly what SPEC-130 is for.

So the attribute is declared `matches: ['none']` — the vocabulary is stated
rather than implied, `refrakt` validates it, and the generated attribute table
renders it, so `/runes/accordion` documents itself.

## Acceptance Criteria
- [ ] `{% accordion schema="none" %}` emits no `typeof` on the accordion
- [ ] Its items emit no `typeof` and no `property` either — the whole subtree, not just the root
- [ ] The JSON-LD is empty too, not merely the HTML attributes
- [ ] Markup, classes, behaviour and the rendered content are otherwise byte-identical
- [ ] Without the attribute, `FAQPage` / `Question` are emitted exactly as today
- [ ] `matches: ['none']` rejects any other value rather than silently ignoring it
- [ ] {% ref "WORK-548" /%}'s shared block uses it, and the rune pages stop claiming ~970 FAQ entries
- [ ] The strip helper is shared, not private to accordion — the next rune needs no new machinery

## Approach

**Strip at transform time, not later.** `extractSeo` runs on the
`Markdoc.transform` output before the identity transform ever sees the tree, and
`collectJsonLd` derives the JSON-LD from `typeof` attributes there. A postProcess
strip would clean the HTML and leave the JSON-LD intact — the failure would look
fixed on the page and not be.

**The parent strips its children itself.** It already holds them: accordion
transforms its items into `sectionNodes` before assembling. A shared
`stripSchemaOrg(nodes)` walking for `typeof` / `property` is enough, and needs no
flag threaded into `accordion-item`'s independent transform.

**Not a trap, though it looks like one:** `RenderableNodeCursor.typeof()` filters
on `data-rune`, not on the `typeof` attribute. Stripping does not break
accordion's own item selection.

## References

- {% ref "SPEC-130" /%} — the general declarative mapping this anticipates
- {% ref "WORK-548" /%} — the pages emitting the fabricated entries

{% /work %}
