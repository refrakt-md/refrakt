{% work id="WORK-663" status="in-progress" priority="high" complexity="moderate" source="SPEC-145" tags="runes, composition, universals, defaults, density" milestone="v0.44.0" %}

# A composition definition declares defaults for universal axes

A native rune states its chrome defaults in config (`defaultWidth`, `defaultElevation`,
`defaultDensity`). A composition has no way to, and `hero` needs `width: full`, which a template
cannot write because `width` stays on the root ({% ref "SPEC-145" /%} D34).

## Acceptance Criteria

- [ ] A definition's frontmatter accepts `defaults`, naming universal axes; any other key, or a value the axis does not accept, is rejected at definition load, naming it
- [ ] `density` is accepted as a default only (`full | compact | minimal`) and lands as `data-density` on the carrier
- [ ] A default lands where the author's attribute would, by WORK-662's placements
- [ ] The order author value > template literal > definition default is asserted for one root-placed axis (`width`) and one carrier-placed axis (`elevation`)
- [ ] A literal the template writes on the carrier is replaced by the author's value at expansion
- [ ] `inspect` shows a default's source, and `reference` documents the definition's defaults
- [ ] The composed-runes guide documents `defaults`, including that a template cannot pin a universal axis against the author

## Approach

Root-placed defaults become the generated config's `defaultWidth`, `defaultSpacing` and
`defaultInset`. The rest are written onto their target tag at expansion when neither the author
nor a literal set them. The placed rune's schema has to admit `density` from a template, since
it is not an author attribute.

SPEC-177 adds site and theme layers above this one later. Nothing here should assume they exist.

## Blocked by

- {% ref "WORK-662" /%}

## References

- {% ref "SPEC-145" /%}: D34.
- {% ref "SPEC-177" /%}: D3's precedence, of which this is the definition's layer.
- {% ref "ADR-042" /%}: compact density as a composition default.

{% /work %}
