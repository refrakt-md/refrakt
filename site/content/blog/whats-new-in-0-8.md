---
title: What's New in 0.8.0
description: Declarative content models, a cross-page pipeline, media runes with streaming, and identity transform improvements.
date: 2026-03-10
author: The Refrakt Team
tags: [release, announcement]
---

Version 0.8.0 is the content model release. The headline is a declarative system for defining how runes interpret their children, replacing the imperative Model class that every rune had to write by hand. This release also introduces a cross-page pipeline for site-wide data, music and audio runes with streaming support, and several identity transform improvements. Here's what changed.

## Declarative content models

Rune schemas previously used an imperative `Model` class to walk AST children, match headings, and extract fields. It worked, but every rune had to write the same boilerplate: find a heading, grab paragraphs until the next heading, handle optional fields, deal with edge cases.

The new `createContentModelSchema()` replaces all of that with a declarative definition. You describe the shape of the content, and the framework handles the parsing:

- **Sequence** -- match children in order (heading, then paragraph, then list)
- **Delimited** -- split children at heading boundaries into repeating groups
- **Sections** -- heading-based content splitting with preamble support
- **Custom** -- escape hatch for runes with non-standard structures

Over 50 runes have been migrated from imperative Model classes to declarative content models. The result is less code, fewer bugs, and a consistent API that tooling (like the block editor) can introspect automatically.

## Cross-page pipeline

The cross-page pipeline is a build-time system that lets runes access data from across your entire site, not just the current page.

The pipeline runs in three phases after all pages are loaded:

- **Register** -- each package scans all pages and indexes named entities into a site-wide `EntityRegistry`
- **Aggregate** -- packages build cross-page indexes from the full registry (page trees, breadcrumb paths, heading indexes)
- **Post-process** -- each page passes through all packages' hooks to resolve deferred content using aggregated data

This powers features like `{% nav auto %}` (generates navigation from child pages), `{% breadcrumb auto %}` (resolves breadcrumb trails from the page tree), and the new blog rune (lists posts from a content folder). Community packages can participate by defining `PackagePipelineHooks` on their `RunePackage`.

## Media runes

Three new runes in `@refrakt-md/media` bring music and audio content to refrakt:

- **`playlist`** -- a collection of tracks with cover art, metadata, and navigation
- **`track`** -- individual song entries with artist, album, and duration
- **`audio`** -- an audio player with streaming support, playlist integration, and playback controls

All three include full schema.org RDFa annotations (`MusicPlaylist`, `MusicRecording`, `AudioObject`), so search engines understand your music content natively.

## Identity transform improvements

The identity transform engine gained several capabilities since 0.7:

- **Recursive `autoLabel`** -- eyebrow, headline, and blurb children inside `<header>` wrappers now receive BEM classes correctly
- **Pill-badge eyebrow** -- an eyebrow paragraph containing a link renders as a rounded pill with a border and primary-colored link, clickable via a CSS overlay
- **`mockup` rune** -- a new rune in `@refrakt-md/design` that wraps content in device frames (phone, tablet, laptop, desktop)
- **Editor support for community runes** -- the block editor's preview and autocomplete now work with runes from installed packages

## Breaking changes

{% hint type="warning" %}
Version 0.8.0 includes two breaking changes that may require updates to custom themes or components.
{% /hint %}

- The `style` attribute has been renamed to `variant` across all runes. If you reference `style` in custom CSS attribute selectors or component code, update to `variant`.
- The `typeof` and `property` HTML attributes have been renamed to `data-rune` and `data-field` throughout the pipeline. This affects custom theme CSS that targets these attributes and any code that reads them from rendered output.

## Bug fixes

- Fixed production CSS tree-shaking caused by a kebab-to-PascalCase key mismatch
- Fixed audio player idempotency guard, playlist interaction, and autoplay race condition
- Fixed duplicate BEM classes on runes nested inside `data-name` elements
- Fixed preview runtime issues with `structuredClone` errors and cache invalidation
- Fixed editor serializing numerical attributes as strings
- Fixed metadata hiding in rune CSS breaking nested runes
- Replaced string booleans with proper boolean types for type safety
- Removed deprecated `ComponentType` and `PropertyNodes` from the schema system

---

For the full changelog, see the [releases page](/releases). To get started with 0.8.0, update your dependencies:

```bash
npm install @refrakt-md/lumina@0.8.0 @refrakt-md/sveltekit@0.8.0
```

Or scaffold a fresh project:

```bash
npm create refrakt@0.8.0
```
