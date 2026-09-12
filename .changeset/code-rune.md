---
"@refrakt-md/runes": patch
---

Add `{% code %}`, an inline code span that can hold a variable (WORK-551)

A backtick code span is literal by definition, so Markdoc syntax inside one is never parsed:

```markdoc
`{% $row.name %}`                      → <code>{% $row.name %}</code>
{% code %}{% $row.name %}{% /code %}   → <code>href</code>
```

Nothing warned about this — you simply got the literal text, once per row.

It is the **only** inline construct with that property. Links, nested emphasis and rune bodies all pass a variable through intact (`{% badge %}{% $row.name %}{% /badge %}` already rendered the value), so this closes one specific gap rather than offering a second spelling for something Markdown does well. **Backticks remain correct for static code**, exactly as `**bold**` remains correct for static emphasis; reach for the rune when the content is dynamic — a `{% data %}` row value, a binding passed to an `{% include %}`.

It renders the same `code` element a backtick span does, which Lumina styles with an element rule, so a paragraph mixing the two looks uniform. `.rf-code` is added for a theme that wants to tell them apart.
