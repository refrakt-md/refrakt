---
title: What's New in 0.5.0
description: Theme development toolkit, behaviors library, six new runes, VS Code language server, and a major architecture shift toward framework-agnostic rendering.
date: 2026-02-23
author: The Refrakt Team
tags: [release, announcement]
---

Version 0.5.0 is a foundational release. While 0.4.0 added runes and restructured packages, 0.5.0 shifts the architecture toward framework-agnostic rendering -- most runes now work without any Svelte components at all. Here's what changed.

## Three new packages

### @refrakt-md/behaviors

The behaviors library is the biggest architectural shift in this release. It provides vanilla JavaScript progressive enhancement for interactive runes -- tabs, accordions, data tables, forms, copy-to-clipboard, and preview toggles -- all driven by `data-rune` attributes on server-rendered HTML.

This means a rune like `{% tabs %}` no longer needs a Svelte component for interactivity. The identity transform engine renders the structure and BEM classes, CSS handles the appearance, and `@refrakt-md/behaviors` attaches the event handlers at runtime. Framework-agnostic from top to bottom.

### @refrakt-md/theme-base

The universal rune configuration, interactive Svelte components, and structural CSS have been extracted from Lumina into a shared base package. This contains the 74 rune configurations that power the identity transform, plus the component registry and element overrides that any theme can inherit.

With `theme-base` in place, creating a new theme means writing CSS and overriding tokens -- not reimplementing component logic.

### refrakt-md (VS Code extension)

The VS Code extension now ships with a full language server providing autocompletion for rune tags and attributes, hover documentation, and real-time diagnostics. It also includes a Rune Inspector tree view that shows the semantic structure of the current document, and snippets for all 43+ runes including preview and sandbox.

## Six new runes

- **symbol** -- Document code constructs (functions, classes, interfaces) with parameter tables, return types, and source links. Designed to be the target of a future extraction pipeline.
- **preview** -- Component showcase with a live rendered preview, theme toggle (light/dark), code/preview tab switching, and responsive viewport simulation.
- **sandbox** -- Live HTML playground rendered in an isolated iframe, with synchronized dark mode and source panels.
- **map** -- Interactive location visualizations with streaming initialization and geocoding fallback.
- **design-context** -- Inject design tokens into a sandbox environment for live theming demos.
- **swatch**, **palette**, **typography**, **spacing** -- Standalone design runes for documenting visual systems.

## Theme development toolkit

This release introduces first-class tooling for theme developers:

**`refrakt scaffold --theme`** generates a complete custom theme project with a default layout, CSS design tokens (light + dark), a manifest, a `SvelteTheme` runtime export, test infrastructure with CSS coverage tests, and kitchen sink preview content. The scaffold produces CSS entry points that match Lumina's architecture: `base.css` for tokens-only imports, `svelte/tokens.css` as a dev mode bridge, and individual `styles/runes/*.css` files for build-time tree-shaking.

**`refrakt inspect`** gives theme developers an audit dashboard: rune coverage (which runes have CSS), CSS validation, and structure contract comparison. The `--contracts` flag generates `structures.json` with the exact HTML structure each rune produces, so themes can write CSS against a stable contract.

## Identity transform expansion

Eight Svelte components have been replaced by pure CSS + identity transform + behaviors:

- Blockquote is now CSS-only
- Design runes (palette, typography, spacing) moved to the identity layer
- All components migrated to `--rf-*` prefixed tokens (the old `aliases.css` compatibility layer is gone)
- New engine capabilities: `styles` for inline style injection, `staticModifiers` for always-on BEM modifiers, and context-aware modifiers that change based on parent rune

The result: roughly 75% of runes need zero JavaScript at runtime.

## Preview rune enhancements

The preview rune gained a three-tab source panel showing Markdoc source, rune structure, and rendered HTML side by side. Source mode is now auto-inferred (no need to manually set `source=true`). The preview container supports responsive bleed via container queries, snapping edge-to-edge at narrow viewports.

## Build and performance

- **CSS tree-shaking** -- The SvelteKit plugin now analyzes content at build time and only imports CSS for runes that are actually used, instead of loading the full stylesheet.
- **Configurable Shiki themes** -- Syntax highlight themes are now set in `refrakt.config.json` instead of being hardcoded.

## Mobile navigation

Lumina's docs layout now has full mobile navigation: a hamburger toggle for the nav panel, scroll lock when open, mutual exclusion with the header menu, and auto-generated breadcrumbs derived from nav group headings.

## CLI improvements

- **Multi-file generation** -- `refrakt write` can now generate multiple pages in a single session
- **Gemini Flash** -- Added as a free cloud AI provider option alongside Anthropic and Ollama

## Bug fixes

A batch of fixes that accumulated during the architecture shift:

- Preview content no longer leaks between pages on client-side navigation
- CodeGroup title placement and pre element borders corrected
- Tab list decoration dots and duplicate copy buttons resolved
- Form fields render correctly (input elements injected via rune schema, not post-transform)
- Map rune handles streaming initialization and geocoding failures gracefully
- Timeline dots, lines, and titles display properly
- Step numbers no longer duplicate in the Steps rune
- Feature rune dt/dd structure and split/mirror API aligned
- Mobile nav links visible and panel positioned correctly
- TS2307 error on Cloudflare resolved with dynamic imports

---

For the full changelog, see the [releases page](/releases). To get started with 0.5.0, update your dependencies:

```bash
npm install @refrakt-md/lumina@0.5.0 @refrakt-md/sveltekit@0.5.0
```

Or scaffold a fresh project:

```bash
npm create refrakt@0.5.0
```
