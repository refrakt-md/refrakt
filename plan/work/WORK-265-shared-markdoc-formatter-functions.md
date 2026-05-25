{% work id="WORK-265" status="done" priority="medium" complexity="simple" source="SPEC-070" tags="runes, markdoc, formatting" milestone="v0.16.0" %}

# Shared markdoc formatter functions

Register a small set of author-facing markdoc functions — `currency`, `date`, `number`, `join` — in `@refrakt-md/runes` as the shared value-formatting layer, usable anywhere markdoc transforms run: collection cells, body templates, and `entityRoutes` render strings. Keeps formatting out of `fields` and out of any bespoke projection DSL.

## Acceptance Criteria
- [ ] `currency`, `date`, `number`, `join` registered as markdoc `functions` available wherever markdoc runs
- [ ] Functions are pure formatters with documented signatures and examples
- [ ] Available in collection heading-delimited cells (WORK-264), body templates (WORK-263), and entityRoutes render / render-template (WORK-268)
- [ ] Unit tests for each formatter, including locale/edge handling for `currency` and `date`

## Dependencies
None — independent; consumed by WORK-263, WORK-264, WORK-268.

## References

- {% ref "SPEC-070" /%}
- {% ref "SPEC-069" /%} — same functions usable in entityRoutes render strings

## Resolution

Completed: 2026-05-25

Branch: `claude/v0.16.0`

### What was done
- `packages/runes/src/functions.ts`: `currency`, `date`, `number`, `join` markdoc `ConfigFunction`s (Intl-based; graceful fallback on bad input) + a `functions` map; exported from the runes index.
- `packages/content/src/site.ts`: added `functions` to the page transform config and to `embedConfig`; now always threads `embedConfig` via `createCorePipelineHooks` so collection/expand per-entity templates transform even without xref patterns or a project root.
- Extended the `embedConfig` type (CorePipelineHooksOptions + postProcess coreData) with `functions?`.
- Tests: `packages/runes/test/functions.test.ts` (6) — formatting, graceful degradation, and markdoc interpolation.

### Notes
- Same functions are available in `entityRoutes` render strings (WORK-268) since those transform through the same embedConfig.

{% /work %}
