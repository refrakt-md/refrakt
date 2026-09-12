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
3. **It substitutes its `variables` into the pasted AST**, rather than binding
   them in a transform-time scope the way `partial` does. Same author-facing
   shape, different mechanism — see the parameterisation section.

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

**A file needing both parameters and preprocessing.** An earlier draft flagged
this as a gap with nowhere to go, since `include` was assumed to take no
variables and `partial` cannot preprocess. It takes variables, so the gap is
closed — `include` covers both. Recorded because the reasoning that produced it
was wrong rather than merely outdated: see the parameterisation section.

## Settled: `include` takes variables

An earlier draft of this spec asserted that it could not, reasoning that *"a
partial's variable binding exists because it expands at transform, where a
variable scope is available; an include is a paste."* **That is a non-sequitur
and the assertion was wrong.** A paste can substitute variables into the AST it
pastes — no transform-time scope required.

The mechanism already exists in this codebase. `bindRow` in `data-pipeline.ts`
clones a `data` body once per row, replacing `Variable` nodes whose path starts
with `row`. An include does the same with its own bindings.

Verified end to end. An included file authored as:

```markdoc
{% data src="…" root="rows" where=$q %}
{% $row.name %}
{% /data %}
```

pasted with `{q: 'rune:card scope:own'}` substituted at paste time, then run
through `preprocessData` with a deliberately **empty** `ctx.variables`, filters
correctly — the matching row renders and the other rune's row does not leak.
The binding came entirely from the include.

### What that changes

**Parameterisation is no longer the hard part.** The call site passes the query:

```markdoc
{% include file="rune-attributes.md" variables={q: "rune:card scope:own"} /%}
```

No function evaluation in the resolver, and no per-page frontmatter.

**It removes this spec's dependency on {% ref "BUG-010" /%}.** That dependency
existed only because deriving the query from `$page.slug` needed
`resolveString` to evaluate `Function` nodes. BUG-010 remains a real bug worth
fixing on its own merits; it is no longer on this spec's critical path.

**It closes the gap this spec previously flagged.** "A file needing both
parameters *and* preprocessing has nowhere to go" was an artifact of the wrong
assumption, not a real hole.

### Still worth doing later: derive from the page

`$page.slug` already *is* the rune name for `/runes/card`, so a rune page could
carry nothing at all — not even a call-site argument. That needs the
preprocess-time resolver to evaluate functions (`concat("rune:", $page.slug, …)`),
which is exactly what BUG-010 makes unsafe today.

Worth having eventually, because it is the only form where adding a rune page
cannot get the wiring wrong. Not worth blocking on: it is a refinement of a call
site, and the variables form ships without it.

### The cost of this decision

`include` becomes a strict superset of `partial` — paste, plus variables, plus
preprocessing. That sharpens "why two runes?", since the difference is no longer
a capability tradeoff.

The answer is unchanged and does not depend on one: `partial` is a Markdoc
builtin that cannot be extended, and it stays the default on the standards
argument. What *does* get harder is the teaching line, which can no longer be
"use `partial` unless you need more" and has to be "use `partial` — it is
Markdoc's — unless your file contains `data` or `snippet`."

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

## Settled: `partial` stays the default

`include` is the specialist, reached for when the file contains a preprocessor
rune. Two reasons, the second the stronger:

- **Variables will be wanted more often than preprocessor runes.** Parameterising
  a reusable chunk is the common case; needing `data` or `snippet` inside one is
  not.
- **`partial` is an established Markdoc standard.** Presenting refrakt's rune as
  the default would have refrakt quietly demoting a Markdoc feature in its own
  docs, and would surprise someone arriving from Markdoc who expects `partial` to
  work as it does everywhere else. Keeping it default keeps "refrakt is Markdoc
  plus runes" true.

**This makes the error message load-bearing rather than merely good.** If
`partial` is what authors reach for first, then hitting the preprocessor failure
*is* the discovery path for `include` — for most authors it will be the only time
they learn the second rune exists. An error that describes the pipeline
("preprocess hook was not wired through") teaches nothing; one that names the fix
is the entire onboarding.

## Acceptance Criteria

- [ ] A file's AST can be pasted into a page during preprocess, so `data` and `snippet` inside it resolve
- [ ] The pasted content is spliced as siblings, so a parent rune's content model sees it
- [ ] Nesting is bounded, with an error naming the cycle rather than a stack overflow
- [ ] `include` accepts `variables`, substituted into the pasted AST at paste time
- [ ] A test proves a variable reaches a `data` attribute inside the included file, with page variables empty
- [ ] Both runes read `_partials/` and the same `namespace:file` roots
- [ ] The preprocessor-in-a-partial failure names the fix — use `include` — rather than describing the pipeline, since with `partial` as the default this is the main discovery path for the new rune
- [ ] `docs/authoring/partials.md`'s "inlined at parse time" claim is corrected
- [ ] The two runes' difference is documented where an author choosing between them will look

## References

- {% ref "SPEC-128" /%} — D1's shared partial, which this unblocks
- {% ref "BUG-010" /%} — the silent `where` no-op that option B forces us to fix
- {% ref "SPEC-127" /%} — splice-not-wrap, the same AST constraint for `data` rows

{% /spec %}
