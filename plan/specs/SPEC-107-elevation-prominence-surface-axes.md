{% spec id="SPEC-107" status="accepted" tags="theme,surface,elevation,prominence,css,architecture,dx" %}

# Elevation, prominence & the surface-axis decomposition

An **amendment to {% ref "SPEC-094" /%} §8** ("Surface as engine-emitted config"). §8
established that the surface dimension (`card | banner | inline | inset`) is the lone
holdout that still falls back to rune-name selector lists in `surfaces.css`, and resolved
to emit it from engine config as `data-surface`. This spec keeps that goal — kill the
static rune-name lists, make the rune→treatment assignment theme-overridable config — but
revises **what the axes are**. It decomposes the single "surface" enum into orthogonal
axes, gives the chrome axis an ordered depth vocabulary, and adds a `prominence` axis that
§8 explicitly deferred. The motivating use case: the same `recipe` should read as a
bordered card mid-prose and as a full-bleed, large-title hero at the top of a page —
without forking the rune.

## Why decompose `surface`

§8's four buckets each bundle several independent decisions:

- **`card`** = a surface fill + radius + a lift (shadow).
- **`banner`** = full-bleed **width** + a loud header.
- **`inline`** = no surface chrome + a quiet header.
- **`inset`** = a recessed surface.

So "surface" silently conflates three concerns: **chrome** (is there a fill/border/shadow,
and how lifted?), **width** (contained vs full-bleed), and **header emphasis** (loud vs
quiet). That conflation is exactly why §8 read `prominence` as "redundant with surface
(banner = loud, inline = quiet)" — under a single enum it *is* redundant. Pulled apart, the
three are independent and compose: a recipe-as-hero is `chrome: none` **+** `width: full`
**+** a loud header — a combination the four-bucket enum cannot express, and which authors
currently cannot reach at all.

This decomposition also sharpens §8's own axis criterion ("one concern per axis"): a single
`surface` enum violates it; three orthogonal axes honor it.

## Design

Three axes, each an ordered, **semantic** scale. The value names express *intent*; the
theme (skin) owns the actual paint and may interpret, clamp, or no-op a value where its
house style demands. All three default **per rune via the theme's `RuneConfig`** and are
overridable per instance and via region/context cascade.

### 1. `elevation` — the chrome / depth axis (universal)

Replaces both §8's `surface` enum and today's separate shadow-only `elevation`
(`none | sm | md | lg`). A single **signed depth ladder**, from recessed through on-plane
to lifted; surface *presence* is just the low end of the scale:

