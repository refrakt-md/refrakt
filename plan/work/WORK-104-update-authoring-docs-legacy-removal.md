{% work id="WORK-104" status="done" priority="medium" complexity="simple" tags="docs, content-model" milestone="v1.0.0" source="SPEC-032" %}

# Update authoring docs after legacy Model removal

Remove or rewrite documentation that references the legacy Model class, decorators, and `createSchema`. After this work, the authoring docs present `createContentModelSchema` as the single path.

## Files to update

- `site/content/docs/authoring/model-api.md` — **Delete entirely** (full Model API reference, no longer applicable)
- `site/content/docs/authoring/overview.md` — Remove references to Model class and decorator approach
- `site/content/docs/authoring/patterns.md` — Rewrite patterns to use `createContentModelSchema` exclusively
- `site/content/docs/authoring/content-models.md` — Review for any legacy cross-references
- `site/content/docs/packages/authoring.md` — Ensure community package guide only references the modern API

## Acceptance Criteria

- [x] `model-api.md` is deleted
- [x] No remaining references to `Model`, `@attribute`, `@group`, `@groupList`, `@id`, or `createSchema` in any authoring doc
- [x] `patterns.md` examples all use `createContentModelSchema`
- [x] `overview.md` presents `createContentModelSchema` as the sole schema API
- [x] Community package authoring guide uses only the modern pattern
- [x] Site builds successfully (`cd site && npm run build`)
- [x] No broken internal links (removed page references updated)

## Dependencies

- {% ref "WORK-103" /%} (legacy code removed — docs should match the actual API)

## References

- {% ref "SPEC-032" /%} (parent spec)

## Resolution

Completed: 2026-04-02

Branch: `claude/implement-spec-032-2KBbw`

### What was done
- Deleted `model-api.md` (full Model API reference page)
- Removed `model-api` from nav in `_layout.md`
- Rewrote Hint example in `authoring-overview.md` to use `createContentModelSchema`
- Updated checklist tables to reference `createContentModelSchema` instead of "Model class"
- Rewrote `patterns.md` — header+body split, child item runes, and field ordering sections
- Updated `content-models.md` — removed Model class cross-reference, updated `base` comment
- Rewrote `packages/authoring.md` — game-item example uses `createContentModelSchema`
- Site builds successfully (128 pages)

{% /work %}
