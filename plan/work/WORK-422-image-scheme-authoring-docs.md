{% work id="WORK-422" status="pending" priority="low" complexity="simple" source="SPEC-106" milestone="v0.22.0" tags="image,docs,authoring" %}

# Image-scheme authoring docs

Document the image-src scheme sugar for content authors, and the data:svg caveat.

## Acceptance Criteria

- [ ] Authoring docs cover `![alt](icon:<name>)` and `![alt](placeholder:<shape>)` — available schemes, the shape list, and accessibility (`alt`).
- [ ] A note documents that raw `data:image/svg+xml` srcs are rejected by the parser (markdown-it `validateLink`) — use `placeholder:`/`icon:` or a non-SVG image.

## Dependencies

- Requires {% ref "WORK-419" /%} + {% ref "WORK-420" /%} (the schemes to document).

## References

- {% ref "SPEC-106" /%} · `site/content/extend/` authoring docs.

{% /work %}
