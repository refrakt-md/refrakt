---
title: HowTo
description: Step-by-step how-to guide with tools and instructions
---

{% hint type="note" %}
This rune is part of **@refrakt/learning**. Install with `npm install @refrakt/learning` and add `"@refrakt/learning"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# HowTo

Step-by-step how-to instructions. Unordered lists become tools/materials needed, ordered lists become steps.

## Basic usage

A how-to guide with required tools and numbered steps.

{% preview source=true %}

{% howto estimatedTime="PT1H" difficulty="medium" %}
# How to Set Up a Development Environment

You will need these tools:

- Node.js 18+
- Git
- A code editor (VS Code recommended)

1. Install Node.js from the official website
2. Clone the repository with `git clone`
3. Run `npm install` to install dependencies
4. Start the dev server with `npm run dev`
{% /howto %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `estimatedTime` | `string` | — | Estimated time in ISO 8601 duration (e.g. "PT1H") |
| `difficulty` | `string` | — | Difficulty level: `easy`, `medium`, or `hard` |
| `headingLevel` | `number` | — | Heading level to convert into steps (auto-detected if omitted) |
