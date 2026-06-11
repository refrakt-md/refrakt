---
title: Composability Contract
description: How runes nest and compose — the open-world contract every rune participates in
---

# Composability Contract

Runes are designed to nest. A `sandbox` sits inside a `juxtapose`; a `map` drops
into a `card`'s media slot; a `hint` adapts when it lives in a `hero`. This page
describes the **contract** that makes composition predictable — and, crucially,
one that holds up in an **open plugin ecosystem** where third parties add runes
neither side knows about.

This is the *how it works* reference. For a catalogue of concrete, ready-to-copy
patterns, see [**Media guests**](/runes/media-guests).

## The governing principle: dependency asymmetry

Composition dependencies point **one way**. The composing party always knows what
it composes with; the composed-with party never needs to know its consumers. A
child knows its parent; an open container knows nothing about its children.

So **every composability fact is self-declared by the party that holds the
knowledge, pointing outward** — never enumerated centrally, and never declared by
the open container. This is the only model that survives third-party runes on
both sides of a nesting. There is no global "who may nest in whom" registry, and
no container-side allow-list.

## Two relationships, only one of them validates

**1. Strict structural children.** Runes like `accordion-item`, `tab`, `step`,
`tier`, `map-pin`, and `bento-cell` are *meaningless* outside their parent — and
they always ship in the same plugin as that parent. Such a rune self-declares the
requirement:

```ts
// in the rune's engine config
MapPin: { block: 'map-pin', parent: 'Map', requiresParent: 'Map' }
```

`requiresParent` is the **only** nesting fact the validator consults. At build
time, a rune that declares `requiresParent: X` but does not have `X` as its
nearest ancestor rune is reported:

- an **error** for the structurally-meaningless set (output is broken without the
  parent), and
- a **warning** otherwise (renders, but off-contract).

A third party writing their own child→parent pair declares it identically, with
zero knowledge of our ecosystem — including a child that requires *our* published
parent (`requiresParent: 'Map'`).

> `parent` vs `requiresParent`: `parent` is an **advisory** grouping hint (a rune
> may declare a typical `parent` yet still be valid standalone, like `track`).
> `requiresParent` is a **hard** constraint that opts the rune into validation.
> A rune is validated *only if* it opts in — open composition is unrestricted.

**2. Open composition.** Containers like `card`, `feature`, `hero`, `bento`, and
`gallery` are **open by default**: any rune may flow in, and there is nothing to
validate. The only thing on offer is *optional, additive adaptation* (styling) —
never permission.

## Styling follows the same asymmetry

A container can't style a third-party guest it has never heard of, but it can
adapt its **slot**, name-agnostically. Any rune dropped into a media zone is
sized, clipped, and centred by one rule — there is no per-guest CSS:

```css
[data-section="media"] { container-type: inline-size; overflow: hidden; border-radius: …; }
[data-section="media"] > * { width: 100%; max-height: 100%; }
```

The container adapts the zone; the guest fills it. Guests that manage their own
bleed or interactive chrome (e.g. `preview`, `juxtapose`, a bleeding `showcase`)
**self-declare an opt-out** so their displacement isn't clipped — again, the
knowledge sits with the guest, not the container.

## When to reach for a context modifier

A `contextModifier` is the hook for a guest that wants a *specific* visual
adaptation when nested in a *known* parent — declared on the adapting rune (the
one with the knowledge):

```ts
Hint: { block: 'hint', contextModifiers: { hero: 'in-hero', feature: 'in-feature' } }
// → `.rf-hint--in-hero` when a hint is inside a hero
```

Reach for one only when the slot-level adaptation above isn't enough. Every
declared context modifier must describe a meaningful adaptation **and** have CSS
coverage — declaring `{ parent: 'in-parent' }` with no `.rf-block--in-parent`
rule is a dead modifier.

## Capabilities — the future generalization

Concrete rune *names* cover every real case today (strict children co-ship with
their parents). The deferred generalization is **capability tokens** — a child
requires a capability (`tab-container`) and any container that `provides` it
satisfies the requirement, by capability rather than name. Named `requiresParent`
ships first.

## Media-guest interaction posture

A rune dropped into another rune's **media slot** (a `card`, `bento-cell`,
`recipe`, … media zone) is a *guest*. Guests are **presentational by default** —
"media slot" means display, so interactivity is the exception. Interactivity is
an explicit guest capability: the behaviour-driven runes (`codegroup`, `tabs`,
`datatable`, `form`, `map`, `sandbox`, `juxtapose`) declare `interactive: true`
in their config, and the engine reads it.

The governing rule: **an interactive guest is mutually exclusive with a clickable
container.** When the container is itself an interaction target, the guest yields:

- **`href` wins.** A `card`/`bento-cell` with `href` is one stretched whole-tile
  link; its media guest is demoted — the engine marks the media zone
  `data-guest-posture="presentational"`, which sets `pointer-events: none` (so
  clicks fall through to the link, no dead zones) and tells the behaviours layer
  to skip enhancement, so the guest renders its **static fallback** instead of
  live controls. Chosen over the inverse because a linked tile is the more common
  intent and the safer a11y default — one unambiguous target, no nested
  interactive-in-a-link.
- **Cover is always a backdrop.** In [`media-position="cover"`](/runes/card#cover-mode)
  the guest sits behind the content overlay, so it is `pointer-events: none`
  regardless of `href` — you don't pan the map behind the title.
- **Scoped to the media guest only.** The demotion never touches authored content
  controls — a "Follow" button or inline link in the body/footer (the lifted
  `z-index` layer above the stretched link) stays fully interactive.
- **A plain container hosts guests normally.** A `card`/`bento-cell` *without*
  `href` (and not `cover`) is the one configuration where a media guest is
  interactive.

An interactive guest in a *linked* tile emits a build warning — *"interactive
guest in a linked tile — its controls are inert; drop `href` or the
interactivity"* — but still renders presentationally; the warning is
informative, not fatal. Interactive full-bleed widgets with their own overlaid
UI (an app dashboard) are explicitly out of scope for a content card.

## Tooling

`refrakt inspect <rune>` surfaces a rune's composability contract — its
`requiresParent` requirement and its `contextModifiers`.

`refrakt inspect <rune> --audit` (or `--all --audit`) reports **context-modifier
CSS coverage**: every declared `.rf-block--modifier` selector is checked against
the theme CSS, so a declared-but-unstyled context modifier shows as `NOT STYLED`.

`requiresParent` **violations are reported at build time** — the identity
transform validates nesting as it runs, emitting the warning/error described
above with the rune and its actual parent context.

## See also

- [**Media guests**](/runes/media-guests) — the catalogue of media-zone composition patterns.
- [Patterns & Best Practices](/extend/rune-authoring/patterns) — child-item rune patterns.
