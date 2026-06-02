{% work id="WORK-326" status="ready" priority="medium" complexity="moderate" source="SPEC-081" tags="runes,transform,budget,computation,fields" milestone="v0.18.0" %}

# Move semantic derivation out of postTransform (budget totals)

Apply the {% ref "SPEC-081" /%} computation boundary: **semantic derivation
belongs in the rune transform, not the presentation `postTransform`.** Budget's
grand / per-category / per-day totals are the worked example — a theme-invariant
fact about the content currently stranded in the engine's escape hatch.

## Acceptance Criteria

- [ ] Budget totals (grand, per-category, per-day) are computed in the rune
  transform, from authored attributes + parsed categories.
- [ ] Totals are emitted as semantic data into the `fields` bag
  ({% ref "WORK-321" /%}) and rendered via a `total` metaField / block placed in
  a footer container by `layout`; currency formatting via a field `transform`.
- [ ] Budget's `postTransform` total computation is removed (reduced only to
  genuinely presentation-dependent bits, if any remain).
- [ ] The grand total is visible to the pre-engine pipeline (registry /
  `aggregate` can read / sum it).
- [ ] Output parity; tests green.

## Dependencies

- {% ref "WORK-321" /%} — the `fields` channel to carry the derived totals.
- {% ref "WORK-324" /%} — `layout` to place the rendered total.

## References

- {% ref "SPEC-081" /%} — declarative structure assembly (computation boundary).
- {% ref "SPEC-082" /%} — typed node data channel.

{% /work %}
