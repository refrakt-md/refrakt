{% work id="WORK-670" status="done" priority="medium" complexity="simple" source="ADR-043" tags="theme, identity, metadata, config" milestone="v0.46.0" pr="refrakt-md/refrakt#752" %}

# All of metaFields is identity

{% ref "SPEC-158" /%} D3 made `metaFields.*.metaType` identity and left `label`, `sentimentMap`
and `transform` overridable, so a theme had something to change. {% ref "ADR-043" /%} decision 2
reads all three as claims about content: a label is copy, a sentiment map says what the content
means, and `transform` names a kind of formatting whose style is now `formats`
({% ref "SPEC-166" /%} D6). So `metaFields` becomes identity as a whole, for native runes too.

## Acceptance Criteria

- [x] `IDENTITY_FIELDS` names `metaFields` in place of `metaFields.*.metaType`, and a theme override of any part of it is reported and dropped
- [x] No first-party theme or preset trips the guard
- [x] SPEC-158 D3 carries a note pointing to ADR-043
- [x] The changeset names the break for third-party themes that override `label`, `sentimentMap` or `transform`, with the migration: change the definition, or style through `[data-field]` and `[data-value]`

## References

- {% ref "ADR-043" /%}: decision 2.
- {% ref "SPEC-158" /%}: D3.

## Resolution

Completed: 2026-11-02

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/transform/src/identity-fields.ts`: `IDENTITY_FIELDS` names `metaFields` in place of `metaFields.*.metaType`. `IDENTITY_FIELD_ATTRIBUTES` keys `data-meta-type` to `metaFields`.
- `packages/transform/src/merge.ts`: the per-entry `metaType` reassert is removed (a guarded override never carries `metaFields`), and the docs are updated.
- Tests: `identity-paths.test.ts` has the D3 block rewritten. Each of metaType/label/sentimentMap/transform is dropped and reported as `metaFields`, `blocks` stays overridable, and the wildcard tests pass their path explicitly. `identity-fields.test.ts` has its list updated.
- `plan/specs/SPEC-158`: a D3 note pointing to ADR-043.
- `.changeset/metafields-identity.md`.

### Notes
- Lumina's identity-guard test (every first-party plugin, and Lumina's own overrides) passes unchanged, so nothing first-party trips the guard.
- The criterion's migration names `[data-value]`, which the engine does not emit. The changeset names `[data-field]`, `[data-meta-type]` and `[data-meta-sentiment]` instead.

{% /work %}
