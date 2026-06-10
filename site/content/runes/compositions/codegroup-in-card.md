---
title: Code-sample card
description: A codegroup in a card's media zone — a titled, tabbed snippet presented as a card.
---

# Code-sample card

A `{% codegroup %}` in a card's media zone is a code-sample card: the tabbed snippet up top, a title and blurb below. No bespoke "code card" rune — a plain `card` with a code guest.

{% preview source=true %}

{% card %}
{% codegroup %}
```js
export const sum = (a, b) => a + b;
```
```py
def sum(a, b): return a + b
```
{% /codegroup %}

---

### Tiny utilities
A starter kit of one-liners.
{% /card %}

{% /preview %}

## How it works

The zone before the `---` is the card's **media zone**. The media-zone contract sizes and clips any guest name-agnostically, so a `codegroup` presents like an image would. With no `href` the tabs stay interactive; a linked card demotes them to a static fallback so the whole tile clicks through (the [interaction-posture contract](/extend/rune-authoring/composability#media-guest-interaction-posture)).

## See also

- [card](/runes/card) · [codegroup](/runes/codegroup)
- [Composability contract](/extend/rune-authoring/composability) — the media-zone model.
