{% work id="WORK-706" status="ready" priority="medium" complexity="moderate" source="SPEC-187" tags="docs, runes, reference, include, section, bar, file-ref" milestone="v0.48.0" %}

# The rune-intro partial renders a section with the package, title, description and bar

SPEC-187 D2 and D3: `site/content/_partials/rune-intro.md`, included as
`{% include file="rune-intro.md" variables={r: "rune:<name>"} /%}`, renders a `section` whose
eyebrow is the package, headline the title, blurb the description, and whose body is a `bar`.

## Acceptance Criteria
- [ ] The partial renders the eyebrow (package linked to its plugin page, or `Core`), an `<h1>` title and the description as the blurb
- [ ] The bar's left group shows a `Composition` badge with a puzzle icon when the rune is composed, and a status badge when the status is not `stable`
- [ ] The bar's right group shows a source icon that opens a `file-ref` drawer on the record's `source`, and the install command for a plugin rune
- [ ] A test asserts that the `<h1>` inside the include still sets the page title, TOC and heading index
- [ ] A test asserts that `file-ref` reads a `path` substituted from a `$row` value
- [ ] On a docs page the section reads as a page header, light and dark, at 1280px and 390px; any adjustment is made with the section's attributes, not site CSS
- [ ] `_partials/README.md` documents the partial beside `rune-attributes.md`

## Blocked by
- {% ref "WORK-705" /%}

## References
- {% ref "SPEC-187" /%}: D2, D3, and the items to confirm.
- {% ref "SPEC-129" /%}: `include`.

{% /work %}
