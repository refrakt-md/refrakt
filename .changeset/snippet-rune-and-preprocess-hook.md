---
"@refrakt-md/types": minor
"@refrakt-md/runes": minor
"@refrakt-md/content": minor
"@refrakt-md/lumina": minor
---

Snippet rune: embed a project file as a syntax-highlighted code block (SPEC-062). Core rune; composes transparently inside `{% codegroup %}`, `{% diff %}`, and any future fence-consuming container via pre-resolve.

```markdoc
{% snippet path="src/lib/foo.ts" /%}
{% snippet path="src/lib/foo.ts" lines="10-25" /%}
{% snippet path=$file.path lang="md" title="This page" /%}

{% codegroup %}
{% snippet path="examples/button.svelte" /%}
{% snippet path="examples/button.vue" /%}
{% /codegroup %}
```

**Implementation as AST preprocessor.** Snippet is not a transform-time rune — every `{% snippet %}` tag is replaced with a Markdoc `fence` node before the schema-driven transform runs. The fence carries the file's resolved content, the inferred (or explicit) language, and `data-snippet-source` / `data-snippet-title` / `data-snippet-lines` attributes for downstream tooling.

By transform time, no snippet tags remain — only fences. Container runes that match `fence` (codegroup, diff, future runes) consume them transparently with no per-rune awareness of snippet. The standalone form's `<figure class="rf-snippet">` chrome is applied by a post-transform wrap step that only fires for `<pre data-snippet-source>` elements *not* descended from a fence-consuming container output.

**New `preprocess` pipeline phase.** `PluginPipelineHooks` gains a `preprocess` hook that runs per page on the parsed Markdoc AST before the transform. The `PreprocessContext` extends `PipelineContext` with `projectRoot` and `sandbox` so file-reading preprocessors (snippet, future macros, future build-time include resolvers) have what they need; variables from the transform config aren't available pre-transform. Hook signature:

```ts
preprocess?: (
  ast: Markdoc.Node,
  page: { url: string; relativePath: string; filePath: string },
  ctx: PreprocessContext,
) => Markdoc.Node | void | Promise<...>;
```

Core's `corePipelineHooks` registers the snippet preprocess hook through the existing `createCorePipelineHooks` factory — exercises the hook contract from within core, validating it as a general extension point.

**Sandbox enforcement** (in `packages/runes/src/lib/read-file.ts`): absolute paths rejected, traversal escapes rejected, symlinks escaping the project root rejected, missing files / directories rejected. All errors produce build errors that name the resolved path and the referencing page; line-range clamps produce warnings.

**`<pre>` data-attribute pass-through.** The fence node transform (`packages/runes/src/nodes.ts`) now forwards `data-*` attributes from the fence node to the rendered `<pre>`. This is how snippet markers (`data-snippet-source`, etc.) survive the transform so the wrap step can find them.

**Docs site dogfood.** New page at `site/content/runes/snippet.md` linked from the "Code & Data" sidebar section. The page renders live snippets of actual files in this repository, demonstrates composition with codegroup and diff using real source files, and ends with a recursive view-source-of-itself example via `{% snippet path=$file.path lang="markdoc" /%}` — the snippet docs page literally embeds its own source markdown.

**Lumina** ships baseline `.rf-snippet` and `.rf-snippet__title` styling.
