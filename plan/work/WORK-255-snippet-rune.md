{% work id="WORK-255" status="done" priority="medium" complexity="complex" source="SPEC-062" tags="runes, docs, code, transform, pipeline" milestone="v0.15.0" %}

# Snippet rune

The `snippet` rune renders the contents of a file (path relative to the project root) as a syntax-highlighted code block. Solves the recurring "docs example drifts from source" problem and incidentally enables the view-source-of-current-page pattern via `{% snippet path=$file.path /%}`. **Core rune** (lives in `@refrakt-md/runes`) — "embed a file as a code block" is a universal primitive, not docs-specific; it sits in the "Code & Data" category alongside `codegroup`, `compare`, and `diff`.

Snippet is implemented as an **AST preprocessor** rather than a transform-time rune, so it composes transparently inside any fence-consuming container (codegroup, diff, future runes). See SPEC-062's Composition section for the design rationale.

## Acceptance Criteria

### Authoring + sandbox

- [x] `{% snippet path="..." /%}` reads the file from project root and renders it as a syntax-highlighted code block
- [x] Paths are resolved relative to the directory containing `refrakt.config.json`
- [x] Absolute paths (`/etc/passwd`) are rejected with a build error
- [x] Traversal paths (`../../foo`) escaping project root are rejected with a build error
- [x] Symlinks pointing outside project root are rejected with a build error
- [x] Missing files produce a build error naming the resolved path and the referencing source location
- [x] Directory paths are rejected with a build error
- [x] `lines="10-25"` extracts lines 10–25 inclusive
- [x] `lines="10-"` extracts from line 10 to end of file
- [x] `lines="-20"` extracts from line 1 to line 20
- [x] `lines="10"` extracts just line 10
- [x] Out-of-range end clamps to file length with a build warning
- [x] Out-of-range start (entirely past EOF) is a build error
- [x] Inverted range (`"25-10"`) is a build error
- [x] Malformed range string is a build error with the input echoed
- [x] Language is inferred from file extension via the shared `lang-map` module from WORK-254
- [x] `lang=` overrides inferred language
- [x] `{% snippet path=$file.path /%}` works end-to-end (project-root frame matches the sandbox)

### Standalone rendering

- [x] `title=` renders as a caption in `.rf-snippet__title` on the standalone figure wrapper
- [x] `data-source-path` is set on the standalone figure wrapper to the resolved path (relative to project root)
- [x] `data-lines` is set on the standalone figure wrapper when `lines=` is used
- [x] CSS in Lumina (`packages/lumina/styles/runes/snippet.css`) covers `.rf-snippet*` selectors

### Composition (pre-resolve)

- [x] `PluginPipelineHooks` gains a `preprocess` hook that runs per page on the parsed Markdoc AST before the schema-driven transform
- [x] `packages/content/src/site.ts` runs registered `preprocess` hooks in plugin order between `Markdoc.parse(...)` and `Markdoc.transform(...)`
- [x] Core's pipeline contributions (`corePipelineHooks` / `createCorePipelineHooks`) register a `preprocess` hook that walks the AST, finds every `{% snippet %}` tag node, resolves it (read file, slice `lines=`, infer language), and replaces it with a `fence` node carrying `content`, `language`, and `data-snippet-source` / `data-snippet-title` / `data-snippet-lines` attributes as appropriate
- [x] By transform time, no `{% snippet %}` tags remain in the AST — only fence nodes (some "snippet-derived" distinguishable by `data-snippet-*` attributes)
- [x] `{% snippet %}` inside `{% codegroup %}` renders as a tab containing the file's content; tab label uses `title=` or the inferred prettified language; **no `<figure>` wrapper applied**
- [x] `{% snippet %}` inside `{% diff %}` (two snippets — before / after) renders as a diff with hunks computed from the two files' contents; **no `<figure>` wrapper applied**
- [x] Mixed children — `{% snippet %}` and triple-backtick fences in the same `{% codegroup %}` or `{% diff %}` — work uniformly
- [x] `{% snippet %}` at document level renders inside the `<figure class="rf-snippet">` wrapper with optional `<figcaption>` from `title=`
- [x] The post-transform wrap step suppresses the figure wrapper when the `<pre data-snippet-source>` is descended from a known fence-consuming container output (`data-rune="code-group"`, `data-rune="diff"`)
- [x] The snippet rune schema's `transform` function is unreachable in normal operation; if it ever runs (e.g., core's preprocess hook not wired through), it throws a clear error pointing the user at the registration site
- [x] Tests cover composition cases with real file fixtures: snippet at document level, two snippets in codegroup, two snippets in diff, mixed snippet + fence in codegroup
- [x] Authoring docs cover the rune, sandbox rules, line range syntax, language inference table, and the composition cases

