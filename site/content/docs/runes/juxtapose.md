---
title: Juxtapose
description: Interactive side-by-side comparison with slider, toggle, fade, and auto modes
---

# Juxtapose

Interactive content comparison. Headings become panel labels, the content below each heading becomes the panel body. Four interaction modes let readers compare content with a draggable slider, A/B toggle, crossfade, or scroll-triggered animation.

## Basic usage

Each `## Heading` inside the rune defines a panel. The default `slider` variant adds a draggable divider between the two panels.

{% preview source=true %}

{% juxtapose %}

## Original

The landing page uses a single-column layout with large text blocks and minimal imagery. Navigation is text-only with five top-level links.

## Redesign

The updated landing page uses a two-column hero with an illustration, tighter copy, and a sticky nav bar with icon links and a search field.

{% /juxtapose %}

{% /preview %}

## Toggle variant

Use `variant="toggle"` for a button-based A/B switch between panels. Best when readers need to see each panel at full width.

{% preview source=true %}

{% juxtapose variant="toggle" %}

## Light theme

Clean white backgrounds with dark text, subtle gray borders, and blue accent links. Cards use light drop shadows for depth.

## Dark theme

Deep charcoal backgrounds with light gray text, muted borders, and teal accent links. Cards use soft inner glows.

{% /juxtapose %}

{% /preview %}

## Fade variant

Use `variant="fade"` for a crossfade transition between panels. The `duration` attribute controls animation speed in milliseconds.

{% preview source=true %}

{% juxtapose variant="fade" duration=800 %}

## Draft

> The system processes input and returns output based on configured parameters.

## Revised

> Paste your text, choose a tone, and get a polished rewrite in seconds — no configuration needed.

{% /juxtapose %}

{% /preview %}

## Auto variant

Use `variant="auto"` for scroll-triggered animation that automatically moves the slider position as the reader scrolls past.

{% preview source=true %}

{% juxtapose variant="auto" duration=2000 %}

## Before optimization

The page loads 47 requests totalling 3.2 MB. First contentful paint at 4.1 seconds. Layout shift score 0.42.

## After optimization

The page loads 12 requests totalling 480 KB. First contentful paint at 0.9 seconds. Layout shift score 0.01.

{% /juxtapose %}

{% /preview %}

## Horizontal orientation

Use `orientation="horizontal"` to stack panels vertically with a horizontal divider. The default is `vertical` (side-by-side with a vertical divider).

{% preview source=true %}

{% juxtapose orientation="horizontal" %}

## Mobile

Single-column layout, hamburger menu, bottom tab bar, touch-friendly tap targets with 48px minimum size.

## Desktop

Three-column layout, full navigation bar, sidebar filters, hover states and keyboard shortcuts.

{% /juxtapose %}

{% /preview %}

## Custom labels

Use the `labels` attribute to override the heading-derived panel names. Provide a comma-separated pair of labels.

{% preview source=true %}

{% juxtapose labels="Before, After" %}

## Version 1

The dashboard shows a single data table with pagination. Users export to CSV for analysis.

## Version 2

The dashboard shows interactive charts with drill-down, inline filtering, and real-time updates.

{% /juxtapose %}

{% /preview %}

## Markdown reinterpretation

| Markdown | Interpretation |
|----------|----------------|
| `## Heading` | Panel name and label |
| Content below heading | Panel body |

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `variant` | `string` | `slider` | Interaction mode: `slider`, `toggle`, `fade`, or `auto` |
| `orientation` | `string` | `vertical` | Divider axis for slider/auto variants: `horizontal` or `vertical` |
| `position` | `number` | `50` | Initial slider position as a percentage (0–100) |
| `duration` | `number` | `1000` | Animation duration in milliseconds (fade/auto variants) |
| `labels` | `string` | — | Comma-separated custom labels for the two panels |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `inset` | `string` | — | Horizontal padding: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
| `bg` | `string` | — | Named background preset from theme configuration |

## Section header

Juxtapose supports an optional eyebrow, headline, and blurb above the comparison panels. Place a short paragraph or heading before the panel content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.
