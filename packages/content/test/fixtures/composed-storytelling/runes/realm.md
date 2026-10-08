---
tag: article
aliases: [location, place]
description: A realm profile, composed over `card`, `details` and a placed meta block. SPEC-145 D7's worked example, kept beside the storytelling plugin's `realm` rather than shipped in place of it (SPEC-147 D1).
attributes:
  name:   { type: string, required: true, description: "Display name shown in the realm header." }
  type:   { type: string, default: place, description: "Kind of location (e.g. city, forest, dungeon, plane, continent)." }
  scale:  { type: string, description: "Geographic scope of the realm (e.g. room, district, region, world)." }
  tags:   { type: string, description: "Comma-separated keywords for filtering and cross-referencing." }
  parent: { type: string, description: "Name of the containing realm for hierarchical nesting." }
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
  type:  { metaType: category, label: Type }
  scale: { metaType: category, label: Scale, condition: scale }
blocks:
  metadata: { fields: [type, scale], layout: definition-list }
schema:
  type: Place
  properties: { name: name, type: additionalType, scene: image }
registers:
  entity:
    idFrom: name
    data: [{ realmType: type }, scale, tags, parent, name]
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
