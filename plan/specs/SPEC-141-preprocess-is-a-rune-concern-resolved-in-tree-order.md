{% spec id="SPEC-141" status="draft" tags="runes, preprocess, architecture, composition, dx" %}

# Preprocess is a rune concern, resolved in tree order

Three runes resolve themselves before the transform — `include`, `snippet`,
`data`. Each owns a top-level module, a near-identical AST walker, and a slot in
a hand-ordered composition in `config.ts`. None of that lives with the rune.

Replace the three whole-AST passes with **one walk that dispatches per tag**,
and move each preprocessor into the tag module that owns it. Ordering stops
being a list to maintain and becomes a consequence of where the node sits.

```ts
// ContentModelSchemaOptions — beside `transform`
preprocess?(node: Node, page: PreprocessPage, ctx: PreprocessContext): Node | Node[] | void;
```

**This is not only tidying.** The fixed pass order cannot express
`data` → `snippet` ({% ref "BUG-027" /%}), and tree order fixes it as a
by-product rather than as a special case.

## Problem

### The logic does not live with the rune

`packages/runes/src/tags/snippet.ts` is 73 lines: an attribute table, and a
`transform` that throws. Its own doc comment is the tell —

> This schema's `transform` function is **unreachable in normal operation**. […]
> If the transform ever does execute […] it throws a clear error pointing the
> user at the registration site.

Twenty lines of signpost standing in for co-location. The 288 lines that do the
work are in `snippet-pipeline.ts`, wired from `config.ts:2464`.

This is the shape {% ref "SPEC-125" /%} already corrected for the join tables,
under a rule `config.ts:47` states plainly and {% ref "ADR-028" /%} settles:

> the join tables […] are declared in the tag modules that own them and
> referenced here. **Config points at rune identity; it does not define it.**

Whether a rune resolves itself before the transform is rune identity. It is the
single most important fact about how `snippet` works, and it is not in
`snippet.ts`.

### The ordering is maintained by hand, and it is incomplete

`config.ts:2455` composes the passes and argues for the order:

> **Include runs first, and the order is load-bearing** ({% ref "SPEC-129" /%}):
> the whole point of the rune is that the pasted content is in the tree when the
> later preprocessors walk it.

Correct for include, and it silently assumes the other two are leaf-producing.
Only one of them is:

| Rune | Replacement | Can contain other runes? |
|------|-------------|--------------------------|
| `include` | the partial's AST | yes — handled, runs first |
| `snippet` | a `fence` node | no — raw text, never re-parsed |
| `data` | the row template, cloned per row ({% ref "SPEC-127" /%}) | **yes — not handled** |

`data` is a producer that runs last, so nothing walks what it produces. That is
{% ref "BUG-027" /%}: a `{% snippet %}` in a row template is resolved before any
row is bound, fails on the unresolvable `$row.path`, and the error fence is
cloned once per row.

Reordering does not fix it. `data`-before-`snippet` is the same assumption
reversed, and `include` must still precede both. Any fixed sequence encodes a
guess about which rune produces work for which.

### Three walkers, one shape

`walkAndReplaceIncludes`, `walkAndReplaceSnippets` and `walkAndReplaceData` are
the same traversal: *descend; when the child is my tag, replace it*. They differ
only in what they do afterwards, and those differences are the interesting part
— include carries a cycle stack, data descends into its own output.

### The plugin hook is wider than any rune needs

`PluginPipelineHooks.preprocess` hands a plugin the entire page AST and trusts
it. Every current use is "find my tag, replace it". The capability is
plugin-shaped; the need is rune-shaped.

## The insight: tree order derives the ordering

The ordering constraint is a producer/consumer relation, and tree position
already encodes it. `include` pastes a file's AST **at its own node**; anything
that file contains is necessarily *below* that point, so a walk that descends
into the replacement meets it next. Same for `data` and its row copies.

The reverse relation does not exist and cannot: `snippet` resolves to a `fence`,
whose content is raw text that is never re-parsed as Markdoc. A partial cannot
be nested inside a snippet. So the graph is acyclic by construction, and a
depth-first walk is a valid topological order of it.

**Both existing preprocessors already rely on this.** `resolveInclude`
(`include-pipeline.ts:153-158`) expands nested includes inside what it just
pasted, under a stack that names cycles. `walkAndReplaceData`
(`data-pipeline.ts:194-196`) walks its own replacement to resolve subqueries.
Each rune has privately implemented descent-into-replacement for its own kind.
This spec generalises that to all kinds and states it once.

### What that buys, concretely

