---
'@refrakt-md/runes': minor
'@refrakt-md/cli': minor
'@refrakt-md/editor': minor
---

Address embedded source by name, and record that a human read it.

`snippet`, `file-ref` and `expand` can now name the region they embed instead of
counting its lines:

```markdoc
{% snippet path="src/engine.ts" symbol="applyBemClasses" /%}
{% snippet path="package.json" match='"scripts"' extent="auto" /%}
```

A `lines=` range silently re-points at whatever moved into those line numbers. A
`symbol=` or `match=` anchor either resolves to the thing it names or refuses —
and the refusal says which of the three termination rules fired, so a broken
reference reads as broken rather than as a different function.

`extent=` picks how far the region runs: `auto` (delimiters), `dedent`
(indentation), `section` (siblings up to the next heading of the same level), or
`paired` (token pairs). `until=` and `through=` stop it early. Languages that
have no delimiters to count — Python, YAML, tag-paired markup — make `auto`
refuse rather than return a plausible-looking span.

`refrakt migrate snippets --fix` converts existing `lines=` invocations,
verifying the output is byte-identical before rewriting, and names every one it
will not convert.

Embedded source can also carry a review marker:

```markdoc
{% snippet path="src/engine.ts" symbol="applyBemClasses" reviewed="a3f91c4e:7b20d1f6" /%}
```

`refrakt snippet review` writes them, never a person: `--check` reports which
markers the target has outgrown, and `--update --interactive` shows the diff
between what the reviewer actually read and what is there now. A change proven
to be formatting-only re-stamps silently, so a repo-wide formatter run does not
cost fifty reviews.
