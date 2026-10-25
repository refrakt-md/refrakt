---
'@refrakt-md/runes': minor
'@refrakt-md/transform': minor
'@refrakt-md/content': minor
'@refrakt-md/svelte': minor
'@refrakt-md/editor': minor
'@refrakt-md/cli': minor
'@refrakt-md/language-server': minor
'@refrakt-md/business': minor
'@refrakt-md/design': minor
'@refrakt-md/docs': minor
'@refrakt-md/learning': minor
'@refrakt-md/marketing': minor
'@refrakt-md/media': minor
'@refrakt-md/places': minor
'@refrakt-md/plan': minor
'@refrakt-md/storytelling': minor
'create-refrakt': minor
---

Markdoc is upgraded from 0.4.0 to 0.5.10, pinned exactly in every package. New sites get `^0.5.10`. An existing site that lists `@markdoc/markdoc` itself should move it to `^0.5.10`, so that it does not install a second copy.

Every tracked `.md` file in this repository parses to the same AST as before, and rendered output, contracts and structured data are unchanged. What authors may notice:

- **`{% if %}` and `{% else %}` conditions are type-checked.** A string or number written as a condition, such as `{% if "yes" %}`, is now an `attribute-type-invalid` error. Before, any value was accepted. Use a variable, a function such as `equals(…)`, or `true`/`false`.
- **`{% table %}` is stricter.** Content between table rows that is not part of a row is now a critical `table-syntax` error, where it was silently dropped before.
- **Validation errors point at their own line.** An error that a rune's validator raises with a specific location is now reported at that line, not at the first line of the rune.
- **Fewer formatting round-trip bugs.** An image URL with several parentheses no longer loses everything after the first `(`. A list or code fence inside a blockquote no longer falls out of the quote. Both affected content that refrakt formats and re-parses internally, such as collection item bodies.
