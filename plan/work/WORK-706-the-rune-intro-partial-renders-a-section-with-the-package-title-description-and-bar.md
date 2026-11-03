{% work id="WORK-706" status="ready" priority="medium" complexity="moderate" source="SPEC-187" tags="docs, runes, reference, include, section, bar, file-ref, drawer" milestone="v0.48.0" %}

# The rune-intro partial renders a section with the package, title, description and bar

SPEC-187 D2, D3, D8 and D9: `site/content/_partials/rune-intro.md`, included as
`{% include file="rune-intro.md" variables={r: "rune:<name>"} /%}`, renders a `section` whose
eyebrow is the package, headline the title, blurb the description, and whose body is a `bar`. The
spec's sketches show the intended result for a composition, a native plugin rune, a core rune, a
non-stable rune and a staged rune.

## Acceptance Criteria
- [ ] The partial renders the eyebrow (package linked to its plugin page, or `Core`), an `<h1>` title and the description as the blurb
- [ ] The bar's left group shows, in order and each only when it applies: a `Composition` badge with a puzzle icon, a status badge when the status is not `stable`, and the `schemaType` badge linked to its schema.org page; a native rune shows no kind badge
- [ ] The bar's right group shows an Install action for a plugin rune and a Source action for every rune, so a core rune shows Source alone
- [ ] The Install action opens a drawer with `npm install <package>`, the `plugins` entry for `refrakt.config.json` and a link to the plugin's overview page, built by the partial from `package`
- [ ] The Source action opens a `file-ref` drawer on the record's `source`
- [ ] A test asserts that the `<h1>` inside the include still sets the page title, TOC and heading index
- [ ] A test asserts that `file-ref` reads a `path` substituted from a `$row` value
- [ ] On a docs page the section reads as a page header, light and dark, at 1280px and 390px; any adjustment is made with the section's attributes, not site CSS
- [ ] `_partials/README.md` documents the partial beside `rune-attributes.md`

## Blocked by
- {% ref "WORK-705" /%}

## References
- {% ref "SPEC-187" /%}: D2, D3, D8, D9, the sketches, and the items to confirm.
- {% ref "SPEC-129" /%}: `include`.

{% /work %}
