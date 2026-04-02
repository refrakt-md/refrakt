{% work id="WORK-104" status="ready" priority="medium" complexity="simple" tags="docs, content-model" milestone="v1.0.0" %}

# Update authoring docs after legacy Model removal

Remove or rewrite documentation that references the legacy Model class, decorators, and `createSchema`. After this work, the authoring docs present `createContentModelSchema` as the single path.

## Files to update

- `site/content/docs/authoring/model-api.md` — **Delete entirely** (full Model API reference, no longer applicable)
- `site/content/docs/authoring/overview.md` — Remove references to Model class and decorator approach
- `site/content/docs/authoring/patterns.md` — Rewrite patterns to use `createContentModelSchema` exclusively
- `site/content/docs/authoring/content-models.md` — Review for any legacy cross-references
- `site/content/docs/packages/authoring.md` — Ensure community package guide only references the modern API

## Acceptance Criteria

- [ ] `model-api.md` is deleted
- [ ] No remaining references to `Model`, `@attribute`, `@group`, `@groupList`, `@id`, or `createSchema` in any authoring doc
- [ ] `patterns.md` examples all use `createContentModelSchema`
- [ ] `overview.md` presents `createContentModelSchema` as the sole schema API
- [ ] Community package authoring guide uses only the modern pattern
- [ ] Site builds successfully (`cd site && npm run build`)
- [ ] No broken internal links (removed page references updated)

## Dependencies

- WORK-103 (legacy code removed — docs should match the actual API)

## References

- SPEC-032 (parent spec)

{% /work %}
