{% work id="WORK-118" status="done" priority="high" complexity="low" tags="runes, validation, architecture" milestone="v1.0.0" %}

# Validate property and ref name uniqueness in createComponentRenderable

> Ref: ADR-008 (Framework-native component interface for rune overrides)

## Summary

Add a static validation step to `createComponentRenderable` that checks for naming collisions between `properties` keys and `refs` keys. Since ADR-008 uses a flat namespace where both properties and refs become component props/slots, duplicate names would cause silent overwrites.

## Acceptance Criteria

- [x] `createComponentRenderable` throws a descriptive error if any key appears in both `properties` and `refs`
- [x] Error message includes the rune name and the colliding key(s)
- [x] All existing runes pass validation (no current collisions)
- [x] Unit test for collision detection
- [x] Unit test confirming no false positives on valid runes

## Approach

1. In `packages/runes/src/lib/component.ts`, add a Set intersection check between `Object.keys(properties)` and `Object.keys(refs)` before building the renderable
2. Throw with rune name and colliding keys if intersection is non-empty


## Resolution

Completed: 2026-04-04

Branch: `claude/adr-008-implementation-nBN9K`

### What was done
- Added Set intersection validation in `packages/runes/src/lib/component.ts`
- Fixed 3 pre-existing collisions: bento-cell `icon` (renamed property to `iconSource`), faction/realm `name` (removed from properties, kept as ref only)
- 9 unit tests in `packages/runes/test/component.test.ts`

### Notes
- Validation runs before attribute decoration, catching collisions at build time
- All 1969 existing tests pass after fixing the 3 collisions
