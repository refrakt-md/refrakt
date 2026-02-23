---
title: refrakt.md
description: A content framework built on Markdoc with 60+ semantic runes
---

{% hero %}

# Write Markdown. Get structure.

A content framework built on [Markdoc](https://markdoc.dev). Extend Markdown with 60+ semantic runes — tags that transform standard Markdown into structured, SEO-rich, machine-readable content.

```shell
npm create refrakt
```

- [Get Started](/docs/getting-started)

{% /hero %}

{% feature %}

## Why refrakt.md?

- {% icon name="puzzle" /%} **Built on Markdoc**

  Not another Markdown dialect. refrakt.md extends Markdoc with semantic runes that add meaning to the Markdown you already write. Everything Markdoc does, you keep.

- {% icon name="sparkles" /%} **Runes, not components**

  Runes reinterpret the Markdown inside them. A heading inside `{% nav %}` becomes a group title. A list inside `{% cta %}` becomes action buttons. You write Markdown — the rune decides what it means.

- {% icon name="globe" /%} **SEO from the start**

  Every rune can emit Schema.org JSON-LD and Open Graph metadata automatically. Recipes get Recipe schema, events get Event schema, FAQs get FAQ schema — no manual wiring.

- {% icon name="brain" /%} **AI-powered authoring**

  Generate full pages with `refrakt write`. The CLI knows every rune and produces valid Markdown with proper rune structure. Supports Claude and local models via Ollama.

- {% icon name="layers" /%} **Layout inheritance**

  Define regions in `_layout.md` files that cascade down directory trees. Headers, navigation, and sidebars compose automatically — no config files needed.

- {% icon name="package" /%} **Portable content**

  Runes transform at the Markdoc level, producing a generic tag tree. Your content stays decoupled from presentation — currently rendering with Svelte, with more frameworks planned.

{% /feature %}

{% testimonial layout="quote" %}
> Once you see content through the refrakt lens, plain Markdown starts feeling like it's leaving so much on the table.

**Claude Opus** — AI, Anthropic
{% /testimonial %}

## Under the hood

A single hint tag flows through five pipeline stages — from the Markdown you type to styled, semantic HTML.

{% steps headingLevel=2 %}

## You write Markdown

Wrap content in a rune tag. The `type` attribute tells the system this is a warning.

```markdoc
{% hint type="warning" %}
Back up your data before proceeding.
{% /hint %}
```

## Markdoc parses it

Markdoc turns your text into an abstract syntax tree — a structured representation of every tag, heading, and paragraph.

```text
Document
└── Tag(hint) { type: "warning" }
    └── Paragraph
        └── "Back up your data before proceeding."
```

## Rune schema interprets

The Hint model reads `type`, emits a `hintType` meta tag, and wraps content in a body container. The `typeof` marker carries semantic meaning forward.

```text
section { typeof: "Hint" }
├── meta { property: "hintType", content: "warning" }
└── div { data-name: "body" }
    └── p "Back up your data before proceeding."
```

## Theme engine styles

The identity transform reads the meta tag, injects a header with icon and title, adds BEM classes, and strips the consumed metadata.

```text
section.rf-hint.rf-hint--warning
├── div.rf-hint__header
│   ├── span.rf-hint__icon
│   └── span.rf-hint__title "warning"
└── div.rf-hint__body
    └── p "Back up your data before proceeding."
```

## Renderer outputs HTML

The framework renderer walks the styled tree and produces clean, semantic HTML.

```html
<section class="rf-hint rf-hint--warning">
  <div class="rf-hint__header">
    <span class="rf-hint__icon"></span>
    <span class="rf-hint__title">warning</span>
  </div>
  <div class="rf-hint__body">
    <p>Back up your data before proceeding.</p>
  </div>
</section>
```

{% /steps %}

{% hint type="warning" %}
Back up your data before proceeding.
{% /hint %}

## See it in action

Pure Markdown in, structured HTML out. The source tabs show exactly what you write and what the framework receives.

{% preview source=true width="wide" %}
{% comparison highlighted="refrakt.md" %}

## refrakt.md

- **Syntax** — Standard Markdown + Markdoc tags
- **Content model** — Semantic runes with structured output
- **SEO** — Automatic JSON-LD and Open Graph from content
- **Portability** — Plain Markdown files, no lock-in

## MDX

- **Syntax** — Markdown + JSX (custom syntax)
- **Content model** — React components embedded in Markdown
- **SEO** — ~~Manual~~ — you wire it yourself
- **Portability** — ~~Tied to React ecosystem~~

## Plain Markdown

- **Syntax** — Standard Markdown only
- **Content model** — Paragraphs, lists, headings — that's it
- **SEO** — ~~None~~ — no structured data support
- **Portability** — Universal, but limited expressiveness

{% /comparison %}
{% /preview %}

{% cta %}

## Ready to get started?

Scaffold a project in seconds and start writing content with runes.

- [Get Started](/docs/getting-started)

{% /cta %}
