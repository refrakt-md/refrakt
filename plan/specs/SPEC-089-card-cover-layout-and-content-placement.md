{% spec id="SPEC-089" status="draft" tags="surfaces,runes,engine,lumina,layout,dx" %}

# Card cover layout: `media-position="cover"`, content placement, and intrinsic height

A media+content rune (`card`, `bento-cell`) normally lays its media and content in
**separate, non-overlapping tracks** — `media-position="top|bottom|start|end"`. This
spec adds a `cover` layout mode where the **media fills the rune's interior and the
content overlays it** — the poster / cover card — preserving the thin-edge frame and
media radius, with a content-placement control, a default legibility scrim, and an
intrinsic-height answer for both cover and `bg`-only cards. It was battle-tested against
a profile-card example (a normal media-top card vs the same card with the media pulled
down to cover, text overlaid).

## Overview

### Cover is a media-slot *layout mode*, not `bg`

The decisive clue is that the image keeps the card's **thin-edge frame** and **media
radius** — it reads as *the media well pulled down to fill the card*, with content
floated on top, not as an edge-to-edge background. So the image is still the rune's
**media guest**; `cover` is a one-attribute toggle on the *same content*
(`media-position: top → cover`), not a content restructure into `bg`.

This refines the {% ref "SPEC-087" /%} §4 boundary: **when the image is the rune's media
(the subject), it stays a media guest in `cover` mode; when it is decorative ambiance
behind content, it is `bg`.** Two reasons `cover` beats `bg` for the media case:

- **Framing reuse** — the thin-edge inset (`--rf-card-edge`) + `--rf-radius-media` already produce the framed look on a normal card; `cover` just lets the media well span the full interior. `bg` is edge-to-edge and out of flow.
- **Height for free** — the media is **in-flow**, so its aspect-ratio defines the card's height (no shrink). A `bg` is `position: absolute` and contributes no height (see §4).

## Design

### 1. `media-position="cover"`

- The media well spans the rune's full interior (inside the thin edge, with `--rf-radius-media`); the content block is positioned **over** it (not in a separate track).
- Height comes from the media's aspect-ratio — `frame-aspect` ({% ref "SPEC-086" /%}) or the card height/aspect knob (§4) — with a **sensible portrait default** (e.g. `3/4`) so the tall look works with zero config.
- Applies to media+content runes (`card`, `bento-cell`). `bento-cell` already gets height from grid row-spans; the standalone card relies on §4.

### 2. `content-place` — the overlay anchor

- **Active only in `cover` mode.** In the non-cover layouts content sits in its own non-overlapping track — there is no overlay to anchor — so `content-place` outside `cover` is inert and emits a build warning (SPEC-084 validation). Aligning content *within* a flow track is a separate `valign`-style concern, deliberately not conflated here.
- **2-axis logical grammar**, mirroring CSS `place-content` and the frame `place` (block × inline): `start | center | end` on each axis. `content-place="end"` = block-end (bottom); `content-place="end start"` = bottom-left. **Default `end`** (bottom). Logical (not physical `top/left`) for RTL/writing-mode safety; physical names may exist as friendly aliases. Maps to `justify`/`align` of the overlaid content block.
- **Orientation-adaptive default.** Logical values resolve against writing-mode, *not* the card's aspect ratio, so a single value can't mean "bottom when portrait, side when landscape." Because the media zone is a container-query context (WORK-339), `content-place="auto"` (the cover default) adapts on the rune's own aspect: **portrait → `block-end`; landscape → `inline-start`** (`@container (min-aspect-ratio: 1/1)`). An explicit `content-place` pins it and opts out.

### 3. Scrim in cover mode

- **On by default.** Overlaying text on an arbitrary image without a scrim is a legibility footgun, so `cover` applies a default scrim. `scrim="none"` opts out (author takes responsibility).
- **Targets the media surface.** In `cover` the text overlays the media well, so the scrim is a legibility treatment over the *media* surface — using the {% ref "SPEC-087" /%} self/media targeting (the bg-layer scrim and the media-well scrim are the same facet on different surfaces).
- **Direction follows `content-place`** by default (the scrim belongs where the text is); independently overridable. The scrim **region tracks the content area** (it grows with the content and re-anchors when `content-place` moves) — frost's panel *is* the content box; a gradient's falloff anchors to the content edge, not a fixed band.
- The scrim *facet* itself — `type` (`gradient`/`frost`), `strength`, `blur`, `tone` — is defined in {% ref "SPEC-088" /%}; `cover` mode only turns it on and binds its direction to `content-place`.

