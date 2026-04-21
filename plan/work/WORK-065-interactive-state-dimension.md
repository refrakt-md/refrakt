{% work id="WORK-065" status="done" priority="medium" complexity="moderate" tags="behaviors, transform, themes, dimensions" milestone="v0.9.0" source="SPEC-025" %}

# Interactive State Dimension

> Ref: SPEC-025 (Universal Theming Dimensions — Interactive State)

## Summary

Migrate interactive rune behaviours from class-based state toggling to `data-state` attribute toggling. Currently, the `@refrakt-md/behaviors` scripts toggle BEM modifier classes (e.g., `rune-accordion__panel--open`). After this change, they toggle `data-state` values (e.g., `data-state="open"`), enabling themes to style all interactive states generically.

## Acceptance Criteria

- [x] Identity transform sets initial `data-state` attributes on interactive elements (e.g., first accordion panel `data-state="open"`, rest `data-state="closed"`)
- [x] Accordion behaviour script toggles `data-state="open"` / `data-state="closed"` on panels and `data-state="active"` / `data-state="inactive"` on triggers
- [x] Tabs behaviour script toggles `data-state="active"` / `data-state="inactive"` on tabs and panels
- [x] Details, Reveal, CodeGroup, Gallery, Juxtapose behaviours updated similarly
- [x] DataTable row selection uses `data-state="selected"`
- [x] Form disabled fields use `data-state="disabled"`
- [x] Existing BEM modifier classes for state are preserved during migration (dual-emit) for backward compatibility
- [x] Lumina CSS updated to target `[data-state]` selectors in addition to (or replacing) BEM state modifiers
- [x] Unit tests for all updated behaviours pass

## Approach

1. In the identity transform, set initial `data-state` attributes based on the rune's default state (first panel open, rest closed, etc.)
2. Update each behaviour script in `packages/behaviors/src/behaviors/` to toggle `data-state` instead of (or in addition to) BEM modifier classes
3. Update Lumina CSS to target `[data-state]` selectors
4. Dual-emit BEM modifiers during transition for themes that target them directly

## References

- {% ref "SPEC-025" /%} (Universal Theming Dimensions — Interactive State, Table 3: Interactive State Map)

{% /work %}
