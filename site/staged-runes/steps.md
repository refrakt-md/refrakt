---
tag: div
description: Numbered steps, composed over `section` and a numbered ladder (SPEC-161 D5, SPEC-169 D4)
sequence: numbered
defaults:
  elevation: flush
content:
  type: sections
  sectionHeading: heading
  emitAttributes: { heading: $heading }
  preamble:
    header: { match: paragraph, optional: true, greedy: true }
    items:  { match: "list:ordered", optional: true }
---

{% section %}
	{% slot name="header" /%}

	{% group name="steps" layout="ladder" %}
		{% slot name="items" each %}
			{% section header="none" media-position="bottom" media="cover" %}
				{% slot /%}
			{% /section %}
		{% /slot %}
		{% slot name="sections" each %}
			### {% $each.heading %}

			{% section header="none" media-position="bottom" media="cover" %}
				{% slot /%}
			{% /section %}
		{% /slot %}
	{% /group %}
{% /section %}
