---
"@refrakt-md/behaviors": patch
---

Fix diagram rune silently failing when theme colors are non-hex. Mermaid only accepts hex colors, but `--rf-color-*` tokens defined as `oklch(...)`, `color-mix(...)`, named colors, or nested `var()` reached it unconverted. The `<rf-diagram>` element now resolves each token to hex at render time via the browser's own color engine before initializing mermaid.
