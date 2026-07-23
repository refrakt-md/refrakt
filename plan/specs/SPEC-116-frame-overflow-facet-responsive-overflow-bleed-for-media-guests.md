{% spec id="SPEC-116" status="shipped" tags="composability,runes,engine,frame,media,behaviors,dx" released-in="v0.24.6" %}

# frame-overflow facet — responsive overflow-bleed for media guests

A media guest whose rendered content is **wider than its frame** — a fixed-width
component, a wide table, a dense dashboard — has nowhere to go on a phone. Today
it is clipped at the frame's rounded inset edge, which reads like a bug, not
intent. The desired affordance: on a narrow viewport, run the overflowing guest's
inline-end out to the **screen** and square those corners, so the component reads
as *cropped by the screen* — a real component at its natural size, continuing
off-frame.

The first implementation (a held sandbox PR) did this as a sandbox-only
`bleed="crop"` attribute. This spec promotes it to a **universal `frame-overflow`
facet** ({% ref "ADR-026" /%}) so every media guest can opt into it
name-agnostically, mirroring the `frame-*` family it belongs to
({% ref "SPEC-086" /%}).

## Overview

`frame-overflow: clip | bleed` — how a media frame handles a guest whose content
exceeds it:

- **`clip`** (default) — current behaviour: the guest is clipped at the rounded
  inset edge of its frame.
- **`bleed`** — on a narrow viewport, run the overflowing guest's inline-end edge
  out to the screen and square those corners. The inline-start stays at the page
  measure, so the component is anchored and runs off the *end*.

**v1 scope:** collapsed/stacked viewport, inline-end only. Anchor-driven bleed
direction (§4) and side-by-side outer-edge bleed (§4) are designed here but
**deferred** — the author surface (`frame-overflow="bleed"`) is chosen to absorb
them without change.

It sits beside the crop-adjacent frame facets — `frame-oversize` ("guest exceeds
its slot"), `frame-anchor` ("crop focal point when the guest is cut"),
`frame-displace`/`-mode` — and `clip|bleed` parallels CSS `overflow`, distinct
from `frame-displace-mode`'s `peek|bleed` (which moves the *whole* guest; this
handles content *wider than* the frame).

## Design

### 1. Policy vs. signal — the core split

The facet works by separating a build-time, guest-agnostic **policy** from a
runtime, per-guest **signal**, which meet in one shared CSS rule.

**Policy (declaration · build-time · guest-agnostic).** `frame-overflow` is a
universal frame facet. `resolveFrameChrome` reads it and emits
`data-frame-overflow="bleed"` on the **frame target** — the host's
`[data-section="media"]` zone. It is the *slot's* policy ("I bleed an overflowing
guest"), independent of what the guest is.

**Signal (activation · runtime · per-guest).** The guest sets `data-overflowing`
on itself when its rendered content exceeds the frame. Each guest type supplies
this however it can:

- `sandbox` → the iframe `ResizeObserver` bridge already reports height; it also
  reports `scrollWidth`, and the behaviour toggles `data-overflowing` with the
  `nextBleedState` hysteresis (the frame widens by the gutter when it bleeds, so a
  single threshold would oscillate; the hysteresis absorbs it).
- `codegroup` / `table` / `datatable` → CSS-detectable; a small shared
  `ResizeObserver` (or a `scroll-state` container query when support lands) sets
  the same flag.
- a guest that cannot measure simply never sets the flag → no bleed, graceful.

The guest reports a **fact** ("I overflow"); the host decides the **policy**. They
are decoupled — a too-wide guest in a `clip` slot stays rounded-and-clipped, and
the *same* guest in a `bleed` slot crops, with zero guest↔host coupling.

**CSS (shared · guest-agnostic).** One rule in the frame/split layer covers every
present and future guest:

```css
@media (max-width: 640px) {
  [data-frame-overflow="bleed"] > [data-overflowing] {
    /* extend to the LAYOUT's outer track edge, never the raw viewport —
       see §5. `--rf-bleed-room-end` defaults to the page gutter. */
    width: calc(100% + var(--rf-bleed-room-end, var(--rf-content-gutter)));
    max-width: none;
    border-start-end-radius: 0;
    border-end-end-radius: 0;
  }
}
```

### 2. Gated by the clip/bleed host axis (`guestFit`)

