# @refrakt-md/highlight

Syntax-highlighting transform for refrakt. Walks a serialized renderable tree, finds elements carrying `data-language`, highlights their text via Shiki, and emits HTML the Renderer can inject.

The default highlighter wraps Shiki's `createCssVariablesTheme` so all highlighting flows through `--rf-syntax-token-*` custom properties. Themes don't import Shiki; they just supply values to the `--rf-syntax-*` contract surface established by SPEC-048, and the highlighter is interchangeable as an implementation detail.

## Default theme — extended CSS variables (SPEC-056)

The default theme used by `createHighlightTransform` is an **extended** css-variables theme that builds on Shiki's stock `createCssVariablesTheme` and adds scope→variable mappings for the optional syntax roles SPEC-056 introduced.

See `src/extended-theme.ts` for the full audit table of what Shiki's stock theme emits vs. what the extended theme adds. Summary:

| Role | Stock Shiki? | Extended theme adds? |
|---|---|---|
| `keyword`, `function`, `string`, `constant`, `comment`, `punctuation`, `string-expression`, `link`, `parameter` | ✓ emitted | — |
| `type` | ✗ (routes to `function`) | ✓ via `entity.name.type`, `entity.name.class`, `support.type`, `support.class`, etc. |
| `tag` | ✗ (routes to `string-expression`) | ✓ via `entity.name.tag` |
| `attribute` | ✗ (routes to `function`) | ✓ via `entity.other.attribute-name` |
| `property` | ✗ | ✓ via `variable.other.property`, `meta.object-literal.key`, etc. |
| `operator` | ✗ (routes to `keyword`) | ✓ via `keyword.operator.*` (assignment, arithmetic, comparison, logical, …) |
| `number` | ✗ (routes to `constant`) | ✓ via `constant.numeric.*` |
| `regex` | ✗ (routes to `string-expression`) | ✓ via `string.regexp`, `string.regex` |

A preset that doesn't set the extended roles inherits the broad-mapping default emitted by the token-stylesheet generator (e.g. `--rf-syntax-token-type` falls back to `function`'s value when the preset doesn't supply `syntax.type`). A preset that *does* set the extended role gets dedicated colouring on the matching scopes.

## Alternative themes

`createHighlightTransform({ theme: 'github-dark' })` — pass a Shiki theme name to use it directly. Bypasses the `--rf-syntax-*` contract; the highlighter writes inline colours into spans and emits CSS that overrides `--rf-color-code-bg` / `--rf-color-code-text` for the page.

`createHighlightTransform({ theme: { light: 'github-light', dark: 'github-dark' } })` — dual themes that switch with the page's light/dark mode.
