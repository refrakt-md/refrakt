---
title: refrakt.md
description: A content framework built on Markdoc with 100+ semantic runes
---
{% hero align="left" spacing="flush" media-position="bottom" reveal="fade" %}
{% bg gradient="to-br" from="transparent" to="muted/0.2" /%}
{% codegroup overflow="wrap" title="index.md" %}
{% snippet path=$file.path lines="5-24" lang="markdoc" /%}
{% /codegroup %}

---

Version {% $version %} released [Check out what's new](/releases)

# Write Markdown. Get structure.

A content framework built on [Markdoc](https://markdoc.dev). Extend Markdown with 100+ semantic runes — tags that transform standard Markdown into structured, SEO-rich, machine-readable content.

```shell
npm create refrakt
```

- [Get Started](/docs/getting-started)
{% /hero %}

{% feature align="left" spacing="loose" reveal="slide" stagger=true %}
The framework
## Why refrakt.md?

Markdown is powerful but limited. Runes extend it with semantic structure — without inventing a new syntax or locking you into a framework.

- {% icon name="puzzle" /%} **Built on Markdoc**

  Not another Markdown dialect. refrakt.md extends Markdoc with semantic runes that add meaning to the Markdown you already write. Everything Markdoc does, you keep.

- {% icon name="sparkles" /%} **Runes, not components**

  Runes reinterpret the Markdown inside them. A heading inside `{% nav %}` becomes a group title. A list inside `{% cta %}` becomes action buttons. You write Markdown — the rune decides what it means.

- {% icon name="globe" /%} **SEO from the start**

  Every rune can emit Schema.org JSON-LD and Open Graph metadata automatically. Recipes get Recipe schema, events get Event schema, FAQs get FAQ schema — no manual wiring.

- {% icon name="brain" /%} **First-class for AI coding agents**

  refrakt projects ship an MCP server out of the box. Agents like Claude Code get typed tools for every CLI command and live resources for your plan and rune contracts — so they can scaffold pages, inspect output, and update work items without parsing text or asking for an API key.

- {% icon name="database" /%} **Cross-page pipeline**

  Refrakt builds a typed registry of every entity across your content. Plain Markdown becomes a live data layer — query it from any page (`collection` / `relationships` / `aggregate`), generate routes from it (`entityRoutes`), link across it (`ref` / `expand`).

- {% icon name="package" /%} **Portable content**

  Runes transform at the Markdoc level, producing a generic tag tree. Your content stays decoupled from presentation — adapters for SvelteKit, Astro, Next.js, Nuxt, Eleventy, and plain HTML.
{% /feature %}

{% feature media-position="end" align="left" media-ratio="1/2" valign="center" collapse="md" spacing="flush" reveal="scale" %}
{% juxtapose %}

{% sandbox src="profile-card" framework="tailwind" tint-mode="light" %}{% /sandbox %}

---

{% sandbox src="profile-card" framework="tailwind" tint-mode="dark" %}{% /sandbox %}
{% /juxtapose %}

---

Composable by design
## Runes that work together

The `sandbox` rune renders code fences as live previews in isolated iframes. Drop two of them inside a `juxtapose` and you get an interactive light-vs-dark comparison — no custom code. Each rune handles its own job while combining into something greater than the parts.
{% /feature %}

{% feature align="left" reveal="fade" %}
{% preview source=true width="content" %}
{% recipe prepTime="PT5M" servings=1 difficulty="easy" media-position="start" collapse="md" %}
![A tequila sunrise cocktail](https://assets.refrakt.md/tequila-sunrise.png)

---

A cocktail classic

## Tequila Sunrise

A layered showstopper that transitions from deep orange to golden yellow — like watching the sun come up in a glass.

- 60ml tequila
- 120ml fresh orange juice
- 15ml grenadine
- Orange slice and cherry for garnish

1. Fill a tall glass with ice and pour in the tequila and orange juice. Stir gently.
2. Slowly pour grenadine over the back of a spoon so it sinks to the bottom.
3. Let the layers settle, then garnish with an orange slice and a cherry.
{% /recipe %}
{% /preview %}

---

Built-in SEO
## Structured data from plain Markdown

Every rune can emit Schema.org JSON-LD automatically. Write a `recipe` in Markdown — headings, lists, paragraphs — and the framework extracts Recipe schema, ingredient lists, and step instructions without any manual wiring.
{% /feature %}

{% feature spacing="tight" tint-mode="auto" align="left" reveal="slide" stagger=true %}
9 packages, 100+ runes
## A rune for every domain

Core ships with essentials like `hint`, `tabs`, and `accordion`. Community packages add domain-specific runes — install only what you need.


- {% icon name="rocket" /%} **Marketing**

  `hero`, `cta`, `feature`, `pricing`, `testimonial`, `bento`, `steps`, `comparison`

- {% icon name="book-open" /%} **Docs**

  `api`, `symbol`, `changelog`

- {% icon name="palette" /%} **Design**

  `swatch`, `palette`, `typography`, `spacing`, `preview`, `mockup`

- {% icon name="lightbulb" /%} **Learning**

  `howto`, `recipe`

- {% icon name="heart" /%} **Storytelling**

  `character`, `realm`, `faction`, `lore`, `plot`, `bond`, `storyboard`

- {% icon name="briefcase" /%} **Business**

  `cast`, `organization`, `timeline`

- {% icon name="map-pin" /%} **Places**

  `event`, `map`, `itinerary`

- {% icon name="video" /%} **Media**

  `playlist`, `track`, `audio`

- {% icon name="clipboard-list" /%} **Plan**

  `spec`, `work`, `bug`, `decision`, `milestone`
{% /feature %}

{% testimonial variant="quote" spacing="breathe" width="content" reveal="blur" %}
> Once you see content through the refrakt lens, plain Markdown starts feeling like it's leaving so much on the table.

**Claude Opus** — AI, Anthropic
{% /testimonial %}

{% cta spacing="breathe" reveal="fade" %}

## Ready to get started?

Scaffold a project in seconds and start writing content with runes.

- [Get Started](/docs/getting-started)

{% /cta %}