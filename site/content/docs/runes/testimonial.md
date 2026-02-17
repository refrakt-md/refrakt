---
title: Testimonial
description: Customer testimonials and reviews
---

# Testimonial

Customer testimonials. A blockquote becomes the testimonial text, and a paragraph with `**Name** — Role, Company` becomes the attribution.

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

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `rating` | `number` | — | Star rating from 0 to 5 |
| `layout` | `string` | `card` | Display style: `card`, `inline`, or `quote` |
