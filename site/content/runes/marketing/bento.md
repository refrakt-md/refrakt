---
title: Bento
description: Magazine-style bento grid of cells — heading depth sizes each tile, or author cells explicitly for full control
category: Marketing
plugin: marketing
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:bento"} /%}

A magazine-style grid of tiles in different sizes. Write a heading for each cell and its level sets the tile's size, or write `{% bento-cell %}` tags to size each tile exactly. A bento has no headline of its own; to title a grid, wrap it in a [feature](/runes/marketing/feature) or [section](/runes/section).

## Basic usage

Each heading starts a cell. Its level sets the tile's size, whatever else is in the grid, so `###` is always a medium tile.

{% preview source=true %}

	{% bento columns=6 %}
	## Featured Article

	This cell spans two-thirds of the grid across two rows — the hero of the layout.

	#### Tip of the Day

	A small cell — a third of the grid width — sits beside the hero.

	#### Did You Know?

	Another small cell tucks under the first, still beside the hero.

	### Quick Update

	A medium cell, half the grid width.

	### Latest News

	Another medium pairs alongside.
	{% /bento %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A heading | A cell, titled with the heading; `#` makes a full tile, `##` large, `###` medium, `####` and deeper small |
| The content under a heading, up to the next | The cell's body |
| `---` inside a cell | Splits it into media and body; with two, the last part is a footer ([Add media to cells](#add-media-to-cells)) |
| Content before the first heading | Loose content above the grid |

## Size cells by heading level

The grid has 6 columns by default, and each size keeps its proportion at any `columns`:

| Heading | Size | Footprint at 6 columns |
|---------|------|------------------------|
| `#` | `full` | full width, 1 row |
| `##` | `large` | two-thirds width, 2 rows |
| `###` | `medium` | half width, 1 row |
| `####` and deeper | `small` | a third of the width, 1 row |

Every row has the same height, so a `large` cell is twice as tall as its neighbors. Set that height with `row-height` (`sm`, `md`, `lg` or `xl`).

## Set your own sizes

`levels` replaces the sizes above with your own, one per heading level starting at `#`. Each entry is a column count (one row tall) or a `WxH` footprint:

{% preview source=true %}

	{% bento columns=6 levels="6,3,2" collapse="sm" %}
	# Launch

	`#` takes the first entry — the full width.

	## Metrics

	`##` takes the second — half the width, so it pairs with the next.

	## Activity

	Half-width.

	### Alpha

	`###` takes the third — a third of the width.

	### Beta

	A third.

	### Gamma

	A third.
	{% /bento %}

{% /preview %}

- Headings deeper than the list use its last entry, so write only as many entries as you have sizes.
- Entries are column counts, not proportions: change `columns` and you need to revisit them.
- `levels="6,5,4,3,2,1"` keeps every cell one row tall with width following the heading; `levels="6x1,6x2,6x3"` makes full-width cells that grow taller, for a timeline feel.

## Add media to cells

Split a cell on `---` into media, body and an optional footer, as on [card](/runes/card). Large and full cells put the media beside the body; smaller cells stack it on top. Set `media-position` on the `bento` to change every cell at once, and on a `bento-cell` to change one. `elevation` works the same way: set it on the `bento` to lift every cell.

{% preview source=true %}

	{% bento columns=6 elevation="raised" %}
	# Coral reef

	![A coral reef teeming with life](https://assets.refrakt.md/figure-coral-reef.jpg)

	---

	Teeming with life beneath turquoise waters — the image fills the cell's media zone.

	# Hot springs

	![Volcanic hot springs](https://assets.refrakt.md/figure-hot-springs.jpg)

	---

	Steam rising from the Icelandic highlands.
	{% /bento %}

{% /preview %}

Any visual rune works as cell media; see [Media guests](/docs/concepts/media-guests). In a cell with `href`, an interactive guest such as a `codegroup` or `map` shows its static form so the whole cell stays one link, and the build warns. The `frame-*` attributes go on a `bento-cell`, not on the `bento`.

## Line up text across cells

`content-height` (`sm` to `xl`) gives the text of every stacked cell the same height, so captions line up however long they are; the media takes the rest of the row. For cells with the media beside the text, `media-ratio` sets the media's share of the width instead. Set either on the `bento` for the whole grid, or on a `bento-cell` for one; both relax once the grid stacks.

{% preview source=true %}

	{% bento columns=4 levels="2" row-height="lg" content-height="md" media-position="bottom" collapse="sm" %}
	### Coral reef

	![A coral reef teeming with life](https://assets.refrakt.md/figure-coral-reef.jpg)

	---

	Teeming with life beneath turquoise waters.

	### Hot springs

	![Volcanic hot springs](https://assets.refrakt.md/figure-hot-springs.jpg)

	---

	Steam rising from the Icelandic highlands, where geothermal vents warm the rivers and pools all year round.
	{% /bento %}

{% /preview %}

## Size each cell yourself

For a dashboard, write `{% bento-cell %}` tags and give each one exact `cols` and `rows`, or a `size` preset. A cell takes its own `media-position`, `tint`, and an `href` that makes the whole tile a link. Once a bento holds a `bento-cell`, loose headings are ignored, so don't mix the two.

{% preview source=true %}

	{% bento columns=6 %}
		{% bento-cell cols=4 rows=2 href="/runes/rune-catalog" %}
		## Overview

		The hero tile spans four columns and two rows, and the whole cell links out.
		{% /bento-cell %}

		{% bento-cell cols=2 media-position="end" %}
		## Sidebar

		A two-column companion tile.
		{% /bento-cell %}
	{% /bento %}

{% /preview %}

## Choose when the grid stacks

Above the `collapse` width the grid renders exactly as written; below it, the cells stack in a single column and size to their content. There is no step in between.

| `collapse` | Stacks below |
|------------|--------------|
| `sm` (default) | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `never` | never stacks |

Pick the narrowest width your grid holds comfortably: a 6-column grid with wide cells wants `md` or `lg`, a grid of small cells can stay at `sm`. The width is the grid's own container, not the window.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:bento"} /%}
