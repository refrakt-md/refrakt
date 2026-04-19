{% work id="WORK-149" status="done" priority="high" complexity="simple" tags="runes, refactor, foundation" source="SPEC-041" assignee="claude" %}

# Promote shared rune-reference infrastructure to packages/runes

> Ref: {% ref "SPEC-041" /%} (Agent Rune Reference) — Implementation, file layout

## Summary

Three pieces of rune-introspection infrastructure live in places that block reuse: `RuneInfo` and `describeRune()` are inside `packages/ai/src/prompt.ts` (locked behind the AI dependency), and `serializeContentModel()` lives in `packages/editor/src/server.ts` (locked behind the editor). The new `refrakt reference` command needs all three without pulling in either package.

Move them to a single shared module — `packages/runes/src/reference.ts` — and have the existing consumers re-import from there. No behavior change; this is pure refactor that unlocks everything else in SPEC-041.

## Acceptance Criteria

- [x] `packages/runes/src/reference.ts` exists and exports `RuneInfo`, `describeRune()`, `EXCLUDED_RUNES`, `HIDDEN_ATTRIBUTES`, and `serializeContentModel()` (alongside its `stripContentModel` helper)
- [x] `packages/runes/src/index.ts` re-exports the public surface from `reference.ts`
- [x] `packages/ai/src/prompt.ts` imports `RuneInfo`, `describeRune`, `EXCLUDED_RUNES`, `HIDDEN_ATTRIBUTES` from `@refrakt-md/runes` instead of defining them locally
- [x] `packages/editor/src/server.ts` imports `serializeContentModel` from `@refrakt-md/runes` instead of defining it locally
- [x] `packages/cli/src/commands/edit.ts` imports `serializeContentModel` from `@refrakt-md/runes` (replacing its `serializeContentModelForEditor` duplicate)
- [x] `packages/ai` no longer re-exports `RuneInfo` from its own surface (or, if kept for backcompat, the type alias points at the runes-package definition)
- [x] `npm run build` succeeds across all packages
- [x] `npm test` passes — existing prompt-builder tests, editor serialization tests, and CLI edit-command tests all continue to pass without modification

## Approach

1. Create `packages/runes/src/reference.ts`. Copy `RuneInfo`, `describeRune`, `describeAttribute`, `attributeTypeName`, `EXCLUDED_RUNES`, `HIDDEN_ATTRIBUTES` from `packages/ai/src/prompt.ts`. Copy `serializeContentModel` and `stripContentModel` from `packages/editor/src/server.ts:261-307`.
2. Export the public surface from `packages/runes/src/index.ts`.
3. Replace the original definitions in `packages/ai/src/prompt.ts` with imports. Keep `BASE_INSTRUCTIONS` and `buildPrompt` (the LLM-prompt-specific code) in place — only the rune-description machinery moves.
4. Replace the editor server's local `serializeContentModel` with an import.
5. Replace the CLI edit command's `serializeContentModelForEditor` with an import (the function names should converge — drop the `ForEditor` suffix).
6. Verify all existing tests still pass (no snapshot changes expected since the functions are byte-for-byte identical, just relocated).

## Dependencies

None — this is the foundation work item.

## References

- {% ref "SPEC-041" /%} — Agent Rune Reference (Implementation section)
- {% ref "SPEC-012" /%} — Rune Inspector (relies on the same `serializeContentModel` after this work)

## Resolution

Completed: 2026-04-19

Branch: `claude/scaffold-landing-docs-cli-DB31i`

### What was done
- **packages/runes/src/reference.ts** (new): consolidates `RuneInfo`, `describeRune`, `EXCLUDED_RUNES`, `HIDDEN_ATTRIBUTES`, `serializeContentModel`, `stripContentModel` (and helpers `attributeTypeName`, `describeAttribute`, `stripField`). Imports `RUNE_EXAMPLES` and types from `@refrakt-md/types`.
- **packages/runes/src/index.ts**: re-exports `describeRune`, `serializeContentModel`, `stripContentModel`, `EXCLUDED_RUNES`, `HIDDEN_ATTRIBUTES` (values) and `RuneInfo` (type) from `./reference.js`.
- **packages/ai/src/prompt.ts**: stripped to mode/prompt-specific code (BASE_INSTRUCTIONS, MODE_GUIDANCE, getModeGuidance, generateSystemPromptParts, generateSystemPrompt). Imports `describeRune`, `EXCLUDED_RUNES`, and `RuneInfo` from `@refrakt-md/runes`. Re-exports `RuneInfo` for backcompat (type alias points at the runes-package definition).
- **packages/editor/src/server.ts**: removed local `serializeContentModel`/`stripContentModel`/`stripField` (lines 845-903). Imports `serializeContentModel` from `@refrakt-md/runes` alongside the existing `runes`/`RUNE_EXAMPLES`/`schemaContentModels` imports. Dropped the now-unused `ContentModel` type import.
- **packages/cli/src/commands/edit.ts**: removed `serializeContentModelForEditor`/`stripModel`/`stripFieldDef` duplicate (lines 181-216). Adds `serializeContentModel` to the existing `await import('@refrakt-md/runes')` destructure and uses it at line 136.

### Notes
- `npm run build` succeeds across all packages.
- All tests in the directly affected packages pass (543 tests across packages/ai, packages/editor, packages/cli, packages/runes). The 4 failures in the full suite were 5000ms test timeouts in `runes/plan/` — unrelated, and the same tests pass cleanly when run in isolation.
- `RUNE_EXAMPLES` still lives in `packages/runes/src/examples.js`; `reference.ts` imports it directly. No new dependencies were introduced.

{% /work %}
