---
title: Changelog
description: Release history for refrakt.md
---

# Changelog

{% changelog %}
## v0.4.0 - February 16, 2026

- `@refrakt-md/highlight` — Shiki-based syntax highlighting with Markdoc grammar support, CSS variables integration, and copy-to-clipboard
- `@refrakt-md/transform` — Identity transform engine extracted into its own package (BEM classes, structural injection, meta consumption)
- `form` — Form component with field validation
- `comparison` — Comparison matrices and tables
- `storyboard` — Story visualization
- `reveal` — Progressive disclosure
- `conversation` — Chat-style content
- `bento` — Grid layout component
- `annotate` — Annotated content
- Merged `@refrakt-md/theme-lumina` into `@refrakt-md/lumina/svelte` as a subpath export
- SvelteKit plugin now derives theme adapter dynamically from `config.theme` + `config.target`
- Theme packages now serve framework adapters via subpath exports — no separate packages per framework
- Replaced Editor rune with dedicated CodeGroup component for multi-file code blocks
- Added Recipe, HowTo, Event, Person, Organization, and Dataset schema.org extractors
- Unified actions pattern across Hero and CTA runes
- Blog layout added to Lumina theme
- Copy-to-clipboard for code blocks
- Test coverage expanded from ~299 to 370 tests

## v0.3.0 - February 13, 2026

- New runes and bug fixes

## v0.2.0 - February 12, 2026

- Added SEO layer
{% /changelog %}
