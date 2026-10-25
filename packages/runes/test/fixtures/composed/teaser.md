---
tag: article
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
        headline: { match: heading }
        blurb:    { match: paragraph, optional: true, greedy: true }
---

{% card %}
	{% slot name="media" /%}

	---

	{% slot name="headline" /%}

	{% slot name="blurb" /%}
{% /card %}
