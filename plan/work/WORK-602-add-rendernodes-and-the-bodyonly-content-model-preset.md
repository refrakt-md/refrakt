{% work id="WORK-602" status="ready" priority="medium" complexity="simple" milestone="v0.38.0" source="SPEC-140" tags="runes,transform,dx" %}

# Add `renderNodes` and the `bodyOnly` content-model preset

Two spellings, each repeated past the point of being idiom.

**`renderNodes(nodes, config)` → `RenderableNodeCursor`.** The full form
appears 153 times, 81 of them as exactly
`new RenderableNodeCursor(Markdoc.transform(asNodes(resolved.X), config) as RenderableTreeNode[])`.
There are 160 `as RenderableTreeNode[]` casts in the tag files.

**`bodyOnly()`** — `{ type: 'sequence', fields: [{ name: 'body', match: 'any',
optional: true, greedy: true }] }` is the entire content model for 49 of the 94
declared in the tag files, in four whitespace variants.

## Acceptance Criteria

- [ ] `renderNodes` is exported from `@refrakt-md/runes` and adopted at the sites matching its exact shape
- [ ] `bodyOnly()` is exported and adopted by the runes whose content model is exactly that shape
- [ ] Sites that wrap or vary the cursor construction (e.g. `unwrapParagraphImages(...)`, a pre-built node array) are left explicit rather than forced through the helper
- [ ] `refrakt contracts --check` and `npm run seo:baseline:check` report no drift
- [ ] `npm test` passes unchanged

## Approach

Purely a spelling change — no behaviour, no output. Adopt only where the shape
matches exactly; the 72 cursor constructions that take a different argument
(`headerAstNodes`, `allItems`, a spread) stay as they are. A helper that has to
grow parameters to cover every caller is not worth having.

`bodyOnly()` returns a fresh object per call rather than a shared constant, so a
rune that spreads and overrides it cannot mutate the preset for everyone else.

## References

- {% ref "SPEC-140" /%} — Tier 3

{% /work %}
