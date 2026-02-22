---
title: What's New in 0.4.0
description: New packages, seven new runes, theme restructuring, syntax highlighting, and more.
date: 2026-02-16
author: The Refrakt Team
tags: [release, announcement]
---

Version 0.4.0 is our biggest release yet -- two new packages, seven new runes, a reworked theme architecture, and a dedicated syntax highlighting pipeline. Here's what changed.

## New packages

### @refrakt-md/highlight

Syntax highlighting is no longer handled inline. The new `@refrakt-md/highlight` package provides a Shiki-based tree walker that processes code blocks during the Markdoc transform phase. It ships with a custom Markdoc grammar for accurate highlighting of rune syntax in documentation, integrates with CSS variables for theme-consistent colors, and adds a copy-to-clipboard button on every code block.

### @refrakt-md/transform

The identity transform engine -- the layer that adds BEM classes, injects structural elements, and resolves context-dependent modifiers -- has been extracted from `@refrakt-md/lumina` into its own package. This makes the engine available to other themes and tools without pulling in Lumina's design tokens or CSS.

## Seven new runes

This release adds runes for patterns we kept seeing in real-world content sites:

- **form** -- Declarative forms with field validation, built from standard Markdown structure
- **comparison** -- Side-by-side comparison matrices for feature tables and product comparisons
- **storyboard** -- Sequential story visualization with step-by-step narrative flow
- **reveal** -- Progressive disclosure that shows content in stages
- **conversation** -- Chat-style message threads with speaker attribution
- **bento** -- Grid layout component for dashboard-style card arrangements
- **annotate** -- Inline annotations that attach explanations to specific content sections

Each rune follows the same pattern: write natural Markdown inside the tag, and the rune reinterprets headings, lists, and paragraphs into semantic structure.

## Theme restructuring

The biggest architectural change in 0.4.0 is the merger of the old `@refrakt-md/theme-lumina` package into `@refrakt-md/lumina` as a subpath export.

Previously, the Lumina theme was split across two separate packages -- one for the identity layer (design tokens, CSS, transform config) and another for the Svelte components. Now it's a single package with subpath exports:

- `@refrakt-md/lumina` -- Identity layer: design tokens, per-rune CSS, pre-built transform config
- `@refrakt-md/lumina/svelte` -- Svelte adapter: Svelte components, layouts, component registry

The SvelteKit Vite plugin now derives the theme adapter dynamically by combining the `theme` and `target` fields from `refrakt.config.json`. This means adding a future React or Astro adapter is just a matter of adding a new subpath export to the same package -- no new packages, no config changes.

{% hint type="tip" %}
If you were importing from `@refrakt-md/theme-lumina`, update your dependency to `@refrakt-md/lumina`. The Vite plugin handles the rest automatically.
{% /hint %}

## CodeGroup redesign

The Editor rune has been replaced with a dedicated CodeGroup component. CodeGroup provides tabbed multi-file code blocks with proper syntax highlighting via the new highlight package. It's a cleaner model -- each code fence inside the group becomes a tab, and the tab label comes from the fence's filename annotation.

## SEO extractors

Six new schema.org extractors round out the SEO layer:

- **Recipe** -- Ingredients, steps, prep/cook time as `schema.org/Recipe`
- **HowTo** -- Step-by-step instructions as `schema.org/HowTo`
- **Event** -- Date, location, registration URL as `schema.org/Event`
- **Person** -- Name, role, contact info as `schema.org/Person`
- **Organization** -- Business details as `schema.org/Organization`
- **Dataset** -- Structured data descriptions as `schema.org/Dataset`

These join the existing extractors for FAQ, Article, and Breadcrumb. If a rune has a corresponding schema.org type, the extractor runs automatically during the content build.

## Other improvements

- **Unified Hero/CTA actions** -- The hero and CTA runes now share a common actions pattern, so buttons and links behave consistently across both
- **Blog layout** -- Lumina now ships a BlogLayout with automatic post listing, date sorting, and tag display
- **Copy-to-clipboard** -- All code blocks get a copy button via the highlight pipeline
- **Test coverage** -- Expanded from around 299 to 370 tests across the full suite

---

For the full changelog, see the [releases page](/releases). To get started with 0.4.0, update your dependencies:

```bash
npm install @refrakt-md/lumina@0.4.0 @refrakt-md/sveltekit@0.4.0
```
