{% work id="WORK-650" status="draft" priority="medium" complexity="simple" source="SPEC-133" tags="runes, transform, contract, cleanup" milestone="v0.43.0" %}

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

- [ ] `property: 'contentSection'` is gone from every transform in `packages/runes/src/tags/` and `plugins/*/src/tags/`
- [ ] `packages/runes/src/documents/page.ts` and `doc.ts` are deleted and `documents` is no longer exported from `@refrakt-md/runes`
- [ ] The `PageSection` config entry, `packages/lumina/styles/runes/page-section.css` and its import in `packages/lumina/index.css` are removed, and the CSS coverage test passes
- [ ] `TransformResult.property` is removed, after checking whether any user besides `contentSection` remains (SPEC-133 names `error.ts`, which the 2026-10-22 audit could not find)
- [ ] Tests that assert the attribute are updated, and the composed-storytelling tests no longer record `data-field="content-section"` as a difference
- [ ] The four rune-authoring docs pages no longer document `contentSection`
- [ ] Contracts are regenerated on both copies and the diff reviewed; the SEO baseline does not move
- [ ] The changeset names the removed attribute and the removed `documents` export for third-party themes and tools

## References

- {% ref "SPEC-133" /%}: "Moved here from SPEC-130".
- {% ref "SPEC-160" /%}: its open question on `contentSection` is closed by this item.

{% /work %}
