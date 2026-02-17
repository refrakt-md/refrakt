---
title: Annotate
description: Content with margin annotations and notes
---

# Annotate

Annotated content with margin notes. Regular content flows normally while nested note tags appear as annotations alongside the text.

## Margin notes

Notes float in the right margin next to the content they annotate.

````markdoc
{% annotate %}
The refrakt.md framework builds on Markdoc to provide semantic content transformation.

{% note %}
Markdoc is an open-source Markdown-based authoring system created by Stripe.
{% /note %}

Runes are the core abstraction — they wrap ordinary Markdown and reinterpret it based on context.

{% note %}
The term "rune" refers to a symbol that carries meaning. In refrakt.md, runes carry rendering intent.
{% /note %}
{% /annotate %}
````

{% preview %}

{% annotate %}
The refrakt.md framework builds on Markdoc to provide semantic content transformation.

{% note %}
Markdoc is an open-source Markdown-based authoring system created by Stripe.
{% /note %}

Runes are the core abstraction — they wrap ordinary Markdown and reinterpret it based on context.

{% note %}
The term "rune" refers to a symbol that carries meaning. In refrakt.md, runes carry rendering intent.
{% /note %}
{% /annotate %}

{% /preview %}

## Inline notes

Use `style="inline"` to show annotations as highlighted blocks within the flow.

```markdoc
{% annotate style="inline" %}
Runes use standard Markdoc tag syntax.

{% note %}
This means any Markdoc-compatible editor will understand them.
{% /note %}

The content inside a rune is regular Markdown.
{% /annotate %}
```

{% preview %}

{% annotate style="inline" %}
Runes use standard Markdoc tag syntax.

{% note %}
This means any Markdoc-compatible editor will understand them.
{% /note %}

The content inside a rune is regular Markdown.
{% /annotate %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `style` | `string` | `margin` | Display style: `margin`, `tooltip`, `inline` |
