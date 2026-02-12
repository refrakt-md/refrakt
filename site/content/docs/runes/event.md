---
title: Event
description: Event information with date, location, and agenda
---

# Event

Event information with date, location, and agenda. Lists become speaker/agenda items, links become registration URLs.

```markdoc
{% event date="2025-06-15" location="San Francisco, CA" url="https://example.com" %}
# Tech Conference 2025

Join us for talks, workshops, and networking.

- Keynote: The Future of the Web
- Workshop: Building with refrakt.md
{% /event %}
```

### Example

{% event date="2025-06-15" endDate="2025-06-17" location="San Francisco, CA" url="https://example.com/register" %}
# Tech Conference 2025

Join us for three days of talks, workshops, and networking with the web development community.

- Keynote: The Future of Web Development
- Workshop: Building with Semantic Content
- Panel: Open Source Sustainability
- Networking Dinner
{% /event %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `date` | `string` | — | Event start date |
| `endDate` | `string` | — | Event end date |
| `location` | `string` | — | Venue name or "Online" |
| `url` | `string` | — | Event or registration URL |
