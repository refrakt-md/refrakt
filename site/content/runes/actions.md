---
title: Actions
description: A row of actions — each link of a list becomes a button, ranked primary and secondary, and a fence becomes a copyable command line
category: Content
plugin: core
status: stable
type: rune
---

# Actions

`{% actions %}` turns a plain list of links into a row of buttons. The first link of the whole row is the **primary** action and the rest are **secondary**, so a theme styles the rank rather than the list position. A fence becomes a copyable command line in the same row.

It is what [`hero`](/runes/marketing/hero) and [`cta`](/runes/marketing/cta) render their buttons with, and what a [composed rune](/extend/rune-authoring/composed-runes) places to get buttons from a slot.

## Basic usage

{% preview source=true %}

	{% actions %}
	- [Get started](/docs/getting-started)
	- [View on GitHub](https://github.com/refrakt-md/refrakt)
	{% /actions %}

{% /preview %}

## With a command line

A fence is a `command` block, unranked, beside the buttons. On a narrow screen the row stacks, and the command line and the buttons share its width.

{% preview source=true %}

	{% actions %}
	```shell
	npm create refrakt@latest
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

## Output contract

```html
<div class="rf-actions" data-rune="actions">
  <div data-name="command" class="rf-actions__command"><pre>…</pre></div>
  <ul data-name="list" class="rf-actions__list">
    <li data-name="action" data-rank="primary" class="rf-actions__action"><a href="…"><span>…</span></a></li>
    <li data-name="action" data-rank="secondary" class="rf-actions__action"><a href="…"><span>…</span></a></li>
  </ul>
</div>
```

The row's alignment comes from `--actions-justify`, which a host sets (`hero` from its `align`, `cta` to centre, and a `section` from its `align` for its own row). Button size comes from `--action-padding` and `--action-font-size`. Lumina sets them from the enclosing rune's `prominence`: `display` and `prominent` give large buttons, anything else the default size. Only the nearest enclosing rune counts, so a card inside a display section keeps default buttons. The primary button's text uses `--rf-color-on-primary`, so it follows the colour scheme, a cover scrim's included.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:actions"} /%}
