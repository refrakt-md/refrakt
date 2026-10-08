{% work id="WORK-619" status="in-progress" priority="high" complexity="simple" source="SPEC-158" milestone="v0.40.0" tags="theme,config,identity,correctness" %}

# The identity guard is path-granular

Implement {% ref "SPEC-158" /%}. `IDENTITY_FIELDS` (`packages/transform/src/identity-fields.ts`)
becomes a list of paths, and `findReservedFields` resolves a wildcard segment. This adds
three protections:

- `sequence` (D2)
- `metaFields.*.metaType` (D3)
- an `attrs` map setting an attribute that an identity field derives (D4)

A violation is dropped and reported, never thrown (D5).

The change is a pure tightening and is inert against today's corpus. SPEC-158 D7 sequences
it before the work that cites these rules, which is why it opens this milestone.

## Acceptance Criteria

- [ ] `IDENTITY_FIELDS` holds paths, and `findReservedFields` resolves a wildcard segment, with the existing eight keys behaving exactly as before — asserted by the current tests passing unchanged
- [ ] A theme override setting `sequence` is dropped and reported, with the rune and field named, and a test cites {% ref "ADR-030" /%} rule 3 as the reason so the history is not lost
- [ ] `sequenceDirection` remains overridable, asserted alongside, so the split is visible in one place
- [ ] A theme override setting `metaFields.status.metaType` is dropped while that field's `label` and `sentimentMap` merge normally, asserted on one override carrying all three
- [ ] An `attrs` map setting `data-section`, `typeof` or `property` is refused with the path and attribute named; the wrapper's other attributes still apply
- [ ] `attrs` setting `data-zone-layout` is *not* refused (D4)
- [ ] The refusal is enforced at config normalisation, so it fires once per config rather than per render
- [ ] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy
- [ ] `packages/lumina` merges unchanged, asserted rather than assumed
- [ ] The theme-authoring guide states which paths are guarded and why, with the track-number example as the case that makes it concrete

{% /work %}
