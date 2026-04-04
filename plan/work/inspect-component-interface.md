{% work id="WORK-121" status="ready" priority="medium" complexity="low" tags="cli, tooling, dx" milestone="v1.0.0" %}

# Add component interface view to refrakt inspect

> Ref: ADR-008 (Framework-native component interface for rune overrides)

Depends on: WORK-117 (extraction logic)

## Summary

Extend `refrakt inspect` to show the component override interface for a rune — what props and slots a component would receive. This makes the contract discoverable from the CLI without reading source code.

## Acceptance Criteria

- [ ] `refrakt inspect <rune> --interface` (or similar flag) outputs the component interface
- [ ] Output shows property names with their types (string, number, union values)
- [ ] Output shows slot names (top-level ref names)
- [ ] Output shows which slots are always present vs conditional
- [ ] Works for both core and community package runes
- [ ] `--json` flag produces machine-readable output of the interface

## Approach

1. After running the identity transform for the inspected rune, call the extraction utility on the output
2. Collect property names from `properties` keys, types from schema attribute definitions
3. Collect slot names from top-level `refs` keys
4. Format and display
