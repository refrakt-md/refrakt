{% work id="WORK-618" status="in-progress" priority="high" complexity="complex" source="SPEC-141" milestone="v0.39.0" tags="runes,preprocess,architecture,composition" %}

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

- [ ] `ContentModelSchemaOptions` accepts `preprocess`, receiving the rune's own node and returning a replacement, several, or nothing
- [ ] One walk resolves all preprocessors; `walkAndReplaceIncludes`, `walkAndReplaceSnippets` and `walkAndReplaceData` no longer exist as three separate traversals
- [ ] The walk descends into a replacement, and `data`'s internal subquery walk is removed in favour of it (D3)
- [ ] `include` keeps its own nested expansion and its cycle stack; a direct and an indirect cycle are still named rather than overflowing
- [ ] `snippet`'s and `include`'s preprocessors live in their tag modules; `snippet-pipeline.ts` and `include-pipeline.ts` are gone as top-level modules
- [ ] `config.ts` no longer states a preprocessor order
- [ ] `{% snippet %}` inside a `{% data %}` row template resolves against the bound row — BUG-027, with a regression test
- [ ] Nested `{% data %}` still resolves its subquery per outer row, with the outer row binding the inner tag's attributes and not its body (SPEC-127 / WORK-553)
- [ ] `{% snippet %}` and `{% data %}` inside an included file still resolve — the existing `include-pipeline.test.ts` cases pass unchanged
- [ ] `emitTag` remains a declarative field; no rune's content model is narrowed to match the emitted tag, and `match` still states the authored input shape (D8)
- [ ] `refrakt contracts --check` and `npm run seo:baseline:check` report no drift
- [ ] The rune authoring guide documents `preprocess`, and says when to reach for the plugin-level hook instead (D2)

## Blocked by

- {% ref "WORK-615" /%}

## Blocks

- {% ref "BUG-027" /%}

## References

- {% ref "SPEC-141" /%} — the spec
- {% ref "SPEC-127" /%} — per-row templates; what made `data` a producer
- {% ref "SPEC-129" /%} — include and the load-bearing order this replaces

{% /work %}
