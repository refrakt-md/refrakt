{% work id="WORK-360" status="ready" priority="high" complexity="moderate" source="SPEC-091" tags="engine, tooling, contracts, dx" milestone="v0.20.0" %}

# Per-variant structure contracts and inspect variant selection

Make structure contracts and CSS-coverage per-variant, and let `refrakt inspect` render a variant via the selecting modifier value.

## Acceptance Criteria
- [ ] `refrakt contracts` / `structures.json` enumerate per-variant structures.
- [ ] CSS-coverage tests cover per-variant selectors.
- [ ] `refrakt inspect <rune> --<modifier>=<value>` renders the corresponding variant (no new flag needed).

## Approach
`inspect` already takes attributes, so variant selection rides them. SPEC-091 Implications.

## References

- {% ref "SPEC-091" /%}

{% /work %}
