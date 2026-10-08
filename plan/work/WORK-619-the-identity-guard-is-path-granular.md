{% work id="WORK-619" status="done" priority="high" complexity="simple" source="SPEC-158" milestone="v0.40.0" tags="theme,config,identity,correctness" pr="refrakt-md/refrakt#679" %}

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

- [x] `IDENTITY_FIELDS` holds paths, and `findReservedFields` resolves a wildcard segment, with the existing eight keys behaving exactly as before — asserted by the current tests passing unchanged
- [x] A theme override setting `sequence` is dropped and reported, with the rune and field named, and a test cites {% ref "ADR-030" /%} rule 3 as the reason so the history is not lost
- [x] `sequenceDirection` remains overridable, asserted alongside, so the split is visible in one place
- [x] A theme override setting `metaFields.status.metaType` is dropped while that field's `label` and `sentimentMap` merge normally, asserted on one override carrying all three
- [x] An `attrs` map setting `data-section`, `typeof` or `property` is refused with the path and attribute named; the wrapper's other attributes still apply
- [x] `attrs` setting `data-zone-layout` is *not* refused (D4)
- [x] The refusal is enforced at config normalisation, so it fires once per config rather than per render
- [x] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy
- [x] `packages/lumina` merges unchanged, asserted rather than assumed
- [x] The theme-authoring guide states which paths are guarded and why, with the track-number example as the case that makes it concrete

## Resolution

Completed: 2026-10-08

Branch: `claude/v040-identity-guard`
PR: refrakt-md/refrakt#679

### What was done
- `packages/transform/src/identity-fields.ts` — `IDENTITY_FIELDS` holds paths (`sequence`, `metaFields.*.metaType` added after the original eight); `findReservedFields` resolves a `*` segment to concrete paths with per-segment presence semantics. New `IDENTITY_FIELD_ATTRIBUTES` / `derivedAttributeOwner` / `derivedAttributeMessage` state D4 by inversion (field → emitted attributes, plus `data-{kebab}` for declared modifiers).
- `packages/transform/src/merge.ts` — dotted-path stripping (copy-on-write); the declared `metaType` is reasserted on replaced `metaFields` entries; layout `attrs` (rune + variant-delta layouts) cleaned and reported under `guardIdentity` at config normalisation. `IdentityViolation.attribute` added; `mergeRuneConfig` exported.
- `packages/transform/src/validate.ts` — `validateThemeConfig` errors on refused layout attrs (surfaces in `refrakt plugin validate`).
- Tests: `packages/transform/test/identity-paths.test.ts` (new); `identity-fields.test.ts` list/loops adjusted; `packages/lumina/test/identity-guard.test.ts` asserts guarded == unguarded merge for Lumina and the full assembly.
- `site/content/extend/theme-authoring/config-api.md` — "Guarded paths" table with the track-number example; cross-links from sequence/metaFields/layout/variants/merge sections.
- Changeset: `@refrakt-md/transform` minor.

### Notes (spec findings)
- "Current tests pass unchanged" cannot hold literally: `identity-fields.test.ts` asserted the exact eight-key list and looped over `IDENTITY_FIELDS` as top-level keys. The list gained the two entries and the loops iterate whole-key paths; every assertion about the original eight is unchanged.
- Stripping `metaType` alone does not preserve it: `metaFields` merges per entry, so a replaced entry would lose the declared type (as would an entry that omits it). The guard reasserts the base `metaType` — slightly beyond D1's presence-only wording, required for "the rune's own declaration stands".
- The `attrs` refusal also applies to a rune's first declaration (no base), since `attrs` bypasses the owning field whoever writes it. Core runes' own layouts are checked only by `validateThemeConfig`; none use `attrs`.
- Inert: SEO baseline and both contract copies unchanged; Lumina and all nine plugins trip no violations.

{% /work %}
