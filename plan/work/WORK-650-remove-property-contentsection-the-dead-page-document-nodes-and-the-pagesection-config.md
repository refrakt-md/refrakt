{% work id="WORK-650" status="done" priority="medium" complexity="simple" source="SPEC-133" tags="runes, transform, contract, cleanup" milestone="v0.43.0" pr="refrakt-md/refrakt#721" %}

# Remove property contentSection, the dead Page document nodes and the PageSection config

28 transforms pass `property: 'contentSection'` to `createComponentRenderable`, which emits
`data-field="content-section"` on the rune root. Nothing reads it. The one consumer that ever
existed, the `Page` document node, compares the camelCase `'contentSection'` against the
kebab-cased attribute, so it could never match, and it is never registered by any Markdoc
config. `Page` also stamps `typeof="PageSection"`, which is not a schema.org type.
{% ref "SPEC-133" /%} decided the removal; v0.35.0 deferred it because it changes HTML on every
section rune, and nothing has carried it out since.

It lands first in v0.43.0 because it touches the runes {% ref "SPEC-160" /%} changes next, and
it removes one recorded plugin-vs-composed difference from the four composed-storytelling tests
before {% ref "WORK-653" /%} re-runs those comparisons.

## Acceptance Criteria

- [x] `property: 'contentSection'` is gone from every transform in `packages/runes/src/tags/` and `plugins/*/src/tags/`
- [x] `packages/runes/src/documents/page.ts` and `doc.ts` are deleted, and neither `documents` nor `Page` (`export { Page }` in `packages/runes/src/index.ts`) is exported from `@refrakt-md/runes` any more
- [x] The `PageSection` config entry, `page-section.css` in both `packages/lumina/styles/runes/` and `packages/skeleton/styles/runes/`, and their imports in `packages/lumina/index.css` and `packages/skeleton/index.css` are removed, and the CSS coverage test passes
- [x] `TransformResult.property` stays accepted but is ignored and marked `@deprecated` for one minor release, so a third-party plugin that still passes it keeps type-checking; its removal is noted for the release after. Before that, check whether any user besides `contentSection` remains (SPEC-133 names `error.ts`, which no longer exists; the 2026-10-26 review found all 28 `property` arguments to `createComponentRenderable` are `contentSection`)
- [x] Tests that assert the attribute are updated, and the composed-storytelling tests no longer record `data-field="content-section"` as a difference
- [x] The four rune-authoring docs pages no longer document `contentSection`
- [x] Contracts are regenerated on both copies and the diff reviewed; the SEO baseline does not move
- [x] The changeset names the removed attribute, the removed `documents` and `Page` exports (they never ran, so they are removed outright) and the deprecated `property` field

## References

- {% ref "SPEC-133" /%}: "Moved here from SPEC-130".
- {% ref "SPEC-160" /%}: its open question on `contentSection` is closed by this item.

## Resolution

Completed: 2026-10-26

Branch: `claude/v0-43-0-review-ny4nl1`

### What was done
- 28 transforms (`packages/runes/src/tags/` and the marketing, docs, storytelling, business, places, media and learning plugins) no longer pass `property: 'contentSection'`, so no rune root carries `data-field="content-section"`.
- `packages/runes/src/lib/component.ts`: `TransformResult.property` is `@deprecated` and ignored. `packages/runes/src/lib/slots.ts`: `EmitsDeclaration.property` is the same, and it is no longer forwarded.
- `packages/runes/src/documents/page.ts` and `doc.ts` are deleted, and the `documents` and `Page` exports are dropped from `packages/runes/src/index.ts`.
- The `PageSection` config entry is removed from `packages/runes/src/config.ts`, and `page-section.css` and its import are removed from both Lumina and the skeleton.
- Docs: the `contentSection` lines are removed from `patterns.md`, `content-models.md`, `output-contract.md` and `authoring-overview.md`. `output-contract.md` documents `property` as deprecated.
- Tests: `slots.test.ts`, the four composed-storytelling tests, `hero-content-model.test.ts` and the plan `emits-equivalence` snapshot are updated.
- Contracts are regenerated on both copies; the `PageSection` entry is gone. `site/content/_data` rune attributes are regenerated. The SEO baseline does not move.

### Notes
- No `property` user besides `contentSection` remains. `error.ts` no longer exists.
- One side effect in the recorded trees: a child rune placed through a parent's `properties` (for example `character-section`) prints `data-field` after `class` instead of before it. The old empty `data-field` key used to reserve that position. The attributes are the same.

{% /work %}
