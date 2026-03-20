---
title: What's New in 0.7.0
description: Eight official rune packages and new tooling for package authors.
date: 2026-03-03
author: The Refrakt Team
tags: [release, announcement]
---

Version 0.7.0 is the packages release. The core rune library has been split into eight domain-specific packages that you install individually, and new tooling makes it straightforward to author and validate your own rune packages. Here's what changed.

## Rune packages

The biggest change in 0.7 is architectural. The monolithic `@refrakt-md/runes` package previously shipped every rune -- marketing components alongside music metadata alongside business directories. That meant everyone paid the cost of runes they never used.

Now, 33 runes have been extracted into eight official packages under the `@refrakt-md` scope:

- **@refrakt-md/marketing** -- hero, cta, bento, feature, steps, pricing, testimonial, comparison
- **@refrakt-md/docs** -- api, symbol, changelog
- **@refrakt-md/storytelling** -- character, realm, faction, lore, plot, bond, storyboard
- **@refrakt-md/places** -- event, map, itinerary
- **@refrakt-md/business** -- cast, organization, timeline
- **@refrakt-md/design** -- swatch, palette, typography, spacing, preview, mockup, design-context
- **@refrakt-md/learning** -- howto, recipe
- **@refrakt-md/media** -- playlist, track, audio

Each package exports a `RunePackage` object containing its rune schemas, theme config, and optional pipeline hooks. You opt in via `refrakt.config.json`:

```bash
npm install @refrakt-md/marketing @refrakt-md/docs
```

The core `@refrakt-md/runes` package retains the ~37 foundational runes (hint, figure, tabs, accordion, grid, nav, and so on) that most sites need.

## Package authoring tooling

New CLI commands support the package development workflow:

- **`refrakt validate`** -- checks that a rune package exports the correct shape, has valid schema definitions, and passes structural checks
- **Fixture discovery** -- test helpers that automatically find and load rune fixture files for snapshot testing
- **AI prompt extensions** -- community packages can extend `refrakt write` prompts so AI-generated content uses their runes correctly

The site documentation has been reorganized to reflect the new package structure, with each package getting its own section in the rune catalog.

---

For the full changelog, see the [releases page](/releases). To get started with 0.7.0, update your dependencies:

```bash
npm install @refrakt-md/lumina@0.7.0 @refrakt-md/sveltekit@0.7.0
```

Or scaffold a fresh project:

```bash
npm create refrakt@0.7.0
```
