---
title: Motion
description: Scroll-reveal entrance motion — the closed reveal vocabulary, stagger, the opt-in default, and reduced-motion / no-JS behaviour, with a feature-stagger example.
---

# Motion

Sections can **reveal** as they scroll into view — a section fades in, a feature grid staggers its items. You declare the *intent*; the theme owns the choreography and the page stays fully readable without JavaScript. Motion is **opt-in**: nothing animates until you ask.

Two universal attributes, available on every block rune — the same on a `hero`, a `feature`, a `cta`, or a `bento`:

| Attribute | What it does |
|-----------|--------------|
| `reveal` | the entrance character — `none` (default), `fade`, `slide`, `scale`, `blur` |
| `stagger` | cascade a multi-child block's items in, one after another |

## `reveal` — the entrance character

You name the *character* of the entrance, not the mechanics. How far it slides, how fast it fades, which part moves — that is the theme's to decide, so motion stays consistent across a site and themes can retune it without touching your content.

| Value | Reads as |
|-------|----------|
| `none` | no entrance — the default, and the opt-out |
| `fade` | a calm fade in |
| `slide` | slides into place as it fades in (the theme picks the direction) |
| `scale` | grows slightly into place as it fades in |
| `blur` | comes into focus — blurred to sharp |

```markdoc
{% hero reveal="fade" %}
# Write Markdown. Get structure.
{% /hero %}
```

`reveal` accepts only these values — a typo like `reveal="zoom"` is a build error, not a silent no-op.

## `stagger` — cascade the items

Add `stagger` to a multi-child block and its items arrive in sequence instead of all at once — a feature grid, pricing tiers, bento cells, steps, playlist tracks. It composes with any character (`reveal="slide" stagger`).

```markdoc
{% feature reveal="slide" stagger=true %}
The framework
## Why refrakt.md?

- {% icon name="puzzle" /%} **Built on Markdoc** — semantic runes over the Markdown you already write.
- {% icon name="sparkles" /%} **Runes, not components** — the rune reinterprets the Markdown inside it.
- {% icon name="globe" /%} **SEO from the start** — Schema.org and Open Graph, automatically.
{% /feature %}
```

`stagger` is a no-op on single-child runes (a `hero` has nothing to cascade), so it's safe to leave on. The theme owns the rhythm and order.

See it live across the whole [home page](/), where each section uses a different character — `fade` on the hero, `slide` + `stagger` on the feature grids, `scale` on a comparison, `blur` on the testimonial.

## Accessibility & no-JS — always complete

Motion is layered on top of a complete page, never load-bearing:

- **Opt-in.** With no `reveal`, nothing animates.
- **Reduced motion.** Visitors with `prefers-reduced-motion` see every section in its final state immediately — no entrance.
- **No JavaScript.** Search crawlers, RSS readers, and no-JS visitors get the fully-rendered page. The hidden-then-revealed state only exists once the page is enhanced — nothing is ever hidden behind JS that might not run.

> **Direction isn't yours to set (yet).** `slide` enters from a theme-chosen offset — the theme derives the axis from the layout (media from its side, content from its side, reading-direction aware). This keeps motion coherent across a site.

For the theme side of this — the character contract, the physics tokens, and how to choreograph it — see [the motion dimension](/extend/theme-authoring/motion).
