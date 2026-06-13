{% spec id="SPEC-105" status="draft" tags="motion,animation,lumina,engine,behaviors,runes,a11y,dimensions,dx" %}

# Scroll-reveal motion — a token-driven entrance dimension

refrakt can compose elaborate *backdrops* (`bg`, substrate, cover) but has no
vocabulary for **choreography** — how a section arrives. Add a **motion dimension**:
a small, closed, author-facing `reveal` vocabulary that declares the *intent* of an
entrance (a section fades in; feature items slide in as they scroll into view), with
the theme owning the *choreography* and an `IntersectionObserver` behaviour owning the
*timing trigger*. Motion is opt-in, token-driven, and enhancement-gated so the static
page is always complete.

Target: next minor.

## Motivation

You can build a live three.js backdrop, but you can't fade a hero in or stagger a
feature grid as it scrolls into view. The pieces to do it *coherently* already exist:

- **The `dimensions/` system** — refrakt already models cross-cutting, token-driven,
  `data-*`-keyed concerns as "dimensions" (`packages/lumina/styles/dimensions/state.css`
  toggles open/closed/active off `data-state`). **Motion is a new dimension**, not a
  per-rune feature.
- **The reduced-motion baseline (WORK-352)** — `global.css` already neutralises *all*
  animation/transition durations to `0.01ms` under `prefers-reduced-motion` (not `none`,
  so `transitionend`/`animationend` still fire for awaiting JS). New motion inherits this
  guard for free.
- **The progressive-enhancement behaviours** — tabs/accordion/datatable/form already
  establish the framework-agnostic JS home; a `reveal` observer joins them.

## Principle

The division that keeps motion from leaking author concerns into theme concerns:

- **Author declares *intent*** — `reveal="fade"`, `stagger` — a coarse, per-section
  character. Never how far, how fast, or which part moves.
- **Theme owns *choreography*** — what moves, in what order, distance, easing, sync vs
  offset — expressed in CSS over the rune's **named BEM anatomy** (`.rf-feature__content`,
  `__media`, …) it already styles. Two themes render the same `reveal="fade"` differently
  (whole-section in sync vs content/media slightly offset) with no author change.
- **The behaviour owns *when*** — an `IntersectionObserver` flips one `data-in-view` state
  on the container. Theme-agnostic; **JS = when, CSS = how.**
- **The shared vocabulary is the contract** — a closed named set with a documented
  *character* per value; themes vary the choreography but must preserve the character
  (a `fade` reads as a fade everywhere).

## Design

### 1. The `reveal` vocabulary (closed, author-facing)

A bounded `matches` set on the `reveal` modifier — an unknown value is a build error,
keeping the author↔theme contract enforceable.

| Value | Character the theme **must** preserve | Theme is free to vary |
|---|---|---|
| `none` | No entrance (the default / opt-out). | — |
| `fade` | Opacity-led: `0 → 1`. | Subtle movement, per-part sync/offset, duration/easing |
| `slide` | Movement-led: translation into place **+** opacity. | Axis, direction, distance (often layout-derived), easing, offset |
| `scale` | Scale-led: slightly `<1 → 1` **+** opacity. | Start scale, transform-origin, easing, offset |
| `blur` | Focus-led: `blur → sharp` **+** opacity. | Blur amount, easing; **may downgrade to `fade`** under perf/reduced constraints |

- **Direction is deliberately not in the vocabulary.** `slide` means "enters from a
  theme-chosen offset"; the theme derives the axis (often from the rune's layout —
  media from its side, content from its side, reading-direction aware). A future optional
  logical `reveal-from="bottom|top|start|end"` *hint* (theme may honour or override) is a
  v2 escalation, not v1.
- **`blur` carries a documented downgrade** — it animates `filter` (not a compositor-cheap
  property), so a theme or a low-power/reduced path may render it as `fade`.

### 2. `stagger` — an orthogonal timing modifier

`stagger` is **not** a character; it composes with any value (`reveal="slide" stagger`)
and governs whether a container's children arrive together or in a cascade.

- The engine stamps `--rf-reveal-index` (0,1,2,…) on each child; the theme turns it into a
  per-child delay against a **stagger-interval token**
  (`animation-delay: calc(var(--rf-reveal-index) * var(--rf-reveal-stagger))`), measured
  from the container's single in-view trigger (not per-child observation — see Non-goals).
- **Multi-child only** — meaningful on `feature`/`bento`/`steps`/`pricing`/playlist tracks;
  a **silent no-op** on single-child runes (`hero`). The theme owns the rhythm and order
  (a grid theme may read the index as a diagonal/column sweep, not strict source order).

### 3. Layer 1 — engine config (the intent → data attributes)

A shared `reveal`/`stagger` modifier on section-level runes (`hero`, `feature`, `bento`,
`cta`, `card`, `steps`, `pricing`, `testimonial`, `playlist`, …) — a cross-cutting facet
like `media-position`/`tint`, configured once, not per rune. It emits:

- `data-reveal="<value>"` on the rune root,
- `data-stagger` when set,
- `--rf-reveal-index` on each enumerated child (the engine already enumerates children for
  numbered sequences, so index assignment is free).

No new structure is required: the theme choreographs over the **named anatomy the engine
already emits**, so enabling theme choreography costs only these attributes.

### 4. Layer 2 — the motion dimension CSS (the choreography)

