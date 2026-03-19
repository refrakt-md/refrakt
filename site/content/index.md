---
title: refrakt.md
description: A content framework built on Markdoc with 60+ semantic runes
---
{% hero align="left" spacing="loose" layout="split" collapse="lg" %}
Version 0.8.4 released [Check out what's new](/releases)

# Write Markdown. Get structure.

A content framework built on [Markdoc](https://markdoc.dev). Extend Markdown with 60+ semantic runes — tags that transform standard Markdown into structured, SEO-rich, machine-readable content.

```shell
npm create refrakt
```

- [Get Started](/docs/getting-started)

---


{% showcase width="content" shadow="hard" bleed="bottom" offset="10rem" %}
{% codegroup overflow="wrap" %}
````markdoc
{% hero align="left" spacing="loose" tint="subtle" layout="split" collapse="lg" %}
Version 0.8.4 released [Check out what's new](/releases)

# Write Markdown. Get structure.

A content framework built on [Markdoc](https://markdoc.dev). Extend Markdown with 60+ semantic runes — tags that transform standard Markdown into structured, SEO-rich, machine-readable content.

```shell
npm create refrakt
```

- [Get Started](/docs/getting-started)
{% /hero %}
````
{% /codegroup %}
{% /showcase %}
{% /hero %}

{% feature align="left" spacing="loose" %}
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

  Runes transform at the Markdoc level, producing a generic tag tree. Your content stays decoupled from presentation — render with SvelteKit or as static HTML, with more adapters planned.
{% /feature %}

{% feature layout="split" align="left" ratio="1 1" valign="center" collapse="md" gap="loose" spacing="flush" %}
Composable by design
## Runes that work together

Nest a `map` and `itinerary` inside a `mockup`, wrap it in a `showcase` — each rune handles its own structure while combining into something greater than the parts.

---

{% showcase bleed="both" offset="7rem" shadow="elevated" place="center" %}
{% mockup device="iphone-15" tint="base" scale=0.9 tint-mode="auto" %}
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

{% feature layout="stacked" align="left" %}
Built-in SEO
## Structured data from plain Markdown

Every rune can emit Schema.org JSON-LD automatically. Write a `recipe` in Markdown — headings, lists, paragraphs — and the framework extracts Recipe schema, ingredient lists, and step instructions without any manual wiring.

---

{% preview source=true width="content" %}
{% recipe prepTime="PT5M" servings=1 difficulty="easy" layout="split-reverse" collapse="md" %}
A cocktail classic

## The Gimlet

A crisp, citrus-forward cocktail that balances gin botanicals with the sweetness of lime cordial. Shaken, strained, and served ice-cold.

- 60ml London dry gin
- 20ml fresh lime juice
- 15ml simple syrup
- Lime wheel for garnish

1. Combine gin, lime juice, and simple syrup in a cocktail shaker with ice.
2. Shake vigorously for 15 seconds until well-chilled.
3. Strain into a chilled coupe glass and garnish with a lime wheel.

---

![A gimlet cocktail](https://assets.refrakt.md/gimlet.png)
{% /recipe %}
{% /preview %}
{% /feature %}

{% feature spacing="tight" tint-mode="auto" align="left" %}
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

  `playlist`, `track`, `audio`
{% /feature %}

{% testimonial variant="quote" spacing="breathe" width="content" %}
> Once you see content through the refrakt lens, plain Markdown starts feeling like it's leaving so much on the table.

**Claude Opus** — AI, Anthropic
{% /testimonial %}

{% cta spacing="breathe" %}

## Ready to get started?

Scaffold a project in seconds and start writing content with runes.

- [Get Started](/docs/getting-started)

{% /cta %}