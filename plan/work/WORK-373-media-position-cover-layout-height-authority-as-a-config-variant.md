{% work id="WORK-373" status="ready" priority="medium" complexity="complex" source="SPEC-089" tags="surfaces, runes, engine, lumina, layout" milestone="v0.20.0" %}

# media-position=cover layout + height authority (as a config variant)

Add `media-position="cover"` as an engine config variant (full/header scope) with the height-authority precedence, superseding the split knobs.

## Acceptance Criteria
- [ ] `media-position` gains `cover`: the media well fills the rune interior (thin-edge frame + `--rf-radius-media` preserved) and content overlays it; switching from `top|bottom|start|end` is a one-attribute change on the same content.
- [ ] Cover scope (`full`|`header`, rune-declared, override-able) bounds the overlay region; `header` flows the body below; content beyond the region always flows, never overlays.
- [ ] Realized as a `media-position` engine variant (SPEC-091) supplying the cover structure; there is no overlay primitive in the layout config.
- [ ] Height authority follows external grid track → media aspect → default portrait; `cover` supersedes `content-height`/`media-ratio`.

## Approach
Gated on WORK-361 (card/bento-cell flat-slot migration). `card.css` (`--rf-card-edge`,`--rf-radius-media`). SPEC-089 §1,§4.

## References

- {% ref "SPEC-089" /%}

{% /work %}
