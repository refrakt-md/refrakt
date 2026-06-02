{% work id="WORK-322" status="ready" priority="high" complexity="moderate" source="SPEC-082" tags="engine,transform,data-channel,fields" milestone="v0.18.0" %}

# Engine reads the `fields` attribute (dual-read)

Step 2 of {% ref "SPEC-082" /%}. The engine resolves `modifierValues` /
`metaFields` from the parsed `data-rune-fields` first, falling back to the legacy
`<meta data-field>` children when a key is absent. Parse the reserved attribute
once per node. With both channels carrying the same data (after
{% ref "WORK-321" /%}), output is unchanged.

## Acceptance Criteria

- [ ] The engine parses `data-rune-fields` once into a typed object before
  modifier / metaField resolution.
- [ ] `modifierValues` is populated from `fields` (preferred) then legacy metas
  (fallback). Present-but-empty values are handled correctly — no `if (value)`
  collapse (the `renderWhenEmpty` case resolves from `key in fields`).
- [ ] Typed values are consumed without re-parsing (numbers / booleans / arrays
  arrive typed).
- [ ] No output change with both channels present; full suite + contracts green.
- [ ] Test: a node carrying only `data-rune-fields` (no legacy metas) resolves
  identically to one carrying only the legacy metas.

## Dependencies

- {% ref "WORK-321" /%} — the `fields` attribute must be emitted first.

## References

- {% ref "SPEC-082" /%} — typed node data channel.

{% /work %}
