{% work id="WORK-370" status="ready" priority="low" complexity="simple" source="SPEC-088" tags="surfaces, bg, config, docs" milestone="v0.20.0" %}

# Formalize the bg raw-CSS escape hatch + project-config backgrounds merge

Promote `BgPresetDefinition.style` to a documented, intentional last-resort escape hatch and confirm the project-config `backgrounds` home with merge-over-theme semantics.

## Acceptance Criteria
- [ ] `BgPresetDefinition.style` is documented with a stated contract (raw CSS on the bg layer, bypasses tokens, author owns portability), valid in both theme and project config.
- [ ] Project `backgrounds` (`refrakt.config.json`) merge over theme `backgrounds`.

## Approach
Same project-vs-theme split as SPEC-087 named recipes. SPEC-088 §2.

## References

- {% ref "SPEC-088" /%}

{% /work %}
