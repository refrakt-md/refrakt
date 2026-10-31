---
tag: article
aliases: [review]
description: Customer testimonial or review, composed over `section` (SPEC-161 D1, SPEC-182 D6)
attributes:
  author:       { type: string, description: "The person quoted. The `**Name** — Role` paragraph fills it when unset." }
  role:         { type: string, description: "Their role or organisation. Filled from the paragraph when unset." }
  rating:       { type: number, description: "Rating out of rating-total." }
  rating-total: { type: number, default: 5, description: "The rating's maximum." }
  variant:      { type: string, matches: [card, inline, quote], default: card, description: "Kept as `data-variant` for themes; no stylesheet branches on it." }
content:
  type: sequence
  fields:
    avatar:       { match: image, optional: true }
    quote:        { match: blockquote }
    attribution:
      match: paragraph
      optional: true
      itemModel:
        fields:
          - { name: name, match: strong }
          - { name: role, match: text, pattern: '^\s*[-–—,]\s*(.+)$', optional: true }
      fills: { author: $name, role: $role }
    avatar-after: { match: image, optional: true }
metaFields:
  rating: { rating: { total: rating-total }, condition: rating }
  author: { tag: cite, condition: author }
  role:   { condition: role }
blocks:
  rating: { fields: [rating], layout: bar }
  byline: { fields: [author, role], layout: lead }
schema:
  type: Review
  properties: { quote: reviewBody }
  entities:
    author: { type: Person, property: author, properties: { author: name, role: jobTitle } }
    rating: { type: Rating, property: reviewRating, properties: { rating: ratingValue } }
defaults:
  elevation: flat
---

{% section media-position="start" media="portrait" %}
	{% slot name="avatar" /%}
	{% slot name="avatar-after" /%}

	---

	{% metablock name="rating" /%}
	{% pullquote variant="plain" align="left" %}
		{% slot name="quote" /%}
	{% /pullquote %}
	{% metablock name="byline" /%}
{% /section %}
