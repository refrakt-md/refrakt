{% work id="WORK-668" status="in-progress" priority="medium" complexity="complex" source="SPEC-161" tags="runes, composition, marketing, testimonial, section, seo, codemod" milestone="v0.44.0" %}

# testimonial is a composition over section, with a codemod for its byline

`testimonial` becomes one `section` with a portrait media zone, the rating and byline
`metablock`s, and the quote slot ({% ref "SPEC-161" /%} D1). Its author and role move from a
`**Name** — Role` paragraph to attributes, so the schema table can publish them.

## Acceptance Criteria

- [ ] A composed `testimonial` definition, per SPEC-161 D1's sketch, places one `section` with `media-position="start"` and `media="portrait"`, with no `{% if %}`
- [ ] It declares `defaults: { elevation: flat, density: compact }`, and renders a surface and the round avatar for every `variant`
- [ ] `variant` is a declared attribute emitted as `data-variant` on the root
- [ ] The byline renders through the `lead` layout ({% ref "WORK-667" /%}), with the author name as lead and the role visible at compact density
- [ ] Its JSON-LD matches the plugin's `Review` graph (`reviewBody`, `Person` author, `Rating`) at both harvest points, compared against the SEO baseline rather than re-recorded
- [ ] A codemod rewrites `**Name** — Role` paragraphs into `author` and `role` attributes, using the plugin's own parser, and is run over this repository's content
- [ ] A page still written the old way reports `content-unmatched` at error severity rather than rendering the paragraph
- [ ] Rendered beside the plugin `testimonial` for every gallery fixture; every difference is listed and explained
- [ ] The plugin `testimonial` is unchanged; replacing it is a later step

## Blocked by

- {% ref "WORK-663" /%}
- {% ref "WORK-667" /%}
- {% ref "WORK-652" /%}: the portrait media zone (v0.43.0)

## References

- {% ref "SPEC-161" /%}: D1, D6.
- {% ref "WORK-639" /%}: the rating becomes `marks` when it lands; not required here.

{% /work %}
