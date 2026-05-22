{% spec id="SPEC-062" status="draft" tags="runes, docs, code, transform" %}

# Code-file rune

A rune that renders the contents of a file (path relative to the project root) as a syntax-highlighted code block. Solves the recurring documentation problem of keeping inline code examples in sync with actual source files, and incidentally enables the view-source-of-current-page pattern via `{% code-file path=$file.path /%}`.

Lives in `@refrakt-md/docs` — code-embed-from-disk is a docs concern. Composes with `{% drawer %}` from {% ref "SPEC-060" /%} for the side-panel view-source pattern, and depends on `$file.path` from {% ref "SPEC-061" /%} for the self-referential case. (Note: `$file.path` is the project-root-relative path, which matches code-file's project-root sandbox. `$page.path` exists too but is content-root-relative and the wrong frame for code-file's resolver.)

## Problem

Documentation embeds code examples by copy-paste. The original source file lives somewhere (an `examples/` directory, a package's `src/`, the page itself), and the docs author copies a chunk into a fenced code block. Inevitably:

- The source file changes; the docs don't notice.
- Boilerplate around the relevant chunk shifts line numbers; the docs reference is now wrong.
- The docs example diverges far enough that running it produces different output than the docs claim.

Workarounds (build scripts that splice files into Markdown, custom shortcodes, manual sync rituals) are ad-hoc and project-specific. No primitive in the rune system covers "render this file's contents as a code block, syntax-highlighted, kept in sync at build time."

The same primitive incidentally solves the view-source case (`path=$page.path`), the "show me my refrakt.config.json" case, and any other "embed this file" need.

-----

## Design Principles

**Path-based, project-root anchored.** `path` is relative to the project root (where `refrakt.config.json` lives). This makes paths portable across sites in a multi-site monorepo, and matches authors' mental model of "the project tree."

**Sandboxed by default.** The resolver rejects paths that escape the project root after normalization. No traversal, no absolute paths, no symlinks pointing outside. Security isn't subtle — explicit rejection.

**Build-time resolution.** File reads happen during parse/transform. No runtime fetches, no `fs` calls in the browser. The output is a fully-rendered code block by the time it reaches the renderer.

**Compose with existing code rendering.** Refrakt already has a code-block rendering path with syntax highlighting (Niwaki). The code-file rune produces the same output shape — it's the *source* (file contents vs. inline body) that differs, not the output.

**Line ranges as first-class.** Real example files have boilerplate (imports, type declarations, surrounding context) before the interesting bit. Without `lines=`, the rune is useful 80% of the time; with it, useful always.

-----

## Authoring Surface

### Syntax

```markdoc
{# Embed a whole file #}
{% code-file path="examples/button.svelte" /%}

{# Embed a line range #}
{% code-file path="examples/button.svelte" lines="10-25" /%}

{# View source of the current page #}
{% code-file path=$file.path lang="md" title="This page" /%}

{# Override inferred language #}
{% code-file path="config/refrakt.json" lang="jsonc" /%}
```

### Attributes

| Attribute | Type | Default | Meaning |
|-----------|------|---------|---------|
| `path` | string | required | Path to file, relative to project root. Rejected if it escapes the root. |
| `lines` | string | full file | Line range. Formats: `"10-25"`, `"10-"` (to EOF), `"-20"` (from start). 1-indexed, inclusive. |
| `lang` | string | inferred from extension | Syntax-highlighting language hint. |
| `title` | string | — | Optional caption above the code block (filename, description). |

-----

## Output Contract

```html
<figure class="rf-code-file" data-rune="code-file" data-source-path="examples/button.svelte">
  <figcaption class="rf-code-file__title">examples/button.svelte</figcaption>
  <!-- existing code-block rendering output -->
  <pre class="rf-code-block" data-lang="svelte"><code>...</code></pre>
</figure>
```

BEM:
- `.rf-code-file` — outer wrapper
- `.rf-code-file__title` — caption (only present when `title=` set)
- Inner `pre/code` produced by existing code-block rendering

Data attributes:
- `data-rune="code-file"`
- `data-source-path` — the resolved path (useful for tooling, "edit this file" buttons, etc.)
- `data-lines` — the line range, if `lines=` set

-----

## Path Resolution & Sandbox

### Resolution rules

1. **Project root anchor**: the directory containing the active `refrakt.config.json`. Resolved once at content-load time.
2. **Join + normalize**: `path.resolve(projectRoot, attributeValue)` then `path.normalize`.
3. **Containment check**: resolved path must start with `projectRoot + path.sep`. Reject otherwise.
4. **Symlink check**: `fs.realpath(resolved)` must also start with `projectRoot + path.sep`. Reject symlinks escaping the sandbox.
5. **Existence check**: `fs.statSync(resolved).isFile()`. Reject directories and missing files.

### Rejection cases (build errors)

- **Absolute path** (`path="/etc/passwd"`) — rejected before joining.
- **Traversal** (`path="../../../etc/passwd"`) — rejected by containment check after normalization.
- **Symlink escape** — rejected by `realpath` check.
- **Directory** — `path="src/"` rejected with "path must be a file".
- **Missing file** — rejected with "file not found at {resolved-path}".

### Error format

```
Error: code-file path "examples/missing.ts" cannot be resolved.

Resolved to: /project/examples/missing.ts
Reason: file not found

Referenced from: docs/getting-started.md:42
```

-----

## Line Ranges

### Format

| Input | Meaning |
|-------|---------|
| `"10-25"` | Lines 10 through 25, inclusive |
| `"10-"` | Line 10 to end of file |
| `"-20"` | Line 1 through line 20 |
| `"10"` | Single line (line 10 only) — shorthand for `"10-10"` |

1-indexed (matches editor line numbers), inclusive on both ends.

### Edge cases

- **Out-of-range start** (`"500-600"` on a 100-line file): build warning, output is empty range → build error suggesting the file's actual length.
- **Out-of-range end** (`"50-200"` on a 100-line file): clamp to file length, build warning naming the clamp.
- **Inverted range** (`"25-10"`): build error.
- **Non-numeric**: build error with the malformed input echoed.

### Dedent

Out of scope for v1 (see Out of Scope). Authors who need leading-whitespace trimming can use a line range that starts after the indentation level, or wait for a future `dedent` attribute.

-----

## Language Inference

A file-extension → language map shared with refrakt's existing code-highlighting machinery:

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

The map should live in a shared module so the inspect tool, the contracts generator, and the rune all use the same table. `lang=` always overrides inference.

-----

## Engine Changes

- New rune schema in `plugins/docs/src/runes/code-file.ts`
- Plugin's `theme.runes` adds the `CodeFile` config entry
- CSS in `plugins/docs/styles/code-file.css`
- File-reading utility in `plugins/docs/src/lib/read-file.ts` — sandbox enforcement, line-range slicing
- Project-root resolution helper, shared with future partial-roots resolution from {% ref "SPEC-063" /%}
- The rune produces the same internal Markdoc node shape as a fenced code block (so existing rendering picks it up) plus the `code-file` wrapper

-----

## Acceptance Criteria

- [ ] `{% code-file path="..." /%}` reads the file from project root and renders it as a syntax-highlighted code block
- [ ] Paths are resolved relative to the directory containing `refrakt.config.json`
- [ ] Absolute paths (`/etc/passwd`) are rejected with a build error
- [ ] Traversal paths (`../../foo`) escaping project root are rejected with a build error
- [ ] Symlinks pointing outside project root are rejected with a build error
- [ ] Missing files produce a build error naming the resolved path and the referencing source location
- [ ] Directory paths are rejected with a build error
- [ ] `lines="10-25"` extracts lines 10–25 inclusive
- [ ] `lines="10-"` extracts from line 10 to end of file
- [ ] `lines="-20"` extracts from line 1 to line 20
- [ ] `lines="10"` extracts just line 10
- [ ] Out-of-range end clamps to file length with a build warning
- [ ] Out-of-range start (entirely past EOF) is a build error
- [ ] Inverted range (`"25-10"`) is a build error
- [ ] Malformed range string is a build error with the input echoed
- [ ] Language is inferred from file extension via a shared extension→language map
- [ ] `lang=` overrides inferred language
- [ ] `title=` renders as a caption in `.rf-code-file__title`
- [ ] `data-source-path` is set on the wrapper to the resolved path (relative to project root)
- [ ] `data-lines` is set when `lines=` is used
- [ ] `{% code-file path=$file.path /%}` works once {% ref "SPEC-061" /%} lands (project-root frame matches the sandbox)
- [ ] CSS in lumina covers `.rf-code-file*` selectors
- [ ] Authoring docs cover the rune, sandbox rules, line range syntax, language inference table

-----

## Out of Scope

- **Remote file fetching** (HTTPS URLs, `github://`, etc.) — file system only. Remote fetching has its own concerns (caching, network failures, build determinism) that don't belong here.
- **Watching the file for changes during dev** — relies on the standard content-pipeline HMR; if the host page rebuilds, the embedded file is re-read. Real-time file watching for embedded files is a future enhancement.
- **Multiple disjoint line ranges** (`lines="5-10,20-25"`) — YAGNI. One contiguous range is sufficient for the common case.
- **Dedent** — trimming common leading whitespace. Useful when extracting from indented blocks (a method body inside a class). Defer; can be added as a `dedent` attribute later.
- **Diff rendering** (showing two files side-by-side or as a diff) — different rune, different concern.
- **Editable code blocks** (live-edit, playground-style) — way out of scope; that's a different primitive entirely.
- **Path namespacing via partial roots** ({% ref "SPEC-063" /%}'s `namespace:filename` syntax) — initially v1 is project-root-only. Whether to share the resolver with partial roots is the most important Open Question below.

-----

## Open Questions

**Should `path` accept partial-root namespacing once {% ref "SPEC-063" /%} lands?** E.g. `path="plan:SPEC-001-foo.md"` reads from the plan namespace. Recommend yes — share one resolver so file-finding is consistent across runes. Implementation: ship code-file with project-root resolution in v1, extend to honor namespaces when SPEC-063 lands.

**Should syntax highlighting happen at build or render time?** Build (matches the existing code-block path; identity transform produces highlighted HTML). Render-time highlighting would require shipping the highlighter to the client, which is wasteful for static content.

**What about very large files — should there be a max-size guard?** Recommend a soft warning above ~100 KB and a hard error above ~1 MB. Embedding multi-megabyte files in docs is almost certainly a mistake worth flagging.

**Should the rune emit a "view original" link to the file?** Tempting (helpful for readers who want context beyond the embedded range), but the URL scheme isn't generic — it depends on the project's hosting (GitHub, GitLab, self-hosted). Defer to a theme-level or site-config concern; the rune sets `data-source-path` so a downstream consumer can build that link.

**Caching: should file reads be memoized within a single build?** Recommend yes (multiple `code-file` references to the same file are common — a getting-started page that shows the same `package.json` twice should read once). Cache key: resolved path; invalidated per build.

**Cross-references with the page-source / reflection idea.** With code-file shipped, the specific `page-source` rune dissolves into a one-line `{% code-file path=$page.path lang="md" /%}`. This spec confirms that direction — no separate `page-source` rune is shipped.

-----

## References

- {% ref "SPEC-060" /%} — drawer rune (primary composition target for view-source)
- {% ref "SPEC-061" /%} — content variable surface (provides `$file.path` for the view-source pattern)
- {% ref "SPEC-063" /%} — configurable partial roots (potential resolver share)
- `packages/lumina/styles/runes/code-block.css` — existing code-block CSS to compose with
- Niwaki syntax highlighting documentation — the highlighting layer this rune feeds into

{% /spec %}
