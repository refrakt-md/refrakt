---
title: Snippet
description: Embed a project file as a syntax-highlighted code block — composes inside codegroup, diff, and any future fence-consuming container
category: "Code & Data"
plugin: core
status: stable
type: rune
---

# Snippet

Embed the contents of a file as a syntax-highlighted code block. The file lives anywhere in your project tree (relative to the project root); refrakt reads it at build time, slices it by line range if you ask, and renders it like any other fenced code block. When the source file changes, the embedded version updates automatically on the next build — no copy-paste drift.

{% hint type="note" %}
The snippet rune is implemented as an AST preprocessor: by the time the transform phase reaches it, every `{% snippet %}` tag has been replaced with a Markdoc `fence` node. This is what makes it compose transparently inside `{% codegroup %}`, `{% diff %}`, and any future container rune that consumes fence nodes — they see snippets exactly the same as triple-backtick code blocks.
{% /hint %}

## Embed a file

The minimum case — a `path` attribute relative to the project root.

```markdoc
{% snippet path="packages/runes/src/lang-map.ts" lines="1-40" /%}
```

Renders as a live embed of refrakt's own language-map module (the one snippet itself uses for extension inference):

{% snippet path="packages/runes/src/lang-map.ts" lines="1-40" /%}

The reader is looking at the actual file in this repository, sliced to its first 40 lines. The build re-reads the file every time it runs, so this stays in sync.

## Address by name, not by line number

A line range is a coordinate into a file nobody promised to hold still. Edit anything above the range and the snippet quietly starts quoting something else — it still renders, still highlights, still looks right. Prefer an anchor:

```markdoc
{% snippet path="packages/types/src/config.ts" symbol="SiteConfig" /%}
```

`symbol` names a declaration. The anchor is built from the language's own keywords, so the region is found wherever it has moved to — and if the symbol is renamed or deleted, the snippet **fails loudly** instead of rendering a plausible wrong span.

`match` is the general form: a raw regex applied per line. `symbol` is sugar over it, and `match` is what to reach for in a language whose keywords refrakt does not carry.

```markdoc
{% snippet path="packages/lumina/styles/runes/hint.css" match="^\.rf-hint\s*\{" /%}
```

Anchors are matched against the **raw** source, so a JSON key or a quoted selector works. A match landing inside a comment is skipped — a declaration mentioned in a comment is talking about code rather than being it.

### How far the slice runs

`extent` picks the strategy. It is never inferred from the file, because guessing right most of the time and silently wrong the rest is the failure this feature exists to remove.

| `extent` | Ends at | For |
|---|---|---|
| `auto` *(default)* | a `;` or the matching `}` | TypeScript, CSS, JSON |
| `dedent` | the first line back at the anchor's indent | Python, YAML |
| `section` | the next sibling at the anchor's own level | Markdown headings, TOML tables |
| `paired` | the matching close token | Markdoc, HTML, Svelte |

`auto` only ends a construct in a brace-and-semicolon language. Point it at Python and it refuses, naming `extent="dedent"` — it will not hand back the rest of the file.

### When an anchor will not do it

Anchoring is not a dead end. Every refusal names the way through, and all three stay supported permanently:

| Attribute | Use |
|---|---|
| `through="^}"` | End at a regex, **including** the matching line |
| `until="^## "` | End at a regex, **excluding** the matching line |
| `lines="10-25"` | Address by coordinate, as before |
| `occurrence=2` | Take the *N*th match when the anchor is ambiguous |

`until` and `through` are two attributes rather than one flag on purpose: in code the terminator line usually belongs in the slice, and in Markdown it usually does not. Either default would be silently wrong half the time.

**`occurrence` belongs on this list, not beside `symbol`.** It is counting, and this whole feature exists to replace counting with naming. It is a *better* count than a line number — inserting unrelated content above does not move it — but it still drifts the moment someone adds another match above the one you meant. Reach for a more specific `match=` first, and use `occurrence` only when the anchors are genuinely identical. An ambiguous anchor warns either way, naming every line that matched; `occurrence` selects one, it does not assert you picked correctly.

An `occurrence` past the end refuses rather than clamping to the last match.

### Presentation

`reindent` strips the slice's common leading whitespace, so a class method or a nested key does not render with a ragged left edge. It defaults **on** for `symbol`/`match` and **off** for `lines` — an author who wrote a line range chose those columns, and changing how they render would be a silent visual change.

`linenumbers` and numeric `highlight` stay in **file** coordinates under an anchor, so the numbers remain a pointer back into the real file. But a numeric `highlight` under an anchor carries exactly the coordinate exposure anchoring removes — you are guessing at line numbers the resolver chose. Use `highlight-match` there, which takes regexes and highlights the lines that match.

## Line ranges

Slice the file with the `lines` attribute. Four formats:

| Input | Meaning |
|-------|---------|
| `"10-25"` | Lines 10 through 25, inclusive |
| `"10-"` | Line 10 to end of file |
| `"-20"` | Line 1 through line 20 |
| `"10"` | Single line (line 10 only) — shorthand for `"10-10"` |

1-indexed (matches editor line numbers), inclusive on both ends. Out-of-range ends clamp to the file length with a build warning; out-of-range starts (entirely past EOF) are a build error.

```markdoc
{% snippet path="packages/runes/src/lang-map.ts" lines="15-35" title="LANG_MAP definition" /%}
```

{% snippet path="packages/runes/src/lang-map.ts" lines="15-35" title="LANG_MAP definition" /%}

## Captions and titles

Snippet itself has no `title` attribute — it's structurally a `fence` by the time the transform runs, and fences don't carry titles. For a labelled chrome, wrap the snippet in `{% codegroup %}`, which produces title-bar chrome around a single fence:

