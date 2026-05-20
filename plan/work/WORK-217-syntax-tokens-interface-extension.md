{% work id="WORK-217" status="done" priority="high" complexity="small" tags="types, tokens, syntax-highlighting, contract" source="SPEC-056" milestone="v0.14.1" %}

# Extend `SyntaxTokens` interface with optional roles

Add 7 new optional roles to the `SyntaxTokens` interface in `packages/types/src/token-contract.ts` — `type`, `property`, `parameter`, `tag`, `attribute`, `operator`, `number`, `regex` — each with JSDoc documenting the role and its core-role fallback. Existing 7 required + 2 optional roles are unchanged.

## Acceptance Criteria

- [x] `SyntaxTokens` in `packages/types/src/token-contract.ts` exports the full 7-required + 9-optional shape from SPEC-056's "Authoring Surface" section
- [x] Each new optional field has JSDoc describing (a) what the role represents in source code and (b) which core role it falls back to when unset
- [x] `DeepPartial<SyntaxTokens>` (used by mode overlays and presets) still works — new optional fields flow through automatically
- [x] No changes to runtime code in this work item — types only
- [x] `npm run build -w packages/types` passes
- [x] `npm test` for downstream packages that import `SyntaxTokens` (transform, runes, lumina, highlight) passes unchanged — adding optional fields must not break any existing consumer

## Approach

Pure interface extension. Add the new optional fields after the existing `link?` and `'string-expression'?` fields, grouped under a `// ── Optional, extended ──` comment marker matching the structure shown in SPEC-056.

Fallback documentation goes in JSDoc only — the actual fallback logic lives in the CSS generator (WORK-219), not in the type. Keep the type surface declarative.

The Niwaki preset (`packages/lumina/src/presets/niwaki.ts`) must not need modification — verify by building Lumina against the updated type.

## Dependencies

None — types-only change, can land first.

## References

- {% ref "SPEC-056" /%} — "Authoring Surface" section with the full interface definition
- `packages/types/src/token-contract.ts` — current `SyntaxTokens` interface (line ~171)

## Resolution

Completed: 2026-05-20

Branch: `claude/spec-056-milestone-v0-14-1`

### What was done

- `packages/types/src/token-contract.ts` — extended `SyntaxTokens` with the 7 new optional roles per SPEC-056: `type`, `property`, `parameter`, `tag`, `attribute`, `operator`, `number`, `regex`. Each carries JSDoc documenting (a) the role's meaning and (b) its fallback core role. Block-comment dividers separate "required core", "optional, existing", and "optional, extended (SPEC-056)" tiers for readability.
- Rewrote the interface-level JSDoc comment block. The previous comment claimed "there is no `type` field" and that "Shiki paints types as token-function" — both still factually true at the highlighter layer (SPEC-056 addresses that gap in WORK-218 via the extended css-variables theme) but no longer the contract-level story. New comment explains the tiered shape and points to the fallback chain handled by the CSS generator (WORK-219).

### Notes

- Pure types change: no runtime code modified. `DeepPartial<SyntaxTokens>` inherits the new optional fields automatically (recursive distribution).
- `npm run build` clean across the full monorepo. `npx vitest run packages/types packages/transform packages/runes packages/lumina packages/highlight` passes 1028/1028 tests.
- Niwaki (`packages/lumina/src/presets/niwaki.ts`) is untouched and continues to be valid — its 9-role shape is a subset of the new 16-role shape.
- Note on `--rf-syntax-*` vs `--rf-syntax-token-*` naming. The contract leaf `syntax.keyword` maps to `--rf-syntax-keyword` per SPEC-048's flattening rule (preserving existing variable names). Shiki's css-variables theme emits `--rf-syntax-token-keyword`. These two surfaces meet in the CSS generator and the Shiki integration; WORK-219 and WORK-218 land the reconciliation. The types are agnostic.

{% /work %}
