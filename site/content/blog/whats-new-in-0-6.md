---
title: What's New in 0.6.0
description: A full WYSIWYG editor, framework-neutral web components, layout transform engine, AI-powered theme designer, and a Python extraction pipeline.
date: 2026-03-02
author: The Refrakt Team
tags: [release, announcement]
---

Version 0.6.0 is the editor release. The headline is a full WYSIWYG block editor that runs alongside your content, but this release also migrates four interactive runes to framework-neutral web components, adds a declarative layout transform engine, and ships a theme designer with AI generation. Here's what changed.

## The block editor

The new `@refrakt-md/editor` package is a full content editing environment that runs as a local dev tool. It presents each rune as a stacked block with a live Shadow DOM preview, so you see the rendered output as you type.

The editor has three modes:

- **Visual** -- Stacked block cards with inline previews, drag-to-reorder, and a rail for quick navigation
- **Code** -- Raw Markdoc editing with syntax highlighting via Shiki
- **Preview** -- Full-fidelity page preview using the actual Svelte runtime and your theme's layouts

A unified header bar lets you switch between modes, toggle the frontmatter panel, and select responsive viewports (desktop, tablet, mobile).

### Content management

The file tree groups pages by category using route rules from `refrakt.config.json`. Creating pages, folders, and categories uses positioned popovers near the trigger button rather than centered modals. Files can be renamed, duplicated, deleted, or toggled between draft and published states.

A rune palette provides autocomplete for all available rune tags with attribute hints, inserting the correct Markdoc syntax at the cursor position.

### Live preview runtime

The preview mode embeds a full Svelte runtime in an iframe, rendering pages with your actual theme layouts, CSS, and behaviors. Edits flow through a 400ms-debounced pipeline that re-renders the page server-side and pushes updates via postMessage. Clicking links in the preview navigates the editor's file tree.

### Layout and frontmatter editing

Layout files (`_layout.md`) get a dedicated editor with visual navigation editing. The frontmatter panel supports both structured field editing and a raw YAML mode for full control.

### File watching

The editor watches the filesystem via Server-Sent Events so external edits (from VS Code, vim, or other tools) are reflected immediately. This means you can use the WYSIWYG editor alongside your regular text editor without conflicts.

## Web components migration

Four interactive runes have been migrated from Svelte components to framework-neutral web components:

- **Diagram** -- Mermaid diagram rendering
- **Sandbox** -- Live HTML playground
- **Map** -- Interactive location maps
- **Comparison** -- Feature comparison matrices

These runes now work with any renderer, not just Svelte. They register as custom elements (`rf-diagram`, `rf-sandbox`, etc.) and initialize from data attributes set by the identity transform. The Svelte component registry still dispatches to them via element overrides, so existing sites work without changes.

## Layout transform engine

Layouts are now declarative. Instead of writing a Svelte component for each layout variation, you define a layout config that describes slots, chrome elements, computed content, and responsive behavior. The `layoutTransform` function in `@refrakt-md/transform` takes a layout config and page data and produces a serialized tag tree -- no framework code required.

The engine supports:

- **Slots** with source resolution (content, regions, computed, chrome)
- **Computed content** -- breadcrumbs, table of contents, and prev/next navigation derived from page data
- **Chrome elements** -- header, footer, sidebar, and toolbar structures with page-data-driven text and icons
- **Conditional rendering** based on frontmatter values and region existence

## postTransform hooks

The identity transform engine gained `postTransform` hooks -- a programmatic escape hatch that runs after all declarative processing (BEM classes, modifiers, structure injection). This enables complex rune behaviors that need the fully-transformed tree, like the Preview rune generating themed HTML source from its transformed children.

## Icon system

A new icon rune system provides inline SVG icons throughout the identity transform. The default set uses Lucide icons, and projects can add custom icons via `refrakt.config.json`. Icons are injected by the engine's structure config and rendered as SVG mask images in CSS.

## Theme distribution

Themes can now be packaged for distribution with `refrakt export`, producing a complete theme package with CSS, tokens, manifest, and install instructions. A companion `refrakt install` command imports a theme package into any project.

## Python symbol extraction

A new `refrakt extract` command parses Python source files and generates Symbol rune documentation. It extracts function signatures, class hierarchies, docstrings, parameter types, and return types into structured Markdoc content ready for the Symbol rune.

## Other improvements

- **Undo/redo** in the block editor with keyboard shortcuts
- **Client-side syntax highlighting** via Shiki for the code editor mode
- **Semantic rune usage** throughout the documentation site -- eating our own dog food
- **Dedicated CLI documentation** section on the site

---

For the full changelog, see the [releases page](/releases). To get started with 0.6.0, update your dependencies:

```bash
npm install @refrakt-md/lumina@0.6.0 @refrakt-md/sveltekit@0.6.0
```

Or scaffold a fresh project:

```bash
npm create refrakt@0.6.0
```
