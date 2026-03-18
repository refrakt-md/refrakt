---
title: Cast / Team
description: People directory for team pages and speaker lineups
---

{% hint type="note" %}
This rune is part of **@refrakt-md/business**. Install with `npm install @refrakt-md/business` and add `"@refrakt-md/business"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Cast / Team

People directory for team pages, cast lists, or speaker lineups. List items with a "Name - Role" pattern are automatically parsed into entries.

## Basic usage

List items are parsed into name and role parts automatically.

{% preview source=true %}

{% cast layout="grid" %}
- Alice Johnson - CEO
  ![Alice Johnson](https://assets.refrakt.md/team-alice-johnson.png)
- Bob Smith - CTO
  ![Bob Smith](https://assets.refrakt.md/team-bob-smith.png)
- Carol Williams - Head of Design
- David Chen - Lead Engineer
{% /cast %}

{% /preview %}

## Explicit members

Use `{% cast-member %}` tags for more control, including bios.

{% preview source=true %}

{% cast %}
{% cast-member name="Alice Johnson" role="CEO" %}
Alice founded the company in 2020.
{% /cast-member %}

{% cast-member name="Bob Smith" role="CTO" %}
Bob leads the engineering team.
{% /cast-member %}
{% /cast %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `layout` | `string` | `grid` | Display layout: `grid` or `list` |

### Member attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | — | Person's name |
| `role` | `string` | — | Person's role or title |

## Section header

Cast supports an optional eyebrow, headline, and blurb above the section above cast members. Place a short paragraph or heading before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `inset` | `string` | — | Horizontal padding: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
| `bg` | `string` | — | Named background preset from theme configuration |
