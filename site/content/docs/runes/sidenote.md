---
title: Sidenote
description: Margin notes and footnotes alongside main content
---

# Sidenote

Margin notes, footnotes, or tooltips displayed alongside the main content. Useful for providing additional context without interrupting the reading flow.

## Basic usage

A margin note that sits alongside the main text.

```markdoc
{% sidenote style="sidenote" %}
This is a margin note that provides additional context without interrupting the main flow of the text. It can contain **rich formatting** and [links](/docs/getting-started).
{% /sidenote %}
```

{% sidenote style="sidenote" %}
This is a margin note that provides additional context without interrupting the main flow of the text. It can contain **rich formatting** and [links](/docs/getting-started).
{% /sidenote %}

## Footnote style

Use `style="footnote"` for content that appears at the bottom of the section.

```markdoc
{% sidenote style="footnote" %}
This appears as a footnote, typically rendered at the bottom of the content section with a separator line.
{% /sidenote %}
```

{% sidenote style="footnote" %}
This appears as a footnote, typically rendered at the bottom of the content section with a separator line.
{% /sidenote %}

## Tooltip style

Use `style="tooltip"` for a subtle inline callout.

```markdoc
{% sidenote style="tooltip" %}
This appears as a tooltip-style callout with a subtle border and background.
{% /sidenote %}
```

{% sidenote style="tooltip" %}
This appears as a tooltip-style callout with a subtle border and background.
{% /sidenote %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `style` | `string` | `sidenote` | Display style: `sidenote`, `footnote`, or `tooltip` |
