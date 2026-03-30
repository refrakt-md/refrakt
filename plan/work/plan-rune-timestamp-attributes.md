{% work id="WORK-085" status="ready" priority="medium" complexity="moderate" tags="plan, runes" milestone="v1.0.0" %}

# Add Timestamp Attributes to Plan Rune Schemas

> Ref: SPEC-029 Phase 3 (Plan Rune Schemas)

Depends on: WORK-084 (variable injection into content pipeline)

## Summary

Add `created` and `modified` attributes to the plan rune schemas (`spec`, `work`, `bug`, `decision`, `milestone`) with defaults referencing `$file.created` and `$file.modified`. Update the plan rune configs to display timestamps in rendered output alongside existing status and priority badges.

## Acceptance Criteria

- [ ] `spec`, `work`, `bug`, `decision`, and `milestone` schemas each declare `created` and `modified` attributes
- [ ] Attribute defaults reference `$file.created` and `$file.modified` via Markdoc variable default syntax (or equivalent fallback if Markdoc doesn't support `{ $variable }` in defaults)
- [ ] Authors can override timestamps with explicit attribute values (e.g. `created="2025-06-15"`)
- [ ] Plan rune configs in `runes/plan/src/config.ts` updated to render timestamps in the header metadata area
- [ ] The `decision` rune's existing `date` attribute remains unchanged; `created` and `modified` are additive
- [ ] Rendered output displays dates in a consistent format alongside existing badges
- [ ] Existing plan content that omits `created`/`modified` attributes continues to work (attributes are optional)
- [ ] Tests updated for new attributes and rendering output

## Approach

1. Verify whether Markdoc supports `{ $variable: 'file.created' }` in attribute defaults — if not, resolve defaults during the schema transform phase
2. Add `created` and `modified` attributes to each plan rune schema in `runes/plan/src/tags/`
3. Update `runes/plan/src/config.ts` to include structure entries for timestamp display
4. Add or update CSS in `runes/plan/styles/` for timestamp display elements
5. Update tests and snapshots

## References

- SPEC-029 (Phase 3 — Plan Rune Schemas)
- WORK-084 (variable injection — dependency)
- `runes/plan/src/tags/` — plan rune schema files
- `runes/plan/src/config.ts` — plan rune engine configs

{% /work %}
