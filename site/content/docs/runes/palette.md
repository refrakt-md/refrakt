---
title: Palette
description: Color swatch grid with optional WCAG contrast and accessibility info
---

# Palette

Displays a grid of color swatches. List items are parsed as `name: #value` pairs. Use `##` headings to create groups. Comma-separated values render as a neutral scale strip.

## Basic usage

A simple color palette grid.

{% preview source=true %}

{% palette title="Brand Colors" %}
- Blue: #2563EB
- Indigo: #4F46E5
- Purple: #7C3AED
- Pink: #EC4899
- Red: #EF4444
- Orange: #F97316
{% /palette %}

{% /preview %}

## Grouped palette

Use `##` headings to organize colors into groups.

{% preview source=true %}

{% palette title="Design System" %}
## Primary
- Blue: #2563EB
- Indigo: #4F46E5

## Semantic
- Success: #10B981
- Warning: #F59E0B
- Danger: #EF4444
{% /palette %}

{% /preview %}

## Neutral scale

Comma-separated values render as a horizontal gradient strip.

{% preview source=true %}

{% palette title="Gray Scale" %}
- Gray: #F9FAFB, #F3F4F6, #E5E7EB, #D1D5DB, #9CA3AF, #6B7280, #4B5563, #374151, #1F2937, #111827
{% /palette %}

{% /preview %}

## Contrast and accessibility

Enable `showContrast` and `showA11y` to display WCAG contrast ratios and AA/AAA compliance.

{% preview source=true %}

{% palette title="Accessible Colors" showContrast="true" showA11y="true" %}
- Navy: #1E3A5F
- Teal: #0D9488
- Coral: #FB7185
- Amber: #F59E0B
{% /palette %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | `string` | — | Palette heading |
| `showContrast` | `boolean` | `false` | Show contrast ratios against white and black |
| `showA11y` | `boolean` | `false` | Show WCAG AA/AAA pass/fail badges |
| `columns` | `number` | auto | Number of grid columns (auto-detected if omitted) |
