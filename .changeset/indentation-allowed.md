---
'@refrakt-md/runes': minor
'@refrakt-md/content': minor
'@refrakt-md/cli': minor
'@refrakt-md/editor': minor
'@refrakt-md/language-server': minor
'@refrakt-md/plan': minor
---

Markdoc content may now be indented. A line indented by a tab or by four or more spaces is no longer an indented code block, so the content of a rune can be indented to show its nesting:

```md
{% card %}
	{% slot name="sections" each %}
		{% details summary=$each.heading %}
			{% slot /%}
		{% /details %}
	{% /slot %}
{% /card %}
```

Before, those lines silently became a code block. That broke a tag whose closing line was indented, with no error. Every surface parses this way: the content loader, `refrakt validate`, the language server, the editor preview, composed-rune templates and plan files. They all go through one new shared function, `parse` from `@refrakt-md/runes`, which tokenizes with Markdoc's `allowIndentation`.

**Behaviour change:** a code sample written as an indented code block, with four spaces or a tab and no fence, now renders as ordinary text. Use a fenced block (```` ``` ````) instead. Fenced code is unaffected, including its own indentation. Every tracked Markdown file in this repository parses to the same tree as before.
