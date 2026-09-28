{% spec id="SPEC-143" status="draft" tags="runes, transform, declarative, architecture, dx" %}

# Declarative slot labelling

{% ref "SPEC-080" /%} made metadata assembly declarative. {% ref "SPEC-081" /%}
made structural assembly declarative. Both left the same remaining step in
imperative TypeScript: turning a resolved content field into a node carrying
`data-name`.

Give that step the declarative footing the other two already have, and the
entity-shaped rune has no `transform` at all.

**The names are already written down.** A content model declares
`{ name: 'title', match: 'heading' }`; the transform then restates it as
`refs: { title: … }`. Across the tag files, **58 of 93 `refs` keys exactly match
a declared content-model field name** — 62% pure restatement.

## Background — the arc this completes

The two-layer split is settled and this spec does not reopen it.
{% ref "SPEC-081" /%} separated the transform's jobs:

| Job | Where it lives |
|---|---|
| **Content interpretation** — which child is the headline, splitting on `---`, collecting list items | the content model, declaratively ({% ref "SPEC-003" /%}) |
| **Structural assembly** — the preamble header, the content / media split, nesting the def-list | `layout`, declaratively ({% ref "SPEC-081" /%}) |
| **Metadata rendering** — chips, def-lists, sentiment, labels | `metaFields` + `blocks`, declaratively ({% ref "SPEC-080" /%}) |
| **Labelling** — resolved field → a node named `data-name="x"` | **`transform`, imperatively** |

SPEC-081 assigned labelling to the transform under its guiding rule:
*"labelling is semantics (transform); nesting / grouping is presentation
(declarative)."* That rule drew the right boundary — labelling **is** semantics.
The claim here is narrower: semantics does not have to mean TypeScript, because
the content model is already the semantic declaration and it already carries the
names.

## Mechanism — one substitution at one call site

`options.transform` is invoked in exactly one place, inside the Schema's own
`transform` (`packages/runes/src/lib/index.ts:865`):

```
Schema.transform(node, config):
  attrs         = resolved attributes
  resolvedModel = options.contentModel      (or the thunk, called with attrs)
  { content }   = resolveContentModel(node.children, resolvedModel, attrs)
  result        = options.transform(content, attrs, config, node)   ← the only call
  result        = applySchemaTable(result, options.schema)          ← SPEC-130
  return result
```

The change is that line: **when `options.transform` is absent, call a transform
generated from the declaration instead.**

**This is a compiler, not an interpreter.** The declaration is compiled into a
function with the same signature, invoked at the same point, returning the same
`RenderableTreeNodes`. There is no second code path and no new stage. Nothing
downstream can distinguish the two — resolution, `applySchemaTable`,
serialization, BEM, `layout`, `blocks`, `contracts`, `inspect` and the pre-engine
pipeline reads are untouched.

That is what makes D7's byte-identical gate provable rather than aspirational.
The generated function is interchangeable with the hand-written one *by
construction*, so a diff means the generator is wrong — never that the output
legitimately moved.

Two properties follow:

- **No new inputs.** The generated function receives the same `content`, `attrs`,
  `config`, `node`. It needs `config` for the reason every transform does: to run
  `Markdoc.transform` over resolved AST nodes.
- **{% ref "SPEC-130" /%}'s table is unaffected.** `applySchemaTable` runs *after*
  the transform and is already independent of how the tree was built, so a
  declaratively-labelled rune keeps its schema.org row unchanged.

## Problem

`plugins/plan/src/tags/work.ts` is the clean case. After SPEC-081 it builds no
structure — `layout` does that. What remains is:

