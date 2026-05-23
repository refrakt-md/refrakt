---
title: Snippet
description: Embed a project file as a syntax-highlighted code block — composes inside codegroup, diff, and any future fence-consuming container
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

## Title and caption

The optional `title` attribute renders as a `<figcaption>` above the code block. Useful when the file path alone doesn't tell the reader what they're looking at.

```markdoc
{% snippet path="packages/runes/src/lang-map.ts" lines="42-50" title="FALLBACK_LANG constant" /%}
```

{% snippet path="packages/runes/src/lang-map.ts" lines="42-50" title="FALLBACK_LANG constant" /%}

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
{% snippet path="packages/runes/src/lang-map.ts" lines="1-5" lang="javascript" title="Same file, force-rendered as JavaScript" /%}
```

{% snippet path="packages/runes/src/lang-map.ts" lines="1-5" lang="javascript" title="Same file, force-rendered as JavaScript" /%}

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

## Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | String | Yes | Path to the source file, relative to the project root. |
| `lines` | String | No | Line range. `"10-25"` / `"10-"` / `"-20"` / `"10"`. 1-indexed, inclusive. |
| `lang` | String | No | Override the extension-inferred syntax-highlighting language. |
| `title` | String | No | Caption rendered above the code block (standalone form only). |

## View source — recursively

Snippet's killer trick: feed it `$file.path` from the page-variable surface ({% xref "/extend/variables" /%}) to embed the page's own source.

```markdoc
{% snippet path=$file.path lang="markdoc" title="The source of this page" /%}
```

Renders as the snippet block below — at build time it reads the page you're looking at right now and inlines its content. The reader sees the markdown that generates the page they're reading. The "see it in action" pitch in one rune.

{% snippet path=$file.path lang="markdoc" title="The source of this page" /%}

## See also

- [Codegroup](/runes/codegroup) — tabbed code blocks; consumes snippet children transparently.
- [Diff](/runes/diff) — before/after code comparison; consumes snippet children transparently.
- [Content variables](/extend/variables) — `$file.path` for the view-source-of-current-page pattern.
