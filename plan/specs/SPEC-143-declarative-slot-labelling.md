{% spec id="SPEC-143" status="accepted" tags="runes, transform, declarative, architecture, dx" %}

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

**But not because a user would write the declaration this spec adds.**
{% ref "ADR-037" /%} settles that users author *composed* runes
({% ref "SPEC-145" /%}) and that this spec's slot declaration is the internal emit
path — how first-party runes shed their transforms. This spec is a prerequisite for
a different reason: a composed rune's frontmatter declares `attributes`, `content`,
`schema`, `metaFields`, `blocks` and `registers`, which is *this* spec's and
{% ref "SPEC-144" /%}'s vocabulary in full. The two paths share their whole
declaration half and differ only in what emits. Make the declaration serialisable
here and the hosted case inherits it; leave it imperative and no emit path can be
authored as data.

**It is necessary and not sufficient.** "Declarative at every step" is a larger
bar than this spec clears, and the remaining surfaces are worth naming so the
question has a map:

| Surface | Sites | Status |
|---|---|---|
| `transform` | 135 | this spec |
| `contentModel` as a thunk `(attrs) => …` | 15 | **a declarative form already exists** — `ConditionalContentModel`'s `when` over `AttributeInCondition` / `AttributeExistsCondition` / `HasChildCondition` — for 12 constants and 2 of the 3 branching sites; `bento.ts:383` parameterises one model rather than choosing between two and is unreachable ({% ref "ADR-036" /%}) |
| `contentModel: { type: 'custom', processChildren }` | 14 | undeclarable by design ({% ref "SPEC-003" /%}) |
| `itemModel` `pattern: /…/` | 8 | serialises, but see below |
| `config.postTransform` | 4 | undeclarable by design ({% ref "SPEC-081" /%} non-goals) |
| `config.styles[…].transform` | 11 | **a named-enum sibling already exists** — and three helpers cover all 11 sites |
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

### The engine config travels too — and it arrives pre-split

A rune is three payloads, not one: the schema, the `RuneConfig` the engine reads,
and CSS. The config cannot be left behind, because `block`, `modifiers` and
`sections` *are* the rune — no theme can supply them for a rune it has never
seen. That sounds like it triples the problem. It does not, for three reasons.

**The config is already the declarative half.** Across the whole of `RuneConfig`
there are exactly two function-typed fields: `styles[…].transform`
(`packages/transform/src/types.ts:301`) and `postTransform` (`:527`). Everything
else — `structure`, `layout`, `contentWrapper`, `autoLabel`, `staticModifiers`,
`editHints`, `projection`, `variants` — is data today. And the plugin boundary is
*already* untyped data: `PluginThemeConfig.runes?: Record<string, Record<string,
unknown>>` (`packages/types/src/package.ts:48`). Config crossing a serialisation
boundary is what plugins already do; it is the transform side that is imperative,
which is this spec's subject.

**The split between what the rune owns and what a theme owns is already drawn,
enumerated and enforced.** `packages/transform/src/identity-fields.ts` is, in its
own words, "the one place the 'a theme restructures a rune, never redefines it'
rule is expressed":

| Half | Fields | Override semantics |
|---|---|---|
| Identity ({% ref "ADR-028" /%}) | `block`, `modifiers`, `sections`, `mediaSlots`, `frameTarget`, `universalAttributes`, `provides`, `schema` | A theme override is dropped and reported as an `IdentityViolation` (`merge.ts`) |
| Presentation | `structure`, `layout`, `contentWrapper`, `styles`, `staticModifiers`, `autoLabel`, `editHints`, `projection`, `variants` | A theme may "hide, reorder, re-wrap and re-decorate" |

So a user rune's config is not one payload but two with different semantics. The
identity half must travel because nothing else can supply it; the presentation
half travels as a **default a theme may override**, which is exactly what plugin
`theme.runes` already is. No new position in the cascade is needed.

**And most of the identity half should not be authored at all.** `sections` is
the slot declaration this spec introduces. `modifiers` follows from the attributes
that feed properties. `block` should be the kebab-cased rune name — *derived, not
declared*, for user runes especially: an author writing `block: 'hero'` would
collide with a core rune's CSS, and deriving it makes collision-avoidance the same
check as the rune-name uniqueness `mergePlugins` already enforces
(`packages/runes/src/plugins.ts:169`). The residue that still needs declaring is
small: `schema`, `provides`, and occasionally `frameTarget` / `mediaSlots`.

#### Superseded: what that implied for file layout

**This subsection prescribed a two-file layout, and the premise under it is gone.** It
specified `<rune>.rune.md` for attributes, slots and the identity residue, `<rune>.skin.md`
for the presentation config plus CSS — shaped as a theme override so it flowed through
`mergeRuneConfig` with `guardIdentity: true` — and argued at length that CSS belongs with
the presentation config, since a user rune has neither CI nor reviewers to police the seam
that `css-coverage.test.ts`'s 116-entry `KNOWN_MISSING_SELECTORS` allowlist polices here.

