---
'@refrakt-md/transform': minor
'@refrakt-md/runes': minor
'@refrakt-md/cli': minor
---

Two checks make ADR-043's and ADR-044's contracts checkable. Both are reports, not gates.

- **`refrakt theme coverage`** reports, for every value of the theme vocabulary, whether a theme's CSS styles it, leaves it to the base stylesheet (`@refrakt-md/skeleton`), or nothing does. The vocabulary is each meta type, sentiment, zone layout, sequence, section role, media kind and universal-axis value. It is read from the registries that define it (`themeVocabulary()` in `@refrakt-md/runes`; `META_TYPES`, `SENTIMENTS`, `LAYOUT_PRIMITIVES` and `vocabularyCoverage()` in `@refrakt-md/transform`), so a new value appears without updating anything. Lumina runs it as a test, with its unstyled values recorded as a set that may only shrink.
- **`refrakt plugins validate`** now reports, for a plugin's themed runes, the elements that carry no vocabulary role (ADR-044's tier 3), and the literal colours, sizes and font stacks in its `styles/` stylesheets (`novelElements()`, `lintTokenOnly()`). A plugin whose stylesheets have none is theme-portable.
- **Baseline:** `npm run plugins:vocabulary` records both for the nine first-party plugins in `contracts/plugin-vocabulary.json`. This is the baseline Lumina's per-rune CSS drains from.
