---
title: Budget
description: Travel and project budgets with categories, line items, and totals
---

# Budget

Structured budgets with categories and line items. Headings become budget categories, and list items with a "Description: $amount" pattern are parsed into line items with automatic subtotals.

## Basic usage

Use headings for categories and list items with amounts for line items.

{% preview source=true %}

{% budget title="Tokyo Trip" currency="JPY" travelers=2 duration="5 days" %}
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

{% budget title="Weekend Getaway" currency="USD" style="summary" %}
## Hotel

- Two nights downtown: $250

## Activities (estimate)

- Museum passes: $40
- Boat tour: $60-80
- Dining: $100-150
{% /budget %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | `string` | — | Budget title |
| `currency` | `string` | `USD` | Currency code |
| `travelers` | `number` | `1` | Number of travelers for per-person calculations |
| `duration` | `string` | — | Trip or project duration |
| `showPerPerson` | `boolean` | `true` | Display per-person cost breakdowns |
| `showPerDay` | `boolean` | `true` | Display per-day cost breakdowns |
| `style` | `string` | `detailed` | Display style: `detailed` or `summary` |
