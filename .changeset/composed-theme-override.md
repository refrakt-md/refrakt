---
'@refrakt-md/transform': minor
'@refrakt-md/runes': minor
'@refrakt-md/lumina': minor
---

A theme override aimed at a composed rune is reported and dropped (ADR-042).

- **A composed rune's config is its definition's.** `composedRuneConfig` now marks what it generates with `composed: true`. `mergeThemeConfig` reports a theme's `runes:` entry keyed to such a rune, naming the theme, the rune and the path, through the same sink and once-per-path rule as identity violations, and drops the entry whole.
- **A composed declaration replaces what stood under its key.** A theme entry merged before a plugin's composed rune no longer leaks into the generated config field by field.
- **Native runes are unaffected.** Their identity fields stay guarded and everything else stays overridable.
- `mergeThemeConfig` takes an optional `{ themeName }` and `assembleThemeConfig` a `themeName`, used to name the theme in the report.
