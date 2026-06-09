{% work id="WORK-371" status="ready" priority="medium" complexity="complex" source="SPEC-088" tags="surfaces, bg, runes, engine, lumina, migration" milestone="v0.20.0" %}

# Structured overlay/scrim facets + raw-string overlay deprecation path

Split the conflated `overlay` string into a structured flat-wash `overlay` and a structured `scrim` legibility facet, with a deprecation path for the raw-string passthrough.

## Acceptance Criteria
- [ ] `overlay` is constrained to `none|dark|light` (+ optional token reference / opacity).
- [ ] A structured `scrim` facet provides legibility behind overlaid text via `scrim-type` (`gradient` default | `frost`), `scrim-strength`, `scrim-blur`, `scrim-tone` (`dark|light`, explicit), targeting the bg overlay or the media well (SPEC-087 routing).
- [ ] The unvalidated raw-string `overlay` passthrough is deprecated with a build warning for one minor then removed, gated on `scrim` shipping.

## Approach
`overlay` passthrough in `engine.ts`. Cover-mode scrim consumer is SPEC-089. SPEC-088 §3.

## References

- {% ref "SPEC-088" /%}

{% /work %}
