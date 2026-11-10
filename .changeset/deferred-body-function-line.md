---
'@refrakt-md/runes': patch
---

**Template bodies keep a function call on its own line.** In a `collection`, `aggregate` or `relationships` body, a line holding only a function call (`{% humanize($kind) %}`) at the start of a block tag such as `{% card %}` was joined to the tag's opening line when the body was captured, so the tag rendered as inline text and the content after it fell outside. It now stays on its own line.