{% ref "BUG-027" /%} resolves with no special-casing: the walk reaches
`{% data %}`, binds the rows, splices in `{% snippet path="src/a.ts" %}` with a
literal path, descends, and resolves it. Every future producer composes the same
way without an entry in a hand-maintained list.

## Prerequisite: `snippet` must become single-phase

`snippet` also runs in **postProcess** — `wrapStandaloneSnippets`
(`config.ts:2743`) wraps a standalone `<pre>` in `<figure class="rf-snippet">`.
A `preprocess` option would co-locate half of snippet's out-of-transform logic
and strand the other half.

The wrapper should go, and the case for it does not survive contact with the
code. {% ref "SPEC-062" /%} gives two reasons for it:

> wraps the `<pre>` in a `<figure class="rf-snippet">` for theme styling and
> tooling (`data-source-path` lives on the figure)

Both are already satisfied without it. `wrapPreInFigure` reads `data-source` and
`data-lines` **off the `<pre>`** and copies them onto the new figure; the `<pre>`
keeps its own. `pre[data-source]` is already a distinct theme selector and
already carries the path for an "edit this file" affordance. The figure adds no
information.

And `.rf-snippet`'s entire CSS payload is margin resets — undoing the UA
`<figure>` margins the wrapper itself introduced. It is a wrapper that exists to
be neutralised.

A standalone snippet should be what it already is: a fence. Authors wanting
chrome compose it — with `{% codegroup title="…" %}`, which
{% ref "SPEC-062" /%} already names as the path for a label, or with
`{% figure %}` once {% ref "BUG-028" /%} is settled.

## Decisions

### D1 — the per-rune hook receives its own node, not the tree

`preprocess(node, page, ctx) → Node | Node[] | void`. The engine owns the walk,
the descent and the ordering. This is strictly narrower than today's whole-AST
hook, so it is a reduction in blast radius, not an addition.

Returning `void` leaves the node alone. Returning `Node[]` splices — `include`
and `data` both need it, and {% ref "SPEC-127" /%} records why a wrapper node to
keep the replacement 1:1 is not acceptable.

### D2 — `PluginPipelineHooks.preprocess` stays

The whole-AST hook remains for genuine cross-cutting concerns. It is not
deprecated by this spec. The per-rune option is the common path, not the only
one; a plugin that needs to see the whole tree still can.

### D3 — the walk descends into replacements; exactly one mechanism owns it

After a replacement, the walk continues into it. `include` keeps its internal
nested expansion, because the cycle stack is per-chain state the generic walk
should not carry — and since `resolveInclude` leaves no `include` tags behind,
descending finds none and cannot double-expand.

`data`'s internal subquery walk is the opposite case: it exists only because
nothing else descended, so it is removed and the generic descent takes over.
Keeping both would not break (the internal walk consumes the tags first) but
would state the rule twice.

### D4 — the ancestor chain is part of the walk context

`data` reads an `enclosing` tag name to reject a per-row body inside a
table-consuming container (`data-pipeline.ts:343`). A single walk knows the full
ancestor chain rather than one threaded string, so this improves. The context
object carries it.

### D5 — the wrapper removal ships first, and separately

It is independently justifiable, it is a visible output change, and it takes
`snippet` from two phases to one. Landing it first means the hook lands against
a simpler target and the diff that removes it is reviewable on its own terms.

### D6 — removing the wrapper is a breaking output change

`<figure class="rf-snippet">` disappears from every standalone snippet. Any
downstream CSS or tooling selecting `.rf-snippet` or `[data-source-path]` must
move to `pre[data-source]`. Changeset required, and the Lumina CSS and the
contracts regenerate.

### D7 — `snippet`'s throwing transform stays

The schema is still what `refrakt inspect`, the contracts generator and the rune
catalog read. The transform is still the right place to explain an unresolved
tag — and with a per-rune hook it becomes reachable through one path only, so
the error can name it precisely.

### D8 — `emitTag` stays declarative; only when it runs may move

A per-rune `preprocess` hook can express the `emitTag` conversion — split by
heading, wrap each section in a tag — so it is fair to ask whether `emitTag` is
still needed. It is, and replacing it with a function would be a straight loss.

**`emitTag` is data three tools read.** The rune reference
(`reference.ts:549`), the block editor (`editor/src/server.ts:1008`) and
`refrakt edit` (`cli/src/commands/edit.ts:167`) all consult the content model as
a structure. A `preprocess` function is opaque to every one of them: nothing
could tell a reader, from the declaration, that `{% character %}` produces
`character-section` children. That is the trade {% ref "SPEC-130" /%} made in
the other direction when it moved schema.org out of imperative transforms into a
table, and {% ref "ADR-028" /%} is the same principle.

