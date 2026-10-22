---
title: Changelog
description: Version history with release notes
category: Docs
plugin: docs
status: stable
type: rune
---

{% hint type="note" %}
This rune is part of **@refrakt-md/docs**. Install with `npm install @refrakt-md/docs` and add `"@refrakt-md/docs"` to the `plugins` array in your `refrakt.config.json`.
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

## Release titles

Give a release a title by putting it after the version, separated by a middle dot (`·`). The date still follows a dash. The title renders inside the release heading, after the version.

{% preview source=true %}

{% changelog %}
## v1.3.0 · Faster builds - March 2025

Builds reuse their cache, and the CLI reports what it skipped.

## v1.2.0 - January 2025

- Added timeline and changelog runes
{% /changelog %}

{% /preview %}

After a title, the dash before the date needs a space on each side, so a title can contain a hyphen (`render-stack`) but not ` - `. Both the title and the date are optional.

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

#### `changelog`

{% include file="rune-attributes.md" variables={r: "rune:changelog"} /%}

#### `changelog-release`

{% include file="rune-attributes.md" variables={r: "rune:changelog-release"} /%}

### Release attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `version` | `string` | — | Version number |
| `title` | `string` | — | Release title, shown after the version |
| `date` | `string` | — | Release date |

## Section header

Changelog supports an optional eyebrow, headline, and blurb above the section above entries. Place a short paragraph or heading before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

