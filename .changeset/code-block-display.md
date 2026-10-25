---
'@refrakt-md/lumina': patch
---

Code blocks show blank lines again, and render tabs two columns wide.

- **Blank lines:** a code block lays its lines out as a grid, and an empty line had no height, so every blank line in a code sample disappeared. An empty line now takes a normal line's height. A trailing newline still adds no extra row.
- **Tab width:** `pre` now sets `tab-size` from a new custom property, `--rf-code-tab-size`, which defaults to `2`. Rune content is indented with tabs, and the browser default of eight columns pushed indented samples off narrow screens. Set it in a theme or site stylesheet to change it.
