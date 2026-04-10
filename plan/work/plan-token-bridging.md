{% work id="WORK-043" status="done" priority="medium" complexity="moderate" tags="plan, themes, css" source="ADR-004" %}

# Token bridging — update plan CSS to use `--rf-*` tokens

Update plan rune CSS to reference `--rf-*` tokens (the standard refrakt token namespace) as primary values, with `--plan-*` as fallbacks. This allows plan styles to adapt to any installed theme's token palette while remaining functional in standalone mode.

## Acceptance Criteria

- [ ] Plan rune CSS references `--rf-*` tokens where equivalent tokens exist (colors, spacing, typography, radii)
- [ ] `--plan-*` tokens are used as fallbacks: `var(--rf-color-success, var(--plan-status-done))`
- [ ] Built-in `tokens.css` still defines `--plan-*` tokens (standalone mode unaffected)
- [ ] Visual appearance with built-in themes is unchanged
- [ ] When a `--rf-*` theme is active, plan runes pick up the theme's palette
- [ ] Both `default.css` and `minimal.css` updated consistently

## Approach

Audit plan CSS files for hardcoded values and `--plan-*` references that have standard `--rf-*` equivalents. Replace with `var(--rf-*, var(--plan-*))` pattern. Focus on:
- Typography: `--rf-font-*` → `--plan-font-*`
- Spacing: `--rf-space-*` → `--plan-space-*`
- Border radius: `--rf-radius-*` → `--plan-radius-*`
- Semantic colors: `--rf-color-*` → `--plan-status-*` (where applicable)

Status-specific colors (e.g., `--plan-status-in-progress`) have no `--rf-*` equivalents and remain as-is.

## References

- ADR-004 (Plan Site Theme Resolution)
- WORK-039 (the refactored pipeline)

{% /work %}