### Site documentation (dogfooded)

- [x] New rune-catalog page at `site/content/runes/snippet.md` following the established rune-doc pattern (frontmatter `title` + `description`, intro paragraph, sectioned examples with `{% preview source=true %}` blocks)
- [x] Page is linked from `site/content/runes/_layout.md` in the "Code & Data" section of the sidebar nav (next to `codegroup`, `compare`, `diff`)
- [x] Page includes a **live example loading a real file from refrakt's own content/source tree** — at minimum, one `{% snippet %}` block that resolves an actual file in the repo (a small, stable example like a token CSS snippet or a docs-plugin source file). The reader sees the actual file content rendered through the rune.
- [x] Page includes a **view-source-of-itself example**: `{% snippet path=$file.path lang="md" title="This page's source" /%}` at the bottom of the doc, demonstrating the canonical view-source pattern recursively against the page itself.
- [x] Page includes **composition examples**: `{% codegroup %}` with two `{% snippet %}` children, and `{% diff %}` with two `{% snippet %}` children, both loading real files from the repo. Reader sees the composition work end-to-end.
- [x] Page documents the line-range syntax with a live example that slices a file (e.g., `lines="1-10"` on a meaningfully larger file).
- [x] Page documents the language-inference table and the `lang=` override with a live example.
- [x] Page documents the sandbox rules (project-root anchor, traversal rejection, symlink rejection) as a reference table; doesn't need to demonstrate failures live.

## Approach

Per SPEC-062's Engine Changes section:

### Pipeline extension

- `packages/types/src/pipeline.ts`: add the `preprocess` hook to `PluginPipelineHooks`. Hook signature accepts a per-page context that includes the parsed AST, the page metadata (url, relativePath, filePath), and a preprocess-specific context with `projectRoot` and the existing `SandboxHooks` (read/list/exists) so file-reading preprocessors like snippet can do sandboxed file reads. Variables from the transform config aren't available yet (the transform hasn't run).
- `packages/content/src/site.ts`: between `Markdoc.parse(...)` and `Markdoc.transform(...)` in the per-page loop, walk every registered hook set (core + plugins, in order) and call each `preprocess` hook. The returned AST (or the mutated one if the hook returned void) flows into the transform.
- Core's own preprocess hook (snippet) is registered through the same `createCorePipelineHooks` factory pattern used for xref patterns — exercises the hook contract from within core, validating it works as a general extension point.

### Docs plugin

- `packages/runes/src/tags/snippet.ts` — rune schema (`createContentModelSchema`) declaring attributes for tooling / validation / inspect output. Exported via `packages/runes/src/index.ts` so it joins the core `tags` map. The `transform` function throws a clear error if invoked (preprocess should have replaced the tag before transform runs).
- `packages/runes/src/lib/read-file.ts` — sandbox enforcement (absolute-path reject, traversal reject, symlink reject, existence check) and line-range slicing. Reusable by future file-reading runes.
- `packages/runes/src/config.ts` — extend `createCorePipelineHooks` (and therefore `corePipelineHooks`) with the snippet preprocess + postProcess hooks. The preprocess hook walks the AST, finds `{% snippet %}` tag nodes, resolves each via `read-file.ts`, and replaces with a fence node carrying content + language + `data-snippet-*` attributes. The postProcess hook walks the rendered tree, finds `<pre data-snippet-source>` elements, wraps in `<figure class="rf-snippet">` when not descended from a fence-consuming container output. Add the `Snippet` theme-config entry to `coreConfig` so inspect / contracts cover it.
- `packages/lumina/styles/runes/snippet.css` — covers `.rf-snippet*` selectors for the standalone form.

