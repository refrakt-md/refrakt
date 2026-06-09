{% work id="WORK-360" status="done" priority="high" complexity="moderate" source="SPEC-091" tags="engine, tooling, contracts, dx" milestone="v0.20.0" %}

# Per-variant structure contracts and inspect variant selection

Make structure contracts and CSS-coverage per-variant, and let `refrakt inspect` render a variant via the selecting modifier value.

## Acceptance Criteria
- [x] `refrakt contracts` / `structures.json` enumerate per-variant structures.
- [x] CSS-coverage tests cover per-variant selectors.
- [x] `refrakt inspect <rune> --<modifier>=<value>` renders the corresponding variant (no new flag needed).

## Approach
`inspect` already takes attributes, so variant selection rides them. SPEC-091 Implications.

## References

- {% ref "SPEC-091" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-091-engine-variants`

### What was done
- `packages/transform/src/contracts.ts`: each rune with `variants` enumerates a per-variant `RuneContract` (base merged with the delta) under `variants[axis][value]`.
- `packages/lumina/test/css-coverage.test.ts`: `expectedSelectors` folds in selectors introduced by variant deltas.
- Confirmed `refrakt inspect <rune> --<modifier>=<value>` selects a variant via the existing flag→attribute path (no new flag).

### Notes
- Regenerated `structures.json` (lumina + root) so the committed contracts match.

{% /work %}
