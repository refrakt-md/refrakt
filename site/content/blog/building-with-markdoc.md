---
title: Building with Markdoc
description: How refrakt.md extends Markdoc's tag system into a full content framework with runes, semantic transforms, and theme-driven rendering.
date: 2026-02-16
author: The Refrakt Team
tags: [architecture, markdoc]
---

Markdoc gives you a solid foundation: a Markdown parser with a tag system for custom elements. Refrakt.md builds on that foundation to create a full content framework.

## From tags to runes

A Markdoc tag is a rendering instruction. A refrakt.md rune is an *interpretation context*. When you write `{% pricing %}`, the rune doesn't just render a pricing table -- it reinterprets its children as tiers, extracts names and prices from headings, and produces semantic output with structured data.

This distinction matters because it means your content stays natural. You write headings, lists, and links. The rune decides what they mean.

## The identity transform

Between the Markdoc transform and the Svelte renderer sits the identity transform. This layer adds BEM classes, injects structural elements, and resolves context-dependent modifiers -- all without any component logic.

This separation keeps themes portable. A theme is just CSS that targets well-known class names, plus a handful of Svelte components for interactive behavior.

```markdoc
{% hint type="tip" %}
The identity transform is what makes it possible to style runes with pure CSS. Components are only needed for interactivity.
{% /hint %}
```

## What's next

We're working on expanding the rune library and improving the developer experience. Follow along on the blog or check the [changelog](/releases) for the latest updates.