### Output shape

By transform time, every snippet has become a Markdoc `fence` node. Markdoc's existing fence-to-code-block path handles syntax highlighting via the existing Niwaki integration. The `data-snippet-*` attributes flow through to the rendered `<pre>` (Markdoc preserves arbitrary `data-*` attributes on fences). Container runes (codegroup, diff) match `fence` nodes in their content models and consume them without any per-rune awareness of snippet.

The standalone wrap step is the only "snippet-knows-about-itself" code at transform time — it sees the marker on a top-level `<pre>` and applies chrome.

## Dependencies

- {% ref "WORK-249" /%} — `$file.path` (for the view-source-of-current-page pattern)
- {% ref "WORK-254" /%} — shared `lang-map` module

## References

- {% ref "SPEC-062" /%} — snippet-rune spec (full; includes the Composition section)
- {% ref "SPEC-060" /%} — drawer rune (composes for view-source pattern)
- {% ref "SPEC-068" /%} — deferred HMR follow-up for referenced-file watching
- `packages/runes/src/tags/codegroup.ts` — fence-consuming container; gets snippet composition for free via pre-resolve
- `packages/runes/src/tags/diff.ts` — fence-consuming container; same
- `packages/lumina/styles/runes/code-block.css` — existing code-block CSS to compose with

## Resolution

Completed: 2026-05-23

Branch: `claude/v0.15.0-phase-2`

### What was done

