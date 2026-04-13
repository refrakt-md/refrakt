{% work id="WORK-138" status="ready" priority="medium" complexity="moderate" source="SPEC-038" tags="plan, runes, pipeline, git, history" %}

# `plan-history` site rune — tag definition and pipeline hooks

Implement the `plan-history` Markdoc tag as a self-closing aggregation rune following the established plan rune pattern (sentinel + meta tags + placeholder → aggregate → postProcess resolution). Supports both per-entity and global feed modes.

## Acceptance Criteria

- [ ] Tag definition in `runes/plan/src/tags/plan-history.ts` with attributes: `id`, `limit`, `type`, `since`, `group`
- [ ] Self-closing tag stores parameters as meta tags and emits sentinel marker
- [ ] Rune config added to `runes/plan/src/config.ts` with block name `plan-history`
- [ ] Rune exported in `runes/plan/src/index.ts` RunePackage
- [ ] Aggregate hook extracts history data and adds to `PlanAggregatedData`
- [ ] PostProcess hook detects sentinel and resolves per-entity timeline HTML
- [ ] PostProcess hook detects sentinel and resolves global commit-grouped feed HTML
- [ ] Per-entity HTML follows BEM structure from spec: `rf-plan-history__events`, `__event`, `__date`, `__hash`, `__changes`, `__change`, `__field`, `__value`, `__criteria`
- [ ] Global feed HTML includes `rf-plan-history--global` modifier and `__commit-message`, `__entity-summary` elements
- [ ] Attribute values use `data-type="add|remove"` for diff styling
- [ ] Criteria collapse: show first 3, collapse rest with "+N more criteria" in per-entity mode
- [ ] Auto-injection: postProcess appends History section to entity pages (when enabled) for entities with >1 commit
- [ ] Commit hashes link to repository URL when configured (parsed from `git remote get-url origin`)

## Dependencies

- {% ref "WORK-134" /%} — Event model and per-entity extraction
- {% ref "WORK-135" /%} — Batch extraction and caching

## Approach

Follow the exact pattern used by `plan-activity` and `plan-progress`:
1. Tag definition exports sentinel constant and uses `createContentModelSchema` with `selfClosing: true`
2. Extend `PlanAggregatedData` interface with `history: Map<string, HistoryEvent[]>` and `globalHistory` fields
3. In aggregate hook, run batch extraction and populate history data
4. In postProcess, detect `plan-history` sentinel, read params, build timeline HTML using Markdoc `Tag` objects
5. Auto-injection follows the same pattern as the existing auto-relationships injection

Repository URL parsing: use `git remote get-url origin` at aggregate time, with a config override field.

## References

- {% ref "SPEC-038" /%} — Git-Native Entity History (Site Rune + Rendering sections)

{% /work %}
