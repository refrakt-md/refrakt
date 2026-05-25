{% work id="WORK-269" status="done" priority="medium" complexity="moderate" source="SPEC-069" tags="runes, expand, embed" milestone="v0.16.0" %}

# embed() embeddability contract

Generalize SPEC-066's `sourceFile` + `extract` into the `embed()` contract: an entity is embeddable if it has `embed()` *or* (`sourceFile` + `extract`). `expand` and the `entityRoutes` adapter accept either, so external plugins can make entities embeddable without a source file on disk.

## Acceptance Criteria
- [ ] An entity is embeddable if it has `embed()` or (`sourceFile` + `extract`); `expand` resolves both forms
- [ ] `embed()` returns the entity's renderable subtree (or source) for inlining
- [ ] Entities with neither produce a clear build error when expanded, naming the entity
- [ ] The existing plan expand path (sourceFile + extract, from v0.15.0) continues to work unchanged

## Dependencies
None — extends the existing expand/embeddability machinery; WORK-270 uses it for plan entities.

## References

- {% ref "SPEC-069" /%}

## Resolution

Completed: 2026-05-25

Branch: `claude/v0.16.0`

### What was done
- `EntityRegistration.embed?: () => Node | null` added to the contract (SPEC-069): returns the entity's embeddable AST directly, no file read.
- `expand-pipeline.ts`: embeddability check is now `embed() || (sourceFile && extract)`; resolution prefers `embed()` (no projectRoot needed), else reads + extracts from `sourceFile`; clear error when neither is present.
- Test: added an `embed()`-without-source-file case to `packages/runes/test/expand-pipeline.test.ts` (19 green); the existing file-backed path (sourceFile+extract) is unchanged.

### Notes
- Enables external plugins (Jira/Notion/etc.) to make entities embeddable without a file on disk. The plan plugin keeps using sourceFile+extract (WORK-270 sets those).

{% /work %}
