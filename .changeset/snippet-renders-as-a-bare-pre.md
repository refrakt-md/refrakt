---
'@refrakt-md/runes': minor
'@refrakt-md/lumina': minor
---

A standalone snippet renders as a bare `<pre data-source>` (WORK-615)

**Breaking output change.** `{% snippet %}` used to wrap a standalone code block
in `<figure class="rf-snippet" data-rune="snippet" data-source-path="…">`. The
wrapper is gone: a standalone snippet now renders as the `<pre>` a fenced code
block produces, with nothing around it. The figure carried nothing the `<pre>`
did not already have. `data-source` (the project-relative path) and
`data-lines` (the resolved range) are on the `<pre>` itself.

CSS or tooling that selects `.rf-snippet` or `[data-source-path]` must move to
`pre[data-source]`. A snippet inside `{% codegroup %}` or `{% diff %}` is
unchanged, because it was never wrapped. For chrome around a single snippet,
compose it with `{% codegroup title="…" %}`.

Lumina drops its `.rf-snippet` rules. They only reset the margins the figure
introduced. The `file-ref` preview drawer used the same figure for its body, so
the drawer now holds the same bare `<pre data-source>`. Structure contracts and
the SEO baseline are unchanged.
