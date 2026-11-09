---
title: Testimonial
description: Customer testimonials and reviews
category: Marketing
plugin: marketing
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:testimonial"} /%}

A customer quote, with who said it and an optional star rating, published as review structured data.

## Basic usage

{% preview source=true %}

	{% testimonial %}
	> The semantic approach just makes sense. We moved our entire docs site to refrakt.md in a weekend.

	**Alex Rivera** — CTO, StartupCo
	{% /testimonial %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A blockquote | The testimonial's text |
| A paragraph `**Name** — Role, Company` after it | The attribution: the name, with the role or organisation beneath it |
| An image before the quote or after the attribution | The person's portrait |

The `author` and `role` attributes give the same attribution without the paragraph, for generated content or a byline you do not want in a plain-Markdown rendering. Use one form or the other: when both are written, the attribute wins.

## Add a rating

Set `rating` for a review-style testimonial.

{% preview source=true %}

	{% testimonial rating=5 %}
	> refrakt.md completely changed how we think about content. Writing docs has never been this productive — our team ships documentation twice as fast now.

	**Sarah Chen** — Head of Content, Acme Corp
	{% /testimonial %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:testimonial"} /%}
