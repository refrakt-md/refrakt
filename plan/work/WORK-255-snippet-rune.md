{% work id="WORK-255" status="ready" priority="medium" complexity="complex" source="SPEC-062" tags="runes, docs, code, transform, pipeline" milestone="v0.15.0" %}

# Snippet rune

The `snippet` rune renders the contents of a file (path relative to the project root) as a syntax-highlighted code block. Solves the recurring "docs example drifts from source" problem and incidentally enables the view-source-of-current-page pattern via `{% snippet path=$file.path /%}`. Lives in `@refrakt-md/docs`.

Snippet is implemented as an **AST preprocessor** rather than a transform-time rune, so it composes transparently inside any fence-consuming container (codegroup, diff, future runes). See SPEC-062's Composition section for the design rationale.

## Acceptance Criteria

### Authoring + sandbox

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
- [ ] Language is inferred from file extension via the shared `lang-map` module from WORK-254
- [ ] `lang=` overrides inferred language
- [ ] `{% snippet path=$file.path /%}` works end-to-end (project-root frame matches the sandbox)

### Standalone rendering

- [ ] `title=` renders as a caption in `.rf-snippet__title` on the standalone figure wrapper
- [ ] `data-source-path` is set on the standalone figure wrapper to the resolved path (relative to project root)
- [ ] `data-lines` is set on the standalone figure wrapper when `lines=` is used
- [ ] CSS in the docs plugin covers `.rf-snippet*` selectors

### Composition (pre-resolve)

- [ ] `PluginPipelineHooks` gains a `preprocess` hook that runs per page on the parsed Markdoc AST before the schema-driven transform
- [ ] `packages/content/src/site.ts` runs registered `preprocess` hooks in plugin order between `Markdoc.parse(...)` and `Markdoc.transform(...)`
- [ ] The docs plugin registers a `preprocess` hook that walks the AST, finds every `{% snippet %}` tag node, resolves it (read file, slice `lines=`, infer language), and replaces it with a `fence` node carrying `content`, `language`, and `data-snippet-source` / `data-snippet-title` / `data-snippet-lines` attributes as appropriate
- [ ] By transform time, no `{% snippet %}` tags remain in the AST — only fence nodes (some "snippet-derived" distinguishable by `data-snippet-*` attributes)
- [ ] `{% snippet %}` inside `{% codegroup %}` renders as a tab containing the file's content; tab label uses `title=` or the inferred prettified language; **no `<figure>` wrapper applied**
- [ ] `{% snippet %}` inside `{% diff %}` (two snippets — before / after) renders as a diff with hunks computed from the two files' contents; **no `<figure>` wrapper applied**
- [ ] Mixed children — `{% snippet %}` and triple-backtick fences in the same `{% codegroup %}` or `{% diff %}` — work uniformly
- [ ] `{% snippet %}` at document level renders inside the `<figure class="rf-snippet">` wrapper with optional `<figcaption>` from `title=`
- [ ] The post-transform wrap step suppresses the figure wrapper when the `<pre data-snippet-source>` is descended from a known fence-consuming container output (`data-rune="code-group"`, `data-rune="diff"`)
- [ ] The snippet rune schema's `transform` function is unreachable in normal operation; if it ever runs (e.g., docs plugin's `preprocess` hook not registered), it throws a clear error pointing the user at the docs plugin
- [ ] Tests cover composition cases with real file fixtures: snippet at document level, two snippets in codegroup, two snippets in diff, mixed snippet + fence in codegroup
- [ ] Authoring docs cover the rune, sandbox rules, line range syntax, language inference table, and the composition cases

## Approach

Per SPEC-062's Engine Changes section:

### Pipeline extension

- `packages/types/src/pipeline.ts`: add the `preprocess` hook to `PluginPipelineHooks`. Hook signature: `(ast, page, ctx) => Node | void`.
- `packages/content/src/site.ts`: between `Markdoc.parse(...)` and `Markdoc.transform(...)` in the per-page loop, walk registered plugin hook sets and call each `preprocess` in order. The returned AST (or the mutated one if the hook returned void) flows into the transform.
- Core has no preprocess hook to register; the slot is purely for plugins.

### Docs plugin

- `plugins/docs/src/runes/snippet.ts` — rune schema (`createContentModelSchema`) declaring attributes for tooling / validation / inspect output. The `transform` function throws a clear error if invoked (preprocess should have replaced the tag before transform runs).
- `plugins/docs/src/lib/read-file.ts` — sandbox enforcement (absolute-path reject, traversal reject, symlink reject, existence check) and line-range slicing. Reusable by future file-reading runes.
- `plugins/docs/src/pipeline.ts` (new or extended):
  - `preprocess` hook: walks the AST, finds `{% snippet %}` tag nodes, resolves each via `read-file.ts`, replaces with a fence node carrying content + language + `data-snippet-*` attributes.
  - `postProcess` hook: walks the rendered tree, finds `<pre data-snippet-source>` elements, wraps in `<figure class="rf-snippet">` when not descended from a fence-consuming container output.
- Plugin's `theme.runes` adds the `Snippet` config entry (for inspect / contracts coverage).
- CSS in `plugins/docs/styles/snippet.css` covers `.rf-snippet*` for the standalone form.

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

{% /work %}
