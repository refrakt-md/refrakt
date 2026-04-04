{% work id="WORK-118" status="ready" priority="high" complexity="low" tags="runes, validation, architecture" milestone="v1.0.0" %}

# Validate property and ref name uniqueness in createComponentRenderable

> Ref: ADR-008 (Framework-native component interface for rune overrides)

## Summary

Add a static validation step to `createComponentRenderable` that checks for naming collisions between `properties` keys and `refs` keys. Since ADR-008 uses a flat namespace where both properties and refs become component props/slots, duplicate names would cause silent overwrites.

## Acceptance Criteria

- [ ] `createComponentRenderable` throws a descriptive error if any key appears in both `properties` and `refs`
- [ ] Error message includes the rune name and the colliding key(s)
- [ ] All existing runes pass validation (no current collisions)
- [ ] Unit test for collision detection
- [ ] Unit test confirming no false positives on valid runes

## Approach

1. In `packages/runes/src/lib/component.ts`, add a Set intersection check between `Object.keys(properties)` and `Object.keys(refs)` before building the renderable
2. Throw with rune name and colliding keys if intersection is non-empty
