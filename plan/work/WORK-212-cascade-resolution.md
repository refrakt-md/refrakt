{% work id="WORK-212" status="done" priority="high" complexity="moderate" tags="cascade, content, tint" source="SPEC-052" milestone="v0.14.0" %}

# Cascade resolution function in @refrakt-md/content

Implement the pure resolution function that, given a page path, walks up the `_layout.md` chain accumulating `tint`, `tint-mode`, and `tint-lock` frontmatter values with last-write-wins semantics, falls back to `theme.colorScheme` at the root, and returns a deterministic `(tint, tintMode, locked)` tuple. The function the renderer ({% ref "WORK-214" /%}) consumes to emit `data-*` attributes on `<html>`.

## Acceptance Criteria

- [x] `resolveTintCascade(pagePath, config)` (or similar) exported from `packages/content/`
- [x] Function walks the layout chain from outermost (`_layout.md` at site root) to innermost (page frontmatter), accumulating each level's `tint` / `tint-mode` / `tint-lock` values
- [x] Last-write-wins per field — a page-level setting overrides the layout, a layout setting overrides outer layouts, an outer layout setting overrides the root config
- [x] Missing fields at any level mean inherit-from-next-outer — confirmed in tests
- [x] Explicit `null` in frontmatter resets the inherited value to "no override" (e.g., `tint: null` removes an inherited named tint without applying a new one)
- [x] Fallback to `theme.colorScheme` at the root if no `_layout.md` sets `tint-mode`
- [x] Returns the tuple deterministically — same inputs produce same outputs; no runtime state
- [x] Unit tests cover: simple cascade (root → leaf), per-level override, null reset, missing-field inheritance, deeply nested layouts (3+ levels), tint name + tint-mode combinations
- [x] Edge case: a page with no `_layout.md` chain above it (orphan page) returns root config + page frontmatter resolution

## Approach

Pure function in `@refrakt-md/content/src/cascade-resolution.ts` (or fold into an existing module that owns frontmatter resolution).

The walk algorithm:

```ts
function resolveTintCascade(pagePath, config) {
  const layoutChain = walkLayoutChain(pagePath); // [root_layout, ..., immediate_layout]
  let resolved = {
    tint: null,
    tintMode: config.theme?.colorScheme ?? 'auto',
    locked: false,
  };
  for (const layout of layoutChain) {
    if (layout.tint !== undefined) resolved.tint = layout.tint; // null is a real value
    if (layout.tintMode !== undefined) resolved.tintMode = layout.tintMode;
    if (layout.tintLock !== undefined) resolved.locked = layout.tintLock;
  }
  // page-level overrides
  const pageFront = readFrontmatter(pagePath);
  if (pageFront.tint !== undefined) resolved.tint = pageFront.tint;
  if (pageFront['tint-mode'] !== undefined) resolved.tintMode = pageFront['tint-mode'];
  if (pageFront['tint-lock'] !== undefined) resolved.locked = pageFront['tint-lock'];
  return resolved;
}
```

YAML null vs missing handling: the parser must distinguish `tint:` (empty, treat as missing) from `tint: ~` / `tint: null` (explicit null, treat as "reset"). Document the canonical idiom in the cascade docs page ({% ref "WORK-216" /%}).

## Dependencies

- {% ref "WORK-213" /%} — frontmatter schema must accept the new fields before this function can read them.
- {% ref "WORK-189" /%} — `theme.colorScheme` field at site level (the root of the cascade).

## References

- {% ref "SPEC-052" /%} — "The Cascade" and "SSR & Rendering" sections
- `packages/content/` — likely home for this function

{% /work %}
