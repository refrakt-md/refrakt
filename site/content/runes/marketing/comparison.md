---
title: Comparison
description: Product and feature comparison matrices from Markdown
category: Marketing
plugin: marketing
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:comparison"} /%}

Compares products, plans or approaches side by side, feature by feature, as a table or as cards.

## Basic usage

Each `##` heading is a column. Items with the same bold label line up in the same row across columns.

{% preview source=true %}

	{% comparison title="Choosing a Framework" %}

	## SvelteKit

	- **Learning curve** — Low, intuitive template syntax
	- **Bundle size** — Compiles away the framework
	- **SSR** — Built-in with adapter system
	- **TypeScript** — First-class support

	## Next.js

	- **Learning curve** — Moderate, React knowledge required
	- **Bundle size** — Medium, React runtime included
	- **SSR** — Built-in with multiple strategies
	- **TypeScript** — First-class support

	## Astro

	- **Learning curve** — Low, HTML-first approach
	- **Bundle size** — Zero JS by default
	- **SSR** — Built-in, island architecture
	- **TypeScript** — First-class support

	{% /comparison %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A `##` heading | A column: the thing being compared |
| A list item under it | A row in that column |
| Bold text at the start of a list item | The row's label; items with the same label line up across columns |
| `~~Strikethrough~~` in an item | A limitation or missing capability |
| An item starting `[x]` or `[ ]` | A check mark or a cross |
| A blockquote under a heading | A callout badge in that column |

## Highlighted column

Use the `highlighted` attribute to visually emphasize a recommended column. Add `verdict` for a summary below the comparison.

{% preview source=true %}

	{% comparison highlighted="refrakt.md" verdict="refrakt.md gives you the power of AI without sacrificing ownership or portability." %}

	## refrakt.md

	- **Content ownership** — Your content stays yours, portable Markdown
	- **Theme system** — Switch themes instantly, same content renders differently
	- **Output** — Real SvelteKit, not proprietary runtime
	- **AI role** — AI generates reusable themes, not throwaway sites

	## Wix AI

	- **Content ownership** — ~~Content locked in Wix platform~~
	- **Theme system** — ~~Templates only~~, no real theme swapping
	- **Output** — Proprietary Wix runtime
	- **AI role** — AI generates a single site layout

	## Framer AI

	- **Content ownership** — ~~Content lives in Framer~~
	- **Theme system** — ~~Visual-first~~, design tool not content system
	- **Output** — Framer runtime
	- **AI role** — AI assists with layout and copy

	{% /comparison %}

{% /preview %}

## Cards layout

Use `layout="cards"` for side-by-side cards. Ideal for pricing comparisons or when columns have different content lengths.

{% preview source=true %}

	{% comparison highlighted="Pro" layout="cards" %}

	## Free

	- **Projects** — 1
	- **AI generations** — 5 per month
	- **Themes** — Community only
	- **Support** — Community forum

	## Pro

	- **Projects** — Unlimited
	- **AI generations** — Unlimited
	- **Themes** — Community + Premium
	- **Support** — Priority email

	## Team

	- **Projects** — Unlimited
	- **AI generations** — Unlimited
	- **Themes** — All + private library
	- **Support** — Dedicated Slack

	{% /comparison %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:comparison"} /%}