- twelve attributes → property metas (already being collapsed by {% ref "SPEC-140" /%}'s utility)
- `resolved.title` → a `header` named `title`
- `resolved.description` → a `div` named `blurb`, only when non-empty
- `resolved.sections` → a `div` named `body`
- assemble the children array in order

Four rules and a list. Every entity rune restates the same four with different
nouns, which is why the shape has already been factored twice independently —
`buildSections` in plan and `buildStoryContent` in storytelling do the same job.
They differ only in whether sections arrive as resolved data or as already-
rendered child runes, which is the `emitTag` axis and not a domain difference.

### The residue, measured

The post-SPEC-081 figure, not the before-picture — `character` already emits
flat slots and says so in a comment:

| | transform lines |
|---|---|
| 7 entity runes (work, spec, bug, decision, character, realm, faction) | 386 |
| 6 child sub-runes (`characterSection`, `symbolMember`, `timelineEntry`, …) | ~71 |
| **the family** | **~450** |

Thirteen transforms that could be thirteen declarations.

## What the mechanism has to express

Derived from the family, not invented:

**A field becomes a named slot.** The common case, and the identity case: field
`title` becomes slot `title`. 58 of 93 `refs` keys need nothing but this.

**A slot may be named differently from its field.** `description` → `blurb`,
`sections` → `body`. A rename is one token.

**A slot has a wrapper element.** `header` for a title, `div` for a body. Today
this is `cursor.wrap('header')`.

**A slot may be omitted when empty.** `work`'s `blurb` appears only when
`resolved.description` has content. Today `descNodes.count() > 0 ? … : undefined`.

**Sections arrive one of two ways.** Resolved entries the rune renders itself
(`work`, `bug`, `decision` — no `emitTag`), or child-rune tags already rendered
(`character`, `realm`, `faction` — with `emitTag`). Both must be expressible, and
the distinction is already declared by the content model's `emitTag`, so the
labelling layer should read it rather than restate it.

## How many runes this reaches

Scanning the 124 candidate transforms (excluding `snippet`'s deliberate throw and
the structural `layout` / `region` / `include`) for constructs that D4's test
rules out — unwrapping rendered `.children`, filtering rendered output, looping
to build nodes, reading the raw AST node, or calling a content-inspecting helper:

| | transforms | lines |
|---|---|---|
| **A** — no disqualifying construct | 60 | 1,798 |
| **B** — exactly one | 27 | 920 |
| **C** — two or more | 37 | 2,582 |

**Treat 60 as a ceiling, not a forecast.** The figure moved twice during
calibration — an early pass counted `if (` as disqualifying and returned 41,
which wrongly excluded `spec`, `character` and `realm` whose only branch is the
omit-when-empty case this spec declares; a later pass returned 65 and admitted
`card`, which calls `splitMediaBodyFooter(resolved.body)` and so turns one field
into three slots by inspecting node types — interpretation, not labelling.

A static scan cannot see every such case, so some of tier A will fail on contact.
A realistic expectation is **40–50 transforms converting**, with the 7 entity
runes and 6 child sub-runes named in the acceptance criteria as the proving set.

Tier B is where the mechanism's boundary gets decided. Each of those 27 fails on
one construct, so each is an argument about whether to add one capability or
leave the rune imperative. D4 is the tiebreaker, and the answer should usually be
to leave it — a mechanism that grows a feature per borderline rune stops being a
mechanism.

## Constraints carried forward from SPEC-081

Its "why the two layers stay" section is binding. Three are limits and one is an
argument in favour:

**The output must remain a semantic, framework-agnostic IR.** One tree renders
through svelte / astro / nuxt / next / react / vue / eleventy; the cross-page
pipeline reads it *pre-engine* for the registry, `extractTitle` and breadcrumbs;
the editor and `refrakt inspect` read it. Declarative labelling must produce the
same IR, not shortcut toward presentation.

**Static contracts get better.** SPEC-081: *"`contracts/structures.json` is
derivable because structure is declared in config, not built imperatively."*
Labelling is the last thing `contracts` has to infer from a schema rather than
read from a declaration.

**No nesting in the labelling layer.** SPEC-081's cautionary case is `event`,
which pre-built a `preamble` `<header>` around headline and blurb — so `layout`
could not address them individually, listing them in root did nothing and
`preamble` silently appended last. A labelling mechanism that emitted nested
nodes would reintroduce that bug class by construction. **Flat bag only.**

**The two layers do not collapse.** SPEC-081's first non-goal. Themes still run
no code at the transform stage.

## Decisions

### D1 — it is not called `projection`, and it is not `layout`

Both words are taken and both mean something else in this pipeline.
`RuneConfig.projection` is post-hoc surgery on a tree a theme does *not* own
(`types.ts:480`), with `group` and `relocate` already deprecated as subsumed by
recursive `layout`. `layout` is assembly — it consumes the flat slot bag. This
spec names what *produces* that bag, and the vocabulary should say so.

### D2 — it declares slots, never structure

A declaration may name a slot, source it from a field, give it a wrapper element
and omit it when empty. It may **not** nest one slot inside another, order them,
or create containers. Those are `layout`'s, and the `event` bug is what happens
when the boundary blurs.

### D3 — the escape hatch stays, and is expected to be used

`transform` remains, exactly as `contentModel: { type: 'custom' }` remains for
models that are "genuinely stateful and cannot be expressed declaratively"
({% ref "SPEC-003" /%}). `recipe` is the proof it will be needed: it renders a
`<ul>` and takes the `<li>` children, discarding the wrapper, does the same for
`<ol>` steps, and filters blockquotes for tips. That is unwrapping and
filtering, not labelling.

### D4 — the family test is the acceptance criterion, not a rune list

**Does every output slot come from exactly one resolved field, wrapped but not
restructured?** If yes, the rune is in the family and should need no transform.
If it unwraps, filters, reorders or merges, it is not, and keeps one. Naming
seven runes would invite the mechanism to grow until it covered the eighth.

### D5 — the emitTag split is read, not restated

Whether a rune's sections arrive as resolved entries or as rendered child tags
is already declared by the content model's `emitTag`. The labelling layer reads
that rather than asking the author to say it twice — which is the same
restatement this spec exists to remove.

### D6 — the properties channel is {% ref "SPEC-140" /%}'s, not this spec's

Attributes becoming property metas is already being collapsed by SPEC-140's
utility. This spec covers `refs` — the content slots. Both feed
`createComponentRenderable`, and the naming collision SPEC-140 introduces
(a `metaFields` *utility* beside a `metaFields` *config key*) should be resolved
before either ships, independently of this spec.

### D7 — no rune migrates until it can be proved output-identical

`refrakt contracts --check` plus `npm run seo:baseline:check` returning no diff
is the gate per rune, as it was for {% ref "SPEC-140" /%}. A rune whose
declarative form does not reproduce its transform's output byte for byte has
found a gap in the mechanism, and the mechanism changes rather than the output.

### D8 — exactly one of `transform` or the declaration, never both

`transform` becomes optional; it is currently required. Neither present is an
error. **Both present is also an error**, rather than "declare the common slots
and let a transform patch the rest".

A half-declared rune is the hardest kind to reason about: a reader cannot tell
from either half what the output is, and the generator and the hand-written code
would both have partial claims on the same slots.
{% ref "SPEC-130" /%}'s acceptance criteria already rejected this shape once —
"the imperative form either still works or is fully migrated — **not half of
each, per rune**". The same rule, for the same reason.

## Non-goals

- Reopening the SPEC-080 field / block / layout vocabulary — this builds on it
- Moving any structural assembly out of `layout`, or reviving `projection`'s deprecated `group` / `relocate`
- Removing `transform`, `postTransform` or `projection` (D3)
- Composing a rune from other runes with a Markdoc template — a separate idea, with its own unresolved questions about contract derivation, CSS ownership, cycles and schema.org, and a different payoff (ecosystem reach rather than maintenance)
- Letting a theme influence labelling — labelling is rune identity ({% ref "ADR-028" /%})
- Covering `recipe`, `symbol`, `event` or any rune that fails D4's test

## Acceptance Criteria

- [ ] A rune can declare its content slots: source field, slot name, wrapper element, and omit-when-empty
- [ ] A slot whose name equals its field name needs no declaration beyond being listed
- [ ] The declaration cannot express nesting, ordering or container creation (D2), and a declaration attempting it is rejected rather than silently partially applied
- [ ] Both section arrival modes work, read from the content model's `emitTag` rather than declared again (D5)
- [ ] `work`, `bug` and `decision` have no `transform`, and `refrakt contracts --check` plus `npm run seo:baseline:check` report no drift for any of them (D7)
- [ ] `character`, `realm` and `faction` have no `transform` for the entity rune, under the same no-drift gate — these span the `emitTag` split, so covering both proves the mechanism
- [ ] `buildSections` and `buildStoryContent` are deleted, not merely unused
- [ ] `recipe` still has its `transform` and is not contorted to fit (D3)
- [ ] The emitted tree is unchanged as a semantic IR: the cross-page pipeline's registry, `extractTitle` and breadcrumb reads produce identical results
- [ ] `refrakt inspect` and the generated reference describe a declaratively-labelled rune at least as completely as a transform-built one
- [ ] The rune authoring guide documents the family test (D4) as the way to decide whether a new rune needs a transform
- [ ] Declaring both `transform` and the slot declaration on one rune is rejected at schema construction, naming the rune (D8)
- [ ] Declaring neither is rejected the same way
- [ ] The generated transform is invoked at the existing call site, with no second code path through `createContentModelSchema`
- [ ] Total `transform()` line count across the tag files is recorded before and after

## References

- {% ref "SPEC-080" /%} — block and layout rune assembly model; act one
- {% ref "SPEC-081" /%} — declarative structure assembly; act two, and the constraints this carries forward
- {% ref "SPEC-003" /%} — the declarative content model that already holds the names
- {% ref "SPEC-140" /%} — the transform boilerplate survey; owns the properties channel and the `metaFields` naming collision
- {% ref "SPEC-142" /%} — inferring the transform signature; would type this declaration
- {% ref "ADR-028" /%} — rune identity is not theme configuration
- {% ref "SPEC-033" /%} — structure slots; where `projection` came from and why it is the wrong word here

{% /spec %}
