---
title: Cast / Team
description: People directory for team pages and speaker lineups
---

# Cast / Team

People directory for team pages, cast lists, or speaker lineups. List items with a "Name - Role" pattern are automatically parsed into entries.

## Basic usage

List items are parsed into name and role parts automatically.

```markdoc
{% cast layout="grid" %}
- Alice Johnson - CEO
- Bob Smith - CTO
- Carol Williams - Head of Design
- David Chen - Lead Engineer
{% /cast %}
```

{% cast layout="grid" %}
- Alice Johnson - CEO
- Bob Smith - CTO
- Carol Williams - Head of Design
- David Chen - Lead Engineer
{% /cast %}

## Explicit members

Use `{% cast-member %}` tags for more control, including bios.

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

{% cast %}
{% cast-member name="Alice Johnson" role="CEO" %}
Alice founded the company in 2020.
{% /cast-member %}

{% cast-member name="Bob Smith" role="CTO" %}
Bob leads the engineering team.
{% /cast-member %}
{% /cast %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `layout` | `string` | `grid` | Display layout: `grid` or `list` |

### Member attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | — | Person's name |
| `role` | `string` | — | Person's role or title |
