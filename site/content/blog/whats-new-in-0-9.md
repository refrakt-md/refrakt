---
title: What's New in 0.9.0
description: Metadata dimensions, universal theming, rune output standards, the plan package, Markdoc partials, and a Lumina design refresh.
date: 2026-03-30
author: The Refrakt Team
tags: [release, announcement]
---

Version 0.9.0 is the theming infrastructure release. The headline is a metadata dimensions system that gives the identity transform engine a shared vocabulary for describing rune structure — density, section anatomy, media slots, checklists, and more. This release also standardizes rune output across packages, adds the `@refrakt-md/plan` package for project planning, introduces Markdoc partials, and refreshes the Lumina theme's visual design. Here's what changed.

## Metadata dimensions

Every rune now declares its structural capabilities through a set of **dimensions** — metadata annotations on the rune config that describe what a rune supports. The engine reads these dimensions and applies consistent data attributes, BEM modifiers, and structural elements automatically.

The dimensions added in this release:

- **Metadata** -- structured key-value metadata (badges, labels, timestamps)
- **Density** -- how compact or spacious a rune renders
- **Section anatomy** -- which named sections (header, body, footer, media) a rune contains
- **Media slots** -- where images and media are placed in the layout
- **Checklist** -- items with checked/unchecked state via `data-checked`
- **Sequential items** -- ordered items with `data-sequence` numbering
- **Interactive state** -- `data-state` for behavior-driven runes (tabs, accordion)

The `refrakt inspect` CLI gained `--audit-dimensions` and `--audit-meta` flags so theme developers can audit which dimensions each rune supports and verify CSS coverage.

## Universal dimension CSS

Lumina now ships universal CSS for all dimensions. Instead of each rune defining its own badge styling, density spacing, or media layout, the theme provides dimension-level styles that apply across all runes. Per-rune CSS that duplicated these patterns has been removed.

This means a new rune that declares `metadata` and `media-slots` dimensions gets styled automatically — no per-rune CSS needed for those aspects.

## Rune output standards

Several runes have been refactored to follow a consistent 3-section output structure: header, body, and media. This makes runes more predictable for theme authors and enables the shared split layout CSS.

- **Recipe and howto** -- SEO meta tags replaced with semantic `<p>` wrappers; steps use proper list semantics
- **Playlist** -- aligned to the standard 3-section structure with header, track list, and cover art
- **Character, realm, and faction** (storytelling) -- consolidated to single `createComponentRenderable` calls with shared transform utilities
- **Feature** -- fixed media slot key from `image` to `media`

A shared split layout CSS system handles the two-column desktop / stacked mobile pattern used by marketing and storytelling runes, replacing per-rune layout code.

## @refrakt-md/plan

The new `@refrakt-md/plan` community package brings project planning runes to refrakt:

- **`spec`** -- specification documents
- **`work`** -- work items with status, priority, and acceptance criteria
- **`bug`** -- bug reports with severity tracking
- **`decision`** -- architecture decision records
- **`milestone`** -- release targets with progress tracking and auto-generated backlogs

The package includes a full CLI (`refrakt plan`) for scanning, updating, and querying plan files, plus a standalone site renderer with live reload for viewing your project plan as a navigable website.

## Markdoc partials

You can now use `{% partial file="shared/header.md" /%}` to include reusable content fragments. Partials are resolved at parse time, support nesting, and work with the language server (completions, hover, go-to-definition) and VS Code extension out of the box.

## xref rune

The new `{% xref %}` rune (aliased as `{% ref %}`) creates inline cross-references to any entity in the site-wide registry. Write `{% xref to="SPEC-001" /%}` and it resolves to a link with the entity's title, type badge, and status at build time.

## Lumina design refresh

The Lumina theme received a significant visual overhaul:

- Soft gray page background with borderless card surfaces
- Transparent banner backgrounds for hero and CTA runes
- Bordered pill badges for metadata items, replacing the previous flat style
- Blog post cards use shadow-on-hover instead of borders
- Hero header centered by default with larger compact title
- Vertical header stacking (eyebrow → headline → blurb) scoped to marketing runes

Per-rune CSS has been cleaned up extensively — redundant header overrides, badge styles, and margin rules were removed in favor of the universal dimension system.

## Other improvements

- **labelHidden** -- a new option on metadata structure entries to hide self-explanatory labels while keeping them accessible
- **Preamble rename** -- `intro header` renamed to `preamble` to avoid confusion with the chrome header
- **Sandbox sources** -- the sandbox rune now supports directory sources for multi-file sandboxes

## Bug fixes

- Fixed tint-mode CSS stripped in production builds
- Fixed preview rune light mode toggle when OS is in dark mode
- Fixed sandbox ignoring tint-mode by reading `data-color-scheme` attribute
- Fixed `overflow:hidden` on media zones clipping preview bleed
- Fixed docs layout 3-track grid leaking into rune articles
- Fixed media/scene positioning in storytelling runes
- Fixed missing dimensions CSS in production build
- Fixed storytelling pipeline TypeScript narrowing errors
- Fixed theme CSS resolution to load full theme instead of tokens only

---

For the full changelog, see the [releases page](/releases). To get started with 0.9.0, update your dependencies:

```bash
npm install @refrakt-md/lumina@0.9.0 @refrakt-md/sveltekit@0.9.0
```

Or scaffold a fresh project:

```bash
npm create refrakt@0.9.0
```
