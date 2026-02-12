---
title: Accordion
description: Collapsible accordion sections for FAQ-style content
---

# Accordion

Collapsible accordion sections. Use explicit `{% accordion-item %}` tags, or set `headingLevel` to automatically convert headings into accordion panels.

```markdoc
{% accordion %}
{% accordion-item name="What is refract.md?" %}
A content framework built on Markdoc that extends Markdown with semantic runes.
{% /accordion-item %}

{% accordion-item name="How do runes work?" %}
Runes are Markdoc tags that create interpretation contexts — the Markdown inside takes on different meaning depending on which rune wraps it.
{% /accordion-item %}
{% /accordion %}
```

### Example

{% accordion %}
{% accordion-item name="What is refract.md?" %}
A content framework built on Markdoc that extends Markdown with semantic runes. You write standard Markdown — runes decide how it's interpreted.
{% /accordion-item %}

{% accordion-item name="How do runes work?" %}
Runes are Markdoc tags that create interpretation contexts. A list inside `{% nav %}` becomes page links, inside `{% feature %}` becomes a feature grid, inside `{% cta %}` becomes action buttons.
{% /accordion-item %}

{% accordion-item name="Do I need to learn a new syntax?" %}
No. Runes use standard Markdoc tag syntax (`{% tag %}...{% /tag %}`), and the content inside is regular Markdown.
{% /accordion-item %}
{% /accordion %}

### Heading conversion

Use `headingLevel` to automatically convert headings into accordion items:

```markdoc
{% accordion headingLevel=2 %}
## What is refract.md?

A content framework built on Markdoc.

## How do runes work?

Runes create interpretation contexts for Markdown content.
{% /accordion %}
```

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `headingLevel` | `number` | — | Convert headings at this level into accordion items |
| `multiple` | `boolean` | `true` | Allow multiple panels to be open simultaneously |
