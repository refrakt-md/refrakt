---
tag: article
aliases: [review]
description: Customer testimonial or review, composed over `section`, its quote a featured quotation
attributes:
  author:       { type: string, description: "The person quoted. Without it, the `**Name** — Role` paragraph after the quote is the attribution." }
  role:         { type: string, description: "Their role or organisation, beside `author`." }
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
          - { name: source, match: text, pattern: '^\s*[-–—,]\s*(.+)$', optional: true }
    avatar-after: { match: image, optional: true }
metaFields:
  rating: { rating: { total: rating-total }, condition: rating }
blocks:
  rating: { fields: [rating], layout: bar }
schema:
  type: Review
  properties: { quote: reviewBody }
  entities:
    author:
      type: Person
      property: author
      properties: { author: name, attribution.name: name, role: jobTitle, attribution.source: jobTitle }
    rating: { type: Rating, property: reviewRating, properties: { rating: ratingValue } }
defaults:
  elevation: flat
---

{% section media-position="start" media="portrait" %}
	{% slot name="avatar" /%}
	{% slot name="avatar-after" /%}

	---

	{% metablock name="rating" /%}

	{% pullquote author=$attrs.author source=$attrs.role %}
		{% slot name="quote" /%}

		{% slot name="attribution" /%}
	{% /pullquote %}
{% /section %}
