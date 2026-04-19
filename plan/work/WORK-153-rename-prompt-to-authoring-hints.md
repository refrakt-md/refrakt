{% work id="WORK-153" status="done" priority="medium" complexity="simple" tags="runes, types, ai-workflow" source="SPEC-041" assignee="claude" %}

# Rename RuneInfo.prompt → authoringHints and surface in reference output

> Ref: {% ref "SPEC-041" /%} (Decision 6)

## Summary

`RuneInfo.prompt` is currently optional LLM-instruction text that `refrakt write` appends to its prompts. SPEC-041 promotes the same data to general agent-facing reference docs — the field is no longer write-specific. Rename to `authoringHints`, audit the ~5 existing values to read for both human and LLM audiences, and surface the content under a "Authoring notes" block in `describeRune` output.

## Acceptance Criteria

- [x] `RuneInfo.prompt` renamed to `RuneInfo.authoringHints` in `packages/runes/src/reference.ts` (after WORK-149)
- [x] `RunePackage.prompt` (or wherever the per-package extension currently lives) renamed to `authoringHints` in `packages/types/src/package.ts`
- [x] `describeRune()` renders `authoringHints` under a clear `Authoring notes:` heading rather than appending it to the description block
- [x] Every package and rune currently setting the `prompt` field is updated to use `authoringHints` and its content is rephrased to read naturally for both human readers and LLMs (no leading "When generating this rune..." imperatives)
- [x] `refrakt write` continues to use `authoringHints` in its prompt construction — no behaviour change for the write command other than the field rename
- [x] No remaining references to the old `prompt` field name in the codebase
- [x] `npm run build` and `npm test` pass

## Approach

1. Grep for `prompt:` and `prompt?:` in package definitions and rune declarations to find every consumer.
2. Rename the field on the type definitions first; the build will surface every site that needs updating.
3. For each occurrence, update the call site and rewrite the content if it's imperative LLM prose. Rule of thumb: the text should make sense if a human read it directly in the reference docs.
4. Update `describeRune` in `packages/runes/src/reference.ts` to render `authoringHints` as a separate section in the markdown output.
5. Verify `refrakt write` still produces sensible prompts (snapshot test on a representative rune).

## Dependencies

- WORK-149 (to operate on the relocated `RuneInfo` type)

## References

- {% ref "SPEC-041" /%} — Decision 6
- `packages/ai/src/prompt.ts:18` (current `prompt` field definition)
- `packages/ai/src/prompt.ts:85-87` (current rendering path)

## Resolution

Completed: 2026-04-19

Branch: `claude/scaffold-landing-docs-cli-DB31i`

### What was done
- Renamed `RuneInfo.prompt` → `RuneInfo.authoringHints` in `packages/runes/src/reference.ts` (also `RuneDescriptor.prompt` and `Rune.prompt` in `packages/runes/src/rune.ts`, and `RunePackageEntry.prompt` in `packages/types/src/package.ts`).
- `describeRune` now emits the hints under a dedicated `Authoring notes:` heading line instead of appending them flat to the description.
- Updated the wiring in `packages/runes/src/packages.ts` so loaded community packages feed `entry.authoringHints` into `defineRune`.
- `packages/cli/src/commands/package-validate.ts` now validates `authoringHints` instead of `prompt`.
- Updated the example + field table in `site/content/docs/packages/authoring.md` to use `authoringHints`.
- Updated tests: `packages/ai/test/prompt.test.ts` (rewrote the four prompt extension cases to assert the new "Authoring notes" section is emitted/omitted correctly), `packages/runes/test/packages.test.ts` (propagation assertion), and the `packages/runes/test/fixtures/mock-community-package/index.ts` fixture.
- Rephrased every existing hint string to read naturally for both human readers and LLMs — no more "Use this rune to..." imperatives.
- `refrakt write` continues to feed `authoringHints` through the same `generateSystemPrompt` path, so behaviour is preserved.

### Notes
- The `prompt` identifiers remaining in the codebase (`packages/cli/src/bin.ts`, `packages/cli/src/commands/write.ts`) refer to the user-supplied prompt string passed into `refrakt write`, not the rune metadata field — intentionally left unchanged.
- `runes/plan/test/build.test.ts > generates static HTML files` times out under full-suite parallelism but passes in isolation. Pre-existing flake, unrelated to this change.

{% /work %}