`frame-overflow="bleed"` can only *do* anything where the media zone is
`overflow: visible` — which is exactly a **bleed host** (`guestFit: 'bleed'` →
hero/feature, whose media zone we already made visible for rune guests). On a
**clip host** (`guestFit: 'clip'` → card, bento-cell, recipe, playlist) the media
zone's `overflow: hidden` and rounded clip neutralise the bleed: the guest stays
clipped to the rounded well, the over-width is simply hidden, no scrollbar, no
shift. So the facet is **self-limiting by construction** — it composes with
`guestFit` without needing to know about it.

Because a silent no-op is a footgun, the engine emits a **hard build warning**
when `frame-overflow="bleed"` lands on a clip host:

> `frame-overflow="bleed"` has no effect on `<rune>` — a clip host crops its media
> guest. Use it on a bleed host (hero, feature), or drop it.

This mirrors the existing frame / interaction-posture build warnings
({% ref "SPEC-090" /%}, `warnFrameNoTarget`).

### 3. Authoring

Canonical is **host/slot-set**, consistent with the rest of `frame-*`:

```markdoc
{% hero frame-overflow="bleed" %}
{% sandbox src="pricing-table" /%}

---

# Our plans
{% /hero %}
```

The host's slot declares the policy; any overflowing guest in it bleeds. Default
`clip` everywhere → no behaviour change.

A **guest-self** route (`{% sandbox frame-overflow="bleed" /%}`) requires giving a
measurable guest `frameTarget: 'self'` so it can carry frame facets on its own
root. That is deferred ({% ref "ADR-026" /%}): it is additive, non-breaking, and
pulls the rest of the frame chrome onto the guest, so it should be a deliberate
later step if the host-set ergonomics bite.

### 4. Direction, `frame-anchor`, and side-by-side (deferred)