### 4. Height authority

Cover and `bg`-only cards both raise "what sets the height," resolved by one precedence:
**external grid track → media aspect → default portrait.**

- **Bento cell, grid mode** — the grid row track wins (`grid-auto-rows`); a `cover` cell's media fills the track-sized cell and `object-fit: cover` crops, content overlays. No aspect is consulted, and **no new bento media-aspect knob is needed** — `cover` reuses bento's existing track-wins / aspect-fallback cascade (the internal `--bento-media-aspect`, default `16/9`, already governs only the collapsed/stack path; SPEC-086's `frame-aspect` may later feed it).
- **Bento cell, collapsed/stack** — no grid track, so it falls back to the `--bento-media-aspect` banner, like a card.
- **Standalone card, cover** — no grid to impose height, so height comes from the media aspect-ratio (`frame-aspect`, default portrait) or the card height knob below. This is the gap bento does not have.
- **`bg`-only card** (decorative backdrop, no in-flow media) — `bg` is `position: absolute; inset: 0`, out of flow, so the card **collapses to content height**. Add a card intrinsic-height knob: a named-scale `height` (`sm|md|lg|xl`) and/or an `aspect` attribute — the **standalone analog of bento's row-spans**.
- **`cover` supersedes the split knobs** — with no media-vs-content split, a bento cell's `content-height` / `media-ratio` (which govern that split in `top/bottom/start/end`) are moot under `cover`.

## Acceptance Criteria

- [ ] `media-position` gains `cover`: the media well fills the rune interior (thin-edge frame + `--rf-radius-media` preserved) and content overlays it; switching a card from `top`/`bottom`/`start`/`end` to `cover` is a one-attribute change on the same content.
- [ ] Height authority follows **external grid track → media aspect → default portrait**: a `cover` `bento-cell` defers to its grid row track (no new bento aspect knob; reuses the existing track-wins / aspect-fallback cascade), while a standalone `cover` card uses the media aspect (`frame-aspect`, default portrait) or the card height knob — so neither collapses.
- [ ] `cover` supersedes `content-height`/`media-ratio` (there is no media-vs-content split in cover).
- [ ] `content-place` positions the overlay: 2-axis logical (`start|center|end` × `start|center|end`), default `end`; active only in `cover` mode and a build warning otherwise.
- [ ] `content-place="auto"` (the cover default) adapts to the rune's container-query orientation (portrait → `block-end`, landscape → `inline-start`); an explicit value pins it.
- [ ] A default scrim is applied in `cover` mode, targeting the **media** surface (SPEC-087 routing), its direction following `content-place` and independently overridable (`scrim="none"` disables); the scrim region tracks the content area.
- [ ] A card intrinsic-height knob (named-scale `height` + `aspect`) preserves height for `bg`-only cards (no in-flow media); documented as the standalone analog of bento row-spans.
- [ ] Docs: the `card` reference documents `cover` mode, `content-place`, the cover scrim default, and card height; cross-linked with {% ref "SPEC-087" /%}, {% ref "SPEC-088" /%}, {% ref "SPEC-086" /%}.

## Work breakdown (provisional)

1. **`cover` layout + height authority** — media fills interior (reuse `--rf-card-edge` / `--rf-radius-media`), content overlay; precedence grid track (bento) → media aspect (card, default portrait); `cover` supersedes `content-height`/`media-ratio`.
2. **`content-place`** — logical 2-axis mapping to `justify`/`align`; orientation-adaptive `auto` via container query; warn outside `cover`.
3. **Cover scrim default** — media-surface target, follows `content-place`, region tracks content; consumes the {% ref "SPEC-088" /%} scrim facet.
4. **Card intrinsic height/aspect knob** — named-scale `height` + `aspect`.
5. **Docs** — `card` reference + cross-links.

## References

- Surface fill + bg/media-slot boundary (revised by this spec): {% ref "SPEC-087" /%} §4; self/media surface targeting.
- Scrim facet (`type`/`strength`/`blur`/`tone`): {% ref "SPEC-088" /%}.
- Media aspect / `frame-aspect`: {% ref "SPEC-086" /%}.
- Cover guest interaction posture (the inert backdrop): {% ref "SPEC-090" /%}.
- Media-zone contract + container-query context: {% ref "WORK-339" /%}; bento row-spans / `row-height`: {% ref "SPEC-085" /%}.
- Card thin-edge + media radius: `packages/lumina/styles/runes/card.css` (`--rf-card-edge`, `--rf-radius-media`); bento layout: `packages/lumina/styles/runes/bento.css`.

{% /spec %}
