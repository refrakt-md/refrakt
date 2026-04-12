{% work id="WORK-054" status="done" priority="high" complexity="moderate" tags="storytelling, pipeline" milestone="v0.9.0" source="SPEC-001,SPEC-002" %}

# Storytelling Package Pipeline Hooks

> Ref: SPEC-002 (Cross-Page Pipeline — Reference Resolution, Package Entity Types)

## Summary

The `@refrakt-md/storytelling` package defines 7 rune types (character, realm, faction, lore, plot, bond, storyboard) but has no `pipelineHooks`. Storytelling entities are invisible to the cross-page pipeline — bold character names can't auto-link to character pages, bonds can't resolve their `from`/`to` targets, and there's no relationship map data.

Add pipeline hooks that register storytelling entities, build a relationship graph from bonds, and resolve bold-text cross-links during post-processing.

## Acceptance Criteria

- [x] Storytelling package exports `pipelineHooks` with `register`, `aggregate`, and `postProcess` hooks
- [x] `register` hook registers entities for: character, realm, faction, lore, plot, bond
- [x] Each entity includes: name, type, source page URL, and type-specific metadata (role, spoiler level, etc.)
- [x] `aggregate` hook builds a relationship graph from bond entities
- [x] `aggregate` hook validates bond references — warns on orphaned bonds (from/to entity doesn't exist)
- [x] `postProcess` hook resolves bold text (`**Veshra**`) to cross-page links when the name matches a registered entity
- [x] Cross-links only resolve to other pages (not self-links on the entity's own page)
- [x] Cross-links resolve first occurrence per page only (avoid over-linking)
- [x] Cross-links don't resolve inside headings, code blocks, or other runes
- [x] Tests cover entity registration, bond validation, and cross-link resolution

## Approach

Follow the pattern established by `planPipelineHooks` in `runes/plan/src/pipeline.ts`. Walk each page's renderable tree looking for nodes with `typeof` matching storytelling schema types (`Character`, `Realm`, `Faction`, `Lore`, `Plot`, `Bond`). Extract the `name` property and register entities.

For bold-text cross-linking in `postProcess`, walk the AST looking for `strong` nodes. Extract their text content, check against the registry, and wrap in a link if a match exists on a different page.

## References

- {% ref "SPEC-002" /%} (Cross-Page Pipeline — Pattern 1: Reference Resolution)
- {% ref "SPEC-001" /%} (Community Runes — `@refrakt-md/storytelling`)

## Resolution

Branch: `claude/work-item-054-aBDgF`
PR: refrakt-md/refrakt#130

### What was done
- Created `runes/storytelling/src/pipeline.ts` with all three pipeline hooks
- `register` hook identifies runes via `data-rune` attribute, reads entity names from `data-name` refs and metadata from `data-field` meta tags (using kebab-case conversion matching the identity transform engine)
- `aggregate` hook builds entity-by-name map including character aliases, constructs bidirectional relationship graph from bonds, and emits warnings for orphaned bond references
- `postProcess` hook walks the renderable tree, wrapping matching `strong` tags in `<a>` links to entity pages; tracks linked names per page for first-occurrence-only behavior; skips headings, code blocks, and nested rune containers
- Wired hooks into the `RunePackage` export via `pipeline` field in `index.ts`
- Added 19 tests covering all acceptance criteria (64 total storytelling tests passing)

### Notes
- Property names are stored as kebab-case `data-field` attributes after identity transform (e.g., `bondType` → `bond-type`), so the pipeline's `readField` helper applies `toKebabCase` conversion
- Character aliases are registered as additional entity-by-name entries pointing to the same entity registration, enabling cross-links via alternate names (e.g., "Strider" → Aragorn's page)

{% /work %}
