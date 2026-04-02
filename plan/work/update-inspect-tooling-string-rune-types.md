{% work id="WORK-108" status="done" priority="medium" complexity="simple" tags="cli, tooling" milestone="v1.0.0" %}

# Update inspect tooling for string-based rune types

Phase 2c of ADR-005. Update `refrakt inspect` and related tooling to use the `Rune.typeName` string field instead of `rune.type?.name`. Small change (~4 lines) but needed before Phase 3 cleanup can remove the `Type` class.

Depends on WORK-105 (dual-signature support) being complete.

## Acceptance Criteria

- [ ] `packages/cli/src/commands/inspect.ts` uses `rune.typeName` instead of `rune.type?.name`
- [ ] `refrakt inspect hint --type=all` output is identical before and after
- [ ] `refrakt inspect --list` output is identical before and after
- [ ] `refrakt inspect hint --audit` output is identical before and after
- [ ] Any other tooling that reads `rune.type` is updated (language server inspector, vscode inspector)

## Key Files

- `packages/cli/src/commands/inspect.ts` — main inspector (lines 163-164, 222-223, 281-282)
- `packages/language-server/src/providers/inspector.ts` — LSP inspector
- `packages/vscode/src/inspector.ts` — VSCode extension inspector

## Approach

1. Search for all usages of `rune.type?.name`, `rune.type?.schemaOrgType`, and `rune.type` across the codebase
2. Replace with `rune.typeName` and `rune.schemaOrgType` respectively
3. Verify inspect output is unchanged

## References

- ADR-005 (Phase 2)
- WORK-105 (dependency — dual-signature support)

{% /work %}
