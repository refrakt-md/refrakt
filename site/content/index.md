---
title: refrakt.md
description: A content framework built on Markdoc with 40+ semantic runes
---

{% cta %}

# Write Markdown. Get structure.

A content framework built on [Markdoc](https://markdoc.dev). Extend Markdown with 40+ semantic runes — tags that transform standard Markdown into structured, SEO-rich, machine-readable content.

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

## See it in action

{% grid layout="1 1" %}

```markdoc
{% steps %}
## Write Markdown

Create pages with standard Markdown.
Runes wrap your content in semantic
contexts — no new syntax to learn.

## Add runes

Pick from 40+ built-in runes for
navigation, SEO, pricing tables,
API docs, changelogs, and more.

## Ship it

Run `npm create refrakt` to scaffold
a project. Deploy anywhere SvelteKit
runs — Vercel, Netlify, or self-hosted.
{% /steps %}
```

---

{% steps %}
## Write Markdown

Create pages with standard Markdown. Runes wrap your content in semantic contexts — no new syntax to learn.

## Add runes

Pick from 40+ built-in runes for navigation, SEO, pricing tables, API docs, changelogs, and more.

## Ship it

Run `npm create refrakt` to scaffold a project. Deploy anywhere SvelteKit runs — Vercel, Netlify, or self-hosted.
{% /steps %}

{% /grid %}

{% hint type="note" %}
refrakt.md is in active development. This site is built with refrakt.md — every page you're reading is authored in Markdown with runes.
{% /hint %}
