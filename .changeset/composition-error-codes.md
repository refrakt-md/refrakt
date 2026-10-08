---
'@refrakt-md/runes': minor
---

Every construction error a composed rune definition can produce now has a stable code. `CompositionError.code` names it, and `COMPOSITION_ERRORS` lists every code with a one-line summary. The new authoring guide, `extend/rune-authoring/composed-runes`, documents each code with its cause and fix, and a test fails if an error is added without an entry.

A template with an unclosed or unopened tag, such as `{% hint %}` with no `{% /hint %}`, is now rejected with `template-parse`. Before, Markdoc recorded the problem on the node and the definition built anyway.
