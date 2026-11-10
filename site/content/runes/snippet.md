---
title: Snippet
description: Embed a project file as a syntax-highlighted code block — composes inside codegroup, diff, and any future fence-consuming container
category: Code
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:snippet"} /%}

Embed a project file, or part of one, as a syntax-highlighted code block. The file is read on every build, so the page never drifts from the code. A snippet is an ordinary code block once it is read, so it works anywhere a fenced block does, including inside `{% codegroup %}` and `{% diff %}`.

## Basic usage

`path` is relative to the project root. With nothing else, the whole file is embedded:

{% preview source=true %}

	{% snippet path="site/examples/counter/script.js" /%}

{% /preview %}

Paths must stay inside the project: absolute paths, `..` that climbs out, symlinks that point out, and directories are build errors, as is a missing file.

## Embed part of a file by name

A line range breaks silently when someone edits the file above it. Name the region instead. `symbol` finds a declaration wherever it has moved to, and fails the build if it is renamed or deleted:

{% preview source=true %}

	{% snippet path="packages/runes/src/lang-map.ts" symbol="inferLanguage" /%}

{% /preview %}

`match` takes a regex applied to each line of the raw source, for anything `symbol` does not cover: `match="^.counter span"` picks a CSS rule. Matches inside comments are skipped.

### Where the slice ends

`extent` sets how far the slice runs from the anchor. It is never guessed from the file.

| `extent` | Ends at | For |
|---|---|---|
| `auto` *(default)* | a `;` or the matching `}` | TypeScript, CSS, JSON |
| `dedent` | the first line back at the anchor's indent | Python, YAML |
| `section` | the next sibling at the anchor's own level | Markdown headings, TOML tables |
| `paired` | the matching close token | Markdoc, HTML, Svelte |

`auto` refuses a language without braces and semicolons, and names `extent="dedent"` instead.

### When an anchor is not enough

| Write | To |
|---|---|
| `through="^}"` | End at a regex, including the matching line |
| `until="^## "` | End at a regex, excluding the matching line |
| `occurrence=2` | Take the second match when the anchor matches more than once |
| `lines="10-25"` | Use a line range |

An ambiguous anchor warns and names every line that matched. Prefer a more specific `match` over `occurrence`: another match added above the one you meant shifts the count. An `occurrence` past the last match is an error.

## Embed a line range

`lines` slices by line number, 1-indexed and inclusive, as your editor counts them. Prefer an anchor where you can.

| Input | Meaning |
|-------|---------|
| `"10-25"` | Lines 10 through 25 |
| `"10-"` | Line 10 to the end of the file |
| `"-20"` | Lines 1 through 20 |
| `"10"` | Line 10 only |

An end past the end of the file is clamped, with a warning; a start past it is a build error.

{% preview source=true %}

	{% snippet path="biome.jsonc" lines="36-41" /%}

{% /preview %}

## Show line numbers and highlight lines

`linenumbers=true` adds a gutter, and `highlight` emphasizes lines without cutting the rest. Both count in the file's own line numbers, so the gutter below starts at 36 and `highlight="39-40"` marks file lines 39 and 40.

{% preview source=true %}

	{% snippet path="biome.jsonc" lines="36-53" linenumbers=true highlight="39-40" /%}

{% /preview %}

`highlight` takes ranges, single lines, or a mix: `"74-78,82,90-92"`. With `symbol` or `match`, use `highlight-match` instead, which takes regexes, so you are not guessing line numbers. An anchored slice also has its common indentation stripped (`reindent`), so a method does not render with a ragged left edge; a `lines` slice keeps its columns.

Both `linenumbers` and `highlight` work on a hand-written fence too: `` ```ts {% linenumbers=true highlight="3-5" %} ``.

## Set the language

The language comes from the file extension:

| Extension | Language |
|-----------|----------|
| `.ts`, `.tsx` | `typescript` |
| `.js`, `.jsx`, `.mjs`, `.cjs` | `javascript` |
| `.svelte` | `svelte` |
| `.vue` | `vue` |
| `.md`, `.markdoc` | `markdoc` |
| `.json` | `json` |
| `.jsonc` | `jsonc` |
| `.html` | `html` |
| `.css` | `css` |
| `.yml`, `.yaml` | `yaml` |
| `.toml` | `toml` |
| `.sh`, `.bash` | `bash` |
| (others) | `text` (no highlighting) |

Set `lang` when the extension is misleading. A `tsconfig.json` holds comments, which would highlight as errors as `json`:

{% preview source=true %}

	{% snippet path="site/tsconfig.json" lang="jsonc" /%}

{% /preview %}

## Add a caption or a title

A snippet has no title of its own. Wrap it in `{% figure caption="…" %}` for a caption below the code, or in `{% codegroup title="…" %}` for a title bar above it, like an editor tab naming the file.

{% preview source=true %}

	{% figure caption="The counter's click handler: one function, called with +1 or −1" %}
		{% snippet path="site/examples/counter/script.js" symbol="update" /%}
	{% /figure %}

{% /preview %}

## Use snippets in codegroup and diff

Containers that take code blocks take snippets too, mixed freely with fences. In a codegroup each becomes a tab:

{% preview source=true %}

	{% codegroup %}
		{% snippet path="site/examples/counter/script.js" /%}
		```html
		<!-- Load the script after the counter's markup -->
		<script src="script.js"></script>
		```
	{% /codegroup %}

{% /preview %}

In a diff, two snippets are the before and after; here the counter's button rule against its dark-theme override:

{% preview source=true %}

	{% diff mode="split" %}
		{% snippet path="site/examples/counter/style.css" lines="8-15" /%}
		{% snippet path="site/examples/counter/style.css" lines="35-39" /%}
	{% /diff %}

{% /preview %}

## Know when the code has outgrown its prose

An anchor keeps the snippet on the right code, but the paragraph beside it can still go stale when that code changes. A `reviewed` marker records that someone read this version of the slice against the prose. It freezes nothing: the snippet still shows current code, and a change asks for a re-read.

```markdoc
{% snippet path="packages/types/src/config.ts" symbol="SiteConfig" reviewed="a3f91c4e:70b2d118" /%}
```

The CLI writes markers; don't write them by hand.

```bash
refrakt snippet review site/content/runes/file-ref.md   # stamp unmarked snippets
refrakt snippet review --check                          # report changed ones
refrakt snippet review --update                         # show each diff and re-stamp
```

A reformat that leaves the meaning unchanged is re-stamped without asking. Mark only snippets whose prose makes specific claims about the code; marking every one makes `--check` noise that people learn to ignore.

## Show a page's own source

Pass `$file.path` ({% xref "/docs/authoring/variables" /%}) to embed the source of the page the reader is on. This one:

{% preview source=true %}

	{% snippet path=$file.path lang="markdoc" /%}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:snippet"} /%}

## See also

- [Codegroup](/runes/codegroup) — tabbed code blocks; consumes snippet children transparently.
- [Figure](/runes/figure) — a captioned container; captions a snippet below the code.
- [Diff](/runes/diff) — before/after code comparison; consumes snippet children transparently.
- [Content variables](/docs/authoring/variables) — `$file.path` for the view-source-of-current-page pattern.
