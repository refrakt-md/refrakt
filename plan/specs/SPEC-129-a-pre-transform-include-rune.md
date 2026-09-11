{% spec id="SPEC-129" status="draft" tags="runes, authoring, preprocess, dx" %}

# A pre-transform include rune

`{% partial %}` cannot contain a preprocessor rune. A `{% data %}` or
`{% snippet %}` inside one reaches the transform phase unresolved and throws.
This spec proposes a sibling that pastes its file's AST during **preprocess**, so
the pasted content is preprocessed like any other page content.

## Problem

Measured against the real content pipeline:

```
{% partial file="attrs.md" variables={rune: "card"} /%}
→ Error: data rune reached the transform phase — its preprocess hook was not
  wired through.
```

Structural, not a wiring mistake. Markdoc resolves partials during
`Markdoc.transform`, reading `config.partials`. `preprocessData` and
`preprocessSnippets` walk the **page's** AST *before* transform. The partial's
content is not in that AST when they run, so the tag survives to its own
throwing transform.

A plain partial with `variables` works. It is specifically the preprocessor runes
that cannot live inside one — and those are exactly the runes worth factoring out
of repeated markup.

`docs/authoring/partials.md` states partials are "inlined at parse time". That is
wrong and should be corrected whatever else this spec produces.

## Why this blocks something concrete

{% ref "SPEC-128" /%} D1 chose a shared partial to carry the universal-attribute
accordion, so the block is authored once rather than copied across ~96 rune
pages. That decision is unimplementable as written. The options without an include rune
are to repeat the block per page — exactly what D1 rejected — or to invent a
rune for this one docs concern.

## Proposal

A rune that reads a file and splices its parsed AST into the page, in a
preprocess hook ordered **before** the other preprocessors.

```markdoc
{% include file="rune-attributes.md" /%}
```

Three properties distinguish it from `partial`:

1. **It expands during preprocess**, so `data` / `snippet` inside it resolve.
2. **It pastes AST, not renderables.** The page sees the content as if typed
   there, so a parent rune's content model reads it — the same constraint
   {% ref "SPEC-127" /%} settled for `data` rows, and for the same reason.
3. **It takes no `variables`.** A partial's variable binding exists because it
   expands at transform, where a variable scope is available. An include is a
   paste; parameterisation is what the next section is about.

## Settled: a new rune, not a mode on `partial`

**`partial` is a Markdoc builtin.** refrakt does not define it — `tags` in
`packages/runes/src/index.ts` spreads `...Markdoc.tags` *last*, deliberately, so
builtins win. Three measurements:

```
tags.partial === Markdoc.tags.partial            → true
{% partial file="x.md" preprocess=true /%}       → Invalid attribute: 'preprocess'
Markdoc's partial.transform                      → reads config.partials, scopes
                                                    variables, sets a $$partial
                                                    marker
```

So "a mode on `partial`" is not a small change. It means reversing the merge
order so refrakt shadows Markdoc builtins *as policy*, then reimplementing
upstream's tag to add a flag — after which upstream fixes to `partial` silently
stop reaching us. That is a maintenance liability out of proportion to the
feature.

**The weaker argument, recorded so it is not reused:** "partial takes variables"
describes a difference between the two runes, not a reason they must be separate.
A mode could have ignored or reused them. The builtin argument stands alone.

### Why two runes is not as confusing as it sounds

The distinction to teach is *not* the phase, which is an implementation detail no
author should reason about:

> `partial` is Markdoc's. `include` is refrakt's, and exists because refrakt has
> a preprocess phase Markdoc does not know about. If what you are including uses
> `data` or `snippet`, use `include`; otherwise either works.

**Name:** `include` rather than `macro`. `macro` names the mechanism — the thing
authors should not need — and carries C-preprocessor baggage (text substitution,
hygiene) that does not apply. `include` is the conventional term and reads as a
default. Its weakness is that it does not *signal* the difference, which the
framing above has to carry whatever the name.

## Settled: the same `_partials/` convention

Both runes read the same directory and the same `namespace:file` file roots.

A file's *location* should not depend on its *contents*. Two directories would
mean moving a file the day someone adds a `{% data %}` to it, and would leave the
call site — which is where the choice actually is — telling you nothing.

Two consequences, both made more likely by sharing rather than less:

