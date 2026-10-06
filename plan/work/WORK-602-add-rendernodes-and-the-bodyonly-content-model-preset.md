{% work id="WORK-602" status="done" priority="medium" complexity="simple" milestone="v0.38.0" source="SPEC-140" tags="runes,transform,dx" pr="refrakt-md/refrakt#657" %}

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

- [x] `renderNodes` is exported from `@refrakt-md/runes` and adopted at the sites matching its exact shape
- [x] `bodyOnly()` is exported and adopted by the runes whose content model is exactly that shape
- [x] Sites that wrap or vary the cursor construction (e.g. `unwrapParagraphImages(...)`, a pre-built node array) are left explicit rather than forced through the helper
- [x] `refrakt contracts --check` and `npm run seo:baseline:check` report no drift
- [x] `npm test` passes unchanged

## Approach

Purely a spelling change — no behaviour, no output. Adopt only where the shape
matches exactly; the 72 cursor constructions that take a different argument
(`headerAstNodes`, `allItems`, a spread) stay as they are. A helper that has to
grow parameters to cover every caller is not worth having.

`bodyOnly()` returns a fresh object per call rather than a shared constant, so a
rune that spreads and overrides it cannot mutate the preset for everyone else.

## References

- {% ref "SPEC-140" /%} — Tier 3

## Resolution

Completed: 2026-10-06

Branch: `claude/v0-37-post-release-plan-dc3va1`

### What was done
- `packages/runes/src/lib/index.ts`: `renderNodes(value, config)` (wraps `asNodes` + `Markdoc.transform` + cast + cursor) and `bodyOnly()` (fresh body-only sequence model per call); both exported from the package index.
- 78 cursor constructions of exactly that shape rewritten across core + plugin tag files (the item estimated 81); now-unused `asNodes` / `RenderableNodeCursor` / `RenderableTreeNode` / `Markdoc` imports dropped.
- 49 rune content models → `bodyOnly()` — matches the item's count; seven were spelled `'sequence' as const` or with `greedy` before `optional`.
- Docs: `authoring-overview.md` (hint walkthrough) and `patterns.md` show `renderNodes` / `bodyOnly()`.

### Notes
- Left explicit: cursor constructions over pre-built node arrays or wrapped inputs, and nested `sectionModel` / `zoneModel` body-only copies (not a rune's content model).
- `refrakt inspect --json` over every rune × variant on both sites is byte-identical to main.

{% /work %}
