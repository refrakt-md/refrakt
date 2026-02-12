---
title: Details
description: Collapsible disclosure blocks for supplementary content
---

# Details

Collapsible disclosure block for supplementary content. Renders as a native `<details>` element.

## Basic usage

Content is hidden by default and revealed when the user clicks the summary.

```markdoc
{% details summary="Click to reveal more information" %}
This content is hidden by default. The details rune wraps content in a native disclosure element that the user can toggle open and closed.
{% /details %}
```

{% details summary="Click to reveal more information" %}
This content is hidden by default. The details rune wraps content in a native disclosure element that the user can toggle open and closed.
{% /details %}

## Open by default

Use `open=true` to have the block expanded when the page loads.

```markdoc
{% details summary="This one starts open" open=true %}
Since `open=true` is set, this block is expanded when the page loads.
{% /details %}
```

{% details summary="This one starts open" open=true %}
Since `open=true` is set, this block is expanded when the page loads.
{% /details %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `summary` | `string` | `"Details"` | The clickable summary text |
| `open` | `boolean` | `false` | Whether the block is initially expanded |
