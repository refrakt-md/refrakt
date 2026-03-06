---
title: Changelog
description: Version history with release notes
---

{% hint type="note" %}
This rune is part of **@refrakt-md/docs**. Install with `npm install @refrakt-md/docs` and add `"@refrakt-md/docs"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Changelog

Version history and release notes. Headings with a `v1.0.0 - date` pattern are automatically converted into release entries.

## Heading-based changelog

Headings are parsed into version and date parts, with list items below becoming the release notes.

{% preview source=true %}

{% changelog %}
## v1.2.0 - January 2025

- Added timeline and changelog runes
- Added breadcrumb navigation rune
- Fixed grid column spanning on mobile

## v1.1.0 - December 2024

- Added testimonial and compare runes
- Improved pricing tier card styling
- Fixed tab panel content not rendering
{% /changelog %}

{% /preview %}

## Explicit releases

Use `{% changelog-release %}` tags for more control over version and date values.

{% preview source=true %}

{% changelog %}
{% changelog-release version="2.0.0" date="March 2025" %}
- Complete rewrite of the rendering engine
- New plugin API for custom runes
{% /changelog-release %}

{% changelog-release version="1.0.0" date="January 2025" %}
- Initial stable release
{% /changelog-release %}
{% /changelog %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `headingLevel` | `number` | — | Heading level to convert into releases (auto-detected if omitted) |
| `project` | `string` | — | Project name |

### Release attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `version` | `string` | — | Version number |
| `date` | `string` | — | Release date |

## Section header

Changelog supports an optional eyebrow, headline, and blurb above the section above entries. Place a short paragraph or heading before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

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