**What may move is when the declaration executes.** Running `emitTag` at
preprocess rather than mid-transform costs nothing this spec can find — none of
the seven `emitTag` runes takes the `attrs` parameter on its `contentModel`
thunk, so the conversion does not depend on resolved attributes (only
`breadcrumb`, `bento` and `symbol` read `attrs`, and none of them emits). It
buys AST-level visibility for tooling, and composition with `include` / `data`
by tree order rather than by special case.

**The declaration keeps both facts, unchanged.** `match` states what an author
may write; `emitTag` states what it becomes. A field stays

```ts
{ name: 'tracks', match: 'list|tag:track', itemModel: {…}, emitTag: 'track' }
```

and is **not** narrowed to `match: 'tag:track'` on the grounds that the
conversion now happens earlier. Narrowing it would delete the only statement
that a list is valid input — unrecoverable by any inference, and invisible to
the editor and the reference. Execution timing is an implementation detail; the
declaration is the contract.

## Non-goals

- Deprecating or removing `PluginPipelineHooks.preprocess` (D2)
- Deciding what `{% figure %}` should accept — that is {% ref "BUG-028" /%}
- Adding a `postProcess` option to `ContentModelSchemaOptions`; after D5,
  nothing in core needs one
- Changing what any preprocessor *does* to its own tag — only who calls it, and
  in what order
- A declarative priority or phase field. Tree position is the ordering; a second
  mechanism would compete with it

## Acceptance Criteria

- [ ] `ContentModelSchemaOptions` accepts `preprocess`, receiving the rune's own node and returning a replacement, several, or nothing
- [ ] One walk resolves all preprocessors; `walkAndReplaceIncludes`, `walkAndReplaceSnippets` and `walkAndReplaceData` no longer exist as three separate traversals
- [ ] The walk descends into a replacement, and `data`'s internal subquery walk is removed in favour of it (D3)
- [ ] `include` keeps its own nested expansion and its cycle stack; a direct and an indirect cycle are still named rather than overflowing
- [ ] `snippet`'s and `include`'s preprocessors live in their tag modules; `snippet-pipeline.ts` and `include-pipeline.ts` are gone as top-level modules
- [ ] `config.ts` no longer states a preprocessor order
- [ ] `wrapStandaloneSnippets` is removed; a standalone snippet renders as `<pre data-source>` with no `<figure>` wrapper (D5)
- [ ] The removal ships with a changeset recording the output change, and Lumina's `.rf-snippet` rules go with it (D6)
- [ ] `{% snippet %}` inside a `{% data %}` row template resolves against the bound row — {% ref "BUG-027" /%}, with a regression test
- [ ] Nested `{% data %}` still resolves its subquery per outer row, with the outer row binding the inner tag's attributes and not its body ({% ref "SPEC-127" /%} / WORK-553)
- [ ] `{% snippet %}` and `{% data %}` inside an included file still resolve — the existing `include-pipeline.test.ts` cases pass unchanged
- [ ] `{% snippet %}` inside `{% codegroup %}` and `{% diff %}` is unchanged
- [ ] `refrakt contracts --check` drift is limited to snippet's wrapper removal, on both committed copies
- [ ] `npm run seo:baseline:check` reports no drift
- [ ] `emitTag` remains a declarative field; no rune's content model is narrowed to match the emitted tag, and `match` still states the authored input shape (D8)
- [ ] The rune authoring guide documents `preprocess`, and says when to reach for the plugin-level hook instead (D2)

## References

- {% ref "BUG-027" /%} — the composition gap tree order closes; the motivating case
- {% ref "BUG-028" /%} — `figure` drops non-media children, which is why "compose with figure" does not work yet
- {% ref "BUG-030" /%} — a mixed `list|tag:x` field with `emitTag` drops the authored tags; surfaced by D8's question
- {% ref "BUG-031" /%} — the reference never renders `emitTag`, so the declaration's second fact is already invisible
- {% ref "SPEC-062" /%} — the snippet rune, its preprocess design and the figure wrapper this removes
- {% ref "SPEC-129" /%} — the include rune and the load-bearing order this replaces
- {% ref "SPEC-127" /%} — per-row templates; what made `data` a producer
- {% ref "SPEC-125" /%} — the join tables moved to their tag modules; the precedent for this move
- {% ref "ADR-028" /%} — rune identity is not theme configuration
- {% ref "SPEC-140" /%} — the transform boilerplate survey; adjacent, and independent of this

{% /spec %}
