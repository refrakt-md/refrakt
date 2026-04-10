{% work id="WORK-042" status="done" priority="medium" complexity="moderate" tags="plan, themes, config" source="ADR-004,SPEC-014" %}

# Config-aware theme resolution for plan site

Update the plan site's `resolveThemeCss()` to read `refrakt.config.json` when no `--theme` flag is provided, so the plan site automatically uses the project's installed theme.

When a theme package is specified in config, resolve its CSS (design tokens + base styles) and layer it under the plan rune CSS. When resolution fails or no config exists, fall back to the built-in default theme.

## Acceptance Criteria

- [ ] When `--theme` is omitted and `refrakt.config.json` exists with a `theme` field, that theme is used
- [ ] Theme package is resolved via its npm package exports (`package/html` or `package/base.css`)
- [ ] `--theme` flag still overrides config when provided
- [ ] `--theme default` and `--theme minimal` still use built-in themes regardless of config
- [ ] When config exists but theme resolution fails, falls back to built-in default with a warning
- [ ] When no config exists, uses built-in default (standalone mode unchanged)
- [ ] `--theme lumina` works as shorthand for `@refrakt-md/lumina`

## Approach

1. In `resolveThemeCss()`, check if `--theme` was explicitly provided
2. If not, look for `refrakt.config.json` in the working directory (or `--config` path)
3. If config has `theme`, attempt to resolve it as an npm package
4. Load the theme's `ThemeConfig` from `package/transform` export and merge with plan rune configs
5. Load CSS from the theme package's base export
6. Fall back gracefully on any error

## References

- ADR-004 (Plan Site Theme Resolution)
- SPEC-014 (Plan Site via HTML Adapter)
- WORK-039 (the refactored pipeline this builds on)

{% /work %}
