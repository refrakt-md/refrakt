---
title: Testimonial
description: Customer testimonials and reviews
category: Marketing
plugin: marketing
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:testimonial"} /%}

A blockquote becomes the testimonial text, and a paragraph with `**Name** — Role, Company` after it becomes the attribution: the name, and the role or organisation beneath it.

The `author` and `role` attributes give the same attribution without the paragraph, for generated content or a byline you do not want in a plain-Markdown rendering. Use one form or the other: when both are written, the attribute wins.

## With rating

Include a star rating for review-style testimonials.

{% preview source=true %}

	{% testimonial rating=5 %}
	> refrakt.md completely changed how we think about content. Writing docs has never been this productive — our team ships documentation twice as fast now.

	**Sarah Chen** — Head of Content, Acme Corp
	{% /testimonial %}

{% /preview %}

## Without rating

Omit the rating for a pure testimonial quote.

{% preview source=true %}

	{% testimonial %}
	> The semantic approach just makes sense. We moved our entire docs site to refrakt.md in a weekend.

	**Alex Rivera** — CTO, StartupCo
	{% /testimonial %}

{% /preview %}

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:testimonial"} /%}

## How it is built

Testimonial is a [composition](/extend/rune-authoring/composed-runes): a Markdown file that places a [`section`](/runes/section) with the avatar as its media and a [`pullquote`](/runes/pullquote) as its featured quotation, which renders the attribution as its caption. It renders no `rf-testimonial` classes. Its `Review` structured data is declared in the definition's `schema` block.

{% snippet path="plugins/marketing/runes/testimonial.md" /%}
