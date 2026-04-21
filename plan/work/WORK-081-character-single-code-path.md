{% work id="WORK-081" status="done" priority="low" complexity="trivial" tags="storytelling, runes, transform" source="SPEC-028" %}

# Consolidate Character Transform to Single Code Path

> Ref: SPEC-028 (Rune Output Standards — Standard 5)

## Summary

The Character rune has two full `createComponentRenderable` calls in a `hasSections` / else branch, differing only in one property and one ref. Merge them into a single call using conditional spreading.

## Acceptance Criteria

- [ ] Character transform has exactly one `createComponentRenderable` call
- [ ] Conditional `hasSections` logic uses spread syntax to vary properties/refs
- [ ] Identity transform output is unchanged — all existing tests pass

## Approach

1. Identify the differing properties between the two branches
2. Merge into a single call with `...(hasSections ? { key: value } : {})`
3. Run tests to verify output is identical

## References

- {% ref "SPEC-028" /%} (Standard 5 — Minimize Transform Code Paths)

{% /work %}
