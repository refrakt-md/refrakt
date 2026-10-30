---
tag: div
description: Full-width introductory section for landing pages, composed over `section` and `actions` (SPEC-160 D7)
attributes:
  align:          { type: string, matches: [start, center, end], default: center, description: "Alignment of the header and the actions" }
  media-position: { type: string, matches: [top, bottom, start, end, cover], default: bottom, description: "Where the media sits relative to the content" }
  media-ratio:    { type: string, description: "The media's share of the row, beside the content" }
  valign:         { type: string, matches: [top, center, bottom, stretch], description: "Cross-axis alignment, beside the content" }
  collapse:       { type: string, matches: [sm, md, lg, never], description: "When a side-by-side split stacks" }
  content-place:  { type: string, description: 'Cover overlay anchor: "<block> <inline>" (e.g. "end start") or "auto"' }
  height:         { type: string, matches: [sm, md, lg, xl], description: "Intrinsic band height (named scale) for cover mode" }
  aspect:         { type: string, description: 'Intrinsic aspect ratio (e.g. "21/9") for cover mode' }
defaults:
  width: full
  elevation: flush
  prominence: marquee
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
        body:     { match: heading|paragraph, optional: true, greedy: true }
        actions:  { match: list|fence, optional: true, greedy: true }
---

{% section align=$attrs.align media-position=$attrs["media-position"] media-ratio=$attrs["media-ratio"] valign=$attrs.valign collapse=$attrs.collapse content-place=$attrs["content-place"] height=$attrs.height aspect=$attrs.aspect media="hero" guest-fit="bleed" %}
	{% slot name="media" /%}

	---

	{% slot name="eyebrow" /%}

	{% slot name="headline" /%}

	{% slot name="blurb" /%}

	{% slot name="body" /%}

	{% actions %}
		{% slot name="actions" /%}
	{% /actions %}
{% /section %}
