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

**A closure factory, not code generation and not an interpreter.** Three readings
of "compile" are possible here and only one is meant:

| Reading | What it would be | Verdict |
|---|---|---|
| Emit source text | a build step writing `.ts` files | no — adds a stage, and one a hosted user could not run |
| `new Function` / `eval` | code built from the declaration at runtime | no — arbitrary code execution from input |
| **Build a closure over the declaration** | `makeSlotTransform(options)` returns a function | **this** |

```ts
const transform = options.transform ?? makeSlotTransform(options);
```

**When:** at `createContentModelSchema(...)` call time — module load, once per
process when the plugin is imported, at dev-server or build startup. Not per
page, not per rune instance.

The declaration stays inert data; the only code that executes is refrakt's own
generator, parameterised by it. The contrast that matters is with an
*interpreter* in the other sense — a second walk of the tree inside the engine,
consulting the slot table at render time. That would mean two code paths to keep
in agreement, declarative runes being a different *kind* of thing downstream, and
"same output" as a property to be tested rather than had.

Instead: one call site, one function type, and nothing downstream can
distinguish the two — resolution, `applySchemaTable`, serialization, BEM,
`layout`, `blocks`, `contracts`, `inspect` and the pre-engine pipeline reads are
untouched.

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

**A slot is a value or a region, and a region has an element.** This is the one
capability that looks presentational and is not.

A **value** slot is already a single node — a `span`, a resolved heading. Nothing
to wrap.

A **region** slot is N nodes, and N nodes need a boundary. The transform must emit
it, because `layout` cannot: `assembleWithBlocks` resolves names out of
`mapDataNames` and appends anything unnamed to `rest`
(`packages/transform/src/engine.ts:1417-1423`). A prose body's contents are
unnamed paragraphs and lists, so no `layout` entry can collect them into a created
wrapper. There is nowhere else for the box to come from.

So the declaration states the *kind*, and the element defaults from it:

```ts
title: { from: 'title',    as: 'region', el: 'header' },
body:  { from: 'sections', as: 'region' },              // el defaults to 'div'
name:  { from: 'name',     as: 'value'  },              // no box
```

`div` is the neutral default — "these nodes are one region and I claim nothing
else about them". `header` is stated when the grouping is semantically a header,
which is a claim about meaning that survives any theme. {% ref "SPEC-081" /%}'s
rule holds under a sharper reading: **choosing to have a boundary is semantics;
choosing how it looks is presentation.** That removes 63 restatements of `'div'`
without changing a byte of output.

**A slot may be omitted when empty.** `work`'s `blurb` appears only when
`resolved.description` has content. Today `descNodes.count() > 0 ? … : undefined`.

**The renderable's identity moves with the slots.** `createComponentRenderable`
is called *inside* the transform today, so `rune`, `tag` and `property` are
stated there — `hint` is a `section`, `work` an `article`, both with
`property: 'contentSection'`. With no transform there is nowhere else for them to
live, so the declaration carries them. The rune name is not otherwise derivable:
a plugin's `loadPlugin` knows it as the `pkg.runes` key, but
`createContentModelSchema` runs inside the tag module, before that.

**Sections arrive one of two ways.** Resolved entries the rune renders itself
(`work`, `bug`, `decision` — no `emitTag`), or child-rune tags already rendered
(`character`, `realm`, `faction` — with `emitTag`). Both must be expressible, and
the distinction is already declared by the content model's `emitTag`, so the
labelling layer should read it rather than restate it.

## Worked examples

### The simple end — `hint`

Today, 17 lines:

```ts
transform(resolved, attrs, config) {
	const hintType = new Tag('meta', { content: attrs.type ?? 'note' });
	const body = new RenderableNodeCursor(
		Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
	);
	const bodyDiv = body.wrap('div');
	return createComponentRenderable({
		rune: 'hint', tag: 'section', property: 'contentSection',
		properties: { hintType },
		refs: { body: bodyDiv.tag('div') },
		children: [hintType, bodyDiv.next()],
	});
}
```

Declared:

```ts
export const hint = createContentModelSchema({
	sections: hintSections,
	attributes: {
		type: { type: String, matches: hintType.slice(), errorLevel: 'critical' },
	},
	contentModel: bodyOnly(),
	emits: {
		rune: 'hint',
		tag: 'section',
		property: 'contentSection',
		properties: { hintType: { from: 'attrs.type', default: 'note' } },
		slots: { body: { from: 'body', as: 'region' } },
	},
});
```

Note `hintType` is *not* an identity rename — the attribute is `type`, the
property is `hintType`. A rename is one token either way, and the declaration
makes it visible instead of buried in a variable name.

