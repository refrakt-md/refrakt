---
title: Getting Started
description: Set up refract.md and create your first content
---

# Getting Started

refract.md is a content framework built on [Markdoc](https://markdoc.dev). It extends Markdown with semantic runes — tags that transform standard Markdown primitives into structured, typed content.

## Installation

Install the core packages in your project:

```shell
npm install @refract-md/runes @refract-md/content @markdoc/markdoc
```

## Project Structure

A refract.md project is a directory of Markdown files:

```
content/
├── _layout.md
├── index.md
└── docs/
    ├── getting-started.md
    └── runes.md
```

The `_layout.md` file defines layout regions that wrap every page in that directory and its subdirectories. Pages are regular Markdown files with optional frontmatter.

## Your First Layout

Create a `_layout.md` at the root of your content directory:

```markdown
{% layout %}
{% region name="header" %}
# My Site
{% /region %}

{% region name="nav" %}
{% nav %}
## Docs
- getting-started
{% /nav %}
{% /region %}
{% /layout %}
```

This defines a header with your site title and a navigation sidebar. The `{% nav %}` rune turns the list into page links — display text is pulled from each page's `title` frontmatter.

## Your First Page

Create an `index.md`:

```markdown
---
title: Welcome
---

# Hello, refract.md

{% hint type="note" %}
This callout was created with the hint rune.
{% /hint %}
```

## Using Runes

Runes are Markdoc tags wrapped in `{% %}` delimiters. They create interpretation contexts for the Markdown inside them — the same primitives take different meaning depending on the wrapping rune.

{% hint type="note" %}
A heading inside `{% nav %}` becomes a navigation group title. A list inside `{% cta %}` becomes action buttons. A list inside `{% feature %}` becomes a feature grid. You write Markdown — the rune decides what it means.
{% /hint %}

See the [Runes Reference](/docs/runes) for the full list of available runes.

{% hint type="check" %}
You're ready to start building with refract.md. Explore the rune reference to see what's possible.
{% /hint %}
