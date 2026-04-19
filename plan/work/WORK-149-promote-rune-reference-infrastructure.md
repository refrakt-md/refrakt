{% work id="WORK-149" status="ready" priority="high" complexity="simple" tags="runes, refactor, foundation" source="SPEC-041" %}

# Promote shared rune-reference infrastructure to packages/runes

> Ref: {% ref "SPEC-041" /%} (Agent Rune Reference) — Implementation, file layout

## Summary

Three pieces of rune-introspection infrastructure live in places that block reuse: `RuneInfo` and `describeRune()` are inside `packages/ai/src/prompt.ts` (locked behind the AI dependency), and `serializeContentModel()` lives in `packages/editor/src/server.ts` (locked behind the editor). The new `refrakt reference` command needs all three without pulling in either package.

Move them to a single shared module — `packages/runes/src/reference.ts` — and have the existing consumers re-import from there. No behavior change; this is pure refactor that unlocks everything else in SPEC-041.

## Acceptance Criteria

- [ ] `packages/runes/src/reference.ts` exists and exports `RuneInfo`, `describeRune()`, `EXCLUDED_RUNES`, `HIDDEN_ATTRIBUTES`, and `serializeContentModel()` (alongside its `stripContentModel` helper)
- [ ] `packages/runes/src/index.ts` re-exports the public surface from `reference.ts`
- [ ] `packages/ai/src/prompt.ts` imports `RuneInfo`, `describeRune`, `EXCLUDED_RUNES`, `HIDDEN_ATTRIBUTES` from `@refrakt-md/runes` instead of defining them locally
- [ ] `packages/editor/src/server.ts` imports `serializeContentModel` from `@refrakt-md/runes` instead of defining it locally
- [ ] `packages/cli/src/commands/edit.ts` imports `serializeContentModel` from `@refrakt-md/runes` (replacing its `serializeContentModelForEditor` duplicate)
- [ ] `packages/ai` no longer re-exports `RuneInfo` from its own surface (or, if kept for backcompat, the type alias points at the runes-package definition)
- [ ] `npm run build` succeeds across all packages
- [ ] `npm test` passes — existing prompt-builder tests, editor serialization tests, and CLI edit-command tests all continue to pass without modification

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

{% /work %}
