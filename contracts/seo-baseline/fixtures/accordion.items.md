---
rune: accordion-item
title: Explicit accordion-item tags
role: edge-case
notes: >
  The `accordion-item` rune's own authorable form, and it is already wrong: the
  Question carries no `name`, and the heading text is concatenated into
  `acceptedAnswer.text` with no separator ("What is refrakt?A content framework.").
  The heading-based fixture produces a correct name/answer split. Recorded as-is —
  WORK-570 retypes and wraps these nodes.
---
{% accordion %}
{% accordion-item %}
## What is refrakt?

A content framework.
{% /accordion-item %}

{% accordion-item %}
## How do runes work?

They reinterpret Markdown.
{% /accordion-item %}
{% /accordion %}
