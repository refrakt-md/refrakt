{% work id="WORK-034" status="done" priority="medium" complexity="moderate" tags="css, plan, themes" %}

# Plan Dashboard Theme

> Ref: {% ref "SPEC-022" /%} (Plan CLI — Default Theme section)

## Summary

Default and minimal CSS themes for the plan dashboard rendered by `serve` and `build` commands. Status badge colors, priority indicators, progress bars, entity cards, sidebar navigation, and responsive dashboard grid.

## Acceptance Criteria

- [x] Default theme with status badge colors (grey/blue/yellow/green/red) and priority colors (critical=red, high=orange, medium=yellow, low=grey)
- [x] Complexity dot indicators
- [x] Checklist progress bars with fraction labels (e.g., `████░░░░░░ 2/5`)
- [x] Entity card layout (bordered cards with header, title, meta line)
- [x] Dashboard grid (responsive column layout for backlog sections)
- [x] Sidebar navigation with entity type grouping
- [x] Cross-reference links styled with entity type icon prefix
- [x] Minimal theme (clean typography, no color/badges, print-friendly)
- [x] Both themes target standard BEM classes from plan rune configs

## Approach

CSS-only — no JavaScript. Use design tokens from `packages/lumina/tokens/base.css` as reference but define plan-specific tokens. The themes target `.rf-spec`, `.rf-work`, `.rf-bug`, `.rf-decision`, `.rf-milestone` blocks and their BEM elements/modifiers as defined in `runes/plan/src/config.ts`.

## References

- {% ref "SPEC-022" /%} (Plan CLI)
- `runes/plan/src/config.ts` (rune configs defining BEM structure)
- `packages/lumina/tokens/base.css` (design token reference)

{% /work %}
