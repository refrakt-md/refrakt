---
tag: article
aliases: [npc, pc]
description: A character profile, composed over `section`, `details` and a placed meta block. SPEC-145's full worked example, kept beside the storytelling plugin's `character` rather than shipped in place of it (SPEC-147 D1).
attributes:
  name:    { type: string, required: true, description: "Display name shown in the character header." }
  role:    { type: string, matches: [protagonist, antagonist, supporting, minor], default: supporting, description: "Narrative importance." }
  status:  { type: string, matches: [alive, dead, unknown, missing], default: alive, description: "Whether the character is alive, dead, unknown, or missing." }
  aliases: { type: string, description: "Comma-separated alternate names or titles for this character." }
  tags:    { type: string, description: "Comma-separated keywords for filtering and cross-referencing." }
  media-position: { type: string, matches: [top, bottom, start, end], default: top, description: "Where the portrait sits relative to the content: above (top), below (bottom), or beside (start/end)" }
provides: [prose]
content:
  type: sections
  sectionHeading: heading
  emitAttributes: { heading: $heading }
  preamble:
    portrait:    { match: image, optional: true }
    description: { match: paragraph, optional: true, greedy: true }
    body:        { match: any, optional: true, greedy: true }
metaFields:
  role:   { metaType: category, label: Role }
  status:
    metaType: status
    label: Status
    sentimentMap: { alive: positive, dead: negative, unknown: neutral, missing: caution }
blocks:
  metadata: { fields: [role, status], layout: definition-list }
schema:
  type: Person
  properties: { name: name, role: jobTitle, portrait: image }
registers:
  entity:
    idFrom: name
    data: [role, status, aliases, tags, name]
    aliases: { from: aliases, separator: "," }
---

{% section media-position=$attrs["media-position"] media="portrait" %}
	{% slot name="portrait" /%}

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
{% /section %}
