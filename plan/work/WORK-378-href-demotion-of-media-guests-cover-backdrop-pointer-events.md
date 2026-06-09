{% work id="WORK-378" status="ready" priority="low" complexity="moderate" source="SPEC-090" tags="composability, runes, engine, a11y, lumina" milestone="v0.20.0" %}

# href demotion of media guests + cover backdrop pointer-events

Demote a clickable container's media guest to presentational + `pointer-events: none`, and make a cover guest an inert backdrop unconditionally.

## Acceptance Criteria
- [ ] A clickable container (`card`/`bento-cell` with `href`) demotes its media guest: renders the static fallback and is `pointer-events: none` so the whole tile links reliably; the demotion is scoped to the media guest only (content-overlay controls stay interactive).
- [ ] In `cover` mode the media guest is `pointer-events: none` regardless of `href`; interactive full-bleed guests with overlaid UI are out of scope.
- [ ] A container without `href` (and not `cover`) hosts interactive guests normally.

## Approach
Stretched link + z-index lift in `bento.css`/`card.css`. SPEC-090 §2,§4,§5.

## References

- {% ref "SPEC-090" /%}

{% /work %}
