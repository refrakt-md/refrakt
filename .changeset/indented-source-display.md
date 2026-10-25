---
'@refrakt-md/highlight': patch
'@refrakt-md/design': patch
---

Indented Markdoc now displays correctly in code samples.

- **Highlighting:** a `markdoc` code block whose lines are indented with tabs is highlighted the way its flat form would be. The tabs are kept as written. Before, Markdown's grammar read every tab-indented line as an indented code block, so indented runes, headings and emphasis showed as plain text. Lines indented with four spaces at least get their tags highlighted.
- **`preview` with `source=true`:** the source it shows is now dedented to the preview's own content, keeping the nesting inside it. Before, the first line lost its indentation and the rest kept theirs.
