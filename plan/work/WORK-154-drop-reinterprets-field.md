{% work id="WORK-154" status="ready" priority="low" complexity="simple" tags="runes, cleanup, types" source="SPEC-041" %}

# Drop the reinterprets field entirely

> Ref: {% ref "SPEC-041" /%} (Decision 4 — final step)

## Summary

After WORK-150 (renderer), WORK-151 (presets), and WORK-152 (legacy migration + custom audit), the `reinterprets` field is fully redundant: every rune has a content model that the renderer can describe, and `custom`-pattern runes carry their own `description` string. Remove the field from the type definitions and from the rendering path so future runes don't have to populate a now-meaningless field.

## Acceptance Criteria

- [ ] `reinterprets` removed from `RuneDescriptor` in `packages/runes/src/rune.ts`
- [ ] `reinterprets` removed from `RuneInfo` in `packages/runes/src/reference.ts`
- [ ] All `reinterprets: { ... }` declarations removed from rune `defineRune` calls (across core and community packages)
- [ ] The legacy fallback path in `describeRune` (`Content interpretation:` block) is removed
- [ ] No remaining references to `reinterprets` in the codebase except in archived/historical docs
- [ ] `npm run build` and `npm test` pass — including the snapshot tests added in WORK-150 (output should be identical or richer, never poorer)

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

{% /work %}
