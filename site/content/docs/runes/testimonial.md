---
title: Testimonial
description: Customer testimonials and reviews
---

# Testimonial

Customer testimonials. A blockquote becomes the testimonial text, and a paragraph with `**Name** — Role, Company` becomes the attribution.

```markdoc
{% testimonial rating=5 %}
> refrakt.md completely changed how we think about content. Our writers love it.

**Sarah Chen** — Head of Content, Acme Corp
{% /testimonial %}
```

### Example

{% testimonial rating=5 %}
> refrakt.md completely changed how we think about content. Writing docs has never been this productive — our team ships documentation twice as fast now.

**Sarah Chen** — Head of Content, Acme Corp
{% /testimonial %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `rating` | `number` | — | Star rating from 0 to 5 |
| `layout` | `string` | `card` | Display style: `card`, `inline`, or `quote` |
