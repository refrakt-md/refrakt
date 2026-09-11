---
title: Accordion
description: Collapsible accordion sections for FAQ-style content
category: Layout
plugin: core
status: stable
type: rune
---

# Accordion

Collapsible accordion sections. Use explicit `{% accordion-item %}` tags, or write headings directly and they will be automatically converted into accordion panels.

## Basic usage

Wrap each section in an `{% accordion-item %}` tag with a name.

{% preview source=true %}

{% accordion %}
{% accordion-item name="What is refrakt.md?" %}
A content framework built on Markdoc that extends Markdown with semantic runes. You write standard Markdown — runes decide how it's interpreted.
{% /accordion-item %}

{% accordion-item name="How do runes work?" %}
Runes are Markdoc tags that wrap ordinary Markdown. The same list renders as navigation links, a feature grid, or action buttons — depending on which rune contains it.
{% /accordion-item %}

{% accordion-item name="Do I need to learn a new syntax?" %}
No. Runes use standard Markdoc tag syntax, and the content inside is regular Markdown.
{% /accordion-item %}
{% /accordion %}

{% /preview %}

## Heading conversion

Headings are automatically converted into accordion items — no explicit tags needed.

{% preview source=true %}

{% accordion %}
## What is refrakt.md?

A content framework built on Markdoc.

## How do runes work?

Runes create interpretation contexts for Markdown content.
{% /accordion %}

{% /preview %}

## Section header

Accordion supports an optional eyebrow, headline, and blurb above the panels. Place a short paragraph or heading before your content heading to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

### When the panels are not a FAQ

An accordion declares itself a `FAQPage`, with each panel a `Question` and its body an `Answer`. That is right for a genuine FAQ and wrong for every other use — a list of definitions, a set of options, the universal-attribute sections on these rune pages. Publishing questions that nobody asked is structured data asserting something untrue.

```markdoc
{% accordion schema="none" %}
```

Suppresses the whole subtree, panels included, and the JSON-LD with it. Nothing else changes — same markup, same classes, same behaviour.

`"none"` is the only value. `FAQPage` has no subtype to narrow to, and switching to another type (`ItemList`, say) would need the container's property renamed *and* each panel's type and properties changed, which an attribute on the container cannot reach.

### Attributes

#### `accordion`

{% include file="rune-attributes.md" variables={r: "rune:accordion"} /%}

#### `accordion-item`

{% include file="rune-attributes.md" variables={r: "rune:accordion-item"} /%}

