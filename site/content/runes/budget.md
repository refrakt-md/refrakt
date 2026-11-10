---
title: Budget
description: Structured budgets with categories, line items, and totals
category: Data
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:budget"} /%}

Headings become budget categories, and list items with a "Description: $amount" pattern are parsed into line items with automatic subtotals.

## Basic usage

Use headings for categories and list items with amounts for line items.

{% preview source=true %}

	{% budget currency="JPY" duration="5 days" %}
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

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A short paragraph, then a heading and a paragraph, before the first category heading | The eyebrow, headline and blurb ([Page sections](/docs/concepts/page-sections)) |
| A heading | A category, with its subtotal; the content up to the next heading of that level is its body |
| A heading ending in `(estimate)` or `(est.)` | A category marked as an estimate |
| A list item written `Description: amount` | A line item, counted in the category subtotal and the total |

## Summary variant

Use `variant="summary"` to show only category totals without individual line items.

{% preview source=true %}

	{% budget currency="JPY" duration="5 days" variant="summary" %}
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

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:budget"} /%}
