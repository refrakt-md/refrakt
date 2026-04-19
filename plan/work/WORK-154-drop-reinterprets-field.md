{% work id="WORK-154" status="done" priority="low" complexity="simple" tags="runes, cleanup, types" source="SPEC-041" assignee="claude" %}

# Drop the reinterprets field entirely

> Ref: {% ref "SPEC-041" /%} (Decision 4 — final step)

## Summary

After WORK-150 (renderer), WORK-151 (presets), and WORK-152 (legacy migration + custom audit), the `reinterprets` field is fully redundant: every rune has a content model that the renderer can describe, and `custom`-pattern runes carry their own `description` string. Remove the field from the type definitions and from the rendering path so future runes don't have to populate a now-meaningless field.

## Acceptance Criteria

- [x] `reinterprets` removed from `RuneDescriptor` in `packages/runes/src/rune.ts`
- [x] `reinterprets` removed from `RuneInfo` in `packages/runes/src/reference.ts`
- [x] All `reinterprets: { ... }` declarations removed from rune `defineRune` calls (across core and community packages)
- [x] The legacy fallback path in `describeRune` (`Content interpretation:` block) is removed
- [x] No remaining references to `reinterprets` in the codebase except in archived/historical docs
- [x] `npm run build` and `npm test` pass — including the snapshot tests added in WORK-150 (output should be identical or richer, never poorer)

## Approach

1. Verify WORK-152 is complete — every rune has a content model and `reinterprets` is already optional.
2. Remove the field from the type definitions.
3. Run `npm run build` to find every call site that's now passing a field that doesn't exist; remove the offending property from each `defineRune` call.
4. Remove the fallback rendering path from `describeRune`.
5. Update the `RuneDescriptor` JSDoc to reflect the simpler shape.
6. Re-run snapshot tests; spot-check that no rune lost meaningful information by comparing reference output before/after.

## Dependencies

- WORK-150 (renderer must be live)
- WORK-152 (every rune must have a content model)

## References

- {% ref "SPEC-041" /%} — Decision 4

## Resolution

Completed: 2026-04-19

Branch: `claude/scaffold-landing-docs-cli-DB31i`

### What was done

- `packages/runes/src/rune.ts` — dropped `reinterprets` from `RuneDescriptor`, the `Rune` class field, and constructor assignment
- `packages/runes/src/reference.ts` — dropped `reinterprets` from `RuneInfo` and removed the legacy `Content interpretation:` fallback in `describeRune` (content model is now the sole source)
- `packages/types/src/package.ts` — dropped `reinterprets` from `RunePackageEntry`
- `packages/runes/src/packages.ts` — removed the `reinterprets` field from the `defineRune()` wiring for package entries
- `packages/runes/src/index.ts` and all community package index files (`runes/{business,design,docs,learning,marketing,media,places,plan,storytelling}/src/index.ts`) — bulk-removed 77 `reinterprets: { ... }` declarations from `defineRune` call sites
- `packages/cli/src/commands/package-validate.ts` — removed the `reinterprets` validation branch
- `packages/cli/src/commands/edit.ts` — switched the child-only-rune filter from `!entry.reinterprets && !entry.fixture` to `!entry.fixture`; presence of a fixture now signals "top-level rune"
- `packages/cli/src/lib/lazy-ai.ts` — removed `reinterprets` from the local `RuneInfo` shape
- `packages/language-server/src/registry/loader.ts` — dropped `reinterprets` from `RuneInfo`, `RunePackageLike`, `indexRunes`, and the `defineRune` call in `loadPackageFromWorkspace`
- `packages/language-server/src/providers/hover.ts` and `.../completion.ts` — removed the `**Reinterprets:**` rendering blocks
- Test suites updated: `packages/runes/test/reference.test.ts`, `packages/runes/test/rune.test.ts`, `packages/ai/test/prompt.test.ts`, `packages/language-server/test/hover.test.ts`, `packages/language-server/test/registry.test.ts` — removed the reinterprets-specific tests and stripped `reinterprets` literals from fixtures
- `site/content/docs/packages/authoring.md` and `site/content/docs/authoring/authoring-overview.md` — removed `reinterprets` from example schemas and the field-reference table

### Notes

- The only remaining `reinterprets` string matches in the repo are prose uses of the English verb in blog posts / patterns docs and historical plan documents — none are field references.
- `npm run build` and `npm test` both pass (180 test files, 2121 tests).
- Ends SPEC-041 Decision 4. With the field gone, every rune's reference output is driven by its content model (renderer from WORK-150) plus the tiered attribute presets (WORK-151).

{% /work %}
