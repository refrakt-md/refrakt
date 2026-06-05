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
compositions, see [Compositions](/compositions).

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

- [Compositions](/compositions) — the catalogue of concrete composition patterns.
- [Patterns & Best Practices](/extend/rune-authoring/patterns) — child-item rune patterns.