### The complex end — `work`

64 lines become roughly this, with the properties channel in
{% ref "SPEC-140" /%}'s data form:

```ts
emits: {
	rune: 'work',
	tag: 'article',
	properties: {
		id: '', status: 'draft', priority: 'medium', complexity: 'unknown',
		assignee: '', milestone: '', source: '', supersedes: '', pr: '', tags: '',
		created:  { from: ['attrs.created',  'file.created'],  default: '' },
		modified: { from: ['attrs.modified', 'file.modified'], default: '' },
	},
	slots: {
		title: { from: 'title',       as: 'region', el: 'header' },
		blurb: { from: 'description', as: 'region', omitWhenEmpty: true },
		body:  { from: 'sections',    as: 'region' },
	},
},
```

`title` states `el: 'header'` because "these nodes are this item's heading group"
is a claim about meaning. `blurb` and `body` take the `div` default, which claims
nothing beyond "one region".

Everything else `work` renders — the eyebrow bar, the twelve metadata rows with
their labels, badges and sentiments, the content column — is already declared in
`config.metaFields`, `config.blocks` and `config.layout`, and is untouched by
this.

Three things the two examples show together. The declaration is **flat** — no
entry nests another, per D2. The **slot names come from the content model** where
they can (`title`, `body`) and are renamed where the output disagrees (`blurb`
from `description`), which is the 62% identity figure in practice. And the
**hard part is already elsewhere**: `work` is longer than `hint` because it has
more attributes, not because it has more structure.

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

## Why this is a prerequisite for hosted rune definitions

A closure factory over inert data means a user-defined rune is **data to
validate, not code to sandbox**: JSON arrives, it is checked against a schema, a
closure is built. No `eval`, no VM, no worker isolation, no dependency surface.
That is a materially easier security story than any codegen approach, and it is
why the shape chosen here is the one a hosted renderer would want anyway.

**It is necessary and not sufficient.** "Declarative at every step" is a larger
bar than this spec clears, and the remaining surfaces are worth naming so the
question has a map:

| Surface | Sites | Status |
|---|---|---|
| `transform` | 135 | this spec |
| `contentModel` as a thunk `(attrs) => …` | 15 | **a declarative form already exists** — `ConditionalContentModel`'s `when` over `AttributeInCondition` / `AttributeExistsCondition` / `HasChildCondition` |
| `contentModel: { type: 'custom', processChildren }` | 14 | undeclarable by design ({% ref "SPEC-003" /%}) |
| `itemModel` `pattern: /…/` | 8 | serialises, but see below |
| `config.postTransform` | 4 | undeclarable by design ({% ref "SPEC-081" /%} non-goals) |
| plugin pipeline hooks | 9 | functions |

Two of those deserve flagging now rather than on discovery:

**A regex is code in the way that matters.** `pattern: /…/` crosses a JSON
boundary as a string, but a user-supplied pattern in a hosted renderer is a ReDoS
vector. Making `itemModel` user-definable needs either a timeout-guarded engine
or a restricted pattern grammar — and `itemModel` is where the list-item
authoring grammar lives ({% ref "BUG-031" /%}), so it is not a corner that can be
skipped.

**The escape hatches are the boundary, and that is the good outcome.**
`type: 'custom'` and `postTransform` stay imperative by design, so a hosted rune
is necessarily a *subset* of what a plugin can express. D4's family test then has
a second job: it becomes the published boundary of that subset rather than an
internal heuristic.

## Capabilities considered, and declined

Tier B above is 27 transforms that each fail on exactly one construct, so each is
an argument for one capability. Recording the verdicts here so they do not have to
be re-argued, and because D4's purpose is resisting exactly this growth.

| Candidate | Runes | Verdict |
|---|---|---|
| **`unwrap`** — take a rendered node's children instead of the node | 7 | **the named next candidate** |
| **`pick`** — find a node by kind inside a field | 5 | belongs to the content model, not here |
| raw AST read — `node.name`, `node.attributes` | 8 | hard boundary; the escape hatch's job |
| `filter` — select rendered nodes by predicate | 3 | needs a predicate language |
| `map` — one value to one node, N times | 3 | iteration; SPEC-033 refused this |

**`unwrap` is the one to add first if any.** `datatable` does
`wrapper.children.find(c => c.name === 'table')`; `recipe` does
`ingredients.push(...node.children)`; `form`, `conversation`, `storyboard`,
`symbolGroup`, `symbolMember` and `budgetCategory` each do a version of the same
thing. It is one bounded operation — *this slot is the contents of the field's
rendered wrapper, not the wrapper* — it stays flat, and it does not cross D2.
Noted rather than included because the mechanism should prove itself on labelling
alone first. **It would also cost this spec its best example**: `recipe` is D3's
standing proof the escape hatch is needed, and `unwrap` is most of what `recipe`
needs.

