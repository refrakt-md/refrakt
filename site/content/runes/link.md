---
title: Link
description: A link around any content — a word in a sentence, or a whole block made clickable without nesting links
category: Content
plugin: core
status: stable
type: rune
---

# Link

`{% link %}` is a link written as a tag. Inside a line of text it is an ordinary `<a>`, the same as `[text](url)`, useful when the target is a variable. Around blocks it makes the whole region a link — a figure, a hint, a heading and its paragraph — and works out how to do that without nesting one link inside another.

## Inline

In a line of text the tag renders a plain `<a>`. Its main use is in templates, where the target comes from a variable:

```md
Read {% link href=$item.url %}{% $item.data.title %}{% /link %} next.
```

## Around blocks

{% preview source=true %}

	{% link href="/runes/card" %}
	## Card

	A generic content card with an optional whole-card link.
	{% /link %}

{% /preview %}

How the region becomes a link depends on what it holds:

- **Nothing interactive inside** — the region is wrapped in a real `<a data-link="wrap">`.
- **Links or controls inside** — an `<a>` around them would nest interactive content, which is invalid HTML. A stretched `<a data-link="stretch">` is laid over the region instead, and the inner links stay clickable above it. This is the same overlay a [`card`](/runes/card) with `href` uses.

{% preview source=true %}

	{% link href="/runes/figure" %}
		{% hint type="note" %}
		The whole hint opens the figure page, and [this link](/runes/hint) still opens the hint page.
		{% /hint %}
	{% /link %}

{% /preview %}

The choice is made when the page is rendered, after the cross-page build has run, so links added late — entity cross-links, resolved [`xref`](/runes/xref)s — are taken into account.

Links, buttons, form controls, `details`, embedded media and interactive runes such as [`tabs`](/runes/tabs) all count as interactive.

## Accessible name

The link is a real, focusable link with one tab stop. It is named, in order:

1. by `aria-label`, when you give one;
2. else by the content's title — its `title`, `headline` or `name` slot, or else its first heading — through `aria-labelledby`;
3. else by the content's text, up to 120 characters.

A wrapped link reads its content as its name already; the order above matters for the stretched link, which has no text of its own.

## Empty `href`

An empty `href` renders the content unchanged, with no link. A template can write `{% link href=$item.url %}` around a block without first checking that the entry has a URL.

## Structured data

`link` adds no `data-rune` of its own, so it is not a boundary for the structured data inside it. A [`character`](/runes/storytelling/character) inside a link still publishes as a `Person`.

## Output contract

Wrapped:

```html
<a href="/guide" data-link="wrap">
  <h2>The guide</h2>
  <p>Read it first.</p>
</a>
```

Stretched over one rune, inside its root with the rune's BEM element class:

```html
<section class="rf-hint …" data-rune="hint">
  …
  <a href="/post" data-name="link" data-link="stretch" class="rf-hint__link" aria-label="…"></a>
</section>
```

Stretched over anything else, inside a host element:

```html
<div data-link="host">
  <h2 id="the-guide">The guide</h2>
  <p>See <a href="/index">the index</a>.</p>
  <a href="/guide" data-name="link" data-link="stretch" aria-labelledby="the-guide"></a>
</div>
```

Themes style these through `[data-link]`: the skeleton positions the stretched link over its host, and Lumina resets the wrapped link's colour and underline and draws the focus ring.

## Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `href` | `string` | — | The link target. Missing or empty renders the content unlinked. |
| `title` | `string` | — | The link's `title`, inline form only. |
| `aria-label` | `string` | — | The accessible name of a link around blocks, used before the content's title. |
