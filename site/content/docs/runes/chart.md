---
title: Chart
description: Chart visualization from a Markdown table
---

# Chart

Turns a Markdown table into a chart. The first column becomes axis labels, the header row becomes series names, and data cells become values.

## Bar chart

The default chart type displays data as vertical bars.

{% preview source=true %}

{% chart type="bar" title="Monthly Revenue" %}
| Month | Revenue | Expenses |
|-------|---------|----------|
| Jan   | 4200    | 3100     |
| Feb   | 5100    | 3400     |
| Mar   | 4800    | 3200     |
| Apr   | 6200    | 3800     |
{% /chart %}

{% /preview %}

## Line chart

Use `type="line"` for trend data.

{% preview source=true %}

{% chart type="line" title="User Growth" %}
| Quarter | Users |
|---------|-------|
| Q1 2024 | 1000  |
| Q2 2024 | 2500  |
| Q3 2024 | 5000  |
| Q4 2024 | 8500  |
{% /chart %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `string` | `bar` | Chart type: `bar`, `line`, `pie`, or `area` |
| `title` | `string` | — | Chart title |
| `stacked` | `boolean` | `false` | Stack series values |

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
