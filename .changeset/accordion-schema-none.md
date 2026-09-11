---
"@refrakt-md/runes": patch
---

`{% accordion schema="none" %}` emits no structured data (WORK-552)

An accordion always declared `typeof="FAQPage"`, with each item a `Question` and
its body an `Answer`. That is right for a FAQ and wrong for every other use of a
disclosure list. refrakt's own rune pages render each universal axis as an
accordion item, which published roughly **970 fabricated `Question` entries**
across 88 pages — plausible-looking structured data asserting something untrue.

```markdoc
{% accordion schema="none" %}
```

Suppresses the whole subtree, not just the container: `accordion-item` declares
`Question` independently, and stripping only the root would leave orphan
`Question` nodes with no `FAQPage` around them — worse than either consistent
state. The JSON-LD goes with it, because `collectJsonLd` derives it from the same
`typeof` attributes.

`"none"` is the only accepted value, declared via `matches` so it validates and
appears in the rune's generated attribute table. `FAQPage` has no subtype to
narrow to, and any other type is a branch switch the rune cannot follow —
`ItemList` would need `itemListElement` on the root *and* `ListItem` with
different properties on each item. Making that expressible is SPEC-130's job.

Markup, classes, behaviour and rendered content are otherwise unchanged, and an
accordion without the attribute emits exactly what it did before.
