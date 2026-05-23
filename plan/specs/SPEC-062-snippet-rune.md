{% spec id="SPEC-062" status="draft" tags="runes, docs, code, transform" %}

# Snippet rune

A rune that renders the contents of a file (path relative to the project root) as a syntax-highlighted code block. Solves the recurring documentation problem of keeping inline code examples in sync with actual source files, and incidentally enables the view-source-of-current-page pattern via `{% snippet path=$file.path /%}`.

**Core rune** (lives in `@refrakt-md/runes`). "Embed a file as a code block" is a universal primitive — useful in tutorials, marketing pages, blogs, world-building sites, anywhere an author wants build-time file embedding. Sits naturally next to `codegroup`, `compare`, `diff`, and `datatable` in the "Code & Data" category rather than in any plugin's specific surface.

Composes with `{% drawer %}` from {% ref "SPEC-060" /%} for the side-panel view-source pattern, depends on `$file.path` from {% ref "SPEC-061" /%} for the self-referential case, and — via a pre-resolve preprocessing step — composes transparently inside container runes that consume fenced code blocks (`{% codegroup %}`, `{% diff %}`, and any future fence-consuming rune). See **Composition** below. (Note: `$file.path` is the project-root-relative path, which matches snippet's project-root sandbox. `$page.path` exists too but is content-root-relative and the wrong frame for snippet's resolver.)

## Problem

