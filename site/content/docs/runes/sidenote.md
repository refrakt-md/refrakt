---
title: Sidenote
description: Margin notes and footnotes alongside main content
---

# Sidenote

Margin notes, footnotes, or tooltips displayed alongside the main content. Useful for providing additional context without interrupting the reading flow.

```markdoc
{% sidenote %}
This provides additional context for the reader.
{% /sidenote %}
```

### Example

{% sidenote style="sidenote" %}
This is a margin note that provides additional context without interrupting the main flow of the text. It can contain **rich formatting** and [links](/docs/getting-started).
{% /sidenote %}

### Footnote style

{% sidenote style="footnote" %}
This appears as a footnote, typically rendered at the bottom of the content section with a separator line.
{% /sidenote %}

### Tooltip style

{% sidenote style="tooltip" %}
This appears as a tooltip-style callout with a subtle border and background.
{% /sidenote %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `style` | `string` | `sidenote` | Display style: `sidenote`, `footnote`, or `tooltip` |
