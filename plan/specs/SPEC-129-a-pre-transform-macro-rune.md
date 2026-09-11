{% spec id="SPEC-129" status="draft" tags="runes, authoring, preprocess, dx" %}

# A pre-transform macro rune

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
pages. That decision is unimplementable as written. The options without a macro
are to repeat the block per page — exactly what D1 rejected — or to invent a
rune for this one docs concern.

## Proposal

A rune that reads a file and splices its parsed AST into the page, in a
preprocess hook ordered **before** the other preprocessors.

```markdoc
{% macro file="rune-attributes.md" /%}
```

The name is a placeholder; see the open question.

Three properties distinguish it from `partial`:

1. **It expands during preprocess**, so `data` / `snippet` inside it resolve.
2. **It pastes AST, not renderables.** The page sees the content as if typed
   there, so a parent rune's content model reads it — the same constraint
   {% ref "SPEC-127" /%} settled for `data` rows, and for the same reason.
3. **It takes no `variables`.** A partial's variable binding exists because it
   expands at transform, where a variable scope is available. A macro is a paste;
   parameterisation is what the next section is about.

## The hard part: a paste is the same everywhere

A macro with no parameters pastes identical content into every page. The
motivating use needs each rune page to filter the artifact to *its own* rune:

```markdoc
{% data src="…/rune-attributes.json" where="rune:card scope:own" %}
```

Three ways to get a page-specific value into a page-independent paste, in
increasing order of what they demand:

**A — the page carries the query in frontmatter.** `preprocessData` already
resolves bare `Variable` attributes against page variables, `frontmatter`
included. Verified: `where=$q` filters correctly, only the matching row renders.
So a rune page adds one frontmatter key and the macro pastes
`where=$frontmatter.attrQuery`. No macro parameters at all.

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

**C — the macro takes one attribute.** `{% macro file="…" name="card" /%}`. Works
immediately, and concedes the "no variables" property — at which point it is
`partial` that expands earlier, and the honest move would be to give `partial` a
preprocess mode rather than add a rune.

**Recommended: B**, with A as the fallback if function evaluation at preprocess
pulls in more of Markdoc's evaluator than is comfortable. B is the only option
where a new rune page needs nothing beyond existing, and it forces
{% ref "BUG-010" /%} to be fixed rather than worked around.

## Constraint: pasting pre-transform is more powerful than it looks

The pasted AST is subject to **every** preprocessor, not just `data`. A macro can
therefore contain `snippet`, another macro, or anything later added to the
preprocess phase. That is the point, and it is also why this is not a simpler
sibling of `partial` but a strictly more capable one.

Two consequences to settle before implementing:

- **Ordering becomes load-bearing.** The macro hook must run before the
  preprocessors whose runes it may contain. Today that is a fixed core order;
  a plugin registering its own preprocessor would need to know where it sits.
- **Recursion needs a bound.** A macro including itself is an infinite paste.
  A depth limit with a clear error, rather than a stack overflow.

## Open questions

- **What is it called?** `macro` describes the mechanism. `include` describes the
  intent and matches what other generators call it. `partial` with a flag is a
  third option that avoids a new rune entirely — worth weighing, since two
  file-pasting runes that differ only in phase is a real teaching burden.
- **Should `partial` gain a preprocess mode instead?** One rune with two
  behaviours may be worse than two runes, but "why did my `data` break inside a
  partial" is a question the current split guarantees.
- **Does the file live under `_partials/`?** Sharing the directory is convenient
  and invites confusion about which rune reads it.

## Acceptance Criteria

- [ ] A file's AST can be pasted into a page during preprocess, so `data` and `snippet` inside it resolve
- [ ] The pasted content is spliced as siblings, so a parent rune's content model sees it
- [ ] Nesting is bounded, with an error naming the cycle rather than a stack overflow
- [ ] The parameterisation question is settled, per A / B / C above
- [ ] `docs/authoring/partials.md`'s "inlined at parse time" claim is corrected
- [ ] The two runes' difference is documented where an author choosing between them will look

## References

- {% ref "SPEC-128" /%} — D1's shared partial, which this unblocks
- {% ref "BUG-010" /%} — the silent `where` no-op that option B forces us to fix
- {% ref "SPEC-127" /%} — splice-not-wrap, the same AST constraint for `data` rows

{% /spec %}