- **`packages/types/src/pipeline.ts`** — added `PreprocessContext` (extends `PipelineContext` with `projectRoot` + `sandbox`), `PreprocessPage` (per-page metadata: url + relativePath + filePath), and the `preprocess` hook to `PluginPipelineHooks`. The hook signature accepts both sync and async, with `void` to leave AST unchanged or a returned `Node` for replacement.
- **`packages/types/src/index.ts`** — re-exported the new types.
- **`packages/runes/src/lib/read-file.ts`** (new) — snippet's file resolver: `resolveSnippetPath` (absolute reject, traversal reject, symlink reject via `fs.realpathSync`), `parseLineRange` (`"N"` / `"N-M"` / `"N-"` / `"-M"`; inverted/malformed throw), `sliceContent` (clamps end with warning, throws on past-EOF start), `readSnippetFile` (orchestrates the above with `SnippetSandboxError` exceptions for the preprocess hook to format).
- **`packages/runes/src/tags/snippet.ts`** (new) — rune schema declaring `path` / `lines` / `lang` / `title` attributes for tooling. The `transform` throws a clear "preprocess hook was not wired through" error if it ever runs (it shouldn't in normal operation).
- **`packages/runes/src/snippet-pipeline.ts`** (new) — `preprocessSnippets(ast, page, ctx)` walks the AST, finds every `{% snippet %}` tag, calls `readSnippetFile`, and replaces the tag with a Markdoc `fence` node carrying `content` + `language` + `data-snippet-source` / `data-snippet-title` / `data-snippet-lines` markers. `wrapStandaloneSnippets(page, aggregated, ctx)` walks the post-transform renderable, finds `<pre data-snippet-source>` elements, and wraps in `<figure class="rf-snippet">` chrome — but only when not descended from a fence-consuming container (`data-rune="code-group"` or `data-rune="diff"`).
- **`packages/runes/src/config.ts`** — `createCorePipelineHooks` returns a hook set whose `preprocess` is `preprocessSnippets` and whose `postProcess` now calls `wrapStandaloneSnippets` after xref resolution. Core-as-snippet-consumer dogfoods the new `preprocess` pipeline phase from within core itself.
- **`packages/runes/src/nodes.ts`** — fence node transform now forwards `data-*` attributes from the fence node to the rendered `<pre>`. This is how snippet markers survive the transform so the wrap step can find them. Side benefit: any future fence-attached metadata flows through automatically.
- **`packages/runes/src/index.ts`** — exported `snippet` schema, `LANG_MAP` / `FALLBACK_LANG` / `inferLanguage` (delivered in WORK-254), and the `Snippet` rune entry (Code & Data category) in the catalog.
- **`packages/content/src/site.ts`** — built `hookSets` before the per-page loop (rather than after, as previously) so the preprocess phase can run during page processing. Per-page preprocess context wraps a warnings array; warnings are funneled into the pipeline-warnings surface so adapters' build summaries see them.
- **`packages/lumina/styles/runes/snippet.css`** (new) — `.rf-snippet` + `.rf-snippet__title` baseline styling. Imported in `packages/lumina/index.css`.
- **`packages/runes/test/snippet-pipeline.test.ts`** (new) — 23 tests covering: preprocess replacement, language inference, lang= override, title + lines markers, all sandbox-rejection paths (absolute, traversal, missing, directory, symlink), line-range edge cases (clamp, past-EOF, inverted, malformed, shorthand, open ranges), nested-AST traversal, full pipeline composition with codegroup (tabs + no figure wrap), full pipeline composition with diff (hunks + no figure wrap), mixed snippet+fence in codegroup, standalone wrap behavior (wrap when standalone, skip inside codegroup, identity-preserve when no snippets), schema-transform-throws safety net.
- **`site/content/runes/snippet.md`** (new) — dogfooded rune-catalog page. Renders live snippets of refrakt's own files (`packages/runes/src/lang-map.ts`, `packages/runes/src/util.ts`), demonstrates line ranges, language override, composition inside `{% codegroup %}` and `{% diff %}` using real source files, sandbox rules table, and a recursive view-source-of-itself example via `{% snippet path=$file.path lang="markdoc" /%}` at the bottom.
- **`site/content/runes/_layout.md`** — added `snippet` to the "Code & Data" sidebar nav section, next to `codegroup` / `compare` / `diff`.
- **`.changeset/snippet-rune-and-preprocess-hook.md`** — minor-version changeset documenting the rune, the new pipeline phase, the sandbox model, and the docs site dogfood.

### Notes

- **Fence node data-attribute pass-through is a small but important change.** Without it, snippet markers set on the fence by preprocess would be filtered out at transform time and the wrap step would have no way to identify snippet-derived `<pre>` elements. Forwarding all `data-*` attributes (rather than hardcoded ones) keeps the contract open: any future fence-attached metadata flows through automatically.
- **The schema's transform throws if reached** — defense in depth. In practice the preprocess hook always replaces snippet tags before transform; if a downstream change broke that wiring, the error points the user at the registration site rather than rendering broken output silently.
- **Container suppression uses an allowlist** (`code-group`, `diff`) on the wrap-step walker. Future fence-consuming containers either get added to the list or, ideally, signal via a generic `data-consumes-fence` attribute on their output. v1 ships with the explicit list since both relevant containers are already known.
- **Site doc page is intentionally minimal in stylistic chrome** — the substance is the live examples showing snippet doing real work against real files. The recursive view-source moment at the bottom is the small punchline.
- **The dogfood doc may need maintenance as referenced files change** — if `packages/runes/src/lang-map.ts` evolves, the line-range examples (`lines="1-40"` etc.) may need adjustment. That's the inherent risk of dogfooding; it's also exactly the value snippet provides — when the file changes, you see it in the docs.
- Full sweep clean: 2757 tests pass across the workspace.

{% /work %}
