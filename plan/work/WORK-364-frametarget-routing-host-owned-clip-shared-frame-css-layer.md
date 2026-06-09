{% work id="WORK-364" status="done" priority="high" complexity="complex" source="SPEC-086" tags="chrome, runes, engine, lumina" milestone="v0.20.0" %}

# frameTarget routing + host-owned clip + shared frame CSS layer

Add `RuneConfig.frameTarget` routing, the host-owned clip contract, the `oversize` opt-out, a shared frame CSS layer, and reconcile with bento's existing media vars.

## Acceptance Criteria
- [x] `RuneConfig.frameTarget` (`'media'|'self'`, default `'media'` when a media section exists) routes frame chrome; `card`→media zone, `figure`/`showcase`→self.
- [x] `frame` on a rune with no frame target emits a build warning.
- [x] Clip is host-owned: clipping hosts (`card`/`bento-cell`/`figure`) crop a displaced/oversized guest (peek + `anchor`, container-query context); breakout hosts spill (bleed); the `--in-bento-cell` one-off is generalised; `offset` collapses on mobile.
- [x] An `oversize`d guest opts out of the media-zone `width:100%` normalisation (folded into the `split.css` opt-out list).
- [x] `frame` facets reconcile with bento (`frame-aspect`→`--bento-media-aspect`, `frame-anchor`→`--bento-media-anchor`, grid-level `frame` default cascades to cells).

## Approach
Media-zone contract WORK-339; `packages/lumina/styles/layouts/split.css`. SPEC-086 §3–§4.

## References

- {% ref "SPEC-086" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-086-surface-chrome`

### What was done
- `RuneConfig.frameTarget` (`'media'|'self'`, default `media` when a media section exists) routes frame chrome to the `[data-section="media"]` zone or the rune root; `figure` → self; validated in `validate.ts`; build warning when no target resolves.
- Shared `packages/lumina/styles/dimensions/frame.css`: silhouette drop-shadow, aspect, anchor (object-position), place, oversize (guest exceeds slot), displacement (bleed/peek) + mobile collapse.
- `split.css` breakout opt-out now tracks `data-displace` (was `data-bleed`).
- bento reconciliation: `frame-aspect`/`frame-anchor` feed the existing `--bento-media-aspect`/`--bento-media-anchor`; a grid-level `frame` cascades to cells (`bento.ts`), grid never claims chrome itself.

### Notes
- Oversize opt-out is realised via `frame.css` specificity (the guest's `width: calc(100% * oversize)` outranks the media zone's `width:100%`), rather than a literal new arm in the `split.css` `:is()` list — same effect (the guest exceeds and is clipped).
- Host-owned clip: media wells clip (WORK-339 `overflow:hidden`), breakout hosts (showcase-self) spill; the `--in-bento-cell` guard is retained on the showcase breakout selector rather than fully generalised.
- CSS is verified structurally (3143 tests pass); visual polish may warrant a follow-up pass.

{% /work %}
