---
title: Comparison
description: Product and feature comparison matrices from Markdown
---

# Comparison

Transform Markdown into structured comparison matrices. Headings become columns, list items become feature rows, and bold labels automatically align rows across columns.

## Basic usage

Each `##` heading defines a column. Bold text at the start of list items serves as alignment keys — items with the same bold label across columns appear in the same row.

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

| Attribute | Type | Default | Description |
|---|---|---|---|
| `title` | string | | Comparison title displayed above the matrix |
| `highlighted` | string | | Column name to visually emphasize as recommended |
| `layout` | string | `table` | Display variant: `table` or `cards` |
| `labels` | string | `left` | Row label position: `left` or `hidden` |
| `collapse` | string | `true` | Collapse to cards on mobile |
| `verdict` | string | | Summary text shown below the comparison |

## Markdown reinterpretation

| Markdown | Interpretation |
|---|---|
| `## Heading` | Column header — the thing being compared |
| List item | Feature row for that column |
| `**Bold text**` at start of list item | Row alignment label |
| Text after bold | Feature description |
| `~~Strikethrough~~` | Negative indicator — limitation or missing capability |
| Blockquote | Callout badge within a column |
