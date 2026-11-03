---
tag: div
description: Call-to-action section with a headline and actions, composed over `section` and `actions` (SPEC-160 D7)
attributes:
  align: { type: string, matches: [start, center, end], default: center, description: "Alignment of the header and the actions" }
defaults:
  width: full
  elevation: flush
  prominence: display
content:
  type: sequence
  fields:
    eyebrow:  { match: paragraph, optional: true }
    headline: { match: heading, optional: true }
    blurb:    { match: paragraph, optional: true }
    body:     { match: heading|paragraph, optional: true, greedy: true }
    actions:  { match: list|fence, optional: true, greedy: true }
---

{% section align=$attrs.align %}
	{% slot name="eyebrow" /%}

	{% slot name="headline" /%}

	{% slot name="blurb" /%}

	{% slot name="body" /%}

	{% actions %}
		{% slot name="actions" /%}
	{% /actions %}
{% /section %}
