---
title: Sidenote
description: Margin notes and footnotes alongside main content
category: Text & inline
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:sidenote"} /%}

Margin notes, footnotes, or tooltips displayed alongside the main content. Useful for providing additional context without interrupting the reading flow. To flag something the reader must notice (a note, warning or caution) in the flow of the text, use [hint](/runes/hint); to set several notes beside the passages they comment on, use [annotate](/runes/annotate).

## Basic usage

A margin note that sits alongside the main text.

{% preview source=true %}

	{% sidenote variant="sidenote" %}
	Gutenberg's first press was adapted from a **wine press** — the same screw mechanism the Rhineland vineyards around Mainz had used for centuries. [More on the Gutenberg Bible](https://en.wikipedia.org/wiki/Gutenberg_Bible).
	{% /sidenote %}

{% /preview %}

## Footnote style

Use `variant="footnote"` for content that appears at the bottom of the section.

{% preview source=true %}

	{% sidenote variant="footnote" %}
	Estimates of the first print run vary between 158 and 180 copies; 49 are known to survive.
	{% /sidenote %}

{% /preview %}

## Tooltip style

Use `variant="tooltip"` for a subtle inline callout.

{% preview source=true %}

	{% sidenote variant="tooltip" %}
	A forme is the frame of locked type that is inked and pressed onto the paper.
	{% /sidenote %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:sidenote"} /%}