Documentation embeds code examples by copy-paste. The original source file lives somewhere (an `examples/` directory, a package's `src/`, the page itself), and the docs author copies a chunk into a fenced code block. Inevitably:

- The source file changes; the docs don't notice.
- Boilerplate around the relevant chunk shifts line numbers; the docs reference is now wrong.
- The docs example diverges far enough that running it produces different output than the docs claim.

Workarounds (build scripts that splice files into Markdown, custom shortcodes, manual sync rituals) are ad-hoc and project-specific. No primitive in the rune system covers "render this file's contents as a code block, syntax-highlighted, kept in sync at build time."

The same primitive incidentally solves the view-source case (`path=$file.path`), the "show me my refrakt.config.json" case, and any other "embed this file" need.

-----

## Design Principles

**Path-based, project-root anchored.** `path` is relative to the project root (where `refrakt.config.json` lives). This makes paths portable across sites in a multi-site monorepo, and matches authors' mental model of "the project tree."

**Sandboxed by default.** The resolver rejects paths that escape the project root after normalization. No traversal, no absolute paths, no symlinks pointing outside. Security isn't subtle — explicit rejection.

**Build-time resolution.** File reads happen during parse/transform. No runtime fetches, no `fs` calls in the browser. The output is a fully-rendered code block by the time it reaches the renderer.

**Compose with existing code rendering.** Refrakt already has a code-block rendering path with syntax highlighting (Niwaki). The snippet rune produces the same output shape — it's the *source* (file contents vs. inline body) that differs, not the output.

**Pre-resolve to a fence node, not a transform-time rune.** Snippet is implemented as an AST preprocessor: every `{% snippet %}` tag is replaced by a Markdoc `fence` node (carrying the file's content + language + attribution markers) *before* the schema-driven transform runs. This means every container rune that already accepts fences accepts snippets for free — `{% codegroup %}`, `{% diff %}`, and any future fence-consuming rune get composition without ever knowing about snippet. The figure+caption chrome is applied as a separate post-transform step that only fires when a snippet renders standalone (not when it's been consumed by a container). Composition is built in, not retrofitted.

**Line ranges as first-class.** Real example files have boilerplate (imports, type declarations, surrounding context) before the interesting bit. Without `lines=`, the rune is useful 80% of the time; with it, useful always.

-----

## Authoring Surface

### Syntax

```markdoc
{# Embed a whole file #}
{% snippet path="examples/button.svelte" /%}

{# Embed a line range #}
{% snippet path="examples/button.svelte" lines="10-25" /%}

{# View source of the current page #}
{% snippet path=$file.path lang="md" title="This page" /%}

{# Override inferred language #}
{% snippet path="config/refrakt.json" lang="jsonc" /%}
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

Two output shapes depending on context — both flow from the same AST representation (a Markdoc `fence` node carrying snippet attribution).

### Standalone (snippet at document level)

When a snippet renders outside a container that consumes fences, a post-transform step wraps the resulting `<pre>` in a `<figure>` with optional caption:

```html
<figure class="rf-snippet" data-rune="snippet"
        data-source-path="examples/button.svelte">
  <figcaption class="rf-snippet__title">examples/button.svelte</figcaption>
  <pre class="rf-code-block" data-lang="svelte"
       data-snippet-source="examples/button.svelte"><code>...</code></pre>
</figure>
```

BEM:
- `.rf-snippet` — outer wrapper
- `.rf-snippet__title` — caption (only present when `title=` set)
- Inner `pre/code` produced by the existing code-block rendering

Data attributes on the figure:
- `data-rune="snippet"`
- `data-source-path` — the resolved path (useful for tooling, "edit this file" buttons, etc.)
- `data-lines` — the line range, if `lines=` set

### Nested (snippet inside a container rune)

When a snippet is consumed by a container that matches `fence` nodes (codegroup, diff, future fence-consuming runes), the container's transform sees the snippet's pre-resolved fence the same way it would see a regular fenced code block. The container produces its own chrome (tab panel, diff hunk, etc.) wrapping the resulting `<pre>`. The `<pre>` still carries `data-snippet-source` and `data-snippet-lines` so tooling can detect provenance; the figure+caption wrapper is **not** applied.

Net effect: an author writing

```markdoc
{% codegroup title="Button variants" %}
{% snippet path="examples/button-primary.svelte" /%}
{% snippet path="examples/button-secondary.svelte" /%}
{% /codegroup %}
```

gets the same output as if they'd inlined the two files into fenced code blocks — codegroup builds tabs from each panel, language inferred from each snippet's extension or `lang=` attribute. No special handling on codegroup's side.

-----

## Composition

The snippet rune is implemented as an **AST preprocessor** rather than a transform-time rune. This is the key design choice that makes composition work without each container rune having to know about snippet.

### Pre-resolve preprocessing

After Markdoc parses a page into an AST but **before** the schema-driven transform runs, a per-page preprocessing step walks the AST. For each `{% snippet %}` tag node:

1. Resolve and validate the path (project-root sandbox enforced; see Path Resolution & Sandbox below).
2. Read the file. Slice by `lines=` if set.
3. Determine the language: `lang=` attribute wins, else extension lookup via the shared `lang-map` module.
4. **Replace the tag node with a `fence` node** in the AST, carrying:
   - `content`: the (possibly sliced) file text.
   - `language`: the resolved language.
   - `attributes['data-snippet-source']`: the resolved path (relative to project root, POSIX-normalized).
   - `attributes['data-snippet-title']`: the `title=` value when set.
   - `attributes['data-snippet-lines']`: the `lines=` value when set.

By the time the transform runs, the AST contains no `{% snippet %}` tags — only fence nodes (some "regular," some "snippet-derived" distinguishable only by the `data-snippet-*` attributes).

### Container composition

Container runes that match fence nodes (codegroup, diff, and any future fence-consuming rune) see snippets as regular fence nodes. They consume `fence.attributes.content` for source text and `fence.attributes.language` for language hint — both fields are populated correctly by the preprocessing step.

The container's transform calls `Markdoc.transform(fence, config)` on each fence (existing behavior). The result is a `<pre>` element that still carries the `data-snippet-source` markers as data attributes. The container's chrome (tab panel for codegroup, diff hunk for diff) wraps that `<pre>`.

**Container runes need no changes to support snippet composition.** The only requirement is that they not strip arbitrary `data-*` attributes from their fence-derived children — which they already don't.

### Standalone wrapping

A small post-transform pass walks the renderable tree looking for `<pre>` elements carrying `data-snippet-source`. For each one whose nearest ancestor is **not** a fence-consuming container, it wraps the `<pre>` in a `<figure class="rf-snippet">` with an optional `<figcaption>` populated from `data-snippet-title`. The data attributes are mirrored onto the figure so tooling can find provenance at either level.

"Fence-consuming container" is detected by the wrap step via a small allowlist of known container outputs (`data-rune="code-group"`, `data-rune="diff"`). Future containers can opt in by setting `data-consumes-fence` on their output, or by being added to the allowlist when they ship.

### Concrete composition cases

| Composition | What happens |
|-------------|--------------|
| `{% snippet %}` at document level | Figure + caption wrapper applied; pre/code inside. |
| Two `{% snippet %}` inside `{% codegroup %}` | Each becomes a tab; tab label from `title=` or filename. No figure wrapper. |
| Two `{% snippet %}` inside `{% diff %}` (before / after) | Pre-resolved into two fences with content extracted; diff computes the hunk-level diff between them. No figure wrapper. |
| `{% snippet %}` inside `{% drawer %}` body | Drawer renders the snippet's body content as drawer-panel children; the standalone wrap step still applies because drawer isn't a fence-consuming container. The drawer's panel contains the figure+caption snippet block. |
| Mixed: fenced ` ```ts ` block AND `{% snippet %}` inside the same `{% codegroup %}` | Both become tabs; codegroup doesn't care about the origin. |

### Why pre-resolve (vs. widening container matchers)

The alternative considered was widening codegroup's / diff's content models to also match `snippet` tags and extracting source via a small abstraction. Pre-resolve was chosen because:

- **No container changes.** Container runes never have to know snippet exists; they keep their `match: 'fence'` contracts.
- **Future containers get composition for free.** A hypothetical `{% file-tabs %}`, `{% reader-pane %}`, or `{% transcript %}` rune that matches fences gets snippet composition without any per-rune work.
- **Single source of truth for "this is a code block."** Whether the source came from a triple-backtick fence or a snippet tag, the AST representation is the same `fence` node by transform time. Less cognitive overhead for downstream tooling.

The cost is one new pipeline phase (`preprocess`) — see Engine Changes.

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
Error: snippet path "examples/missing.ts" cannot be resolved.

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

A file-extension → language map shared across the rune system:

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

The map lives at `packages/runes/src/lang-map.ts`, exported from `@refrakt-md/runes`. Consumers (the snippet rune itself, the inspect tool in `packages/cli/`, the contracts generator, future runes wanting extension inference) import from there.

`@refrakt-md/runes` is the right home because:
- It's already a dependency of every consumer (plugins, CLI, inspect tooling).
- Plugins can import from runes; runes can't import from plugins (dependency direction is correct).
- It's "rune-shaped knowledge" — sits alongside the existing rune-utility surface (catalog, SEO extraction, engine config) rather than mixed in with the lower-level transform engine.

`lang=` always overrides inference.

-----

## Engine Changes

### New pipeline phase: `preprocess`

The composition story requires a new per-page hook that operates on the parsed AST *before* the schema-driven transform runs. Adding it to `PluginPipelineHooks`:

```ts
export interface PreprocessContext extends PipelineContext {
  /** Absolute path to the project root (where `refrakt.config.json` lives).
   *  Used by snippet's resolver as the sandbox anchor; available to any
   *  preprocess hook that needs disk-relative resolution. */
  projectRoot?: string;
  /** Sandboxed filesystem helpers — same shape as the transform-time
   *  `__sandboxReadFile` family, exposed here because preprocess runs
   *  before the transform's config.variables exist. */
  sandbox?: { read: (p: string) => string | null; list: (p: string) => string[]; exists: (p: string) => boolean };
}

export interface PluginPipelineHooks {
  /** Phase 0 — Preprocess.
   *  Runs per page on the parsed Markdoc AST before the transform. Hooks
   *  may rewrite the AST (replace tags with other node types, inject nodes,
   *  resolve include-style references). The returned AST is the one passed
   *  to the transform. Return `undefined` to leave the AST unchanged.
   *
   *  Use sparingly — most concerns belong in transforms or postProcess hooks.
   *  Preprocess is for cases where the rune needs to be invisible to
   *  downstream transforms (e.g., snippet → fence so container runes don't
   *  need per-rune awareness). */
  preprocess?: (
    ast: import('@markdoc/markdoc').Node,
    page: { url: string; relativePath: string; filePath: string },
    ctx: PreprocessContext,
  ) => import('@markdoc/markdoc').Node | void;

  register?: ...;
  aggregate?: ...;
  postProcess?: ...;
}
```

This is a small but meaningful pipeline extension. Snippet is the v1 consumer (registered through `corePipelineHooks` since snippet is a core rune); future use cases (custom macros, content rewriters, build-time include resolvers) plug in the same way from plugins.

The content pipeline runs preprocess hooks per page after parse, in the order they're registered (core first, then plugins). The output AST flows into the transform.

### Core contributions

- **Preprocess + postProcess hooks** join `corePipelineHooks` in `packages/runes/src/config.ts` (via the existing `createCorePipelineHooks` factory introduced in WORK-253). The preprocess hook walks the AST, finds `{% snippet %}` tag nodes, resolves each one (read file, slice lines, infer language), and replaces it in-place with a `fence` node carrying the resolved content + `data-snippet-*` attributes. The postProcess hook walks the rendered tree, finds `<pre>` elements carrying `data-snippet-source`, and — when not nested under a known fence-consuming container — wraps in `<figure class="rf-snippet">` with the appropriate caption.
- **Rune schema** in `packages/runes/src/tags/snippet.ts`: a thin schema declaring the rune's attributes for tooling (validation, inspect output, snippet-rune docs). The `transform` function is unreachable in normal operation (preprocess replaces the tag before transform runs); if it does execute it throws a clear error pointing at core's preprocess hook registration. Schema is exported via `packages/runes/src/index.ts` so it joins the core `tags` map.
- **Theme config entry** added to `coreConfig` in `packages/runes/src/config.ts` so `refrakt inspect snippet` works and the contracts generator picks it up.
- **File-reading helper** in `packages/runes/src/lib/read-file.ts` — sandbox enforcement matching the Path Resolution section (absolute-path reject, traversal reject, symlink reject, existence check, line-range slicing). Designed for reuse by future file-reading runes.
- **CSS** in `packages/lumina/styles/runes/snippet.css` covers `.rf-snippet*` selectors for the standalone form.

### Per-build context for the preprocess hook

Preprocess hooks need file-system access — they run before transform, so the `__sandboxReadFile`-style variables that runes use at transform time aren't available yet. Core's preprocess hook receives the per-page context augmented with `projectRoot` and the existing `SandboxHooks` (read/list/exists) so the snippet resolver can do sandboxed file reads. Plugin-defined preprocess hooks get the same context — generic, not snippet-specific.

### Shared utilities

- **Extension → language map** in `packages/runes/src/lang-map.ts` (delivered in WORK-254), exported from `@refrakt-md/runes`. Used by core's preprocess hook for language inference.
- **Project-root resolution helper** lives in `packages/runes/src/lib/read-file.ts` alongside the file-reading utility. Future file-reading runes (built-time includes, generated-content embeds) reuse it.

### Pipeline integration

- `packages/types/src/pipeline.ts`: add `preprocess` to `PluginPipelineHooks`.
- `packages/content/src/pipeline.ts`: extend `runPipeline` (or a parse-time sibling) to call each registered preprocess hook per page after `Markdoc.parse(...)` and before `Markdoc.transform(...)` in `site.ts`. The hooks operate on a mutable AST (or return a replacement AST).
- `packages/content/src/site.ts`: after the existing `Markdoc.parse(escapeFenceTags(content))`, run preprocess hooks in plugin order, then proceed with `extractHeadings`, `firstH1`, and the existing transform.

The wrap step (postProcess) is a regular cross-page pipeline postProcess hook — no new infrastructure required there.

-----

## Acceptance Criteria

- [ ] `{% snippet path="..." /%}` reads the file from project root and renders it as a syntax-highlighted code block
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
- [ ] Language is inferred from file extension via the shared `lang-map` module at `packages/runes/src/lang-map.ts`
- [ ] `lang=` overrides inferred language
- [ ] `title=` renders as a caption in `.rf-snippet__title` (standalone form only)
- [ ] `data-source-path` is set on the standalone figure wrapper to the resolved path (relative to project root)
- [ ] `data-lines` is set on the standalone figure wrapper when `lines=` is used
- [ ] `{% snippet path=$file.path /%}` works end-to-end via the `$file.path` variable (project-root frame matches the sandbox)
- [ ] CSS in Lumina covers `.rf-snippet*` selectors
- [ ] Authoring docs cover the rune, sandbox rules, line range syntax, language inference table, and composition behavior
- [ ] A dogfooded rune-catalog page lives at `site/content/runes/snippet.md`, linked from the `_layout.md` sidebar nav. The page includes a live example that loads a real file from refrakt's content/source tree, a view-source-of-itself example (`path=$file.path`), and live composition examples inside `{% codegroup %}` and `{% diff %}` — so the reader sees the rune working end-to-end against real content, not stubs.

### Composition (pre-resolve)

- [ ] `PluginPipelineHooks` gains a `preprocess` hook that runs per page on the parsed AST before the transform
- [ ] The content pipeline calls registered `preprocess` hooks in plugin order between `Markdoc.parse` and `Markdoc.transform`
- [ ] Core's `preprocess` hook (part of `corePipelineHooks`) replaces every `{% snippet %}` tag node in the AST with a `fence` node carrying the resolved file content, the resolved language, and `data-snippet-source` / `data-snippet-title` / `data-snippet-lines` attributes as appropriate
- [ ] `{% snippet %}` inside `{% codegroup %}` renders as a tab containing the file's content, with the language inferred or set, and **no `<figure>` wrapper applied**
- [ ] `{% snippet %}` inside `{% diff %}` (two snippets — before and after) renders as a diff with hunks computed from the two files' contents, and **no `<figure>` wrapper applied**
- [ ] Mixed children — `{% snippet %}` and triple-backtick fences in the same `{% codegroup %}` or `{% diff %}` — work uniformly (containers don't distinguish them)
- [ ] `{% snippet %}` at document level (not nested in a fence-consuming container) renders inside the `<figure class="rf-snippet">` wrapper with optional `<figcaption>` from `title=`
- [ ] The wrap step suppresses the figure wrapper when the `<pre data-snippet-source>` is descended from a known fence-consuming container output (`data-rune="code-group"`, `data-rune="diff"`)
- [ ] The snippet rune schema's `transform` function is unreachable in normal operation (preprocess replaces the tag before transform runs); if it does execute, it throws a clear error pointing the user at core's preprocess hook registration
- [ ] Tests cover all the composition cases above with real file fixtures

-----

## Out of Scope

- **Remote file fetching** (HTTPS URLs, `github://`, etc.) — file system only. Remote fetching has its own concerns (caching, network failures, build determinism) that don't belong here.
- **HMR for referenced files during dev** — deferred to {% ref "SPEC-068" /%}. In v1 the host page does *not* auto-refresh when a referenced source file changes outside the content tree; the author triggers a rebuild by saving any file inside the content tree (or restarting the dev server). Production builds are unaffected — every referenced file is read once at build time and committed to the output. Real dependency-tracked watching is a follow-up spec, intentionally informed by real usage shapes from this rune before committing to a per-adapter contract.
- **Multiple disjoint line ranges** (`lines="5-10,20-25"`) — YAGNI. One contiguous range is sufficient for the common case.
- **Dedent** — trimming common leading whitespace. Useful when extracting from indented blocks (a method body inside a class). Defer; can be added as a `dedent` attribute later.
- **Diff rendering** (showing two files side-by-side or as a diff) — different rune, different concern.
- **Editable code blocks** (live-edit, playground-style) — way out of scope; that's a different primitive entirely.
- **Path namespacing via file roots** ({% ref "SPEC-063" /%}'s `namespace:filename` syntax) — initially v1 is project-root-only. Whether to share the resolver with file roots is the most important Open Question below.
- **Nested composition inside other snippet-aware containers** — beyond codegroup and diff, no specific containers are prioritized for v1. Future fence-consuming runes get composition for free via the pre-resolve model; the wrap step's container allowlist gets a new entry as each lands.
- **Generic preprocess-hook ecosystem** — the new `preprocess` hook is added as part of this work item but no other plugins are migrated to use it in v0.15.0. Future macro / include / content-rewriting runes can adopt the same hook when they're designed.

-----

## Open Questions

**Should `path` accept file-root namespacing once {% ref "SPEC-063" /%} lands?** E.g. `path="plan:SPEC-001-foo.md"` reads from the plan namespace. Recommend yes — share one resolver so file-finding is consistent across runes. Implementation: ship snippet with project-root resolution in v1, extend to honor namespaces when SPEC-063 lands.

**Should syntax highlighting happen at build or render time?** Build (matches the existing code-block path; identity transform produces highlighted HTML). Render-time highlighting would require shipping the highlighter to the client, which is wasteful for static content.

**What about very large files — should there be a max-size guard?** Recommend a soft warning above ~100 KB and a hard error above ~1 MB. Embedding multi-megabyte files in docs is almost certainly a mistake worth flagging.

**Should the rune emit a "view original" link to the file?** Tempting (helpful for readers who want context beyond the embedded range), but the URL scheme isn't generic — it depends on the project's hosting (GitHub, GitLab, self-hosted). Defer to a theme-level or site-config concern; the rune sets `data-source-path` so a downstream consumer can build that link.

**Caching: should file reads be memoized within a single build?** Recommend yes (multiple `snippet` references to the same file are common — a getting-started page that shows the same `package.json` twice should read once). Cache key: resolved path; invalidated per build.

**Cross-references with the page-source / reflection idea.** With snippet shipped, the specific `page-source` rune dissolves into a one-line `{% snippet path=$file.path lang="md" /%}`. This spec confirms that direction — no separate `page-source` rune is shipped.

-----

## References

- {% ref "SPEC-060" /%} — drawer rune (primary composition target for view-source)
- {% ref "SPEC-061" /%} — content variable surface (provides `$file.path` for the view-source pattern)
- {% ref "SPEC-063" /%} — configurable file roots (potential resolver share)
- {% ref "SPEC-068" /%} — adapter HMR contract for arbitrary file dependencies (deferred follow-up that closes the dev-experience gap)
- `packages/lumina/styles/runes/code-block.css` — existing code-block CSS to compose with
- `packages/runes/src/` — home of the shared `lang-map` module
- Niwaki syntax highlighting documentation — the highlighting layer this rune feeds into

{% /spec %}
