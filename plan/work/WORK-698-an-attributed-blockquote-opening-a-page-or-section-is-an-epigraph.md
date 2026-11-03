{% work id="WORK-698" status="done" priority="medium" complexity="moderate" source="SPEC-185" tags="epigraph, section, quotation, header" milestone="v0.47.0" pr="refrakt-md/refrakt#763" %}

# An attributed blockquote opening a page or section is an epigraph

SPEC-185 D5: a blockquote with an attribution in the epigraph position (after a section's headline and blurb, or at the start of a page's content) is an epigraph.

## Acceptance Criteria
- [x] `section`'s header group gains an optional `epigraph` group (quote, attribution) after the blurb, so every rune composed over `section` reads it
- [x] A blockquote at the start of a page's content, or directly after its `#` title, with an attribution, is an epigraph
- [x] A blockquote without an attribution stays a quotation, and a lone attribution after a headline stays the blurb
- [x] An epigraph renders as `<figure data-quote="epigraph">` with its `<figcaption>`, and Lumina styles it

## Blocked by

- {% ref "WORK-695" /%}
- {% ref "WORK-697" /%}

## References

- {% ref "SPEC-185" /%}: D5.

## Resolution

Completed: 2026-11-03

Branch: `claude/milestone-v0-44-0-ism7ni`
PR: refrakt-md/refrakt#763

### What was done
- `packages/runes/src/tags/section.ts`: the auto header group gains an optional `epigraph` group (`epigraph-quote` blockquote + `epigraph-attribution` paragraph, required within), rendered after the blurb inside the header; both are registered header roles for the ADR-046 audit (`lib/header-roles.ts` remedies).
- `packages/runes/src/nodes.ts`: a `document` node; `pageEpigraphAt` finds an attributed blockquote opening the content or directly after the `#` title.
- `packages/runes/src/lib/attribution.ts`: the shared attribution item model, reader and `<figure>`/`<figcaption>` renderers; `pullquote` uses it.
- `packages/lumina/styles/elements/blockquote.css`: the `[data-quote="epigraph"]` role styles; the vocabulary gap is closed.
- Tests: `epigraph.test.ts` (section and page positions, the negative cases); the section declared-model test.
- Docs: the section reference page.

### Notes
- A sweep of every repo `.md` found no existing content that changes.
- An epigraph sits at the start with an indent rather than against the line's end: on a page with no measure an end-aligned one drifted far from the text.

{% /work %}
