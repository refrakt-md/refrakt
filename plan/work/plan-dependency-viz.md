{% work id="WORK-049" status="draft" priority="low" complexity="complex" tags="plan, ux, pipeline" %}

# Dependency visualization for plan site

Surface cross-entity relationships by scanning content for ID references (`WORK-XXX`, `SPEC-XXX`, `BUG-XXX`, `ADR-XXX`). Build a bidirectional relationship index and inject a "Relationships" section into each entity page showing what it blocks, is blocked by, and relates to.

## Acceptance Criteria

- [ ] During the `register` pipeline phase, entity content is scanned for ID reference patterns
- [ ] A bidirectional relationship index is built in the `EntityRegistry`
- [ ] During `postProcess`, a "Relationships" section is injected into each entity page
- [ ] Each reference is a live link with an inline status badge
- [ ] Relationships are categorized: "Blocked by", "Blocks", "Related"
- [ ] Blocked items show a visual indicator in the sidebar when blockers are unresolved

## Approach

Extend the plan package's pipeline hooks. In `register()`, scan each entity's content for `(WORK|SPEC|BUG|ADR)-\d+` patterns and index relationships. In `postProcess()`, inject the relationships section as a renderable tag tree at the bottom of each entity page.

## References

- SPEC-015 (Plan Site UX at Scale — Feature 6)
- WORK-020 (entity registration — the registry this builds on)

{% /work %}
