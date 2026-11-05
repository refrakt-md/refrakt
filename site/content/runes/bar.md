---
title: Bar
description: Block-level wrapper that renders a horizontal row of content — the bar layout primitive, composable in prose
category: Sections & blocks
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:bar"} /%}

A bar is a horizontal row that flags context: an identifier on the left, a status badge on the right; a date and a category; a breadcrumb and an action.

A bar is position-agnostic geometry: place one in the **eyebrow** position (the slot above a title) for a kicker, or anywhere a labelled strip is wanted.

## Basic usage

Split the body on a top-level `---` to get two groups. The right group is pushed to the end of the row.

{% preview source=true %}

	{% bar %}
	WORK-051
	---
	{% badge sentiment="positive" %}done{% /badge %}
	{% /bar %}

{% /preview %}

## Single group

Omit the `---` to render a single left-aligned group.

{% preview source=true %}

	{% bar %}
	Just one side — no right group.
	{% /bar %}

{% /preview %}

## Composable inside other runes

Drop a bar inside any block rune that accepts authored content. The rune emits the same DOM regardless of where it appears, so themes that style `[data-zone-layout="bar"]` style every bar consistently.

```markdoc
{% card %}
	{% bar %}
	ID-123
	---
	{% badge sentiment="positive" %}New{% /badge %}
	{% /bar %}

	# Card title

	Body content here.
{% /card %}
```

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:bar"} /%}

## See also

- [`{% badge %}`](/runes/badge) — the chip primitive that pairs naturally with a bar's right group.
- [`{% deflist %}`](/runes/deflist) — sibling composable rune for the `definition-list` layout primitive.
