---
title: Code
description: Inline code span for dynamic content, where backticks cannot reach
category: "Code & Data"
plugin: core
status: stable
type: rune
---

# Code

An inline code span you can put a **variable** inside.

```markdoc
{% code %}{% $row.name %}{% /code %}
```

## Use backticks unless the content is dynamic

For static code, backticks are still correct and always will be:

```markdoc
Set `href` to make the card clickable.
```

Reach for this rune only when what goes inside is a variable — a `{% data %}` row value, a binding passed to an [`{% include %}`](/runes/include). Exactly as `**bold**` stays correct for static emphasis.

## Why backticks can't do it

A code span is **literal by definition**. Everything between the backticks is text, so Markdoc syntax inside one is never parsed:

```markdoc
`{% $row.name %}`   →   <code>{% $row.name %}</code>
```

That is standard Markdown, not a refrakt quirk — and it is the *only* inline construct with this property. Everything else passes a variable through intact:

| Authored | Renders |
|----------|---------|
| `[{% $row.name %}](/runes/card)` | a link labelled `href` |
| `[**{% $row.name %}**](…)` | bold inside a link |
| `**_{% $row.name %}_**` | nested emphasis |
| `{% badge %}{% $row.name %}{% /badge %}` | a badge reading `href` |
| `` `{% $row.name %}` `` | the literal text `{% $row.name %}` |

So this rune exists to close one specific gap, not to offer a second spelling for something Markdown already does well.

## In a table cell

The case it was built for — a generated reference table whose first column is an attribute name:

```markdoc
{% data src="_data/rune-attributes.json" root="attributes" where=$own
        headers="Attribute, Type, Required, Description" %}
{% code %}{% $row.name %}{% /code %}
---
{% $row.type %}
---
{% if $row.required %}✓{% else /%}—{% /if %}
---
{% $row.description %}
{% /data %}
```

See [`data`](/runes/data#a-table-with-formatted-cells) for the `headers` attribute.

## Output

The same element a backtick span produces, plus the usual rune markers:

```html
<code class="rf-code" data-rune="code">href</code>
```

The element is the point: Lumina styles `code` with an element rule, so a paragraph mixing a backtick span and this rune looks uniform without either needing to know about the other. `.rf-code` is there for a theme that *wants* to tell them apart — it is not required for the default styling.

## Attributes

None.

## Related

- [data](/runes/data) — the per-row body this was built for
- [include](/runes/include) — the other place a variable reaches content
- [snippet](/runes/snippet) — for a *block* of code read from a file