**`pick` is the tempting one to get wrong.** `card`, `event`, `bentoCell`,
`step` and `organization` take one authored field and split it into several slots
by node kind — `splitMediaBodyFooter`, `extractMediaImage`. But one field
yielding several slots by inspection is {% ref "SPEC-081" /%}'s *content
interpretation*: "deciding which authored child is the headline… it cannot be
config." If it is ever wanted it belongs in the **content model** as a resolution
feature, where interpretation already lives, not in the labelling declaration.
Putting it here would move the boundary SPEC-081 drew.

**The raw AST read is a boundary, not a gap.** Those 8 read the *unresolved*
node, before the content model has interpreted anything. Exposing it to a
declaration hands user-defined runes the whole AST — the widest possible surface,
and precisely what a hosted renderer must not grant. This is where
`type: 'custom'` and `transform` earn their keep.

**`filter` and `map` are where a slot table becomes a language.** A predicate is
a function, which D9 forbids, so they would need an expression grammar and an
evaluator. Three runes each does not pay for that, and {% ref "SPEC-033" /%}
already refused the general form: "five targeted additions, **not a template
language**". If these are ever wanted, the answer is composition from primitives,
not a bigger slot table.

### One capability not on the list, rated above all of them

**Declaring a slot expected, so its absence is loud.** A slot that resolves to
nothing currently vanishes silently — the same shape as
{% ref "BUG-028" /%} (`figure` dropping non-image children),
{% ref "BUG-030" /%} (a mixed field dropping authored tags) and
{% ref "BUG-031" /%} (an em-dash `date` that never matches). Four of the six bugs
filed alongside this spec are silent absence.

It eliminates no imperative code, so it fails {% ref "SPEC-033" /%}'s test
outright and is not in this spec's criteria. It is recorded because a mechanism
being introduced is the cheapest moment to make absence loud, and because the
information already exists — the content model's `optional` flag says which
slots are expected, and the generator knows when one came back empty.

## Why a region needs a boundary — three consumers, not CSS

The wrapper reads like a CSS convenience and is not. `data-name` is an *address*,
and three things resolve against it.

**The editor.** `editHints` is documented as "keys are data-name values … resolved
at click time by the editor" (`packages/transform/src/types.ts:440`). Three sibling
paragraphs each carrying `data-name="body"` means a click on the second resolves
`body` and edits *one paragraph* as though it were the whole body.

**`layout`.** `mapDataNames` builds a `Map` keyed by name, last write wins.
Duplicates collapse to one entry and the rest fall through to `rest`, appended at
root.

**`projection`.** A theme can `hide`, `group` or `relocate` by `data-name`. If a
prose body's paragraphs were individually named, a theme could hide or move part of
an authored body — reshaping content it does not own.

That last one inverts the intuition. The flat-nodes-inside-a-named-box shape is
what makes a region **opaque to the theme**: its children carry no `data-name`, so
nothing in `layout` or `projection` can reach inside. The box is the boundary that
protects authored content, not decoration around it.

### The correspondence with `editHints`, tested and rejected

It is tempting to derive `as: 'region'` from `editHint: 'none'` and `as: 'value'`
from `'inline'` — one fact stated twice is exactly what this spec removes
elsewhere. **It does not hold.**

`Sidenote` wraps its body in a `div` *and* declares
`editHints: { body: 'inline' }`. So do `PullQuote`, `ConversationMessage` and
`AnnotateNote`. Meanwhile `Annotate` declares `body: 'none'` — and both `Sidenote`
and `Annotate` declare `provides: ['prose']`, so it is not tracking prose either.

The two are orthogonal. `as` is structural: how many nodes, does it need a
boundary. `editHint` is a UX judgement: is this short enough to type into in place.
A sidenote's body is a region either way; the editor is simply willing to edit it
inline. Both stay declared.

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

**One node per `data-name`, and the generator must enforce it.** This is an
invariant of the existing output contract that nothing currently checks.
`createComponentRenderable`'s refs loop names *every* node in a cursor
(`component.ts:96-106`), so a rune passing an unwrapped multi-node cursor silently
produces duplicates — ambiguous for the editor, lossy for `layout`, and reachable
by `projection`.

