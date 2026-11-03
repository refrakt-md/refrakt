{% work id="WORK-699" status="in-progress" priority="medium" complexity="moderate" source="SPEC-185" tags="attribution, blockquote, quotation, content-model" milestone="v0.47.0" %}

# An attribution inside a blockquote is read as its last line

SPEC-185 D6 (the inside form): `— **Name**, Source` as a blockquote's last paragraph is its attribution, read by a nested model with `position: last`, so it works in a composition as in the core node.

## Acceptance Criteria
- [x] The shared attribution model reads the inside form (a leading dash, then a `strong`), and a quote ending in bold text without a dash is not misread
- [x] The core `blockquote` node reads an inside attribution, rendering `<figure data-quote="quotation">` with a `<figcaption>`
- [x] `pullquote` and the epigraph position accept either form, rendering one `<figcaption>`
- [x] A composition's `blockquote` field reads it through a nested model with `position: last`

## Blocked by

- {% ref "WORK-693" /%}
- {% ref "WORK-692" /%}
- {% ref "WORK-697" /%}

## References

- {% ref "SPEC-185" /%}: D6.
- {% ref "SPEC-186" /%}: D2, D3.

{% /work %}
