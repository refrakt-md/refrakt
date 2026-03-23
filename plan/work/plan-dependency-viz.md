{% work id="WORK-049" status="done" priority="low" complexity="complex" tags="plan, ux, pipeline" %}

# Dependency visualization for plan site

Surface cross-entity relationships by scanning content for ID references (`WORK-XXX`, `SPEC-XXX`, `BUG-XXX`, `ADR-XXX`). Build a bidirectional relationship index and render relationships in a dedicated layout slot on each entity page.

## Acceptance Criteria

- [x] During the `register` pipeline phase, entity content is scanned for ID reference patterns
- [x] A bidirectional relationship index is built in the `EntityRegistry`
- [x] Each entity page displays a "Relationships" section showing linked entities
- [x] Each reference is a live link with an inline status badge
- [x] Relationships are categorized: "Blocked by", "Blocks", "Related"
- [x] Blocked items show a visual indicator in the sidebar when blockers are unresolved
- [x] Relationships render via a computed layout slot or region (not manual HTML injection)

## Approach

Extend the plan package's pipeline hooks. In `register()`, scan each entity's content for `(WORK|SPEC|BUG|ADR)-\d+` patterns and index relationships. The relationships section is surfaced via the shared layout engine — either as a `computed` slot in `planLayout` (similar to how `computed.toc` works) or as an injected region. This avoids manual HTML injection in `postProcess()` and keeps the rendering declarative.

Once WORK-050 converges the plan renderer with the shared layout engine, the relationships section can sit in the right-side panel alongside the ToC, providing an "on this page" + "related entities" sidebar similar to documentation sites.

## References

- SPEC-015 (Plan Site UX at Scale — Feature 6)
- WORK-020 (entity registration — the registry this builds on)
- WORK-050 (renderer convergence — provides the layout slot mechanism)

{% /work %}
