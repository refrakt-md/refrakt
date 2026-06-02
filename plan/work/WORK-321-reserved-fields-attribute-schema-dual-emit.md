{% work id="WORK-321" status="ready" priority="high" complexity="moderate" source="SPEC-082" tags="runes,transform,serialization,data-channel,fields" milestone="v0.18.0" %}

# Reserved `fields` attribute + schema dual-emit

Step 1 of {% ref "SPEC-082" /%}. Introduce the typed field-data channel: rune
schemas write their field values to a single reserved attribute,
`data-rune-fields`, holding a JSON-encoded object — produced by
`createComponentRenderable` (`properties` populate it). Keep emitting the legacy
`<meta data-field>` children in parallel (dual-emit) so behavior is unchanged.
No engine changes in this step.

## Acceptance Criteria

- [ ] Reserved attribute key chosen and documented — working name
  `data-rune-fields`; value is a JSON-encoded `Record<string, FieldValue>` where
  `FieldValue = string | number | boolean | string[]`.
- [ ] `createComponentRenderable` writes its `properties` into `data-rune-fields`
  on the node, **in addition to** the existing `<meta data-field>` emission.
- [ ] Values are typed where natural (e.g. `servings` → number); JSON quotes are
  escaped against the attribute delimiter by the serializer.
- [ ] No output change — the engine still reads the legacy metas this step; the
  rendered HTML is byte-identical. Full suite + contracts green.
- [ ] Unit test at the helper level: a renderable's `properties` appear both in
  `data-rune-fields` (typed, parsed) and as the legacy metas.

## References

- {% ref "SPEC-082" /%} — typed node data channel.

{% /work %}