Three decisions removed the audience it was written for. {% ref "ADR-037" /%} makes the
declaration on this page the **internal** emit path — how first-party runes shed their
transforms — so no user ever authors one and there is no file to lay out: it is a
TypeScript sibling to `transform`. {% ref "ADR-035" /%} is `rejected`, so there is no skin
format for the second file to be written in. And {% ref "SPEC-153" /%} D9 settles the
user-facing case as a single `<rune>.md`, because a composed rune ships no CSS
({% ref "SPEC-145" /%} D2) and therefore has no presentation half to separate.

**What survives is the paragraph above this one, and it survives intact.** The cut running
*through* `RuneConfig` rather than between config and schema is a fact about
`identity-fields.ts` and `merge.ts`, not about files, and it is what makes the engine
config travel as two payloads with different override semantics. The `block`-should-be-
derived argument stands on the same footing. Only the file names, the skin override path
and the CSS co-location argument are void.

Recorded as superseded rather than deleted because the reasoning was load-bearing for a
while and a reader meeting `.skin.md` in {% ref "SPEC-153" /%}'s history, in
{% ref "ADR-035" /%}, or in this spec's own open questions deserves to find where it went
rather than inferring it.

**One category the split does not cover: claims about content.** `schema` is an
identity field — a rune's schema.org table. {% ref "SPEC-130" /%} D5 accepted
deliberately that nothing validates a table against schema.org, because
"visibility replaces validation" and a wrong row is caught by a reviewer reading
it. That holds while every rune ships in a package a human reviewed. It does not
survive untrusted authorship: a user rune's table is a claim published about
someone else's content with no reviewer in the loop. That needs its own answer,
separate from the regex-safety and CSS-sanitisation questions already deferred.

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
- Composing a rune from other runes with a Markdoc template — now {% ref "SPEC-145" /%}, which carries its own questions about contract derivation, CSS ownership, cycles and schema.org, and has a different payoff (ecosystem reach rather than maintenance)
- Letting a theme influence labelling — labelling is rune identity ({% ref "ADR-028" /%})
- Specifying hosted rune definitions, or the validation, quotas and regex-safety story a hosted renderer needs — this spec only removes one of the blockers
- Covering `recipe`, `symbol`, `event` or any rune that fails D4's test

## Open questions

These came out of thinking about the file format a hosted renderer would accept
for a user-authored rune. None of them block this spec — the mechanism here is a
TypeScript sibling to `transform`, and the serialisable form only has to *exist*,
not to have a file extension. They belong to the follow-on spec that defines that
file, and are recorded here because that spec does not exist yet. The file-layout
question that used to sit here is answered above, in the enforced identity /
presentation split; what follows is what that answer left open.

{% ref "ADR-037" /%} has since **retired two of these** rather than answering them.
Because a user authors a composed rune, which ships no CSS, "does CSS come with it?"
no longer applies to a rune author at all. It was said here to apply to a theme author
instead, *"where {% ref "ADR-035" /%} already answers it"* — but ADR-035 is now
`rejected`, because after composition a theme's work is cross-cutting and a capability
package shipping CSS is simply a package. So there is no skin format, the two-file
`.rune.md` / `.skin.md` pair collapses to a single `<rune>.md`
({% ref "SPEC-153" /%} D9), and the discovery question is about one shape rather than a
pair. What the schema question and the schema.org question lose in scope they keep in
force; both are recorded below as they stand.

**Where does the rune-definition schema live?** Two JSON Schemas are already
committed and drift-tested — `packages/transform/refrakt.config.schema.json`
against `SiteConfig`, and `packages/content/frontmatter.schema.json`. A rune
definition needs the same treatment against the slot declaration's interface,
and `config-schema.test.ts` shows what that treatment costs: it asserts
bidirectionally, so a field added to the interface fails the test until the
schema gains it too, *and* the schema may declare no property the interfaces do
not have. The question is whether the rune schema sits beside those two as a
third top-level artifact or is generated from the same source. The sub-question of
whether it spans both halves of a file pair or one per file is void with the pair
({% ref "SPEC-153" /%} D9): there is one file, so one schema — and understanding a
serialised rune as a single-rune `Plugin` is what that one schema describes.

**How is a definition discovered?** A conventional directory scanned the way
`discoverPluginFixtures` already finds plugin fixtures, or an explicit list in
`refrakt.config.json`. Convention is cheaper to author and worse to debug; a
declaration is the reverse. The choice also decides whether a hosted renderer can
accept a rune as an upload without touching site config. Narrowed by
{% ref "ADR-037" /%}: this is now one file per rune plus its
{% ref "SPEC-102" /%} fixtures, not a `.rune.md` / `.skin.md` pair, so the
"is a skin file required?" sub-question is gone.

**What stops a user rune from making false claims about content?** The narrowest
of the three and the one with no precedent to lean on. `schema` is an identity
field, so a user rune's schema.org table travels with it and is published as an
assertion about the site's content; {% ref "SPEC-130" /%} D5's trade — visibility
in place of validation, with a reviewer as the check — has no reviewer here.
Options span refusing `schema` on user runes outright, a closed allowlist of
types, or shipping the ontology D5 declined. This is not the CSS-sanitisation
question in another costume: bad CSS is visible on the page, a bad schema.org row
is invisible by construction.

