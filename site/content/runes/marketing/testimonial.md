---
title: Testimonial
description: Customer testimonials and reviews
category: Marketing
plugin: marketing
status: stable
type: rune
---

{% hint type="note" %}
This rune is part of **@refrakt-md/marketing**. Install with `npm install @refrakt-md/marketing` and add `"@refrakt-md/marketing"` to the `plugins` array in your `refrakt.config.json`.
{% /hint %}

# Testimonial

Customer testimonials. A blockquote becomes the testimonial text, and the `author` and `role` attributes give the attribution: the name, and the role or organisation beneath it.

The older form, a paragraph with `**Name** — Role, Company` after the quote, still works for now. `refrakt marketing migrate-testimonial <paths> --apply` rewrites it into the attributes.

## With rating

Include a star rating for review-style testimonials.

{% preview source=true %}

	{% testimonial rating=5 author="Sarah Chen" role="Head of Content, Acme Corp" %}
	> refrakt.md completely changed how we think about content. Writing docs has never been this productive — our team ships documentation twice as fast now.
	{% /testimonial %}

{% /preview %}

## Without rating

Omit the rating for a pure testimonial quote.

{% preview source=true %}

	{% testimonial author="Alex Rivera" role="CTO, StartupCo" %}
	> The semantic approach just makes sense. We moved our entire docs site to refrakt.md in a weekend.
	{% /testimonial %}

{% /preview %}

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:testimonial"} /%}

