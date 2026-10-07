{% work id="WORK-618" status="done" priority="high" complexity="complex" source="SPEC-141" milestone="v0.39.0" tags="runes,preprocess,architecture,composition" pr="refrakt-md/refrakt#667" %}

# Resolve preprocessors in one tree-order walk

{% ref "SPEC-141" /%}'s main change. Replace the three whole-AST passes
(`walkAndReplaceIncludes`, `walkAndReplaceSnippets`, `walkAndReplaceData`) and their
hand-written order in `config.ts` with **one walk that dispatches per tag**, and move
each preprocessor into the tag module that owns it:

```ts
// ContentModelSchemaOptions — beside `transform`
preprocess?(node: Node, page: PreprocessPage, ctx: PreprocessContext): Node | Node[] | void;
```

The walk descends into a replacement, so a producer's output is resolved where it
lands. That is a valid topological order because the producer/consumer graph is
acyclic by construction (a snippet's fence is never re-parsed). The ordering then
follows from tree position instead of from a maintained list, and it fixes
{% ref "BUG-027" /%} (`{% snippet %}` in a `{% data %}` row template) with no special
case.

Held back from v0.38.0 because v0.37.0 was still rewriting
`snippet-pipeline.ts`. Both of those milestones are now done.

## Decisions carried from the spec

- **D1** — the hook receives its own node, not the tree; `Node[]` splices.
- **D2** — `PluginPipelineHooks.preprocess` stays, undeprecated.
- **D3** — `include` keeps its own nested expansion and cycle stack; `data`'s internal subquery walk is removed in favour of the generic descent.
- **D4** — the ancestor chain is part of the walk context; `data`'s `enclosing` check reads it.
- **D7** — `snippet`'s throwing `transform` stays.
- **D8** — `emitTag` stays declarative; no content model is narrowed.

## Acceptance Criteria

- [x] `ContentModelSchemaOptions` accepts `preprocess`, receiving the rune's own node and returning a replacement, several, or nothing
- [x] One walk resolves all preprocessors; `walkAndReplaceIncludes`, `walkAndReplaceSnippets` and `walkAndReplaceData` no longer exist as three separate traversals
- [x] The walk descends into a replacement, and `data`'s internal subquery walk is removed in favour of it (D3)
- [x] `include` keeps its own nested expansion and its cycle stack; a direct and an indirect cycle are still named rather than overflowing
- [x] `snippet`'s and `include`'s preprocessors live in their tag modules; `snippet-pipeline.ts` and `include-pipeline.ts` are gone as top-level modules
- [x] `config.ts` no longer states a preprocessor order
- [x] `{% snippet %}` inside a `{% data %}` row template resolves against the bound row — BUG-027, with a regression test
- [x] Nested `{% data %}` still resolves its subquery per outer row, with the outer row binding the inner tag's attributes and not its body (SPEC-127 / WORK-553)
- [x] `{% snippet %}` and `{% data %}` inside an included file still resolve — the existing `include-pipeline.test.ts` cases pass unchanged
- [x] `emitTag` remains a declarative field; no rune's content model is narrowed to match the emitted tag, and `match` still states the authored input shape (D8)
- [x] `refrakt contracts --check` and `npm run seo:baseline:check` report no drift
- [x] The rune authoring guide documents `preprocess`, and says when to reach for the plugin-level hook instead (D2)

## Blocked by

- {% ref "WORK-615" /%}

## Blocks

- {% ref "BUG-027" /%}

## References

- {% ref "SPEC-141" /%} — the spec
- {% ref "SPEC-127" /%} — per-row templates; what made `data` a producer
- {% ref "SPEC-129" /%} — include and the load-bearing order this replaces

## Resolution

Completed: 2026-10-07

Branch: `claude/v039-tree-order-preprocess`
PR: refrakt-md/refrakt#667

### What was done
- `packages/runes/src/lib/preprocess.ts` (new): `RunePreprocess`, `RunePreprocessContext` (`PreprocessContext` + `ancestors`, document first), the `schemaPreprocessors` WeakMap, and `preprocessTree` — the single walk. It dispatches per tag from a tag table, splices `Node[]`, revisits the position after a replacement (so it descends into what was produced), and treats `undefined` or the node itself as "leave alone, descend into it".
- `packages/runes/src/lib/index.ts`: `ContentModelSchemaOptions.preprocess`, recorded on the WeakMap; `preprocessTree` and the types exported from `@refrakt-md/runes`.
- `tags/snippet.ts`, `tags/include.ts`: the preprocessors moved in and are declared as `preprocess`; `snippet-pipeline.ts` and `include-pipeline.ts` deleted. Include keeps its own nested expansion + cycle stack (D3); `MAX_INCLUDE_DEPTH` now lives in `tags/include.ts`.
- `data-pipeline.ts`: `preprocessData` / `walkAndReplaceData` replaced by `preprocessDataTag`, declared on `tags/data.ts`; the internal subquery walk is gone (generic descent resolves it); `enclosing` is read from `ctx.ancestors` (D4).
- `config.ts`: the ordered composition and its comment are gone; the core hook calls `preprocessTree` over `embedConfig.tags` (merged core + plugin tags), falling back to core's include/snippet/data. Plugin runes declaring `preprocess` therefore take part. `PluginPipelineHooks.preprocess` unchanged (D2); `emitTag` / content models untouched (D8); snippet's throwing transform kept (D7).
- Docs: `extend/rune-authoring/authoring-overview.md` gains "Resolving before the transform — `preprocess`" with the rune-vs-plugin hook guidance; `runes/include.md` drops "runs first"; `runes/data.md` documents preprocessor runes in a row template seeing the bound row.
- Tests: `preprocess-tree-order.test.ts` (BUG-027 cases committed failing first, plus hook API cases); existing include/data/snippet test cases unchanged, imports pointed at a `preprocess` helper in `test/helpers.ts` that runs the one walk.
- Changeset `preprocess-in-tree-order.md`.

### Notes
- Contracts and SEO baseline: no drift. Full suite 5112/5112.
- Diagnostics from a snippet inside a data body are now reported once per row (it resolves per row), where before one error was cloned silently.
- Known limitation, kept by D3: include's internal nested expansion walks into a `data` body inside a pasted file, so `{% include file=$row.x %}` in a row template *inside an included file* still expands before the row is bound. That same internal walk is what names a cycle through a data body instead of looping. The page-level case works. Follow-up candidate: carry the include chain on pasted nodes so the generic walk can own descent for include too.

{% /work %}
