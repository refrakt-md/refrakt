{% work id="WORK-653" status="draft" priority="medium" complexity="moderate" source="SPEC-160,SPEC-147" tags="runes, composition, storytelling, section" milestone="v0.43.0" %}

# The storytelling compositions place section instead of card

The composed `character`, `realm` and `faction` place `{% card %}`, because it was the only
primitive with a media split. Once `section` has the split, they move to it
({% ref "SPEC-160" /%} D4). The expected differences are listed in D4: `rf-section__*` element
classes, a real `<header>` for title and description, no surface, and the portrait regaining
`data-media="portrait"`.

## Acceptance Criteria

- [ ] `character`, `realm` and `faction` place `{% section %}` with `media-position` passed through, and `character` passes `media="portrait"`
- [ ] The composed `character` renders its portrait with `data-media="portrait"` again
- [ ] The JSON-LD, RDFa and registry comparisons against the plugin are re-run, not re-recorded, and any movement is explained in the resolution
- [ ] The recorded rendered-tree differences in the composed-storytelling tests are updated, each change explained
- [ ] `plugins/storytelling/` is unchanged and still passing its own tests (SPEC-147 D1)

## Blocked by

- {% ref "WORK-652" /%}
- {% ref "WORK-650" /%}: so the comparisons are re-run once, without the dead `content-section` difference

## References

- {% ref "SPEC-160" /%}: D4.
- {% ref "SPEC-147" /%}: D1, D2.

{% /work %}
