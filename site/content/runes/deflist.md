---
title: Deflist
description: Block-level definition list — stacked dt/dd pairs that flow into multiple columns on wider screens
category: Sections & blocks
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:deflist"} /%}

A list of terms and their descriptions. Each list item that starts with `**Term:**` becomes a term and its description, stacked on a narrow screen and spread into columns where there is room.

Use it for option references, glossaries, attribute tables, recipe details, character stats — any term/description pair set. Composable inside any container rune, identical DOM to a projected metadata zone using the same layout primitive.

## Basic usage

A markdown list where each item starts with bold-text-plus-colon.

{% preview source=true %}

	{% deflist %}
	- **Priority:** {% badge sentiment="caution" %}high{% /badge %}
	- **Complexity:** moderate
	- **Assignee:** @alice
	- **Milestone:** v0.18
	{% /deflist %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A list | The definition list, one term and description per item |
| `**Term:**` at the start of an item | The term; the rest of the item is its description |
| An item with no bold prefix | An empty term, with the whole item as the description, and a build warning |

## Inline composition

Inline runes inside the value (after `**Term:**`) compose naturally. Use `{% badge %}` for sentiment-colored chips, `{% ref %}` for entity links, inline code for identifiers.

{% preview source=true %}

	{% deflist %}
	- **Status:** {% badge sentiment="positive" %}accepted{% /badge %}
	- **Version:** `v0.16.2`
	- **Released:** 2026-01-15
	{% /deflist %}

{% /preview %}

## Fallback for items without a bold prefix

If a list item doesn't start with `**Term:**`, the rune emits an empty `<dt>` plus the full content in `<dd>` and prints a build-time warning naming the line. Prefix every item with bold-term-colon to label it properly.

{% preview source=true %}

	{% deflist %}
	- **Owner:** Platform team
	- Reviewed every quarter
	{% /deflist %}

{% /preview %}

## Aliases

The rune is also registered as `definitions` and `terms` for authoring preference. All three names produce identical DOM.

```markdoc
{% definitions %}
- **Owner:** Platform team
{% /definitions %}

{% terms %}
- **Owner:** Platform team
{% /terms %}
```

## On narrow screens

A definition list follows the width it has: each term sits above its description on a narrow screen, and the pairs spread into columns where there is room.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:deflist"} /%}

## See also

- [`{% bar %}`](/runes/bar) — sibling composable rune for the `bar` layout primitive.
- [`{% badge %}`](/runes/badge) — the chip primitive used inside sentiment-mapped `<dd>` cells.
