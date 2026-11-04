---
title: PullQuote
description: A featured quotation with its attribution, or a pull quote repeating words from the text
category: Text & inline
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:pullquote"} /%}

A featured quotation: a statement presented for its own sake, set apart from the text with who said it. With `excerpt`, a pull quote: words from the text around it, repeated large for a skimming eye.

You choose what the quote **is**; the theme decides how it looks. `{% quote %}` is the same rune.

## A featured quotation

Wrap a blockquote. A paragraph after it, `**Name** — Source`, is its attribution: the name in bold, then the source after a dash or a comma.

{% preview source=true %}

	{% pullquote %}
	> Design is not just what it looks like and feels like. Design is how it works.

	**Steve Jobs** — Apple
	{% /pullquote %}

{% /preview %}

It renders as a `<figure>` holding the `<blockquote>`, with the attribution as its `<figcaption>` and the name in `<cite>`. The attribution is read only after a quote; the source is optional.

The attribution can also be the quote's own last line, opening with a dash: `— **Name**, Source`. The dash marks it, so a quote that ends in bold text is not read as its source.

{% preview source=true %}

	{% pullquote %}
	> The best way to predict the future is to invent it.
	>
	> — **Alan Kay**, 1971
	{% /pullquote %}

{% /preview %}

## A pull quote

When the words already appear in the text, add `excerpt`. The quote renders as an `<aside aria-hidden="true">`, so a screen reader does not read the passage twice. It looks the same as a featured quotation.

{% preview source=true %}

	{% pullquote excerpt=true align="right" %}
	> The best interface is no interface.
	{% /pullquote %}

{% /preview %}

## How loud it is

`prominence` sets how loud the quote is, on the same scale that sizes a section's header: `quiet` and `normal` are a quotation's own size, `prominent` and `display` set it apart, and `marquee` makes it a page's centrepiece.

{% preview source=true %}

	{% pullquote prominence="display" %}
	> Simplicity is the ultimate sophistication.
	{% /pullquote %}

{% /preview %}

A tinted panel is the universal `tint`:

{% preview source=true %}

	{% pullquote tint="subtle" prominence="prominent" %}
	> Words can be like X-rays if you use them properly — they'll go through anything.

	**Aldous Huxley**
	{% /pullquote %}

{% /preview %}

## Placement

`align` places the quote: centred in the measure (the default), or floated `left` or `right` beside the text, set against a rule.

{% hint type="note" %}
`variant` is deprecated: its values named looks, which belong to the theme. `accent` maps to `tint="subtle"` and `prominence="prominent"`; `default` and `editorial` map to nothing. It is accepted with a warning for this release.
{% /hint %}

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:pullquote"} /%}