| Value | Intent | Lumina (illustrative — skin's call) | Subsumes |
|-------|--------|--------------------------------------|----------|
| `sunken` | Recessed *into* the page (a well) | Inset shadow / slightly darker fill, radius | §8 `inset` |
| `flush` | No surface — content sits on the bare page | No fill/border/shadow/radius | §8 `inline`; the hero base |
| `flat` | A surface with a boundary, no lift | Fill *or* hairline border (skin's choice), radius | `elevation=none` |
| `raised` | The default lifted card | Fill + radius + soft shadow | §8 `card`; `elevation=sm/md` |
| `floating` | Pronounced lift — hovers above | Stronger shadow | `elevation=lg` |
| `overlay` *(optional)* | Above everything — true overlays | Max shadow | drawer/menubar panels |

Universal: every block rune has chrome (or its absence), so `elevation` applies everywhere.
The engine emits `data-elevation`; skins target `[data-elevation="raised"]` instead of
enumerating rune names. Whether `raised` is borderless-with-shadow or bordered-flat is the
skin's interpretation, not the axis's contract.

**Relationship to `frame-shadow` ({% ref "SPEC-086" /%}).** Lift already partly lives in the
frame system: `data-frame-shadow` paints a per-instance `drop-shadow()` filter (its own
`none|sm|md|lg` scale) on framed guests. The two are distinct and both kept — the boundary
must be written down or they will drift:

- **`elevation` owns the rune surface's *resting depth*** — the `box-shadow` on the rune's
  own surface (does this card sit flat, or float?).
- **`frame-shadow` owns *per-guest* media drop-shadows** — e.g. a displaced image peeking
  out of a card's media well.

`frame-shadow` keeps its own `none/sm/md/lg` scale and is **not** renamed by this spec; only
the rune-surface `elevation` scale migrates. The single depth ladder deliberately collapses
(chrome-presence × lift) to one line; where an author needs an off-diagonal a ladder can't
express — a borderless element that still casts a shadow — that is a `frame`/`frame-shadow`
concern, not an elevation rung.

### 2. `width` — the layout axis (interpreter is the layout, not the skin)

§8's `banner` was a **width** decision wearing a surface label. It moves to the existing,
already-config `width` axis: a full-bleed section is `width: full` (which `cta` already
defaults to). `elevation` never carries width; this keeps the depth ladder from rotting
back into a grab-bag.

But `width` is a **different kind of axis** from elevation/prominence, and the spec is
explicit about it. Elevation and prominence are **surface** axes — self-contained rune
chrome the *skin* interprets; a card looks like a card in any layout. `width` is a
**rune↔layout contract**: the rune (or its default) declares *intent* via `data-width`, and
the **layout** owns what that intent means. Today `layouts/default.css` and
`layouts/docs.css` interpret the same `data-width="wide"`/`"full"` value *differently* (docs
maps it onto a named `wide` grid track — a preview breaks out of the docs reading column
because its `defaultWidth: 'wide'` meets that track, with no author involvement). A layout
with no wide track simply renders `full` at container width; nothing breaks.

So the model is **two layers**:

- **Surface axes** — `elevation`, `prominence` — author-overridable intent, *skin*-interpreted.
- **Layout axis** — `width` — author-overridable intent, *layout*-interpreted; its per-rune
  `defaultWidth` is an intent the layout may reinterpret.

`hero = flush + full + display` therefore deliberately spans both layers. All three are
author-overridable with per-rune defaults; what differs is **who realizes the value** — the
skin for elevation/prominence, the layout for width.

### 3. `prominence` — header emphasis (page-section **family**, not universal)

The axis §8 deferred. `prominence` scales a rune's **page-section header** — eyebrow /
title / blurb / surrounding rhythm — selecting its typographic register (pairs with the
type tokens from {% ref "SPEC-094" /%} Tier 1; the top rung is the display family):

| Value | Intent |
|-------|--------|
| `quiet` | De-emphasized header — a section-rune embedded in prose that shouldn't shout |
| `normal` | Default header treatment |
| `prominent` | Featured — louder than default |
| `display` | Banner / hero register — display type, generous rhythm |

**Availability is gated by structure, magnitude by the theme.** Unlike `elevation`,
`prominence` is *not* universal: it applies only to runes that carry the page-section
header model (the cluster already sharing `pageSectionProperties` / `sections: { preamble,
headline, blurb }` — `recipe`, `hero`, `cta`, `section`, `feature`, `budget`, `cast`,
`comparison`, …). A `badge`/`progress`/`chart` has no header to scale, so it does not expose
the attribute (the schema rejects it with a clear message). Within the family, the skin
still owns the degree — it may under-emphasize or effectively ignore `display` where its
house style says a giant title is wrong. This is the principled middle between a
hand-maintained allowlist and a universal-but-mostly-no-op axis.

**Why an independent axis, not derived.** Two cheaper-looking alternatives were considered
and rejected, both because the off-diagonal combinations are mainstream rather than edge
cases:

- *Derive prominence from chrome + width* ("a flush full-bleed section just renders a big
  title") couples the axes and forbids a **prominent card** or a **quiet flush strip**.
- *Derive width from prominence* ("`display` ⇒ full-bleed") forbids the **editorial article
  header** — a display-scale headline over a body held to a readable measure (`display`
  prominence **+** `narrow`/`contained` width), the signature move of the very editorial /
  magazine themes this epic targets — and the reverse, a **wide but quiet** full-bleed image
  strip.

The loud↔wide correlation is real, but it belongs in **per-rune defaults** (a theme may
default `hero` to `{ width: full, prominence: display }`), never in a derivation rule —
defaults stay overridable, derivation forbids the exceptions. General principle:
**correlated axes are defaulted together, never derived from each other, whenever their
off-diagonal combinations are real.** For prominence × width they are not just real, they
are the editorial brief, so the axes stay independent.

### 4. Per-rune defaults via theme `RuneConfig`

The rune ships no presentation opinion; the **theme** sets `defaultElevation` and
`defaultProminence` per rune in its `RuneConfig`, alongside the existing `defaultWidth` /
`defaultDensity`. This is what **supersedes the static `surfaces.css` rune-name lists** —
the four hardcoded buckets become data-driven defaults:

```
// Lumina config (illustrative)
Chart:   { defaultElevation: 'sunken'  }
Recipe:  { defaultElevation: 'flat'    , defaultProminence: 'normal'  }
Card:    { defaultElevation: 'raised'  }
Hero:    { defaultElevation: 'flush'   , defaultProminence: 'display' , defaultWidth: 'full' }
CallToAction: { defaultElevation: 'flush', defaultProminence: 'prominent' }
Drawer:  { defaultElevation: 'floating' }
```

Because defaults live in theme config, a magazine theme can default `recipe` to `flush`
while Lumina keeps it `flat` — same content, different house style. Note the synthesis on
prominence: with `Hero: { defaultProminence: 'display' }`, an author **never writes
`prominence` on a hero** (its default is already the top rung), so in practice "a hero is
always prominent, no attribute" falls out for free — while the knob still exists for a
*compact hero* (`prominence="normal"`) or the *recipe-as-hero* (`prominence="display"` on a
rune whose default is `normal`).

### 5. Migration off the old `elevation` scale

The breaking change is the `elevation` value rename. Mapping (note the trap):

| Old | New | Note |
|-----|-----|------|
| `none` | `flat` | ⚠️ `none` means "keep the surface, drop the shadow" — that's `flat`, **not** `flush`. Mapping to `flush` would wrongly strip the surface. |
| `sm` | `raised` | |
| `md` | `raised` | |
| `lg` | `floating` | |
| — | `flush`, `sunken` | net new |

Mechanism mirrors {% ref "SPEC-086" /%}'s deprecation alias (`shadow` → `frame-shadow`,
console-warn) and the rune-schema `deprecations: { newName, transform }` field: ship an
alias map that resolves + warns the old values for one minor, then remove. A
`refrakt`-side codemod rewrites authored `elevation="none|sm|md|lg"` in content; the
template/site content and docs are migrated in the same work. Only the rune-surface
`elevation` scale is migrated — `frame-shadow`'s identically-named `none/sm/md/lg` scale is
a separate axis (§1) and is left untouched.

## Relationship to SPEC-094 §8 (what this amends)

- **Keeps** §8's intent: the chrome assignment becomes engine-emitted config (`data-*`),
  theme-overridable per rune; the static `surfaces.css` rune-name lists are retired; the
  bucket→treatment stays skin.
- **Changes** §8's *vocabulary*: `data-surface = {card,banner,inline,inset}` → an ordered
  `data-elevation` depth ladder; folds the separate shadow-`elevation` modifier into it
  (the breaking rename above); hands `banner` to the `width` axis.
- **Overrides** §8's deferral of `prominence`: §8 judged it redundant *because surface was
  one enum*. Decomposed, header-emphasis is a distinct concern nothing else carries, so it
  earns an axis — built here, gated to the page-section family to bound its combinatorial
  cost (it adds variants only on header-bearing runes, not all 100+).
- Still satisfies §8's axis criterion: each axis is a small closed set, bucket→treatment is
  skin while rune→default is a theme call, and CSS cannot express the assignment without
  enumerating rune names.

## Implications

- **Breaking** on `elevation` values; covered by aliases + codemod + a changeset. `releases.md`
  is historical and left as-is.
- **Site + docs must be updated**: `surfaces.md` (the canonical surfaces reference — a
  rewrite), `figure.md`, `card.md`, `bento.md`, and `theme-authoring/dimensions`.
- The gallery's `UNIVERSAL_AXES` already includes `elevation`; variant cells pick up the new
  rungs automatically, and `prominence` joins as a family-scoped axis.
- Validated by the {% ref "WORK-410" /%} skeleton/skin spike (it already probes `data-surface`
  + the cut line) and demonstrated on the original use case (a full-bleed hero `recipe`).

## Acceptance Criteria

- [ ] `elevation` is a universal axis with the ordered set `sunken | flush | flat | raised | floating` (+ optional `overlay`), emitted as `data-elevation`; skins target the attribute, not rune-name lists.
- [ ] Today's `elevation` values (`none/sm/md/lg`) are migrated per the mapping, with a deprecation alias (warns) and a content codemod; `none` maps to `flat`, never `flush`.
- [ ] `width: full` carries full-bleed; the `banner` surface bucket is removed in favor of it. `width` stays author-overridable but is realized by the **layout** (named tracks), not the skin.
- [ ] The `elevation` ↔ `frame-shadow` boundary holds: `elevation` sets the rune surface's `box-shadow` depth; `frame-shadow` ({% ref "SPEC-086" /%}) keeps its own scale for per-guest media drop-shadows and is not renamed or migrated.
- [ ] `prominence` (`quiet | normal | prominent | display`) is available only on page-section-header runes (schema rejects it elsewhere) and emitted as `data-prominence`; the skin owns magnitude.
- [ ] Per-rune `defaultElevation` / `defaultProminence` live in theme `RuneConfig`; the static `surfaces.css` rune-name lists are retired in favor of `[data-elevation]` / `[data-prominence]`.
- [ ] A `recipe` renders as a bordered card by default and as a full-bleed large-title hero via `elevation="flush" width="full" prominence="display"` — verified in the gallery (light + dark).
- [ ] Site content + docs (`surfaces.md` rewrite, `figure`/`card`/`bento`, theme-authoring) are migrated; CSS-coverage + contracts stay green.

## Work breakdown (provisional)

1. **Elevation axis** — engine `data-elevation` emission, the value set, `defaultElevation` config, deprecation aliases for `none/sm/md/lg`.
2. **Prominence axis** — engine `data-prominence`, page-section-family availability gating + validation, `defaultProminence` config.
3. **Lumina mapping** — rungs → chrome, prominence → type register; set per-rune defaults; retire the static `surfaces.css` rune-name lists.
4. **Migration + docs** — content codemod, `surfaces.md` rewrite, migrate `figure`/`card`/`bento` + theme-authoring/dimensions, changeset.
5. **Demonstration** — full-bleed hero `recipe`/`playlist` examples (the original use case) in the gallery + docs.

## References

- Parent / amended: {% ref "SPEC-094" /%} §8 ("Surface as engine-emitted config").
- Migration precedent: {% ref "SPEC-086" /%} (`shadow` → `frame-shadow` deprecation alias).
- `packages/lumina/styles/dimensions/surfaces.css` (the rune-name lists this retires) · `packages/transform/src/engine.ts` (axis emission) · `packages/runes/src/tags/common.ts` (`pageSectionProperties` — the prominence family).

{% /spec %}
