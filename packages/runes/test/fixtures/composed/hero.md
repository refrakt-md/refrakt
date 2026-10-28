---
tag: section
attributes:
  media-position: { type: string, matches: [top, bottom, start, end, cover], default: bottom, description: "Where the media sits relative to the content" }
content:
  type: delimited
  delimiter: hr
  zones:
    - name: media
      fields:
        media: { match: any, optional: true, greedy: true }
    - name: content
      primary: true
      fields:
        eyebrow:  { match: paragraph, optional: true }
        headline: { match: heading }
        blurb:    { match: paragraph, optional: true }
        actions:  { match: list, optional: true, greedy: true }
---

{% section media-position=$attrs["media-position"] %}
	{% slot name="media" /%}

	---

	{% slot name="eyebrow" /%}

	{% slot name="headline" /%}

	{% slot name="blurb" /%}

	{% actions %}
		{% slot name="actions" /%}
	{% /actions %}
{% /section %}
