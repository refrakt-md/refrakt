{% work id="WORK-364" status="ready" priority="high" complexity="complex" source="SPEC-086" tags="chrome, runes, engine, lumina" milestone="v0.20.0" %}

# frameTarget routing + host-owned clip + shared frame CSS layer

Add `RuneConfig.frameTarget` routing, the host-owned clip contract, the `oversize` opt-out, a shared frame CSS layer, and reconcile with bento's existing media vars.

## Acceptance Criteria
- [ ] `RuneConfig.frameTarget` (`'media'|'self'`, default `'media'` when a media section exists) routes frame chrome; `card`→media zone, `figure`/`showcase`→self.
- [ ] `frame` on a rune with no frame target emits a build warning.
- [ ] Clip is host-owned: clipping hosts (`card`/`bento-cell`/`figure`) crop a displaced/oversized guest (peek + `anchor`, container-query context); breakout hosts spill (bleed); the `--in-bento-cell` one-off is generalised; `offset` collapses on mobile.
- [ ] An `oversize`d guest opts out of the media-zone `width:100%` normalisation (folded into the `split.css` opt-out list).
- [ ] `frame` facets reconcile with bento (`frame-aspect`→`--bento-media-aspect`, `frame-anchor`→`--bento-media-anchor`, grid-level `frame` default cascades to cells).

## Approach
Media-zone contract WORK-339; `packages/lumina/styles/layouts/split.css`. SPEC-086 §3–§4.

## References

- {% ref "SPEC-086" /%}

{% /work %}
