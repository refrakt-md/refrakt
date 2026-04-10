{% work id="WORK-121" status="done" priority="medium" complexity="low" tags="cli, tooling, dx" milestone="v1.0.0" source="ADR-008" %}

# Add component interface view to refrakt inspect

> Ref: ADR-008 (Framework-native component interface for rune overrides)

Depends on: WORK-117 (extraction logic)

## Summary

Extend `refrakt inspect` to show the component override interface for a rune — what props and slots a component would receive. This makes the contract discoverable from the CLI without reading source code.

## Acceptance Criteria

- [x] `refrakt inspect <rune> --interface` (or similar flag) outputs the component interface
- [x] Output shows property names with their types (string, number, union values)
- [x] Output shows slot names (top-level ref names)
- [x] Output shows which slots are always present vs conditional
- [x] Works for both core and community package runes
- [x] `--json` flag produces machine-readable output of the interface

## Approach

1. After running the identity transform for the inspected rune, call the extraction utility on the output
2. Collect property names from `properties` keys, types from schema attribute definitions
3. Collect slot names from top-level `refs` keys
4. Format and display


## Resolution

Completed: 2026-04-04

Branch: `claude/adr-008-implementation-nBN9K`

### What was done
- Added `--interface` flag to `packages/cli/src/bin.ts` argument parser
- Added `showComponentInterface()` function in `packages/cli/src/commands/inspect.ts`
- Added `findRuneTag()` and `findFirstRuneTag()` helpers for tree search
- Human-readable output shows Properties, Slots, and Svelte 5 Usage example
- JSON output includes rune name, typeName, properties with types/examples, slots, and hasAnonymousContent
- Updated CLI help text with --interface flag and example

### Notes
- Uses the serialized (pre-identity-transform) tree since properties are consumed by the engine
- Falls back to findFirstRuneTag when data-rune doesn't match CLI name (e.g., tabs → tab-group)
- Schema attribute types used for richer type info in output (union literals for enum matches)
