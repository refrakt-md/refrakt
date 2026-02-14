---
title: refrakt.md
description: A content framework built on Markdoc with 60+ semantic runes
---

{% cta %}

# Write Markdown. Get structure.

A content framework built on [Markdoc](https://markdoc.dev). Extend Markdown with 60+ semantic runes — tags that transform standard Markdown into structured, SEO-rich, machine-readable content.

```shell
npm create refrakt
```

- [Get Started](/docs/getting-started)

{% /cta %}

{% feature %}

## Why refrakt.md?

- **Built on Markdoc**

  Not another Markdown dialect. refrakt.md extends Markdoc with semantic runes that add meaning to the Markdown you already write. Everything Markdoc does, you keep.

- **Runes, not components**

  Runes reinterpret the Markdown inside them. A heading inside `{% nav %}` becomes a group title. A list inside `{% cta %}` becomes action buttons. You write Markdown — the rune decides what it means.

- **SEO from the start**

  Every rune can emit Schema.org JSON-LD and Open Graph metadata automatically. Recipes get Recipe schema, events get Event schema, FAQs get FAQ schema — no manual wiring.

- **AI-powered authoring**

  Generate full pages with `refrakt write`. The CLI knows every rune and produces valid Markdown with proper rune structure. Supports Claude and local models via Ollama.

- **Layout inheritance**

  Define regions in `_layout.md` files that cascade down directory trees. Headers, navigation, and sidebars compose automatically — no config files needed.

- **Portable content**

  Runes transform at the Markdoc level, producing a generic tag tree. Your content stays decoupled from presentation — currently rendering with Svelte, with more frameworks planned.

{% /feature %}

{% testimonial layout="quote" %}
> Once you see content through the refrakt lens, plain Markdown starts feeling like it's leaving so much on the table.

**Claude Opus** — AI, Anthropic
{% /testimonial %}

## Under the hood

A single hint tag flows through five pipeline stages — from the Markdown you type to styled, semantic HTML.

{% steps %}

## You write Markdown

Wrap content in a rune tag. The `type` attribute tells the system this is a warning.

```markdown
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

Every example below is pure Markdown — no custom components, no JSX, no frontmatter gymnastics.

{% tabs headingLevel=3 %}

### Steps

{% steps %}
## Write Markdown

Create pages with standard Markdown. Runes wrap your content in semantic contexts — no new syntax to learn.

## Add runes

Pick from 60+ built-in runes for navigation, SEO, pricing tables, API docs, changelogs, and more.

## Ship it

Run `npm create refrakt` to scaffold a project. Deploy anywhere SvelteKit runs — Vercel, Netlify, or self-hosted.
{% /steps %}

### Comparison

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

### Timeline

{% timeline %}
## Q1 2025 — Foundation

Core rune system, Markdoc integration, and Svelte renderer. First 20 runes covering content, layout, and navigation.

## Q2 2025 — Expansion

40+ new runes for data, code, semantic content, and creative layouts. SEO layer with automatic JSON-LD generation.

## Q3 2025 — Ecosystem

Theme marketplace, CLI authoring tools, and multi-framework support beyond Svelte.
{% /timeline %}

### Conversation

{% conversation %}
> Can you build me a pricing page?

> Sure — here's the Markdown. Three tiers, feature comparison, and a highlighted recommended plan. It also emits PriceSpecification schema automatically.

> Wait, that's just Markdown? Where are the components?

> There are none. The `pricing` rune reinterprets your headings as tier names and list items as features. The theme handles the visual layout.
{% /conversation %}

{% /tabs %}

{% cta %}

## Ready to get started?

Scaffold a project in seconds and start writing content with runes.

- [Get Started](/docs/getting-started)

{% /cta %}
