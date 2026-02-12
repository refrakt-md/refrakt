---
title: Cast / Team
description: People directory for team pages and speaker lineups
---

# Cast / Team

People directory for team pages, cast lists, or speaker lineups. List items with a "Name - Role" pattern are automatically parsed into entries.

```markdoc
{% cast layout="grid" %}
- Alice Johnson - CEO
- Bob Smith - CTO
- Carol Williams - Designer
{% /cast %}
```

### Example

{% cast layout="grid" %}
# Our Team

- Alice Johnson - CEO
- Bob Smith - CTO
- Carol Williams - Head of Design
- David Chen - Lead Engineer
{% /cast %}

### Explicit members

You can also use explicit `{% cast-member %}` tags:

```markdoc
{% cast %}
{% cast-member name="Alice Johnson" role="CEO" %}
Alice founded the company in 2020.
{% /cast-member %}

{% cast-member name="Bob Smith" role="CTO" %}
Bob leads the engineering team.
{% /cast-member %}
{% /cast %}
```

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `layout` | `string` | `grid` | Display layout: `grid` or `list` |

### Member attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | — | Person's name |
| `role` | `string` | — | Person's role or title |
