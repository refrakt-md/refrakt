---
title: Actions
description: A row of actions — each link of a list becomes a button, ranked primary and secondary, and a fence becomes a copyable command line
category: Sections & blocks
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:actions"} /%}

`{% actions %}` turns a plain list of links into a row of buttons. The first link of the whole row is the **primary** action and the rest are **secondary**, so a theme styles the rank rather than the list position. A fence becomes a copyable command line in the same row.

It is what [`hero`](/runes/marketing/hero) and [`cta`](/runes/marketing/cta) render their buttons with, and what a [composed rune](/extend/rune-authoring/composed-runes) places to get buttons from a slot.

## Basic usage

{% preview source=true %}

	{% actions %}
	- [Get started](/docs/getting-started)
	- [View on GitHub](https://github.com/refrakt-md/refrakt)
	{% /actions %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A list of links | A row of buttons, one per list item |
| The first link of the whole row | The primary action; every other link is secondary |
| A code fence | A copyable command line beside the buttons |

## With a command line

A fence is a `command` block, unranked, beside the buttons. On a narrow screen the row stacks, and the command line and the buttons share its width.

{% preview source=true %}

	{% actions %}
	```shell
	npx create-refrakt
	```

	- [Read the docs](/docs/getting-started)
	{% /actions %}

{% /preview %}

## Rank

Rank is positional over the whole row: the first link is primary, wherever it is. A row written as a list, a fence and another list has one primary action, the first link of the first list. Every other link is secondary.

## In a composed rune

A composition places `actions` around a slot, so its authors keep writing a plain list:

```markdoc
{% section media-position=$attrs["media-position"] %}
	{% slot name="media" /%}

	---

	{% slot name="headline" /%}

	{% slot name="blurb" /%}

	{% actions %}{% slot name="actions" /%}{% /actions %}
{% /section %}
```

## In a bar

Inside a [`bar`](/runes/bar), actions are metadata actions rather than a page's call to action: compact, at the height of the badges beside them, and tonal rather than filled, a primary included. They stay in a row on a phone. The context is `.rf-actions--in-bar`, so a theme styles it like any other context modifier. Each link may carry an [icon](/runes/icon), and a link to a [drawer](/runes/drawer#triggering-from-a-link) on the page opens it.

```markdoc
{% bar %}
Composition
---
{% actions %}
- [{% icon name="package" /%} Install](#install)
- [{% icon name="code" /%} Source](#source)
{% /actions %}
{% /bar %}
```

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:actions"} /%}
