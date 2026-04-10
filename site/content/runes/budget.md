---
title: Budget
description: Travel and project budgets with categories, line items, and totals
---

# Budget

Structured budgets with categories and line items. Headings become budget categories, and list items with a "Description: $amount" pattern are parsed into line items with automatic subtotals.

## Basic usage

Use headings for categories and list items with amounts for line items.

{% preview source=true %}

{% budget currency="JPY" travelers=2 duration="5 days" %}
Spring 2026

# Tokyo Trip

A week in Japan — temples, food, and a night in a ryokan.

## Accommodation

- Hotel in Shinjuku: ¥15000
- Ryokan in Hakone: ¥25000

## Transportation

- Japan Rail Pass (7-day): ¥29650
- Airport transfer: ¥3000
- Local metro cards: ¥5000

## Food & Dining

- Daily meals: ¥5000
- Sushi experience: ¥8000
{% /budget %}

{% /preview %}

## Summary variant

Use `variant="summary"` to show only category totals without individual line items.

{% preview source=true %}

{% budget currency="JPY" travelers=2 duration="5 days" variant="summary" %}
Spring 2026

# Tokyo Trip

A week in Japan — temples, food, and a night in a ryokan.

## Accommodation

- Hotel in Shinjuku: ¥15000
- Ryokan in Hakone: ¥25000

## Transportation

- Japan Rail Pass (7-day): ¥29650
- Airport transfer: ¥3000
- Local metro cards: ¥5000

## Food & Dining

- Daily meals: ¥5000
- Sushi experience: ¥8000
{% /budget %}

{% /preview %}

## Estimates

Mark categories as estimates by adding `(estimate)` or `(est.)` to the heading, or use strikethrough.

{% preview source=true %}

{% budget currency="USD" %}
# Weekend Getaway

## Hotel

- Two nights downtown: $250

## Activities (estimate)

- Museum passes: $40
- Boat tour: $60-80
- Dining: $100-150
{% /budget %}

{% /preview %}

## Section header

Budget supports an optional eyebrow, headline, and blurb above the categories. Place a short paragraph or heading before the first category heading to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `currency` | `string` | `USD` | Currency code |
| `travelers` | `number` | `1` | Number of travelers for per-person calculations |
| `duration` | `string` | — | Trip or project duration |
| `showPerPerson` | `boolean` | `true` | Display per-person cost breakdowns |
| `showPerDay` | `boolean` | `true` | Display per-day cost breakdowns |
| `variant` | `string` | `detailed` | Display variant: `detailed` or `summary` |

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
