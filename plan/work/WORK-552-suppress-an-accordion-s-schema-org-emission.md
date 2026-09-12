{% work id="WORK-552" status="done" priority="medium" complexity="simple" milestone="v0.33.0" tags="runes,seo,schema-org" %}

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
- [x] `{% accordion schema="none" %}` emits no `typeof` on the accordion
- [x] Its items emit no `typeof` and no `property` either — the whole subtree, not just the root
- [x] The JSON-LD is empty too, not merely the HTML attributes
- [x] Markup, classes, behaviour and the rendered content are otherwise byte-identical
- [x] Without the attribute, `FAQPage` / `Question` are emitted exactly as today
- [x] `matches: ['none']` rejects any other value rather than silently ignoring it
- [x] {% ref "WORK-548" /%}'s shared block uses it, and the rune pages stop claiming ~970 FAQ entries
- [x] The strip helper is shared, not private to accordion — the next rune needs no new machinery

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

## Resolution

Completed: 2026-09-11

Branch: `claude/content-author-docs-org-vps1un`

### What was done

- `packages/runes/src/lib/component.ts` — `stripSchemaOrg(nodes)`, a shared recursive delete of `typeof` / `property`. Exported from `lib/index.ts`.
- `packages/runes/src/tags/accordion.ts` — `schema` attribute with `matches: ['none']`; when set, the rune drops its own `schemaOrgType`/`schema` map and strips the transformed items.
- `site/content/_partials/rune-attributes.md` — the shared block's accordion uses it.
- `site/content/runes/accordion.md` — a "When the panels are not a FAQ" section.
- `packages/runes/test/accordion.test.ts` — 5 tests.

### Notes

**Measured end to end, not just asserted.** `/runes/card` went from **44 `Question` occurrences to 0**, with all 11 accordion items still rendering. Site-wide, 965 accordion items now emit 25 `FAQPage` — and the only page still emitting any is `/runes/accordion` itself, whose examples genuinely are questions. That is the correct residue, not a miss.

**The subtree strip is the whole point, and the tests prove it.** Stripping only the root leaves orphan `Question` nodes with no `FAQPage` — worse than either consistent state. Probed by disabling `stripSchemaOrg`: three tests fail, including the JSON-LD one.

**Timing was the design constraint.** `extractSeo` reads the `Markdoc.transform` output at `site.ts:393`, and `site.ts` never applies the identity transform — that runs later, at render time. So a postProcess or engine-level strip would clean the HTML and leave the JSON-LD already harvested: a failure that looks fixed on the page. The test asserts `collectJsonLd` is empty rather than only checking markup, which is what would catch a regression to the later-pass approach.

**Not the trap it looks like:** `RenderableNodeCursor.typeof()` filters on `data-rune`, not the `typeof` attribute, so stripping does not break accordion's own item selection.

**One test error of my own, caught by the test failing.** The "content is identical" assertion first compared the two trees by regexing `typeof`/`property` out of the serialised JSON — which leaves dangling commas and reported a difference that was not there. Rewritten to strip the attributes from the parsed objects and compare those.

**Deliberately narrow.** `"none"` is the only value: `FAQPage` has no subtype to narrow to, and any other type is a branch switch needing both the container's property renamed and each item's type and properties changed — not reachable from an attribute on the container. {% ref "SPEC-130" /%} is where that becomes expressible, and `"none"` stays valid under whatever it settles.

{% /work %}
