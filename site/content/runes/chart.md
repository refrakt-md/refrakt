---
title: Chart
description: Chart visualization from a Markdown table
category: "Code & Data"
plugin: core
status: stable
type: rune
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

{% chart type="line" title="Monthly Active Users" %}
| Month     | Users |
|-----------|-------|
| January   | 1000  |
| February  | 1240  |
| March     | 1580  |
| April     | 1820  |
| May       | 2100  |
| June      | 1950  |
| July      | 1880  |
| August    | 2240  |
| September | 2680  |
| October   | 3120  |
| November  | 2890  |
| December  | 3540  |
{% /chart %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `string` | `bar` | Chart type: `bar`, `line`, `pie`, or `area` |
| `title` | `string` | — | Chart title |
| `stacked` | `boolean` | `false` | Stack series values |
| `tick-count` | `number` | `5` | Approximate number of Y-axis ticks (auto picks "nice" round steps) |
| `tick-step` | `number` | — | Explicit unit-span between Y-axis ticks. Overrides `tick-count` |
| `label-angle` | `string` | `auto` | X-axis label rotation: `auto` rotates -45° when slots are crowded, `0` forces horizontal, or any explicit degree (e.g. `"-45"`, `"-90"`) |

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
