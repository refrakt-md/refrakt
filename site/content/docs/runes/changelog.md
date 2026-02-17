---
title: Changelog
description: Version history with release notes
---

# Changelog

Version history and release notes. Headings with a `v1.0.0 - date` pattern are automatically converted into release entries.

## Heading-based changelog

Headings are parsed into version and date parts, with list items below becoming the release notes.

```markdoc
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
```

{% preview %}

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

```markdoc
{% changelog %}
{% changelog-release version="2.0.0" date="March 2025" %}
- Complete rewrite of the rendering engine
- New plugin API for custom runes
{% /changelog-release %}

{% changelog-release version="1.0.0" date="January 2025" %}
- Initial stable release
{% /changelog-release %}
{% /changelog %}
```

{% preview %}

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
