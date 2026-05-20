{% work id="WORK-222" status="done" priority="low" complexity="trivial" tags="docs, plan, specs" source="SPEC-056" milestone="v0.14.1" %}

# Cross-reference SPEC-056 from SPEC-048

Add a brief pointer from {% ref "SPEC-048" /%} (the design tokens contract foundation) to {% ref "SPEC-056" /%} (the syntax tier extension) so readers of SPEC-048 discover the extended syntax surface and don't model their understanding on the original 9-role contract.

## Acceptance Criteria

- [x] `plan/specs/SPEC-048-design-tokens-contract.md` mentions SPEC-056 in the appropriate place — either in the syntax tokens discussion or in a "Subsequent extensions" subsection near the end
- [x] The reference uses `{% ref "SPEC-056" /%}` syntax so the plan validator catches link rot
- [x] One sentence is enough — this is a signpost, not a re-explanation. Example: "The optional syntax role set was widened in {% ref \"SPEC-056\" /%} to support importing well-known palettes; see that spec for the current `SyntaxTokens` shape."

## Approach

Trivial doc edit. Locate the section of SPEC-048 that introduces `SyntaxTokens` (around the "Highlighter is an implementation detail" principle) and add the pointer. Don't restate SPEC-056's content — just link.

## Dependencies

None — SPEC-056 exists; no implementation dependency.

## References

- {% ref "SPEC-048" /%} — `plan/specs/SPEC-048-design-tokens-contract.md`
- {% ref "SPEC-056" /%} — `plan/specs/SPEC-056-syntax-token-contract-extension.md`

## Resolution

Completed: 2026-05-20

Branch: \`claude/spec-056-milestone-v0-14-1\`

Added a one-paragraph cross-reference inside SPEC-048's "Highlighter is an implementation detail" design principle. The pointer covers all three of SPEC-056's extensions (syntax role widening, optional code-surface claim, scoped tint projection) so readers of SPEC-048 don't model their understanding on the original 9-role contract or the original tint vocabulary.

{% /work %}
