{% work id="WORK-601" status="ready" priority="medium" complexity="simple" milestone="v0.38.0" source="SPEC-140" tags="runes,duplication" %}

# Consolidate `extractText` and adopt the exported `textContent`

Two families of duplication, with different fixes.

**AST side — six byte-identical copies.** `extractText(node: Node)` is defined
identically in `packages/runes/src/tags/form.ts`,
`plugins/places/src/tags/map.ts`,
`plugins/design/src/tags/{palette,typography,spacing}.ts` and
`plugins/marketing/src/tags/comparison.ts`.

**Renderable side — `textContent` is already exported and reimplemented anyway.**
`@refrakt-md/runes` exports it (`seo.ts:23`), and
`plugins/plan/src/pipeline.ts` + `plugins/storytelling/src/pipeline.ts` define
`extractTextContent`, while `plugins/media/src/tags/track.ts` defines a
Tag-flavoured `extractText`.

## Acceptance Criteria

- [ ] `extractText` for AST nodes is defined once, exported from `@refrakt-md/runes`, and imported by all six former copies
- [ ] `plan`, `storytelling` and `media` either import `textContent` or carry a comment stating why they keep a local variant
- [ ] `npm test` passes unchanged
- [ ] `refrakt contracts --check` and `npm run seo:baseline:check` report no drift

## Approach

The AST side is a pure move — the six bodies are byte-identical, so a single
export and six imports.

**The renderable side is a behaviour change at each site, not a rename.** The
exported `textContent` ends with `.trim()`; the three local copies do not. Two
places where that matters and must be checked individually:

- `plugins/plan/src/pipeline.ts` — `countCheckboxes` regexes the result for `[ ]` / `[x]`. Trimming cannot change a count, so this is safe.
- `plugins/storytelling/src/pipeline.ts` — feeds entity indexing; a trimmed key differs from an untrimmed one.
- `plugins/media/src/tags/track.ts` — check what consumes the value before swapping.

Where trimming is wrong, keep the local variant and say why in a comment. A
blanket swap is the failure mode here.

## References

- {% ref "SPEC-140" /%} — Tier 2, D6

{% /work %}