**The error message becomes the teaching surface.** The same file reached by
`{% partial %}` fails and by `{% include %}` succeeds. Today that failure reads
*"data rune reached the transform phase — its preprocess hook was not wired
through. Ensure the content pipeline runs registered `preprocess` hooks before
`Markdoc.transform`"* — written for a framework author. With a shared directory
it is what a *content* author hits, and it is the main way anyone will discover
the distinction. It has to name the fix: this file uses `{% data %}`, include it
with `{% include %}`.

**A file needing both parameters and preprocessing has nowhere to go.** `include`
takes no variables; `partial` cannot preprocess. That is not hypothetical — it is
exactly what the accordion needed before option B removed the parameter. Option B
makes it moot here and leaves the gap real for the next author. Worth watching
rather than solving pre-emptively: if it recurs, the answer is probably variables
on `include`, at which point the "no variables" property was never load-bearing.

## The hard part: a paste is the same everywhere

An include with no parameters pastes identical content into every page. The
motivating use needs each rune page to filter the artifact to *its own* rune:

```markdoc
{% data src="…/rune-attributes.json" where="rune:card scope:own" %}
```

Three ways to get a page-specific value into a page-independent paste, in
increasing order of what they demand:

**A — the page carries the query in frontmatter.** `preprocessData` already
resolves bare `Variable` attributes against page variables, `frontmatter`
included. Verified: `where=$q` filters correctly, only the matching row renders.
So a rune page adds one frontmatter key and the include pastes
`where=$frontmatter.attrQuery`. No include parameters at all.

*Cost:* a line per page, on files that already carry `type: rune` — so a second
per-rune key in a per-rune file. *Risk:* it is hand-written, which is the class
of thing this milestone exists to stop; a wrong value filters to nothing and the
page renders empty.

**B — derive it from the page.** `$page.slug` is already available and *is* the
rune name for `/runes/card`. Pages need nothing added. The gap is composing
`"rune:" + slug`, which needs `resolveString` to evaluate `Function` nodes —
today `concat(…)` returns empty and, per {% ref "BUG-010" /%}, that silently
matches every row.

*Cost:* teaching the preprocess-time resolver to evaluate Markdoc functions.
*Benefit:* zero per-page authoring, and it is the only option where adding a rune
page cannot get the wiring wrong.

**C — the include takes one attribute.** `{% include file="…" name="card" /%}`. Works
immediately, and concedes the "no variables" property — at which point it is
`partial` that expands earlier, and the honest move would be to give `partial` a
preprocess mode rather than add a rune.

**Recommended: B**, with A as the fallback if function evaluation at preprocess
pulls in more of Markdoc's evaluator than is comfortable. B is the only option
where a new rune page needs nothing beyond existing, and it forces
{% ref "BUG-010" /%} to be fixed rather than worked around.

## Constraint: pasting pre-transform is more powerful than it looks

The pasted AST is subject to **every** preprocessor, not just `data`. An include can
therefore contain `snippet`, another include, or anything later added to the
preprocess phase. That is the point, and it is also why this is not a simpler
sibling of `partial` but a strictly more capable one.

Two consequences to settle before implementing:

- **Ordering becomes load-bearing.** The include hook must run before the
  preprocessors whose runes it may contain. Today that is a fixed core order;
  a plugin registering its own preprocessor would need to know where it sits.
- **Recursion needs a bound.** An include including itself is an infinite paste.
  A depth limit with a clear error, rather than a stack overflow.

## Open questions

- **Should `include` be the documented default**, with `partial` presented as
  Markdoc's built-in that still works? Two peers invite "which one?"; a default
  plus a compatibility note does not. It slightly demotes a Markdoc feature in
  refrakt's own docs, which is an editorial call rather than a technical one.

## Acceptance Criteria

- [ ] A file's AST can be pasted into a page during preprocess, so `data` and `snippet` inside it resolve
- [ ] The pasted content is spliced as siblings, so a parent rune's content model sees it
- [ ] Nesting is bounded, with an error naming the cycle rather than a stack overflow
- [ ] The parameterisation question is settled, per A / B / C above
- [ ] Both runes read `_partials/` and the same `namespace:file` roots
- [ ] The preprocessor-in-a-partial failure names the fix — use `include` — rather than describing the pipeline
- [ ] `docs/authoring/partials.md`'s "inlined at parse time" claim is corrected
- [ ] The two runes' difference is documented where an author choosing between them will look

## References

- {% ref "SPEC-128" /%} — D1's shared partial, which this unblocks
- {% ref "BUG-010" /%} — the silent `where` no-op that option B forces us to fix
- {% ref "SPEC-127" /%} — splice-not-wrap, the same AST constraint for `data` rows

{% /spec %}
