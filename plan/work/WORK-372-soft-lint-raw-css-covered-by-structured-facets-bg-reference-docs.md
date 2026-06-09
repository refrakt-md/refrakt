{% work id="WORK-372" status="done" priority="low" complexity="simple" source="SPEC-088" tags="surfaces, bg, validation, docs" milestone="v0.20.0" %}

# Soft-lint raw CSS covered by structured facets + bg reference docs

Add a build-time soft warning for raw CSS that a structured facet now covers, and document gradients/escape-hatch/overlay in the `bg` reference.

## Acceptance Criteria
- [x] A build-time soft warning flags a raw gradient/background in `style` or `overlay` that a structured facet covers, pointing to the facet.
- [x] The `bg` reference docs document gradients (facets + presets), the escape hatch (contract + config home), and the `overlay` change, cross-linked with SPEC-087/086.

## Approach
`site/content/runes/bg.md`. SPEC-088 §2–§3.

## References

- {% ref "SPEC-088" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-088-bg-gradients-scrim`

### What was done
- `validate.ts` soft-lint: a build-time **warning** when a background preset's `style` escape hatch contains a raw gradient the structured `gradient` field now covers (raw `overlay` warns at runtime via `warnRawOverlay`).
- `bg.md` reference rewritten: gradient facets + token-name stops + presets, the overlay vocabulary + deprecation, the structured scrim (incl. foreground polarity), and the escape-hatch contract + config homes; cross-linked to the surface model.

### Notes
- The lint is a warning, not an error — the escape hatch stays valid.

{% /work %}
