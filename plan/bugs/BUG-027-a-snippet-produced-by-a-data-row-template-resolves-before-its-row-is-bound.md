{% bug id="BUG-027" status="confirmed" severity="major" source="SPEC-127" tags="runes,snippet,data,preprocess,composition" %}

# A `{% snippet %}` produced by a `{% data %}` row template resolves before its row is bound

The core preprocess phase runs three whole-AST passes in a fixed order —
include, then snippet, then data (`packages/runes/src/config.ts:2464`). A row
template that contains a `{% snippet %}` is therefore walked by snippet's pass
*before* `data` has bound any row, so `path=$row.path` is unresolvable and the
snippet fails. `data` then clones the resulting **error fence** once per row.

```md
{% data src="files.csv" %}
{% snippet path=$row.path /%}
{% /data %}
```

## Steps to Reproduce

Run the three core preprocessors in their real order over the markup above,
with `files.csv` listing two paths that both exist in the sandbox.

## Expected

Two fences, each holding the contents of the file named by its row — the same
composition {% ref "SPEC-129" /%} already delivers for a `{% snippet %}` inside
an included file.

## Actual

```
messages: [{ severity: "error",
  message: "snippet `path` attribute is required (and an unresolvable
            variable reference resolves to empty)" }]
leftover snippet tags: 0
fences: 2 — both 'snippet error: snippet `path` attribute is required …'
```

One error is reported, then duplicated silently into every row.

## Where it comes from

The ordering comment at `config.ts:2455` reasons about one direction only:

> **Include runs first, and the order is load-bearing** (SPEC-129): the whole
> point of the rune is that the pasted content is in the tree when the later
> preprocessors walk it.

That is correct for include, whose output is a parsed file AST. It silently
assumes `snippet` and `data` are leaf-producing, and only one of them is:

| Rune | Replacement | Can contain other runes? |
|------|-------------|--------------------------|
| `include` | the partial's AST | yes — handled, runs first |
| `snippet` | a `fence` node | no — raw text, never re-parsed |
| `data` | the authored row template, cloned per row ({% ref "SPEC-127" /%}) | **yes — not handled** |

`data` is a producer like `include`, but it runs last, so nothing walks what it
produces. `walkAndReplaceData` (`data-pipeline.ts:194`) already descends into its
own replacement to resolve subqueries — it just does so for `data` tags only, so
a nested `data` works and a nested `snippet` does not.

## Notes

- The failure is loud in the build log (one `error` message) and silent on the
  page in the sense that matters: the author sees N identical error fences and
  no indication that *ordering* is the cause. The message names a missing
  `path`, which reads as an authoring mistake.
- Nested `{% data %}` inside `{% data %}` is unaffected and verified working —
  the docs site uses it at `site/content/_partials/rune-attributes.md:30-44`.
- No test covers this direction. `include-pipeline.test.ts` covers
  include → snippet and include → data; nothing covers data → snippet.
- A fix by reordering the passes is not available: making `data` run before
  `snippet` breaks nothing today but is the same assumption in reverse, and
  `include` would still have to precede both. {% ref "SPEC-141" /%} proposes
  resolving preprocessors in tree order instead, which derives the ordering from
  node position and makes producer/consumer relations work in any combination.
- Workaround until then: put the `{% snippet %}` in a partial and
  `{% include %}` it, or hoist the path out of the row.

## References

- {% ref "SPEC-127" /%} — per-row templates; what made `data` a producer
- {% ref "SPEC-129" /%} — the include rune and the ordering constraint this generalises
- {% ref "SPEC-062" /%} — the snippet rune and its preprocess design
- {% ref "SPEC-141" /%} — tree-order preprocessing, the proposed fix

{% /bug %}
