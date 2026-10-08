---
tag: article
aliases: [guild, order]
description: A faction profile, composed over `card`, `details` and a placed meta block. Kept beside the storytelling plugin's `faction` rather than shipped in place of it (SPEC-147 D1).
attributes:
  name:      { type: string, required: true, description: "Display name shown in the faction header." }
  type:      { type: string, description: "Classification of the group (e.g. guild, kingdom, cult, order)." }
  alignment: { type: string, description: "Moral or political stance of the faction (e.g. lawful, chaotic, neutral)." }
  size:      { type: string, description: "Approximate scale of the faction (e.g. small, medium, large, massive)." }
  tags:      { type: string, description: "Comma-separated keywords for filtering and cross-referencing." }
  media-position: { type: string, matches: [top, bottom, start, end, cover], default: top, description: "Where the media zone sits relative to the content: above (top), below (bottom), or beside (start/end)" }
  media-ratio:    { type: string, matches: ["1/3", "2/5", "1/2", "3/5", "2/3"], description: "Media zone’s share of the row width when media is beside content (start/end)" }
  valign:         { type: string, matches: [top, center, bottom, stretch], description: "Cross-axis alignment when media is beside content (start/end); applies to the shorter zone" }
  collapse:       { type: string, matches: [sm, md, lg, never], description: "Breakpoint at which side-by-side layouts collapse to a single stacked column" }
provides: [prose]
content:
  type: sections
  sectionHeading: heading
  emitAttributes: { heading: $heading }
  preamble:
    scene:       { match: image, optional: true }
    description: { match: paragraph, optional: true, greedy: true }
    body:        { match: any, optional: true, greedy: true }
metaFields:
  type: { metaType: category, label: Type, condition: type }
  alignment:
    metaType: category
    label: Alignment
    condition: alignment
    sentimentMap: { good: positive, neutral: neutral, evil: negative, chaotic: caution, lawful: neutral }
  size: { metaType: quantity, label: Size, condition: size }
blocks:
  metadata: { fields: [type, alignment, size], layout: definition-list }
schema:
  type: Organization
  properties: { name: name, scene: image }
registers:
  entity:
    idFrom: name
    data: [{ factionType: type }, alignment, size, tags, name]
---

{% card media-position=$attrs["media-position"] media-ratio=$attrs["media-ratio"] valign=$attrs.valign collapse=$attrs.collapse %}
{% slot name="scene" /%}

---

# {% $attrs.name %}

{% metablock name="metadata" /%}

{% slot name="description" /%}

{% slot name="body" /%}

{% slot name="sections" each %}
{% details summary=$each.heading %}
{% slot /%}
{% /details %}
{% /slot %}
{% /card %}
