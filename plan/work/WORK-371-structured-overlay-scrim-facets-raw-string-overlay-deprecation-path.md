{% work id="WORK-371" status="done" priority="medium" complexity="complex" source="SPEC-088" tags="surfaces, bg, runes, engine, lumina, migration" milestone="v0.20.0" %}

# Structured overlay/scrim facets + raw-string overlay deprecation path

Split the conflated `overlay` string into a structured flat-wash `overlay` and a structured `scrim` legibility facet, with a deprecation path for the raw-string passthrough.

## Acceptance Criteria
- [x] `overlay` is constrained to `none|dark|light` (+ optional token reference / opacity).
- [x] A structured `scrim` facet provides legibility behind overlaid text via `scrim-type` (`gradient` default | `frost`), `scrim-strength`, `scrim-blur`, `scrim-tone` (`dark|light`, explicit), targeting the bg overlay or the media well (SPEC-087 routing).
- [x] `scrim-tone` sets the overlaid content's **foreground polarity** (text/muted tokens), not just the wash — a `dark` scrim yields light text — so text colour follows the scrim, not the base surface.
- [x] The unvalidated raw-string `overlay` passthrough is deprecated with a build warning for one minor then removed, gated on `scrim` shipping.

## Approach
`overlay` passthrough in `engine.ts`. Cover-mode scrim consumer is SPEC-089. SPEC-088 §3.

## References

- {% ref "SPEC-088" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-088-bg-gradients-scrim`

### What was done
- `overlay` constrained to `dark`/`light`/token-reference (+ `overlay-opacity`); raw CSS still applies but warns (deprecated, gated on `scrim` shipping).
- Structured `scrim` facet (universal): `scrim` (edge) + `scrim-type` (gradient|frost), `scrim-strength`, `scrim-blur`, `scrim-tone`. Engine emits the `data-scrim-*` contract + `--scrim-*` vars on a scrim element; `bg.css` renders the directional gradient / backdrop-blur frost. Scrim/overlay can stand alone (raise the layer with no image).
- `scrim-tone` flips the overlaid content's foreground via `data-color-scheme` on the host (dark scrim → light text), reusing the palette flip; an explicit tint scheme wins.
- Force-included `bg.css` in the used-CSS set (bg is now universal-attribute-driven).

### Notes
- The scrim's **media-well** target (vs the bg overlay) is realized by cover mode (SPEC-089, Batch 5); the facet + bg-overlay target ship here.

{% /work %}
