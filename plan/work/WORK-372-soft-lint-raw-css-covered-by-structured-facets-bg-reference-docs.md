{% work id="WORK-372" status="ready" priority="low" complexity="simple" source="SPEC-088" tags="surfaces, bg, validation, docs" milestone="v0.20.0" %}

# Soft-lint raw CSS covered by structured facets + bg reference docs

Add a build-time soft warning for raw CSS that a structured facet now covers, and document gradients/escape-hatch/overlay in the `bg` reference.

## Acceptance Criteria
- [ ] A build-time soft warning flags a raw gradient/background in `style` or `overlay` that a structured facet covers, pointing to the facet.
- [ ] The `bg` reference docs document gradients (facets + presets), the escape hatch (contract + config home), and the `overlay` change, cross-linked with SPEC-087/086.

## Approach
`site/content/runes/bg.md`. SPEC-088 §2–§3.

## References

- {% ref "SPEC-088" /%}

{% /work %}
