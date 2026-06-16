---
title: Motion dimension
description: The theme-side motion dimension — the reveal character contract, the physics tokens, the data-reveal × data-in-view choreography, transform composition, and the data-animate enhancement gate (SPEC-105)
---

# Motion dimension (theme config)

Refrakt models scroll-reveal entrances as a **dimension** — a cross-cutting, token-driven, `data-*`-keyed concern, exactly like [state](/extend/theme-authoring/dimensions) or [surfaces](/extend/theme-authoring/surfaces). One stylesheet (`dimensions/motion.css`) choreographs *every* section rune; no rune gains its own motion CSS.

The division of labour is what keeps motion from leaking author concerns into theme concerns:

| Layer | Owns | Where |
|-------|------|-------|
| **Author** | *intent* — `reveal="fade"`, `stagger` | the Markdown (see [Motion](/runes/motion)) |
| **Engine** | the contract — `data-reveal`, `data-stagger`, `--rf-reveal-index` | framework (`@refrakt-md/transform`) |
| **Theme** | *choreography* — what moves, how far, how fast, in what order | `dimensions/motion.css` + tokens |
| **Behaviour** | *timing* — when it fires | `@refrakt-md/behaviors` (`scroll-reveal`) |

**JS = when, CSS = how.** The author never says how far or how fast; the theme never says when. Two themes render the same `reveal="fade"` differently — whole-section in sync, or content and media slightly offset — with no author change.

## The character contract

`reveal` is a closed vocabulary (an unknown value is a build error). Each value names a *character* the theme **must** preserve; everything else is the theme's to vary.

| Value | Character to preserve | Free to vary |
|-------|-----------------------|--------------|
| `none` | no entrance (the default) | — |
| `fade` | opacity-led `0 → 1` | subtle movement, per-part sync/offset, duration, easing |
| `slide` | movement-led: translation into place **+** opacity | axis, direction, distance, easing, offset |
| `scale` | scale-led: slightly `<1 → 1` **+** opacity | start scale, transform-origin, easing, offset |
| `blur` | focus-led: `blur → sharp` **+** opacity | blur amount, easing; **may downgrade to `fade`** |

A `fade` must read as a fade in every theme — that is the author↔theme contract. **Direction is deliberately not in the vocabulary**: `slide` means "enters from a theme-chosen offset", so the theme derives the axis (often from the rune's layout — media from its side, content from its side, reading-direction aware).

## The physics tokens

The theme owns the physics as tokens. A "calm" theme and a "punchy" theme differ purely by retuning these — like a spacing or radius scale. Lumina's defaults:

| Token | Default | Controls |
|-------|---------|----------|
| `--rf-reveal-duration` | `0.9s` | entrance duration |
| `--rf-reveal-easing` | `cubic-bezier(0.16, 1, 0.3, 1)` | entrance easing |
| `--rf-reveal-distance` | `1.5rem` | `slide` travel |
| `--rf-reveal-scale-start` | `0.94` | `scale` entrance start |
| `--rf-reveal-blur` | `8px` | `blur` entrance start (set `0` to downgrade to `fade`) |
| `--rf-reveal-stagger` | `140ms` | per-child cascade interval |

## How the dimension CSS works

The stylesheet keys on **generic hooks**, never a rune's structure, so it covers core, community, and custom runes from one place.

### Root entrance — `data-reveal` × `data-in-view`

The behaviour sets `data-in-view` on a container the first time it scrolls into view. The CSS holds a pre-entrance (hidden) state until then, and transitions to the resting state when it lands:

```css
/* Hidden until in view — gated under the root [data-animate] flag (below). */
[data-animate] [data-reveal="slide"]:not([data-in-view]) {
  opacity: 0;
  translate: 0 var(--rf-reveal-distance);
}
/* The transition plays the entrance as the hidden state reverts. */
[data-animate] [data-reveal]:not([data-reveal="none"]) {
  transition: opacity   var(--rf-reveal-duration) var(--rf-reveal-easing),
              translate var(--rf-reveal-duration) var(--rf-reveal-easing);
}
```

### Transform composition — the critical rule

Reveal animates the **individual `translate` and `scale` properties**, **never** the `transform` shorthand. Lumina already uses `transform` in dozens of files (hover-lifts on `card`/`cta`/`feature`, `frame` displacement, drawer/nav slides). Animating `translate`/`scale` means a reveal *composes with* an existing `transform: scale(…)` hover instead of clobbering it — which is what lets the dimension stay global rather than auditing every rune that already transforms.

> If you write a theme's `motion.css`, hold this line. A single `transform:` declaration in the reveal path will fight every rune hover. Lumina guards it with a test (`motion-compose.test.ts`).

### Stagger — the `--rf-reveal-index` marker

When the author sets `stagger`, the engine stamps `--rf-reveal-index` (`0, 1, 2, …`) on the container's cascade items. The theme turns the index into a per-child delay against the interval token — measured from the container's single in-view trigger, never per-child observation:

```css
[data-animate] [data-stagger][data-in-view] [style*="--rf-reveal-index"] {
  transition-delay: calc(var(--rf-reveal-index) * var(--rf-reveal-stagger));
}
```

Targeting the index marker (`[style*="--rf-reveal-index"]`) rather than a structural `> *` means *which* children cascade is decided in rune config (`RuneConfig.staggerItems`), not in CSS — a grid theme can even read the index as a diagonal sweep.

### Choreography over named parts (opt-in polish)

Because the theme styles the rune's **named anatomy** (`[data-section="media"]`, `.rf-feature__content`, …), it can offset parts for a richer two-beat entrance — strictly optional on top of the working global default:

```css
/* Media arrives a beat behind the content on a sliding section. */
[data-animate] [data-reveal="slide"]:not([data-stagger]) > * > [data-section="media"] {
  transition-delay: 60ms;
}
```

## Enhancement gating — the static page is always complete

The cardinal rule (and the classic scroll-reveal footgun avoided): **SSR / no-JS / crawler / reduced-motion render the fully-visible final state.** Never bake `opacity: 0` into SSR HTML that only JS removes.

The hide-then-reveal CSS is scoped under a **root `data-animate` flag the behaviour adds on boot**. No flag (no JS) → every section fully rendered, no motion. The reduced-motion path reuses the global reset ([WORK-352](/extend/theme-authoring/css)) which neutralises animation/transition durations, and the behaviour also marks everything in-view immediately — so the final state is reached without animation.

## Writing your own

A new theme ships its own `dimensions/motion.css` and reveal tokens. The framework structure (`@refrakt-md/skeleton`) has **no** motion — choreography is wholly skin. The only contract you must honour:

1. Preserve each value's **character** (a `fade` reads as a fade).
2. Animate `translate`/`scale`, never `transform`.
3. Gate the pre-entrance state under `[data-animate]`.
4. Drive stagger off `--rf-reveal-index`.

Everything else — distances, easings, per-part offsets, the cascade rhythm — is yours.
