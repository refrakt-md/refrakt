{% work id="WORK-670" status="ready" priority="medium" complexity="simple" source="ADR-043" tags="theme, identity, metadata, config" milestone="v0.46.0" %}

# All of metaFields is identity

{% ref "SPEC-158" /%} D3 made `metaFields.*.metaType` identity and left `label`, `sentimentMap`
and `transform` overridable, so a theme had something to change. {% ref "ADR-043" /%} decision 2
reads all three as claims about content: a label is copy, a sentiment map says what the content
means, and `transform` names a kind of formatting whose style is now `formats`
({% ref "SPEC-166" /%} D6). So `metaFields` becomes identity as a whole, for native runes too.

## Acceptance Criteria

- [ ] `IDENTITY_FIELDS` names `metaFields` in place of `metaFields.*.metaType`, and a theme override of any part of it is reported and dropped
- [ ] No first-party theme or preset trips the guard
- [ ] SPEC-158 D3 carries a note pointing to ADR-043
- [ ] The changeset names the break for third-party themes that override `label`, `sentimentMap` or `transform`, with the migration: change the definition, or style through `[data-field]` and `[data-value]`

## References

- {% ref "ADR-043" /%}: decision 2.
- {% ref "SPEC-158" /%}: D3.

{% /work %}
