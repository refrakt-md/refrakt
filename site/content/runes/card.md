---
title: Card
description: A generic, self-contained content card — optional media, body, and footer zones, with an optional whole-card link
---

# Card

`{% card %}` is a generic content card: a bordered surface with an optional media zone, a body, and an optional footer. It carries no knowledge of the registry or `$item` — it's a plain presentational component you can drop into prose, or feed from a [`collection`](/runes/collection) body template.

There is one generic `card` (named by *shape*, not by entity) — refrakt deliberately has no `article-card` / `recipe-card` / per-entity card runes. A designed list item is `{% card %}` fed by entity fields, not a bespoke card per type.

{% preview source=true %}

{% card href="/runes/collection" %}
### Collection rune
The plural counterpart to `ref` and `expand` — query the registry and render the results.

---

Core rune · see also `expand`
{% /card %}

{% /preview %}

## Zones

The body divides on `---` (a horizontal rule) into up to three zones — here all three, with a real cover image:

{% preview source=true %}

{% card href="/runes/learning/recipe" layout="split" %}
![A tequila sunrise cocktail](https://assets.refrakt.md/tequila-sunrise.png)

---

### Tequila Sunrise
A bright, layered cocktail — five minutes, no shaker.

---

Cocktail · Easy
{% /card %}

{% /preview %}

- **media** (optional, leading zone) — laid out beside the body on wide screens and as a full-bleed header on small screens.
- **body** — the main content.
- **footer** (optional, trailing zone) — a muted meta row.

Zones are assigned by count: **1 zone → body**; **2 → media + body**; **3 → media + body + footer**. To have a footer with no media, lead with an empty zone (`--- body --- footer`).

### The media zone isn't just images

The media zone holds *any* content — it's ordinary markdown, transformed in place. An image is the common case, but a `{% codegroup %}`, a `{% sandbox %}`, a chart, or a video embed work equally well:

````markdoc
{% card %}
```js
export const sum = (a, b) => a + b;
```

---

### Tiny utilities
A starter kit of one-liners.
{% /card %}
````

## Whole-card links

`href` makes the entire card clickable. It's rendered as a stretched-link overlay, so real links inside the body or footer stay clickable too (no invalid nested `<a>`).

```markdoc
{% card href="/guide/getting-started/" %}
### Getting started
Read the five-minute guide.
{% /card %}
```

## Layout

`card` reuses the shared split layout. By default the media zone sits beside the body on wide screens (collapsing to a full-bleed header on narrow screens). The `SplitLayoutModel` attributes are accepted to tune it:

| Attribute | Values | Description |
|-----------|--------|-------------|
| `href` | string | Optional whole-card link target. |
| `layout` | `stacked` \| `split` \| `split-reverse` | Media/body arrangement on wide screens. |
| `collapse` | `sm` \| `md` \| `lg` \| `never` | Breakpoint at which a split collapses to stacked. |

## Feeding a card from a collection

Because the card is plain, a `collection` body template wires entity fields into it — the card neither knows nor cares that it's in a collection:

```markdoc
{% collection type="page" filter="url:/blog/*" sort="date-desc" layout="grid" %}
{% card href=$item.url %}
### {% $item.data.title %}
{% date($item.data.date) %} — {% $item.data.description %}
{% /card %}
{% /collection %}
```

See [collection → per-item templates](/runes/collection#per-item-templates) for the `$item` contract.

## Output contract

```html
<div class="rf-card" data-rune="card" data-layout="stacked" data-media-position="top">
  <div data-section="media" data-name="media">…</div>
  <div data-name="content">
    <div data-name="body">…</div>
    <footer data-name="footer">…</footer>
  </div>
  <!-- only when href is set -->
  <a data-name="link" href="…" aria-hidden="true" tabindex="-1"></a>
</div>
```

The media / content split, responsive collapse, and mobile full-bleed media header all come from the shared `layouts/split.css` (keyed off `data-layout` / `data-section="media"` / `data-media-position`), so `card` ships only its box chrome.

## See also

- [collection](/runes/collection) — feeds cards from registry entities via a body template.
- The `recipe` rune is built on the same split-layout skeleton (media zone + delimited content).
