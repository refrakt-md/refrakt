---
title: refrakt.md
description: A content framework built on Markdoc with 60+ semantic runes
---
{% hero justify="left" tint-mode="auto" spacing="breathe" tint="subtle" %}
Version 0.7.2 released [Check out what's new](/releases)

# Write Markdown. Get structure.

A content framework built on [Markdoc](https://markdoc.dev). Extend Markdown with 60+ semantic runes — tags that transform standard Markdown into structured, SEO-rich, machine-readable content.

```shell
npm create refrakt
```

- [Get Started](/docs/getting-started)
{% /hero %}

{% feature justify="left" spacing="default" %}
The framework
## Why refrakt.md?

Markdown is powerful but limited. Runes extend it with semantic structure — without inventing a new syntax or locking you into a framework.

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

{% feature layout="split" justify="left" ratio="1 1" align="center" collapse="md" gap="loose" tint="subtle" spacing="flush" %}
Composable by design
## Runes that work together

Nest a `map` and `itinerary` inside a `mockup`, wrap it in a `showcase` — each rune handles its own structure while combining into something greater than the parts.

---

{% showcase bleed="none" offset="0" shadow="elevated" %}
{% mockup device="iphone-15" tint="base" scale="0.9" tint-mode="auto" %}
{% map zoom="12" center="40.7580, -73.9855" %}
- **Museum of Modern Art** - *Modern and contemporary art* - 40.7614, -73.9776
- **Central Park** - *Urban green oasis* - 40.7829, -73.9654
- **Times Square** - *The Crossroads of the World* - 40.7580, -73.9855
{% /map %}

{% itinerary inset="tight" %}
### 10:00 AM — Museum of Modern Art

Spend the morning exploring the permanent collection.

### 1:00 PM — Central Park

Picnic lunch on the Great Lawn.

### 3:00 PM — Times Square

Walk through the theater district.
{% /itinerary %}
{% /mockup %}
{% /showcase %}
{% /feature %}

{% feature layout="stacked" justify="left" align="center" %}
Built-in SEO
## Structured data from plain Markdown

Every rune can emit Schema.org JSON-LD automatically. Write a `recipe` in Markdown — headings, lists, paragraphs — and the framework extracts Recipe schema, ingredient lists, and step instructions without any manual wiring.

---

{% preview source="true" width="content" %}
{% recipe prepTime="10 min" cookTime="10 min" servings=2 difficulty="easy" %}
## Classic Margherita Pizza

A simple Neapolitan-style pizza with fresh ingredients.

- 250g pizza dough
- 80ml San Marzano tomato sauce
- 125g fresh mozzarella
- Fresh basil leaves
- Extra virgin olive oil

1. Set your oven to 250°C with a pizza stone inside.
1. Stretch the dough into a 30cm round. Spread the tomato sauce evenly, leaving a 2cm border.
1. Tear the mozzarella over the sauce. Bake for 8–10 minutes until the crust is charred. Finish with fresh basil and a drizzle of olive oil.
{% /recipe %}
{% /preview %}
{% /feature %}

{% feature spacing="loose" tint-mode="auto" justify="left" %}
8 packages, 60+ runes
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

  `music-playlist`, `music-recording`
{% /feature %}

{% testimonial variant="quote" spacing="breathe" tint="cool" width="content" %}
> Once you see content through the refrakt lens, plain Markdown starts feeling like it's leaving so much on the table.

**Claude Opus** — AI, Anthropic
{% /testimonial %}

{% cta spacing="breath" %}

## Ready to get started?

Scaffold a project in seconds and start writing content with runes.

- [Get Started](/docs/getting-started)

{% /cta %}