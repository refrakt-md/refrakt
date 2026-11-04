{% work id="WORK-712" status="ready" priority="high" complexity="moderate" source="SPEC-193" tags="docs, runes, template, attributes" milestone="v0.49.0" %}

# A rune page has one shape, and the attribute table renders a rune's family

SPEC-193 D1. Rune pages have no fixed section order, and the attribute table sits under H2, H3 or
H4, often nested under the example before it. About 20 pages include the attribute partial once per
child rune, and two document only the child.

## Acceptance Criteria
- [ ] The rune page template (D1: intro, opening paragraph, "Basic usage", "How Markdown is read", task sections, "Attributes", "See also") is written down in `extend/rune-authoring/`
- [ ] The attribute partial, included once with the parent rune, renders the parent's table and then each child's under its own `###`, from the child-to-parent mapping (`PAGELESS`)
- [ ] Every rune page has exactly one attribute include, under `## Attributes`, after its task sections; pricing and steps document their parent rune too
- [ ] `check-rune-docs` fails on a rune page whose attribute include is missing, repeated, or not under `## Attributes`
- [ ] "See also" is the one name for related links; the two "Related" sections are renamed

## Blocked by
- {% ref "WORK-711" /%}

## References
- {% ref "SPEC-193" /%}: D1.
- {% ref "SPEC-128" /%}: the generated attribute tables.

{% /work %}