A new `dimensions/motion.css` (+ motion tokens in `tokens/`) defines, per character, the
keyframes/transitions keyed on `data-reveal` × `data-in-view`, plus the stagger delay.
The theme owns the **physics tokens** — duration, easing, travel distance, scale start,
stagger interval — so a "calm" theme and a "punchy" theme differ purely by retuning
tokens, like spacing/radius scales. Choreography across named parts (`__content`/`__media`
offset) lives here too.

### 5. Layer 3 — the `reveal` behaviour (the trigger)

A tiny `IntersectionObserver` behaviour (joining tabs/accordion/datatable/form):

- Observes each `[data-reveal]:not([data-reveal="none"])` container; on first intersection
  it sets `data-in-view` and **unobserves** it.
- Honours `matchMedia('(prefers-reduced-motion: reduce)')` — marks everything in-view
  immediately (belt-and-braces with the global reset).
- Theme-agnostic: it sets one state attribute and nothing else.

### 6. Enhancement gating — the static page is always complete

The cardinal rule (and the classic scroll-reveal footgun avoided): **SSR / no-JS /
crawler / reduced-motion render the fully visible final state.** Never bake `opacity: 0`
into SSR HTML that only JS removes.

- The hide-then-reveal CSS is scoped under a **root `data-animate` flag the behaviour adds
  on boot**. No flag (no JS) → every section fully rendered, no motion. With the flag,
  `[data-reveal]:not([data-in-view])` holds the pre-entrance state until the observer
  fires.
- Reuses the WORK-352 global reduced-motion reset; animates **compositor-only properties**
  (`opacity`/`transform`), `blur` being the documented exception that may downgrade.

### 7. Defaults

`reveal` defaults to `none` — no surprise motion; the author opts a section in. A theme
**may** set per-rune defaults via config (e.g. `hero` → `fade`), but the safe baseline is
opt-in.

## Acceptance Criteria

- [ ] A closed `reveal` modifier (`none|fade|slide|scale|blur`, default `none`, unknown =
  build error) is available on section-level runes as a shared engine facet; it emits
  `data-reveal` on the root and `--rf-reveal-index` on enumerated children.
- [ ] `stagger` is an orthogonal modifier composing with any character; it emits
  `data-stagger`, is a silent no-op on single-child runes, and drives a per-child delay
  from `--rf-reveal-index` against a theme stagger-interval token.
- [ ] A `dimensions/motion.css` + motion tokens define each character keyed on
  `data-reveal` × `data-in-view`; the theme owns duration/easing/distance/scale/stagger as
  tokens, and may choreograph across a rune's named parts (sync or offset) without author
  input.
- [ ] An `IntersectionObserver` `reveal` behaviour sets `data-in-view` on first
  intersection and unobserves; under `prefers-reduced-motion` it marks all in-view
  immediately.
- [ ] **Enhancement gating:** SSR/no-JS/crawler render the fully visible final state (no
  `opacity:0` baked in); the pre-entrance state is scoped under a root `data-animate` flag
  the behaviour adds on boot; the WORK-352 reduced-motion reset still neutralises motion.
- [ ] `blur` documents (and a theme may apply) a downgrade to `fade`; all other characters
  animate compositor-only properties.
- [ ] Docs: a theme-authoring **motion dimension** page (the vocabulary, the character
  contract, the physics tokens, choreography over named parts) and an author-facing
  `reveal`/`stagger` reference with a feature-stagger example; contracts regenerated and
  CSS coverage passes for the new selectors.

## Non-goals

- **A timeline / keyframe authoring system in Markdown**, or raw inline CSS animation —
  the author surface is the closed vocabulary + `stagger`, nothing finer.
- **Animate-by-default** — opt-in only (theme may set per-rune defaults).
- **Direction in the vocabulary** — `slide` is theme/layout-derived; an optional
  `reveal-from` hint is a deferred v2 escalation.
- **Per-part scroll triggers** — one container-level trigger + CSS delay covers "slightly
  out of sync"; parts triggering at genuinely different scroll positions is deferred.
- **CSS scroll-driven animation (`animation-timeline: view()`)** — IO is the v1 baseline
  (universal, controllable); scroll-driven CSS is a later zero-JS progressive upgrade where
  supported.
- **Page/route transitions, parallax, scroll-linked continuous animation** — this spec is
  discrete entrance reveals only.

## Work breakdown (provisional)

1. **Engine facet** (§3) — shared `reveal`/`stagger` modifier, `data-reveal`/`data-stagger`,
   `--rf-reveal-index` child enumeration; `matches` validation.
2. **Motion dimension CSS + tokens** (§4) — `dimensions/motion.css`, per-character
   keyframes/transitions, motion tokens, stagger delay.
3. **`reveal` behaviour + enhancement gating** (§5–§6) — IO observer, `data-in-view`,
   root `data-animate` boot flag, reduced-motion path.
4. **Docs + showcase** (§7) — theme-authoring motion-dimension page, author `reveal`
   reference, a feature-stagger demo.

## References

- The dimension precedent (`data-state` toggled by behaviours, read by the theme): `packages/lumina/styles/dimensions/state.css`; theme-authoring dimensions doc `site/content/extend/theme-authoring/dimensions.md`.
- Reduced-motion baseline this builds on: {% ref "WORK-352" /%}; `packages/lumina/styles/global.css`.
- Behaviour-package home + progressive-enhancement pattern: `packages/behaviors/src/` (tabs/accordion/datatable/form).
- Engine modifier + child enumeration: `packages/transform/src/engine.ts`, `packages/runes/src/config.ts`.
- Named-set / token-discipline convention this follows: {% ref "SPEC-088" /%} (bounded facets vs escape hatch), {% ref "SPEC-086" /%} (named scales).

{% /spec %}
