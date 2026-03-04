---
title: Page sections
description: How to add an eyebrow, headline, and blurb above rune content
---

# Page sections

Many runes support an optional **section header** — a short combination of eyebrow, headline, blurb, and image that introduces the content block. No extra tags are needed; the rune reads these from the Markdown you write at the top of the block.

## The slots

| Slot | What it is |
|------|-----------|
| **Eyebrow** | A small label displayed above the headline — a short phrase, category tag, or badge link |
| **Headline** | The main heading for the section |
| **Blurb** | A supporting paragraph that follows the headline |
| **Image** | An image placed alongside or above the header content |

---

## Syntax

### Headline only

A single heading becomes the headline.

```markdown
{% accordion headingLevel=2 %}
## Frequently asked questions

## What is refrakt.md?
A content framework built on Markdoc.
{% /accordion %}
```

### Paragraph eyebrow + headline

A paragraph placed **before** the first heading becomes the eyebrow. This is the recommended pattern for badge links and short category labels.

```markdown
{% accordion headingLevel=2 %}
[What's new →](#changelog)

## Frequently asked questions

## What is refrakt.md?
A content framework built on Markdoc.
{% /accordion %}
```

```markdown
{% hero %}
New in v2.0

# Build with refrakt.md

A content framework for semantic Markdown.
{% /hero %}
```

### Heading eyebrow + headline

Two consecutive headings: the first becomes the eyebrow, the second becomes the headline.

```markdown
{% hero %}
## What's new in v2

# Build with refrakt.md

A content framework for semantic Markdown.
{% /hero %}
```

### Headline + blurb

A paragraph placed **after** the headline becomes the blurb.

```markdown
{% accordion headingLevel=2 %}
## Frequently asked questions

Browse our most common questions below.

## What is refrakt.md?
A content framework built on Markdoc.
{% /accordion %}
```

### Full example: eyebrow + headline + blurb

{% preview source=true %}

{% accordion headingLevel=2 %}
[What's new →](#)

## Frequently asked questions

Browse our most common questions below.

## What is refrakt.md?

A content framework built on Markdoc that extends Markdown with semantic runes.

## How do runes work?

Runes create interpretation contexts for Markdown content.

## Do I need to learn new syntax?

No. Runes use standard Markdoc tag syntax.
{% /accordion %}

{% /preview %}

---

## Supported runes

The following runes support the eyebrow / headline / blurb / image pattern:

**Core**
- [Accordion](/docs/runes/accordion)
- [Tabs](/docs/runes/tabs)
- [Reveal](/docs/runes/reveal)

**@refrakt-md/marketing**
- [Hero](/docs/runes/hero)
- [CTA](/docs/runes/cta)
- [Feature](/docs/runes/feature)
- [Steps](/docs/runes/steps)
- [Pricing](/docs/runes/pricing)
- [Comparison](/docs/runes/comparison)
- [Bento](/docs/runes/bento)

**@refrakt-md/learning**
- [How-to](/docs/runes/howto)
- [Recipe](/docs/runes/recipe)

**@refrakt-md/docs**
- [Changelog](/docs/runes/changelog)

**@refrakt-md/business**
- [Cast](/docs/runes/cast)
- [Organization](/docs/runes/organization)
- [Timeline](/docs/runes/timeline)

**@refrakt-md/places**
- [Event](/docs/runes/event)
- [Itinerary](/docs/runes/itinerary)

**@refrakt-md/media**
- Music Playlist
