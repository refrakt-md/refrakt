---
title: refract.md
description: A content framework that extends Markdown with semantic runes
---

{% cta %}

# Write Markdown. Get structure.

refract.md extends Markdown with semantic runes — tags that reinterpret standard Markdown primitives into rich, typed content. Same Markdown you know, new semantic power.

- [Get Started](/docs/getting-started)
- [View on GitHub](https://github.com)

{% /cta %}

{% feature %}

## Why refract.md?

- **Runes, not components**

  Runes reinterpret the Markdown inside them. A heading inside `{% nav %}` becomes a group title. A list inside `{% cta %}` becomes action buttons. You write Markdown — the rune decides what it means.

- **Semantic output**

  Every rune produces valid HTML with Schema.org-compatible attributes. Your content is structured data from the start — accessible, SEO-ready, and machine-readable.

- **Framework-agnostic transforms**

  Runes transform at the Markdoc level, producing a generic Tag tree. Render with Svelte, React, or plain HTML. The content layer is decoupled from presentation.

- **Layout inheritance**

  Define regions in `_layout.md` files that cascade down directory trees. Headers, navigation, and sidebars compose automatically — no config files needed.

{% /feature %}

{% hint type="note" %}
refract.md is in active development. This site is built with refract.md itself — every page is authored in Markdown with runes.
{% /hint %}
