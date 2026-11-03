{% work id="WORK-699" status="done" priority="medium" complexity="moderate" source="SPEC-185" tags="attribution, blockquote, quotation, content-model" milestone="v0.47.0" pr="refrakt-md/refrakt#764" %}

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

## Resolution

Completed: 2026-11-03

Branch: `claude/milestone-v0-44-0-ism7ni`
PR: refrakt-md/refrakt#764

### What was done
- `packages/types/src/content-model.ts`, `packages/runes/src/lib/resolver.ts`, `lib/composition.ts`: `ItemModel.prefix`, the text a paragraph record opens with; parsed from a string in YAML.
- `packages/runes/src/lib/attribution.ts`: `insideAttributionItemModel`, `splitInsideAttribution`, `attributionFrom`; `renderAttributedQuote` strips an inside attribution so a quote with both forms captions once.
- `packages/runes/src/nodes.ts`: the core `blockquote` node renders an inside-attributed quotation as `<figure data-quote="quotation">`; the page-start epigraph accepts either form.
- `packages/runes/src/tags/pullquote.ts`: a nested model with `position: last` on `quote`; either form, one caption.
- `packages/runes/src/tags/section.ts`: an inside-attributed blockquote directly after the header is the epigraph.
- `packages/lumina/styles/elements/blockquote.css`: the attributed quotation figure.
- Tests: `attribution-inside.test.ts`. Docs: the content-models guide, the pullquote, section and dimensions pages.

### Notes
- With both forms present, the paragraph after the quote is the caption and the inside line is dropped.
- Section's inside-form epigraph is recognised in the transform (body's first node after the header), not by the declared group: a field cannot be made to match only when its nested model's members are present.

{% /work %}
