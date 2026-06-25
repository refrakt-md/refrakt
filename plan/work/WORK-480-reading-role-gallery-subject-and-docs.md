{% work id="WORK-480" status="ready" priority="low" complexity="simple" source="SPEC-108" milestone="v0.26.0" tags="reading,prose,gallery,docs" %}

# Reading-role gallery subject + docs

Visually regression-guard the reading treatment and document the registers for authors. Per
{% ref "SPEC-108" /%} Implications + Work breakdown 4.

## Scope

- Add a **prose subject** to the gallery — a long body rendered at each register (`fine`/`ui`/
  `prose`), including the editorial-header composition (`elevation="flush" width="full"
  prominence="display" reading="prose"`) so the measure-vs-width independence is guarded in light +
  dark.
- **Docs**: a reading-role section in the surfaces / theme-authoring docs (how the theme interprets
  `reading="prose"`), and the `fine`/`ui`/`prose` registers documented for content authors.

## Acceptance Criteria

- [ ] The gallery grows a prose subject rendering a long body at each register, including the editorial-header composition (light + dark), so the reading treatment is regression-guarded.
- [ ] Docs: a reading-role section in the surfaces / theme-authoring docs, and the `fine`/`ui`/`prose` registers documented for content authors.

## Dependencies

- {% ref "WORK-477" /%} — defaults to exercise in the gallery subject.
- {% ref "WORK-478" /%} — the Lumina treatment being guarded and documented.

## References

- Spec: {% ref "SPEC-108" /%} Implications (gallery prose subject), §5 (editorial-header composition).

{% /work %}
