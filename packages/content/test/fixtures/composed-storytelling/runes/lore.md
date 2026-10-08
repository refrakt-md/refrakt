---
tag: article
description: A lore entry, composed over no primitive at all — a title, a placed meta block and the body. Kept beside the storytelling plugin's `lore` rather than shipped in place of it (SPEC-147 D1).
attributes:
  title:    { type: string, required: true, description: "Heading displayed for this lore entry." }
  category: { type: string, description: "Grouping label used to organize lore entries (e.g. history, magic, culture)." }
  spoiler:  { type: boolean, default: false, description: "Enable/disable spoiler protection that hides content until revealed." }
  tags:     { type: string, description: "Comma-separated keywords for filtering and cross-referencing." }
provides: [prose]
content:
  type: sequence
  fields:
    body: { match: any, optional: true, greedy: true }
metaFields:
  category: { metaType: category, label: Category, condition: category }
blocks:
  metadata: { fields: [category], layout: bar }
schema:
  type: Article
  properties: { title: headline, category: articleSection }
registers:
  entity:
    idFrom: title
    data: [category, spoiler, tags, { name: title }]
---

# {% $attrs.title %}

{% metablock name="metadata" /%}

{% slot name="body" /%}
