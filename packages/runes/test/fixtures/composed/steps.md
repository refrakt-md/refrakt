---
content:
  type: sections
  sectionHeading: heading
  emitAttributes: { heading: $heading }
  preamble:
    header: { match: paragraph, optional: true, greedy: true }
    items:  { match: "list:ordered", optional: true }
---

{% slot name="header" /%}

{% grid %}
	{% slot name="items" each %}
		{% textblock %}
			{% slot /%}
		{% /textblock %}
	{% /slot %}
	{% slot name="sections" each %}
		{% textblock %}
			### {% $each.heading %}

			{% slot /%}
		{% /textblock %}
	{% /slot %}
{% /grid %}