**Answered — is `metaFields` identity or presentation?** {% ref "SPEC-158" /%} D3 splits it
by sub-key: `metaFields.*.metaType` **is** identity and a theme override of it is dropped,
while `label`, `sentimentMap` and `transform` merge normally. The reasoning below is kept
because it is the argument that answer rests on, and because the mechanism it needed — a
guard that can protect a path with a wildcard segment rather than a whole top-level field —
is SPEC-158's subject rather than a detail. The question as posed here is closed.

It is not in `IDENTITY_FIELDS`, so a
theme may currently override a field's `metaType` — and `metaType` both selects
chip-versus-bare rendering *and* is described as the field's "domain semantics".
For a first-party rune that is harmless: the override ships in a package a reviewer
reads. For a user-authored rune it means a theme can change what the author declared
their data to *mean*. Compare the reasoning that guards `schema`: a theme able to
restate a rune's schema.org type "would be able to change what a site asserts about
its own content by changing its appearance". `metaType` looks like it belongs on the
same side of that line; `blocks` and `layout` are unambiguously presentation and are
correctly placed. Worth an answer rather than an accident, and it is cheap to settle
while adoption is 20 runes out of 126.

{% ref "SPEC-152" /%} is where that question stops being theoretical. A composed plan
entity's *entire* differentiation from its four siblings is its `metaFields` and
`blocks` manifest — the layout is byte-identical five ways — so a theme retyping
`status` would not be restyling a work item, it would be changing what a work item's
status means. That audit therefore carries this as a prerequisite rather than an open
question.

**Answered, recorded above rather than here:** whether the engine config has to travel
(it does, split along `IDENTITY_FIELDS`, with the presentation half overridable).

**Withdrawn rather than answered: whether CSS travels with the rune.** This paragraph used
to answer *"it does, in the skin half, where the config generating its selectors also
lives"* — which contradicted the opening of this very section, where the skin half is
recorded as gone. There is no skin half, and the question no longer has a subject on either
path: a composed rune ships no CSS at all ({% ref "SPEC-145" /%} D2), and a declared rune is
first-party, so its CSS lives where every other first-party rune's does.

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
  - *Deferred, not met in v0.39.0.* {% ref "WORK-617" /%} was cancelled (owner's decision, 2026-10-07): on contact all three fail D4. `realm` / `faction` nest a named `sceneImage` inside the named `scene` wrapper, which the schema.org `image` row reads, and `extractScene` splits one field by node kind (`pick`). `character` filters its portrait to `img`. All three filter rendered children to the section rune and merge preamble runes into `body` only when no sections exist. Fitting them needs nesting, `pick`, `filter` and a cross-slot conditional, which this spec rules out. They go to the composed-runes work ({% ref "SPEC-145" /%} / {% ref "SPEC-147" /%}). The `emitTag` side of D5 is proved by the mechanism's tests, not by a migrated rune.
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
- [ ] The slot declaration is sufficient to derive the rune's `sections` config entry, so the identity half of `RuneConfig` is not authored a second time alongside it
- [ ] Total `transform()` line count across the tag files is recorded before and after

## References

- {% ref "SPEC-080" /%} — block and layout rune assembly model; act one
- {% ref "SPEC-081" /%} — declarative structure assembly; act two, and the constraints this carries forward
- {% ref "SPEC-003" /%} — the declarative content model that already holds the names
- {% ref "SPEC-140" /%} — the transform boilerplate survey; owns the properties channel and the `metaFields` naming collision
- {% ref "SPEC-142" /%} — inferring the transform signature; would type this declaration
- {% ref "ADR-028" /%} — rune identity is not theme configuration
- {% ref "SPEC-033" /%} — structure slots; where `projection` came from and why it is the wrong word here
- {% ref "SPEC-102" /%} — the standardised fixture format; why fixtures stay sibling files
- {% ref "SPEC-130" /%} — the schema.org table as identity, and the D5 trade that untrusted authorship breaks
- {% ref "SPEC-144" /%} — declarative entity and edge registration; the cross-page half of the same programme
- {% ref "SPEC-145" /%} — composed runes; the second authoring tier, which needs no CSS
- {% ref "ADR-035" /%} — `rejected`; the skin format this spec's file layout was built on, and whose rejection superseded it
- {% ref "ADR-036" /%} — name the pattern, do not open a language; the rule governing every gap this spec leaves
- {% ref "ADR-037" /%} — users author composed runes only; why this spec's declaration is the internal emit path
- {% ref "SPEC-152" /%} — the plan audit; where the `metaFields` identity question becomes load-bearing rather than theoretical
- {% ref "SPEC-158" /%} — where that question is answered: `metaFields.*.metaType` is identity, `label` / `sentimentMap` / `transform` are not
- {% ref "SPEC-153" /%} — delivery; D9's single `<rune>.md`, which supersedes this spec's two-file layout

{% /spec %}
