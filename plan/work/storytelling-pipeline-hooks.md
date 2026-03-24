{% work id="WORK-054" status="ready" priority="high" complexity="moderate" tags="storytelling, pipeline" %}

# Storytelling Package Pipeline Hooks

> Ref: SPEC-002 (Cross-Page Pipeline — Reference Resolution, Package Entity Types)

## Summary

The `@refrakt-md/storytelling` package defines 7 rune types (character, realm, faction, lore, plot, bond, storyboard) but has no `pipelineHooks`. Storytelling entities are invisible to the cross-page pipeline — bold character names can't auto-link to character pages, bonds can't resolve their `from`/`to` targets, and there's no relationship map data.

Add pipeline hooks that register storytelling entities, build a relationship graph from bonds, and resolve bold-text cross-links during post-processing.

## Acceptance Criteria

- [ ] Storytelling package exports `pipelineHooks` with `register`, `aggregate`, and `postProcess` hooks
- [ ] `register` hook registers entities for: character, realm, faction, lore, plot, bond
- [ ] Each entity includes: name, type, source page URL, and type-specific metadata (role, spoiler level, etc.)
- [ ] `aggregate` hook builds a relationship graph from bond entities
- [ ] `aggregate` hook validates bond references — warns on orphaned bonds (from/to entity doesn't exist)
- [ ] `postProcess` hook resolves bold text (`**Veshra**`) to cross-page links when the name matches a registered entity
- [ ] Cross-links only resolve to other pages (not self-links on the entity's own page)
- [ ] Cross-links resolve first occurrence per page only (avoid over-linking)
- [ ] Cross-links don't resolve inside headings, code blocks, or other runes
- [ ] Tests cover entity registration, bond validation, and cross-link resolution

## Approach

Follow the pattern established by `planPipelineHooks` in `runes/plan/src/pipeline.ts`. Walk each page's renderable tree looking for nodes with `typeof` matching storytelling schema types (`Character`, `Realm`, `Faction`, `Lore`, `Plot`, `Bond`). Extract the `name` property and register entities.

For bold-text cross-linking in `postProcess`, walk the AST looking for `strong` nodes. Extract their text content, check against the registry, and wrap in a link if a match exists on a different page.

## References

- SPEC-002 (Cross-Page Pipeline — Pattern 1: Reference Resolution)
- SPEC-001 (Community Runes — `@refrakt-md/storytelling`)

{% /work %}
