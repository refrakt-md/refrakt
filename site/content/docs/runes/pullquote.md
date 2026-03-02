---
title: PullQuote
description: Editorial pull quotes with alignment and style variants
---

# PullQuote

Editorial pull quotes for magazine-style layouts. Extracts blockquotes or paragraphs and displays them as prominent typographic elements.

## Basic usage

Wrap a blockquote or paragraph to turn it into a pull quote.

{% preview source=true %}

{% pullquote %}
> Design is not just what it looks like and feels like. Design is how it works.
{% /pullquote %}

{% /preview %}

## Alignment

Use the `align` attribute to position the pull quote within the content flow.

{% preview source=true %}

{% pullquote align="right" %}
> The best interface is no interface.
{% /pullquote %}

{% /preview %}

## Styles

The `style` attribute controls the visual treatment.

{% preview source=true %}

{% pullquote style="accent" align="center" %}
> Words can be like X-rays if you use them properly — they'll go through anything.
{% /pullquote %}

{% /preview %}

{% preview source=true %}

{% pullquote style="editorial" %}
> Simplicity is the ultimate sophistication.
{% /pullquote %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `align` | `string` | `center` | Horizontal alignment: `left`, `center`, or `right` |
| `style` | `string` | `default` | Visual style: `default`, `accent`, or `editorial` |