The fix is **not** to make `mapDataNames` a multimap. That would legitimise the
ambiguous case rather than reject it. A declaration that would emit duplicate names
is an error, and the same assertion is worth adding to the structure contract so it
also covers hand-written transforms.

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

### D9 — the declaration must stay serialisable; no function values

Every value in the declaration is data. No slot may take a function — not a
computed default, not a predicate, not a formatter. This is what keeps the
declaration transportable across a JSON boundary, and therefore what makes a
hosted rune definition possible at all.

**This is in tension with {% ref "SPEC-140" /%} as drafted**, and the tension
should be resolved rather than inherited. SPEC-140's `metaFields` utility takes a
function for a computed default:

```ts
created: () => attrs.created || fileVars?.created || '',
```

That is a closure, so a properties spec written that way is not serialisable. The
declarative equivalent is a fallback chain — a list of sources tried in order
with a literal default — which covers the twelve `fileVars`-derived metas without
a function value. Whichever form SPEC-140 ships, this spec's slot declaration
takes the data form.

## Non-goals

- Reopening the SPEC-080 field / block / layout vocabulary — this builds on it
- Moving any structural assembly out of `layout`, or reviving `projection`'s deprecated `group` / `relocate`
- Removing `transform`, `postTransform` or `projection` (D3)
- Composing a rune from other runes with a Markdoc template — a separate idea, with its own unresolved questions about contract derivation, CSS ownership, cycles and schema.org, and a different payoff (ecosystem reach rather than maintenance)
- Letting a theme influence labelling — labelling is rune identity ({% ref "ADR-028" /%})
- Specifying hosted rune definitions, or the validation, quotas and regex-safety story a hosted renderer needs — this spec only removes one of the blockers
- Covering `recipe`, `symbol`, `event` or any rune that fails D4's test

## Open questions

These three came out of thinking about the file format a hosted renderer would
accept for a user-authored rune. None of them block this spec — the mechanism
here is a TypeScript sibling to `transform`, and the serialisable form only has
to *exist*, not to have a file extension. They belong to the follow-on spec that
defines that file, and are recorded here because that spec does not exist yet.

**Where does the rune-definition schema live?** Two JSON Schemas are already
committed and drift-tested — `packages/transform/refrakt.config.schema.json`
against `SiteConfig`, and `packages/content/frontmatter.schema.json`. A rune
definition needs the same treatment against the slot declaration's interface,
and `config-schema.test.ts` shows what that treatment costs: it asserts
bidirectionally, so a field added to the interface fails the test until the
schema gains it too, *and* the schema may declare no property the interfaces do
not have. The question is whether the rune schema sits beside those two as a
third top-level artifact or is generated from the same source, and it is worth
answering before the first one is written by hand.

**Where do the files live?** A conventional directory discovered by scanning —
the way `discoverPluginFixtures` already finds plugin fixtures — or an explicit
list in `refrakt.config.json`. Convention is cheaper to author and worse to
debug; a declaration is the reverse. The choice also decides whether a hosted
renderer can accept a rune as an upload without touching site config.

**Does CSS come with it?** This is the sharpest of the three, because it may
change what the file has to contain. A declaratively-defined rune emits correct
BEM classes and renders completely unstyled, which is a third authoring barrier
standing beside the schema and the config. Either the definition carries a
`style` block — and then sanitisation is in scope, with the same untrusted-input
posture the regex-safety non-goal above defers — or user runes are limited to
reusing the BEM blocks a theme already styles, which is a real limitation and
should be stated as one rather than discovered. Answer this before fixing the
format.

## Acceptance Criteria

- [ ] A rune can declare its content slots: source field, slot name, wrapper element, and omit-when-empty
- [ ] A slot whose name equals its field name needs no declaration beyond being listed
- [ ] The declaration cannot express nesting, ordering or container creation (D2), and a declaration attempting it is rejected rather than silently partially applied
- [ ] A slot declares whether it is a `value` or a `region`; a region emits a boundary element defaulting to `div`, and only a non-default element is stated
- [ ] No declaration can produce two nodes carrying the same `data-name`; one that would is rejected at schema construction, naming the slot
- [ ] The same one-node-per-`data-name` assertion is added to the structure contract, so it covers hand-written transforms too
- [ ] A region's children carry no `data-name`, so neither `layout` nor `projection` can address inside an authored body
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
- [ ] The declaration carries the renderable's identity — `rune`, `tag` and `property` — since `createComponentRenderable` is no longer called from a transform
- [ ] The slot declaration contains no function values, and a declaration carrying one is rejected at schema construction (D9)
- [ ] The declaration round-trips through `JSON.parse(JSON.stringify(…))` unchanged for every migrated rune
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