```markdoc
{% codegroup title="FALLBACK_LANG constant" %}
{% snippet path="packages/runes/src/lang-map.ts" lines="42-50" /%}
{% /codegroup %}
```

{% codegroup title="FALLBACK_LANG constant" %}
{% snippet path="packages/runes/src/lang-map.ts" lines="42-50" /%}
{% /codegroup %}

## Language inference

The language is inferred from the file extension via a shared map:

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

Override with `lang=` when the extension doesn't tell the full story (a `.config` file that's actually JSONC, for instance).

```markdoc
{% snippet path="packages/runes/src/lang-map.ts" lines="1-5" lang="javascript" /%}
```

{% snippet path="packages/runes/src/lang-map.ts" lines="1-5" lang="javascript" /%}

## Composition

The pre-resolve model means snippets work inside any container rune that matches `fence` nodes. No special handling required on either side — the container sees a fence, it consumes a fence.

### Inside `{% codegroup %}`

Multiple snippets become tabs in a codegroup. Tab labels come from the inferred language (or set `labels` on codegroup for custom names).

{% preview source=true %}

{% codegroup %}
{% snippet path="packages/runes/src/lang-map.ts" lines="1-5" /%}
{% snippet path="packages/runes/src/util.ts" lines="1-5" /%}
{% /codegroup %}

{% /preview %}

Mixed children — snippets and triple-backtick fences in the same codegroup — work uniformly:

{% preview source=true %}

{% codegroup %}
{% snippet path="packages/runes/src/lang-map.ts" lines="1-5" /%}
```python
# An inline Python snippet alongside a real file
def hello(): pass
```
{% /codegroup %}

{% /preview %}

### Inside `{% diff %}`

Two snippets become before/after for a diff comparison.

{% preview source=true %}

{% diff mode="split" %}
{% snippet path="packages/runes/src/lang-map.ts" lines="42-50" /%}
{% snippet path="packages/runes/src/util.ts" lines="42-50" /%}
{% /diff %}

{% /preview %}

The diff doesn't know or care that its children came from snippet tags — it sees the same `fence` nodes a triple-backtick block would produce.

## Sandbox rules

Paths are resolved relative to the directory containing `refrakt.config.json`. The resolver enforces the snippet sandbox at build time:

| Pattern | Outcome |
|---------|---------|
| `path="/etc/passwd"` | **Rejected** — absolute paths are not allowed. |
| `path="../../etc/passwd"` | **Rejected** — paths must stay inside the project root after normalization. |
| `path="link-to-outside"` (symlink that points outside the project root) | **Rejected** — `fs.realpath` is checked too. |
| `path="src/"` (a directory) | **Rejected** — must be a regular file. |
| `path="missing.ts"` (file doesn't exist) | **Rejected** — build error names the resolved path and the page that referenced it. |

These rules make snippet safe to use on sites that accept untrusted author content (a hosted authoring product, an external editor) — the worst a malicious author can do with snippet is point at a file inside the project root.

## Line numbers

Set `linenumbers=true` to show a numbered gutter. The starting number derives from `lines=` so the gutter reflects the file's real offsets — `lines="74-125"` starts the count at 74, not 1. SPEC-062 / WORK-304.

```markdoc
{% snippet path="packages/runes/src/lang-map.ts" lines="15-25" linenumbers=true /%}
```

Renders with the gutter starting at 15 (file coordinates), matching what you'd see in your editor:

{% snippet path="packages/runes/src/lang-map.ts" lines="15-25" linenumbers=true /%}

The implementation is pure CSS — `pre[data-linenumbers]` gets a `counter-reset` seeded by an inlined `--rf-start-line` custom property the fence schema computes from `data-lines`. No JS, no DOM rewriting.

## Highlighting specific lines

`highlight="74-78"` emphasizes specific lines without cropping. Unlike `lines=` (which slices), highlight keeps the surrounding context visible and draws the eye to the lines that matter. Use it for "look at this part" callouts inside a larger code block.

```markdoc
{% snippet path="packages/runes/src/lang-map.ts" lines="10-40" linenumbers=true highlight="18-22" /%}
```

Renders the slice 10-40 with file lines 18-22 emphasized via a neutral surface tint and a primary-coloured left rail:

{% snippet path="packages/runes/src/lang-map.ts" lines="10-40" linenumbers=true highlight="18-22" /%}

Range syntax matches Shiki: single ranges (`"74-78"`), single lines (`"82"`), or comma-separated mixed (`"74-78,82,90-92"`). Indices are **file coordinates** — if you've set `lines="10-40" highlight="20"`, the highlighted line is file line 20, not the 20th line of the slice. Less surprising for citing line numbers from a real file.

Both `linenumbers` and `highlight` are also fence-level annotations — `` ```ts {% linenumbers=true highlight="3-5" %} `` works on any hand-authored fence too, no snippet required.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:snippet"} /%}

No `title` attribute. Snippet's output is a fence; for a labelled chrome wrap in `{% codegroup title="..." %}`.

## View source — recursively

Snippet's killer trick: feed it `$file.path` from the page-variable surface ({% xref "/docs/authoring/variables" /%}) to embed the page's own source.

```markdoc
{% snippet path=$file.path lang="markdoc" /%}
```

Renders as the snippet block below — at build time it reads the page you're looking at right now and inlines its content. The reader sees the markdown that generates the page they're reading. The "see it in action" pitch in one rune.

{% snippet path=$file.path lang="markdoc" /%}

## See also

- [Codegroup](/runes/codegroup) — tabbed code blocks; consumes snippet children transparently.
- [Diff](/runes/diff) — before/after code comparison; consumes snippet children transparently.
- [Content variables](/docs/authoring/variables) — `$file.path` for the view-source-of-current-page pattern.
