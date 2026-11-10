---
title: TextBlock
description: Styled text blocks with drop caps, columns, and lead paragraphs
category: Text & inline
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:textblock"} /%}

Typography-focused text wrapper for magazine-style layouts. Adds drop caps, multi-column text, lead paragraph styling, and text alignment without any custom markup inside the content.

## Drop cap

The `dropcap` attribute adds a large decorative first letter for an editorial feel.

{% preview source=true %}

	{% textblock dropcap=true %}
	Mainz, 1450. In a rented workshop off the cathedral square, a goldsmith named Johannes Gutenberg was casting letters in an alloy of lead, tin and antimony. Each one was a mirror image, set by hand into a composing stick, locked into a forme and inked with a varnish of linseed oil and soot. Five years later his press had printed some 180 copies of the Bible — about as many as a scriptorium could copy in a lifetime.
	{% /textblock %}

{% /preview %}

## Multi-column layout

Use the `columns` attribute for newspaper-style column layouts.

{% preview source=true %}

	{% textblock columns=2 %}
	The invention of the printing press in the 15th century revolutionized the spread of information across Europe. Before Gutenberg, books were painstakingly copied by hand, making them rare and expensive.

	With movable type, ideas could be reproduced quickly and cheaply. This democratization of knowledge helped fuel the Renaissance, the Reformation, and the Scientific Revolution.
	{% /textblock %}

{% /preview %}

## Lead paragraphs

The `lead` attribute styles the text as a larger introductory paragraph.

{% preview source=true %}

	{% textblock lead=true %}
	Before the press, a book was a year of a scribe's life. Within fifty years of Gutenberg, Europe had printed some twenty million.
	{% /textblock %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:textblock"} /%}
