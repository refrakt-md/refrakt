---
title: Code
description: Inline code span for dynamic content, where backticks cannot reach
category: Text & inline
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:code"} /%}

An inline code span you can put a **variable** inside. Here each attribute name of [badge](/runes/badge) comes from a data file, one table row per attribute:

{% preview source=true %}

	{% data src="site/content/_data/rune-attributes.json" root="own" where="rune:badge" headers="Attribute, Description" %}
	{% code %}{% $row.name %}{% /code %}
	---
	{% $row.description %}
	{% /data %}

{% /preview %}

That is the case it was built for: a generated reference table whose first column is a name. See [`data`](/runes/data#a-table-with-formatted-cells) for the `headers` attribute.

## Use backticks unless the content is dynamic

For static code, backticks are still correct and always will be: write `` `href` ``, not `{% code %}href{% /code %}`. Reach for this rune only when what goes inside is a variable — a `{% data %}` row value, a binding passed to an [`{% include %}`](/runes/include). Exactly as `**bold**` stays correct for static emphasis.

## Why backticks can't do it

A code span is **literal by definition**. Everything between the backticks is text, so Markdoc syntax inside one is never parsed. The same row value, in backticks and in the rune:

{% preview source=true %}

	{% data src="site/content/_data/rune-attributes.json" root="own" where="rune:badge" headers="Backticks, The code rune" %}
	`{% $row.name %}`
	---
	{% code %}{% $row.name %}{% /code %}
	{% /data %}

{% /preview %}

That is standard Markdown, not a refrakt quirk — and it is the *only* inline construct with this property. Everything else passes a variable through intact:

| Authored | Renders |
|----------|---------|
| `[{% $row.name %}](/runes/card)` | a link labelled `href` |
| `[**{% $row.name %}**](…)` | bold inside a link |
| `**_{% $row.name %}_**` | nested emphasis |
| `{% badge %}{% $row.name %}{% /badge %}` | a badge reading `href` |
| `` `{% $row.name %}` `` | the literal text `{% $row.name %}` |

So this rune exists to close one specific gap, not to offer a second spelling for something Markdown already does well.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:code"} /%}

## See also

- [data](/runes/data) — the per-row body this was built for
- [include](/runes/include) — the other place a variable reaches content
- [snippet](/runes/snippet) — for a *block* of code read from a file
