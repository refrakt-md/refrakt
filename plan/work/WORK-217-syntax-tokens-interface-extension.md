{% work id="WORK-217" status="ready" priority="high" complexity="small" tags="types, tokens, syntax-highlighting, contract" source="SPEC-056" milestone="v0.14.1" %}

# Extend `SyntaxTokens` interface with optional roles

Add 7 new optional roles to the `SyntaxTokens` interface in `packages/types/src/token-contract.ts` — `type`, `property`, `parameter`, `tag`, `attribute`, `operator`, `number`, `regex` — each with JSDoc documenting the role and its core-role fallback. Existing 7 required + 2 optional roles are unchanged.

## Acceptance Criteria

- [ ] `SyntaxTokens` in `packages/types/src/token-contract.ts` exports the full 7-required + 9-optional shape from SPEC-056's "Authoring Surface" section
- [ ] Each new optional field has JSDoc describing (a) what the role represents in source code and (b) which core role it falls back to when unset
- [ ] `DeepPartial<SyntaxTokens>` (used by mode overlays and presets) still works — new optional fields flow through automatically
- [ ] No changes to runtime code in this work item — types only
- [ ] `npm run build -w packages/types` passes
- [ ] `npm test` for downstream packages that import `SyntaxTokens` (transform, runes, lumina, highlight) passes unchanged — adding optional fields must not break any existing consumer

## Approach

Pure interface extension. Add the new optional fields after the existing `link?` and `'string-expression'?` fields, grouped under a `// ── Optional, extended ──` comment marker matching the structure shown in SPEC-056.

Fallback documentation goes in JSDoc only — the actual fallback logic lives in the CSS generator (WORK-219), not in the type. Keep the type surface declarative.

The Niwaki preset (`packages/lumina/src/presets/niwaki.ts`) must not need modification — verify by building Lumina against the updated type.

## Dependencies

None — types-only change, can land first.

## References

- {% ref "SPEC-056" /%} — "Authoring Surface" section with the full interface definition
- `packages/types/src/token-contract.ts` — current `SyntaxTokens` interface (line ~171)

{% /work %}
