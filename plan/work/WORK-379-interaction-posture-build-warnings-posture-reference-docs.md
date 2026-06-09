{% work id="WORK-379" status="ready" priority="low" complexity="simple" source="SPEC-090" tags="composability, validation, docs, a11y" milestone="v0.20.0" %}

# Interaction-posture build warnings + posture reference docs

Emit the interaction-posture build warning and document the posture in the reference + composability docs.

## Acceptance Criteria
- [ ] A genuinely-interactive guest in a linked tile emits a build warning (still renders presentationally; informative, not fatal).
- [ ] `card`/`bento` reference + composability docs document the posture (presentational-by-default, `href`-wins demotion, cover backdrop) and the build warning.

## Approach
SPEC-084 validation philosophy. SPEC-090 §2 + Docs.

## References

- {% ref "SPEC-090" /%}

{% /work %}
