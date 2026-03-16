---
title: Timeline
description: Chronological events displayed as a timeline
---

{% hint type="note" %}
This rune is part of **@refrakt-md/business**. Install with `npm install @refrakt-md/business` and add `"@refrakt-md/business"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Timeline

Chronological events. Headings with a `date - label` pattern are automatically converted into timeline entries.

## Heading-based timeline

Headings are parsed into date and label parts, with content below becoming the description.

{% preview source=true %}

{% timeline %}
## 2023 - Founded

The company was founded with a mission to simplify content authoring for developer teams.

## 2024 - Public launch

Released v1.0 with support for 15 semantic runes and two themes. Open-sourced the core framework.

## 2025 - Community growth

Reached 10,000 users and launched the plugin marketplace for custom runes.
{% /timeline %}

{% /preview %}

## Explicit entries

Use `{% timeline-entry %}` tags for more control over date and label values.

{% preview source=true %}

{% timeline %}
{% timeline-entry date="Q1 2024" label="Alpha release" %}
Initial release to early testers.
{% /timeline-entry %}

{% timeline-entry date="Q3 2024" label="Beta release" %}
Public beta with full documentation.
{% /timeline-entry %}
{% /timeline %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `direction` | `string` | `vertical` | Timeline orientation |

### Entry attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `date` | `string` | — | Date or time period |
| `label` | `string` | — | Entry label |

## Section header

Timeline supports an optional eyebrow, headline, and blurb above the section above entries. Place a short paragraph or heading before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

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