`frame-overflow` and `frame-anchor` are complementary answers to "the guest does
not fit": `frame-anchor` is the **focal point the frame keeps** (today
`object-position` on an `object-fit: cover` image/video), and `frame-overflow` is
**clip vs bleed** for a laid-out guest whose content overflows. They act on
different guest kinds (a scaled image never "overflows"; a sandbox is not
`object-fit`'d), so they do not compose on the same guest — but the *author
intent* is shared, which sets up the deferred extensions below.

The author surface is **`frame-overflow="bleed"`** and it is stable across these
extensions — the engine derives direction; the attribute never changes.

- **Bleed direction via `frame-anchor` (deferred).** In a stacked/collapsed
  layout the bled edge is free, so `frame-anchor`'s *inline* keyword chooses the
  **anchored** edge and the opposite bleeds: `start` (default) → bleed inline-end;
  `end` → bleed inline-start; `center` → bleed **both**. This keeps `frame-anchor`
  meaning one thing — "the focal point kept" — for both the `object-fit` crop and
  the overflow bleed. v1 is **inline-end only** (i.e. `bleed` ≡ `bleed-end`); the
  emitted `data-frame-overflow="bleed"` is forward-compatible (direction is added
  later as a resolved edge without changing the author API).

- **Side-by-side bleed (deferred).** In `media-position="start|end"` a too-wide
  guest has an obvious target — the **outer** edge (the side away from content),
  running off the page margin to the screen — and that direction is forced by
  `media-position` (bleeding toward content would collide with it), overriding
  `frame-anchor`. This is arguably the *more* dramatic case (the outer margin is
  large on desktop), but it is more geometry (the media column must escape its
  grid track and the page margin, interacting with `contentMeasure` anchoring), so
  it is out of v1. v1's trigger is therefore the **collapsed/stacked** viewport
  only; the general trigger is "content overflows **and** there is a bleedable
  outer edge."

### 5. Layout-aware bleed boundary — never the raw viewport

The bleed extends to the **current layout's outermost content track**, not the
literal viewport. The two stock layouts differ:

- **Default layout** has a `full` track that *is* the viewport, so a bleed can
  reach the screen edge.
- **Docs layout** has its own grid (`[wide-start] … content … [wide-end]`) with
  **no viewport track** — its widest track is `wide`, bounded inside the content
  column between the sidebar and the TOC. A bleed to the raw viewport would slide
  under the chrome; it must stop at the wide-track edge.

So the bleed extends by a **layout-owned inset** (`--rf-bleed-room-{start,end}`,
defaulting to the page gutter), set by each layout — to the full/viewport edge in
the default layout, to the wide-track edge in docs and any chrome'd layout. This
is the same boundary `width="full"` already honours (a full-width hero in docs
spans the content row, not under the sidebar); the bleed honours it too.

v1's collapsed trigger (≤640px) does not expose the collision — the docs layout
hides the sidebar (≤768px) and TOC (≤1100px) before then, so the content row is
already full-width. But v1 still expresses the bleed against the layout-owned
variable (defaulting to the gutter) so the deferred desktop / side-by-side cases
inherit a correct boundary instead of retrofitting one.

### 6. Sandbox as the first consumer

The held sandbox work becomes the first consumer: keep the overflow measurement +
`nextBleedState` hysteresis + tests; drop the sandbox-only `bleed` attribute; have
the behaviour set `data-overflowing` unconditionally when overflowing (policy now
lives on the host); move the bleed CSS from `sandbox.css` to the shared frame
layer. `codegroup`/`table` follow by adding their own `data-overflowing` signal.

## Acceptance Criteria

- [ ] `frame-overflow` is a universal frame facet (`clip` default | `bleed`), accepted on every content-model schema and resolved by `resolveFrameChrome`, emitting `data-frame-overflow` on the frame target (the host `[data-section="media"]` zone).
- [ ] A shared, guest-agnostic CSS rule bleeds `[data-frame-overflow="bleed"] > [data-overflowing]` on a narrow viewport: inline-end runs to the screen, inline-end corners square, inline-start stays at the page measure. No per-rune bleed CSS. **v1 is inline-end only**; direction (§4) is deferred but the emitted attribute is forward-compatible.
- [ ] A guest signals overflow at runtime by setting `data-overflowing` on itself; the guest reports the fact regardless of host policy, and the policy gates the effect.
- [ ] `sandbox` is the first consumer: its behaviour sets `data-overflowing` from measured content width with hysteresis; the sandbox-only `bleed` attribute is removed (it never shipped).
- [ ] On a clip host (`guestFit: 'clip'`) `frame-overflow="bleed"` is inert (the well clips) **and** emits a hard build warning naming the rune and pointing to a bleed host.
- [ ] The bleed extends to a **layout-owned boundary** (`--rf-bleed-room-*`, default page gutter), never the raw viewport — capped at the content-row's outer track in chrome'd layouts (docs: the wide track inside the sidebar/TOC), matching the `width="full"` boundary. v1 uses the variable seam even though its collapsed trigger does not expose the collision.
- [ ] Default (`clip` / unset) is byte-identical to today for every rune; the bleed is mobile-only and content-gated (a guest that fits stays inset and rounded).
- [ ] Docs: `frame-overflow` in the Surfaces / frame reference; the runtime-gate model documented; the clip-host warning documented.

## Work breakdown (provisional)

1. **Facet plumbing** — `frame-overflow` into `UNIVERSAL_ATTRIBUTE_NAMES`, the frame-facet meta list, and `FramePresetDefinition`; `resolveFrameChrome` reads it and emits `data-frame-overflow`; the clip-host hard warning (gated on `config.guestFit`).
2. **Shared CSS** — the bleed rule in the frame/split layer (skeleton structure + lumina skin); remove sandbox-specific bleed CSS.
3. **Sandbox first consumer** ({% ref "WORK-444" /%}) — behaviour sets `data-overflowing` unconditionally; drop the `bleed` attribute; keep measurement + hysteresis + tests.
4. **Validation + docs** — contract/coverage; reference docs for the facet and the warning.
5. **Generalisation (later)** — a shared overflow signal for `codegroup`/`table`/`datatable`; optional guest-self `frameTarget` route.
6. **Bleed direction (later)** — derive the bled edge from `frame-anchor`'s inline keyword (`start` → end, `end` → start, `center` → both); CSS branches on a resolved edge. The `frame-overflow="bleed"` author API is unchanged.
7. **Side-by-side bleed (later)** — bleed the outer edge (forced by `media-position`) when a too-wide guest sits beside content; the heavier-geometry case, verified on real devices. Lands the per-layout `--rf-bleed-room-*` values (§5) — the desktop case where chrome'd layouts (docs) must cap at the wide track.

## References

- Frame chrome facets + `resolveFrameChrome`: {% ref "SPEC-086" /%}. `frame-anchor` (the focal-point-kept facet this unifies with for direction, §4) lives there too — today `object-position` for `object-fit` crops.
- Clip/bleed host axis (`guestFit`) and the bleed-host `overflow: visible` for rune guests: the media-host chrome work (PR-merged) and {% ref "SPEC-090" /%} (sibling interaction axis).
- Build-warning precedent: {% ref "SPEC-090" /%}, `warnFrameNoTarget` in `packages/transform/src/engine.ts`.
- Decision record: {% ref "ADR-026" /%}.
- Held first-consumer PR: sandbox `bleed="crop"` (refrakt-md/refrakt#530) — to be reworked per this spec.

{% /spec %}
