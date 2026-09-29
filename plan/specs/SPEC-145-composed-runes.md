{% spec id="SPEC-145" status="draft" tags="runes, composition, markdoc, seo, hosted, architecture" %}

# Composed runes

## Summary

A rune defined not by declaring its own output but by placing its authored content
into slots of existing primitive runes, with a Markdoc template. It has no BEM
block and ships no CSS: its appearance is whatever the installed theme already
gives the primitives it is built from. It does carry its own identity — a
`data-rune`, a schema.org row, and optionally a
{% ref "SPEC-144" /%} registration — so the tree it produces means the domain type,
not the primitives.

This is the second of two authoring tiers. {% ref "SPEC-143" /%} covers a
genuinely new atom that needs its own block and styles; this covers a domain type
that is structurally a familiar shape, which is most of them.

## Background — why this is the pressure valve

A hosted refrakt cannot ship a plugin per domain, so users define runes. The
temptation at every expressive gap is a richer language in the definition file;
{% ref "ADR-036" /%} rules that out and names composition as the alternative. This
spec is that alternative.

**These are not two authoring tiers a user chooses between.** They share their whole
declaration half — a composed rune's frontmatter declares `attributes`, `content`,
`schema`, `metaFields`, `blocks` and `registers`, which is {% ref "SPEC-143" /%}'s and
{% ref "SPEC-144" /%}'s vocabulary in full. They differ only in what *emits*, and
{% ref "ADR-037" /%} assigns the two emit paths to different audiences:

| | Declared emit path ({% ref "SPEC-143" /%}) | Composed emit path (this spec) |
|---|---|---|
| Audience | **Internal** — first-party runes shedding transforms | **Users** — the one way to author a rune outside this repo |
| Output | Own block, own BEM classes | The primitives' blocks |
| CSS | Ships with the theme | **None** — inherits whatever the theme gives the primitives |
| Arrangement decided by | the theme, via `layout` | the rune author, in the template |
| Contract | Derived from config, as today | Derived by expanding the composition |

The arrangement row is why the split lands this way. A declared rune hands
arrangement to the theme, which is full {% ref "ADR-028" /%} portability and exactly
what `work`, `character` and the rest need. A user running one site with one theme
cannot cash that benefit, and pays for it in the CSS column: "a declaratively-defined
rune renders unstyled" is the sharpest authoring barrier SPEC-143 identifies, and
composition dissolves rather than solves it — there is no new block to style. Hence
users get this path, and only this path.

## The mechanism mostly exists

`{% include %}` (`packages/runes/src/tags/include.ts`, SPEC-129) splices a file's
parsed AST into the page during **preprocess**, ahead of every other preprocess
step, and substitutes `variables` bindings at paste time. Its own doc comment is
explicit that this is substitution rather than a transform-time scope, "so bound
values reach preprocessor attributes such as `{% data where=$q %}`".

That is the right machinery, for a reason worth stating: because the splice happens
before `Markdoc.transform`, the primitives' own transforms then run on the spliced
tree exactly as if the author had typed it. No special-casing, no second code path,
and SPEC-129 already settled the ordering problem a preprocessor inside a pasted
file creates.

Three things are missing.

**1. Content slots, not just scalar variables.** `variables={q: "rune:card"}` binds
strings. Composition needs to place authored *subtrees* into named positions — the
body a user wrote under `{% character %}` has to land inside the template's
`{% card %}`. That is substitution over node lists rather than over strings.

**2. An outer identity.** After the splice the tree is the primitives': it carries
`data-rune="card"`, and the cross-page pipeline, `extractTitle`, breadcrumbs and
the editor all see a card. The composition needs a wrapper carrying the composed
rune's own `data-rune`, with the inner runes demoted to implementation detail.

**3. Cycle detection.** A composes B composes A. Cheap to detect, easy to omit.

## SEO — the retyping works, the name resolution does not

An earlier draft of this section claimed SEO was "the solved part" of composition.
That was wrong in a way worth recording rather than quietly fixing, because the
half-truth is seductive: the *retyping* mechanism does exist and does fit, but
**name resolution does not cross a composition boundary**, and without that the
retyping has nothing to retype. D9, D10 and D11 are what the corrected reading
requires.

### What does fit — retyping

`applySchemaTable` (`packages/runes/src/lib/index.ts:463-500`) retypes children from
the *parent's* row, and says why in its own comments:

> Children are retyped by the parent, never by themselves (D9). Markdoc transforms
> bottom-up, so by now the children carry their own `typeof` and this rewrites them
> — and only the parent can supply the `property` that nests them.

A parent's `row.children` is keyed by child name, and a `SCHEMA_TYPE_EXPLICIT`
marker distinguishes a type the *author* stated — which survives — from one that
came from the child's fallback row, which the parent may overrule, because
"the parent is the better authority on what an unlabelled child is".

That is exactly composition's requirement. A composed `character` declares `Person`
and child rows keyed by slot name; the `card` and `deflist` primitives it is built
from contribute structure while the outer rune owns the claim. And the explicit
marker means composition cannot silently steal a type an author stated by hand.

**The identity problem is the same problem one layer up.** The fix for SEO is
already "the parent is the authority"; item 2 above is that principle applied to
`data-rune` and cross-page registration rather than to `typeof`. Extending an
existing principle is a much better position than inventing one.

### What does not fit — reaching the values

A schema row maps **names** to schema.org properties, and two different resolvers
turn a name into nodes. They behave oppositely, and neither is composition-ready:

| Resolver | Used by | Boundary | Matches |
|---|---|---|---|
| `findAllByName` (`schema-table.ts:235`) | `properties` via `stamp`, `text` via `findByName` | **Stops at any nested `data-rune`** | `data-name`, `data-field` (+ kebab) |
| `findChildren` (`:528`) | `children` — retyping child runes | **Full subtree, no guard** | `data-name`, `data-field`, **and `data-rune`** |

`findAllByName`'s own doc comment describes the bug the guard exists to prevent,
and it is precisely the bug composition would reintroduce:

> **The search stops at another rune's node.** {% ref "ADR-008" /%}'s flat namespace
> is unique *per rune*, so the same name means different things in a parent and in a
> child it contains: `character` names its title span `name`, and so does every
> `character-section` inside it. Reaching across that boundary published a character
> whose `name` was the character plus each of its section headings.

**So for `properties`, the problem is not ambiguity — it is unreachability.** Trace
a composed `character` whose template parks slot content inside `{% card %}`:

```html
<article data-rune="character" data-rune-fields='{"role":"antagonist","status":"alive"}'>
  <div data-rune="card">                    <!-- boundary -->
    <img data-name="portrait" src="…">      <!-- slot-placed: the author's image -->
    <h1>Veshra</h1>                         <!-- {% $attrs.name %}, no data-name -->
    <span data-rune="badge">antagonist</span>
    <p data-name="description">…</p>        <!-- slot-placed -->
    <div data-rune="details">…</div>        <!-- template-placed, per section -->
  </div>
</article>
```

`findAllByName(root, 'portrait')` visits the `<article>` (exempt, it is `top`), then
hits `div[data-rune="card"]` and returns. Nothing inside the card is ever visited.
`stamp` then falls back to the field bag (`:309-312`), which holds no image because
an image is a node and not a scalar — so the Person publishes **with no `image`
property and no diagnostic**.

What survives is exactly what the bag holds: `name`, `role` and `status`, because
they are attributes. So **attribute-derived properties work today and
content-derived ones vanish**, which is the worst possible split — it works well
enough in the simple case to look correct.

**And for `children`, the problem is the opposite: over-matching.** `findChildren`
has no boundary guard and also matches `data-rune === name`, because that is how
`playlist` retypes its `track`s. Under composition, where the template deliberately
places runes and slots hold arbitrary authored content, a `children` key named
`figure` matches a `{% figure %}` the *author* wrote in the body — publishing an
illustration of a location as the Person's own `image`. Every match is applied, not
the first, and that is deliberate (`:300-303`, so a recipe's six ingredient `<li>`s
all get stamped).

So the mechanism that removes ambiguity removes reach, and the mechanism with reach
has unbounded matching. Neither is usable as-is, which D10 addresses.

## Worked examples

A composed rune has two halves, and only one of them is the template. The body
says where a slot's content *goes*; something still has to say how authored
markdown *becomes* a slot with that name. That is the content model — which
already exists and is exactly what {% ref "SPEC-143" /%}'s slot declaration names.
So: **frontmatter is the input declaration, the body is the output template, and
slot names are the join.** Frontmatter rather than the H2 sections a declared rune
might use, because here the body is claimed by the template and the declaration has
nowhere else to go.

### The small end — `bond`

```md
---
rune: bond
tag: aside
attributes:
  from:          { type: string, required: true }
  to:            { type: string, required: true }
  type:          { type: string, default: fellowship }
  status:        { type: string, matches: [active, broken, strained], default: active }
  bidirectional: { type: boolean, default: true }
content:
  type: sequence
  fields:
    body: { match: any, optional: true, greedy: true }
registers:
  edge: { from: from, to: to, kind: { field: type } }
---

{% hint type="note" %}
**{% $attrs.from %}** {% if $attrs.bidirectional %}↔{% else /%}→{% /if %} **{% $attrs.to %}**

{% slot name="body" /%}
{% /hint %}
```

Seventeen lines replace `plugins/storytelling/src/tags/bond.ts` (88 lines) plus its
slice of the registration pipeline. The `bidirectional` arrow is Markdoc's own
`{% if %}`, not a conditional this spec invents — D1 holding up in practice.

### The full case — `character`

```md
---
rune: character
tag: article
base: taxonomy
provides: [prose]
attributes:
  name:    { type: string, required: true, description: "Display name shown in the header." }
  role:    { type: string, matches: [protagonist, antagonist, supporting, minor], default: supporting }
  status:  { type: string, matches: [alive, dead, unknown, missing], default: alive }
  aliases: { type: string, description: "Comma-separated alternate names." }
content:
  type: sections
  sectionHeading: heading
  preamble:
    portrait:    { match: image, optional: true }
    description: { match: paragraph, optional: true, greedy: true }
schema:
  type: Person
  properties: { name: name, role: jobTitle }
registers:
  entity:
    idFrom: name
    data: [role, status, aliases, tags]
    aliases: { from: aliases, separator: "," }
---

{% card %}
{% slot name="portrait" /%}

# {% $attrs.name %}

{% badge tone=$attrs.role %}{% $attrs.role %}{% /badge %}
{% badge tone=$attrs.status %}{% $attrs.status %}{% /badge %}

{% slot name="description" /%}

{% slot name="sections" each %}
  {% details summary=$item.heading %}
    {% slot /%}
  {% /details %}
{% /slot %}
{% /card %}
```

**The comparison that makes the case.** `character.ts` is 184 lines, and it defines
a *second* rune — `character-section` — for no reason other than to carry each H2
section: its content model sets `emitTag: 'character-section'` and
`emitAttributes: { name: '$heading' }`. The composed version does not need it. That
child rune exists only because there was no way to say "wrap each section in
something that already exists", which is precisely the gap this spec closes.
Across the plugin, `character`, `realm` and `faction` share that shape exactly, so
three child runes go with it.

### Repeated slots are the `collection` pattern, not iteration

`{% slot name="sections" each %}` does not put a loop in the template. The engine
iterates and the template describes *one* item with `$item` bound — the same
arrangement `collection`, `data` and `relationships` item templates already use. A
bare `{% slot /%}` inside an `each` means "this item's content", which avoids an
`of=$item` argument.

This matters because the constraint is already documented and deliberate.
`site/content/runes/data.md:174`:

> The binding is deliberately shallow — bind a row, render a block. `{% if %}`
> works (`{% else /%}` is self-closing), but there is no iteration, and formatting
> goes through the shared Markdoc functions, the same constraint `collection`
> templates hold.

Composition must hold that same line rather than quietly crossing it.

### Smaller shape decisions the examples imply

- **Fallback content.** `{% slot name="description" %}No description yet.{% /slot %}`
  — cheap, and the difference between an unfilled optional slot rendering nothing
  and rendering something sensible. Self-closing stays the common form.
- **`$attrs` is a binding, not new syntax.** Markdoc's variable form already works
  in content (`{% $attrs.name %}`) and in attribute position (`tone=$attrs.role`),
  alongside the `$item` / `$row` bindings that exist.

## What worries me, stated plainly

**Contract derivation couples to the primitives' versions.**
`contracts/structures.json` is derived from config per rune. A composed rune's
structure is its expansion, so changing `card`'s structure diffs every composed
rune's contract. That is arguably the feature — it surfaces breakage that would
otherwise ship — but `contracts --check` becomes noisy in a way that needs a story
before this lands, not after.

**~~The editor's `editHints`~~ — answered in D11.** This was recorded as a live
coupling (whose hints win, the composition's or the primitives'?). It is not one:
the primitives' nodes are not content, so their hints are irrelevant, and the
composed rune declares hints for its own slots. Left visible rather than deleted
because the reasoning that dissolved it — editability follows `location.file` —
is the same reasoning D11 rests on.

**It makes a false schema.org claim easier to write.** Composition lowers the bar
to asserting a type, which sharpens {% ref "SPEC-143" /%}'s open question about a
user rune's schema row being published with no reviewer in the loop. Bad CSS is
visible on the page; a wrong `Person` row is invisible by construction. This spec
should not ship a composition path for `schema` before that question has an answer.

**Slot substitution over node lists is where the complexity actually is.** Scalar
`variables` substitution is a string replace. Node-list substitution has to decide
what happens to a slot that is filled twice, a slot that is never filled, a slot
filled with content the primitive's content model rejects, and a slot whose
authored content contains another composed rune. Each has an obvious answer; none
is free.

## Decisions

### D1 — the template is Markdoc, not a new syntax

Per {% ref "ADR-036" /%}. Markdoc is already a template language, already parsed,
already safe, and already spliced by `include`. A bespoke template DSL would be
either a weaker vocabulary in worse clothing or a sandbox problem.

### D2 — a composed rune has no block and ships no CSS

If it needs its own styling it belongs on the declared emit path, which per
{% ref "ADR-037" /%} means it is a first-party rune or a plugin — not a user
definition.

**This is load-bearing, not tidiness.** Because users author only composed runes, D2
is what keeps untrusted CSS out of the hosted story entirely: no `style` fence, no
sanitiser, no scope assertion over author-written selectors, no question about what a
skin file may contain. The moment a user-facing rune could ship CSS, all of that
returns. Which is also why a definition that tries to is rejected rather than ignored.

### D3 — the outer rune owns identity; inner runes are implementation detail

`data-rune`, the schema row, and any {% ref "SPEC-144" /%} registration belong to
the composition. An author-stated type on an inner rune survives, per
`SCHEMA_TYPE_EXPLICIT`; an implicit one does not.

### D4 — substitution happens at preprocess, through `include`'s existing path

Not a new pipeline stage. The primitives' transforms must run on the spliced tree
unmodified, which is what the preprocess timing already guarantees.

### D5 — exactly one of: a slot declaration, a composition template, or a `transform`

The same mutual exclusion {% ref "SPEC-143" /%} D8 establishes, extended to three
options. Declaring two is rejected at schema construction, naming the rune.

Under {% ref "ADR-037" /%} this gains a second job: it is also the line between the
internal and user-facing paths. A user definition carrying a slot declaration instead
of a template is rejected rather than quietly accepted onto a path it was not offered.

### D6 — a composed rune's contract is its expansion, not an opaque marker

Recording it opaquely would lose the drift check that makes contracts worth
having. The cost is the version coupling named above, accepted deliberately — but
the noise story is an acceptance criterion, not an afterthought.

### D7 — a composed rune places declared meta blocks; `layout` cannot reach into primitives

{% ref "SPEC-080" /%}'s `metaFields` + `blocks` is already the metadata primitive,
and it is better factored than a `meta` rune would be: `metaFields` is a pure data
manifest of field semantics (`metaType`, label, sentiment, condition, plus `href` /
`rating` / `icon`), and `blocks` groups those fields under a `LayoutPrimitive` —
a closed two-member vocabulary, `'definition-list' | 'bar'`. Field *shape* is
intrinsic to `metaType`, so the same field renders as a chip in a `<dd>` and as bare
text in an eyebrow with no per-field config change.

**But blocks are placed by `layout`, whose keys are container `data-name`s, and a
composed rune does not own its containers** — they belong to `card`, `details` or
whatever the template reached for. A composed rune's `layout` would be addressing
inside a primitive it does not own, which is exactly what this spec's sibling
forbids for authored regions: a region's children carry no `data-name`, so neither
`layout` nor `projection` can address inside them.

So the projection path assumes the rune owns its tree, and composition breaks that
assumption. The resolution is a template-side placement tag — spelled
`{% metablock name="…" /%}` below, though see the naming sub-question — giving one
`blocks` declaration two consumers:

- the **engine** projects it, for runes that own their tree (today's mechanism,
  untouched)
- a **template** places it, for composed runes

The theme keeps the same authority in both: `blocks` is not an identity field, so
which fields, their order and which primitive renders them stay theme-overridable.
One declaration, one authority model, two placement paths.

Half of this already exists: `bar` and `deflist` ship *twice* — as `LayoutPrimitive`
values the engine projects into, and as author-callable runes ("Block-level wrapper
that renders the SPEC-080 `bar` layout primitive over author-written content"). The
missing piece is a binding, not a primitive.

#### It is a placeholder, not a renderer

Timing forces this, and it is the reason the tag is cheap. `metaFields` resolve
against the engine's `modifierValues` —
`resolveField(fieldName, metaFields, modifierValues, locale)` at `engine.ts:1395`,
stage 4 of the pipeline. A composition template splices at **preprocess**, before
`Markdoc.transform` (D4). At the moment the tag exists, the values do not. So it
cannot render metadata; it can only be a marker that survives parse → transform →
serialize and is substituted by the engine. That is idiomatic here — the engine
already consumes and strips meta tags, and deferred sentinels (`breadcrumb auto`)
already work this way.

**Which makes this decision's first acceptance criterion true by construction rather
than by test.** `renderBlock` at `engine.ts:1388` is already a named, on-demand
closure returning `SerializedTag | null`:

```ts
const renderBlock = (name: string): SerializedTag | null => {
  const def: BlockDef | undefined = blocks[name];
  if (!def) return null;
  … resolveField per field …
  if (items.length === 0) return null;
  if (def.layout === 'bar') return renderBarLayout(name, items, def.wrap ?? true, locale, config);
  return renderDefListBlock(name, items.map((i) => i.resolved), locale, config);
};
```

`layout` placement calls it at `engine.ts:1563`. The tag is a *second trigger for the
same closure* — same code, same output, different placement source. Anything that
re-rendered metadata for composed runes would have to be kept in step by hand.

#### Worked example — `realm`, projected and composed

`Realm` today (`plugins/storytelling/src/config.ts:102-118`):

```ts
metaFields: {
  realmType: { metaType: 'category', label: 'Type' },
  scale:     { metaType: 'category', label: 'Scale', condition: 'scale' },
},
blocks: {
  metadata: { fields: ['realmType', 'scale'], layout: 'definition-list' },
},
layout: {
  root:     ['scene', 'content'],
  content:  { tag: 'div', children: ['preamble', 'metadata', 'body', 'sections'] },
  preamble: { tag: 'header', children: ['name'] },
},
```

`'metadata'` sits in `content.children` beside `preamble`, `body` and `sections`,
which are transform slots — **block names and slot names share one namespace in
`layout`**, with blocks resolved first (`engine.ts:1562-1571`). That is precisely why
a tag is needed: a composed rune has no `layout` to write the name into.

The composed form keeps `metaFields` and `blocks` verbatim and drops `layout`:

```md
---
rune: realm
tag: article
attributes:
  name:      { type: string, required: true }
  realmType: { type: string }
  scale:     { type: string }
content:
  type: sections
  sectionHeading: heading
  preamble:
    scene: { match: image, optional: true }
metaFields:
  realmType: { metaType: category, label: Type }
  scale:     { metaType: category, label: Scale, condition: scale }
blocks:
  metadata: { fields: [realmType, scale], layout: definition-list }
---

{% mediatext %}
{% slot name="scene" /%}
---
# {% $attrs.name %}

{% metablock name="metadata" /%}

{% slot name="body" /%}

{% slot name="sections" each %}
  {% details summary=$item.heading %}{% slot /%}{% /details %}
{% /slot %}
{% /mediatext %}
```

What lands is the DOM the projection already produces: a `<dl>` of
`<dt data-meta-label>` / `<dd>` pairs, each `<dd>` a chip or bare text chosen from the
field's `metaType` (`engine.ts:1330-1356`); a `bar` block would land as
`<div data-name="{block}" data-zone="{block}" data-zone-layout="bar">`
(`engine.ts:1318-1324`). Lumina styles both through `[data-zone-layout]` and
`[data-meta-type]` without knowing composed runes exist.

#### Whose config resolves the marker

The marker sits inside `{% mediatext %}`, but the block belongs to `realm`.
`assembleWithBlocks` is called per-rune with *that* rune's config and
`modifierValues`, so the outer rune's pass must scan its whole subtree for markers —
not only its direct children, which is all `layout` addresses.

That reads like a breach of {% ref "SPEC-143" /%}'s rule that `layout` may not address
inside a region, and it is not, but the distinction has to be stated or it will be
read as one: **the template is the rune's own output, so the rune may address inside
it. Authored content is what it may not reach into.** Same rule, different material.

#### The failure this prevents

`engine.ts:1408-1409` — *"No `layout` → render the transform tree verbatim (no
projection)."* A rune with `blocks` and no `layout` renders **no blocks at all**,
silently. Every composed rune has no `layout`. So without this tag a composed rune
could declare `metaFields` and `blocks` in full and get nothing, with no diagnostic,
which is the worst available outcome.

#### Sub-questions on the tag

- **It must not be called `meta`.** `meta` already means two other things here — HTML
  `<meta>`, and refrakt's "meta tags", the properties channel `createComponentRenderable`
  emits. With one `metaFields` collision already being untangled, a third `meta` is a
  mistake. `{% metablock %}` is the placeholder used above; `{% fields %}` is a
  candidate. `{% block %}` is out — it collides with `RuneConfig.block`, the BEM name.
- **Empty and undefined need different handling.** `renderBlock` returns null both for
  an undefined block and for one whose every field resolved empty. Empty is legitimate
  — `condition` exists for exactly that — so the marker is removed silently. An
  undefined name is an authoring error and should be rejected at schema construction,
  naming the block.
- **Placing one block twice is an error.** `renderBlock` sets `'data-name': blockName`
  (`engine.ts:1319`), so two placements produce duplicate `data-name`s, which SPEC-143
  forbids and `mapDataNames` silently collapses.
- **May a tree-owning rune use the tag instead of `layout`?** Mechanically yes, which
  would leave one rune with two placement mechanisms. Wants a stated preference rather
  than both being left open.

### D8 — a theme supplies no rune template

Tempting, for symmetry: if a composed rune assembles itself with a template, why not
let a theme do the same and retire `layout`/`blocks` projection? Because the two
mechanisms are not the same power, and the difference is exactly the one
{% ref "ADR-028" /%} exists to police.

`layout` is a **permutation with wrappers** over content the transform emitted. It
can reorder, create a container (`{ tag, children }`), and inject structural
elements. It cannot fabricate content, and it cannot drop any: "Transform-built
children a list doesn't name are appended in transform order (rune content is never
dropped)" (`packages/transform/src/types.ts:236`).

A template is a **free function producing a tree**. It can fabricate — the
`{% badge %}{% $attrs.role %}{% /badge %}` in the `character` example is a badge no
transform emitted — and it can omit, by not placing a slot. Fabrication would let a
theme add claims the author never made; omission would let it silently swallow
authored content. ADR-028's own reasoning applies directly: a theme that could
rewrite structural facts "could change what the same markdown *means*, which is the
portability premise the project rests on."

So this is not a slope toward violating ADR-028. Creating the tree *is* the act of
defining the rune, and a template is a tree-creating device.

**The asymmetry is not an inconsistency — it tracks the portability boundary.**
refrakt already has both mechanisms, split by scope:

| Scope | Mechanism | Why |
|---|---|---|
| Page | template — `{% layout %}` / `{% region %}` in `_layout.md`, cascading, with `region`'s `mode: replace \| prepend \| append` | A page's arrangement is not portable content; nobody moves a layout between sites expecting meaning preserved |
| Rune | config — `blocks` / `layout` projection | The same markdown must mean the same thing under any theme |

This spec moves the template mechanism *down* to rune scope. The theme does not
follow it down, because at rune scope the portability guarantee starts applying.

A theme that genuinely needs more already has a route, and an appropriately
heavyweight one: a Svelte component override in `packages/svelte/src/registry.ts`,
or `postTransform`. Both are code, shipped in a package, reviewed as code. Nothing
is being denied — only a cheap path to an expensive capability.

**This costs a documentation obligation, not nothing.** Two assembly mechanisms at
two scopes invites "when do I reach for `layout` versus a template?", and both will
grow features under pressure from the same use cases. The answer — *`layout` when
the rune owns its tree, a template when you are creating one* — belongs in the
theme-authoring guide beside ADR-028 rather than left to be inferred.

### D9 — compose only from runes that emit no schema type, or a subordinate one

A composed rune owns the claim (D3). A rune it composes *from* must therefore not
make a competing one.

**The worked counter-example is `recipe` from `howto`,** which looks ideal — in
schema.org, `Recipe` *is* a subtype of `HowTo` — and fails three ways:

1. **The property is renamed.** `howToSchema` attaches its steps as
   `step`; `recipeSchema` attaches the same `HowToStep` children as
   `recipeInstructions`. And `recipeIngredient` has no HowTo analogue at all — its
   list vocabulary is `supply` / `tool`, so typing flour as a `HowToTool` would be a
   lie in the graph.
2. **RDFa captures them at the wrong resource.** The inner `{% howto %}` carries
   `typeof="HowTo"`, and RDFa Core 1.1 §7.5 step 11 resolves a property's object to
   the typed resource when `@typeof` is present and `@about` absent
   ({% ref "SPEC-130" /%} records this). So the steps attach to the nested HowTo,
   not the Recipe: a Recipe with no instructions containing a HowTo that has them,
   rendering pixel-identically.
3. **The escape is worse than the problem.** `schema="none"` suppresses it, but
   deliberately for the *whole subtree* — "a child rune declares its own type
   independently, so stripping only the root would leave orphan typed nodes with no
   container (WORK-552)". The outer row must then re-declare every child type the
   inner would have emitted, which is re-specifying the schema while borrowing
   markup, with total coupling and nothing to catch the drift.

**The line this yields is clean, and the catalog already draws it.** Of 126 runes,
30 emit structured data (the seo-baseline's fixture set). The composable primitives
are, with near-perfect correspondence, the ones that emit nothing:

| | Runes |
|---|---|
| Emit no schema | `card`, `section`, `bar`, `deflist`, `details`, `badge`, `hint`, `mediatext`, `hero`, `grid`, `textblock`, `steps`, `feature`, `tabs`, `progress` |
| Emit a type | `howto`, `recipe`, `character`, `realm`, `faction`, `event`, `organization`, `playlist`, `cast`, `timeline`, `pricing`, `symbol`, `budget`, `plot`, `lore`, … |

That is not coincidence — it is the same division as everywhere else in this spec:
primitives carry presentation, entities carry claims. **Compose into a type, never
from one.**

One refinement: `figure` and `gallery` do emit, and composing from them is fine,
because an `ImageObject` becoming the outer entity's `image` is legitimate
**subordinate** nesting rather than a peer entity. So the rule is: compose from runes
whose schema contribution is absent or subordinate; never from one declaring a peer
top-level entity.

This is mechanically checkable — both the contract generator and the composition
expander know which runes carry schema tables — so it is a build diagnostic rather
than something a reviewer must notice.

### D10 — name resolution across boundaries is {% ref "SPEC-146" /%}'s, not this spec's

Composition cannot make a correct structured-data claim until two resolvers change:
`findAllByName` must be able to cross a nested rune's boundary to reach content placed
on the composing rune's behalf, and `findChildren` must stop matching content it was
never about. The mechanism is an ownership marker declared on the node instead of
inferred from ancestry, used to *admit* in one resolver and *reject* in the other.

**That is split out, for a reason worth stating.** One half of it is a present-tense
defect with no connection to composition: `findChildren` matches `data-rune === name`
across the whole subtree, and `howto`/`recipe`'s `children: { step }` collides with
the real `step` rune, so a `{% steps %}` block an author nests inside a `{% recipe %}`
gets stamped as one of its instructions. That is reproduced in SPEC-146 and is worth
fixing whether or not composition ships.

The other half — reaching placed content — is inert until this spec places any, so
the sequencing is: land the resolver change, prove it inert against the seo-baseline,
then build composition on a verified foundation. Changing the resolver and adding
composition in one diff would leave a baseline diff that cannot be attributed.

**This spec therefore depends on {% ref "SPEC-146" /%}** and its slot substitution
must set the marker that spec defines. Nothing else here changes.

### D11 — editability follows the source file, not the tree

The editor edits the page, not the rendered tree — `packages/editor/src/stamp-on-insert.ts`
states it plainly: "The first point at which the invocation names a real region is
when the page is written, so that is where this runs." So a composed rune's editable
surface is its **attributes and slot content**: the author's own markdown. The
template is implementation, like a component's internals.

**The line is drawn by `location.file`, and {% ref "ADR-034" /%} already decided the
mechanism** — a file-qualified `(file, start, end)` from Markdoc's own `location`,
with the relevant consequence stated outright: "a spliced partial reports the
partial." Because composition rides `include`'s splice (D4), template nodes report
the template file and slot content reports the author's page:

| Node | `location.file` | Editable |
|---|---|---|
| `<img data-name="portrait">`, `<p data-name="description">`, section content | the author's page | **yes** |
| `{% card %}` / `{% badge %}` / `{% details %}` wrappers | the rune definition | no |
| `<h1>{% $attrs.name %}</h1>` | the rune definition | no — see below |

**Composition therefore lands in an existing category, not a new one.** Content
spliced from another file is what a `{% partial %}` already is, and its body is
already not editable in place from the including page. The editor needs that rule
regardless.

**A template node interpolating an attribute is a read-only projection.** The `<h1>`
displays the name but is not its source; inline editing there has nowhere to write,
and rewriting the template would change the rune for every page. Its edit affordance
routes to the **attribute**. This is arguably better than a declared rune manages,
since the composed rune's frontmatter declares `role` and `status` with `matches`
enums, so the editor can offer selects rather than free text.

**The `editHints` ownership question is answered, not deferred.** A composed rune
declares hints for its own slots, keyed by slot name; the primitives' hints are
irrelevant because the primitives' nodes are not content. There is also little to
break — `editHints` has exactly one consumer,
`packages/editor/app/src/lib/components/BlockCard.svelte`.

**Structural editing is unrestricted where it matters.** Adding, removing and
reordering sections works, because sections come from the content model parsing the
author's H2 headings and the template's `each` renders however many exist. What an
author cannot do is add content for a slot the template does not place — identical to
a declared rune, where the slot declaration fixes the set, so no regression.

**And one guarantee to carry over.** If the content model declares a field that *no
slot places*, the author's content parses and then silently does not render: it stays
in their source and vanishes from the page. That contradicts a promise the project
already makes — `packages/transform/src/types.ts:236`: "Transform-built children a
list doesn't name are appended in transform order (**rune content is never
dropped**)." `layout` is designed not to do this; a template would. So an unplaced
declared field is a build error, naming the field. Both sets are known at schema
construction, so the check is free.

**ADR-034 is a dependency, not a nicety.** It is `proposed`, and nothing in the tree
carries a source range yet — verified. Composition is its sixth consumer and the
first that cannot be served another way, so SPEC-145's editor story does not land
before it does.

## Non-goals

- Replacing {% ref "SPEC-143" /%}'s declared tier — the two tiers coexist, and D5 keeps them distinct
- A template language of refrakt's own (D1, {% ref "ADR-036" /%})
- Letting a composed rune style itself (D2)
- Composing *across* sites, or composing a layout rather than a rune
- Resolving the dormant editor's `editHints` ownership question — recorded, not answered
- Answering {% ref "SPEC-143" /%}'s open question on unreviewed schema.org claims; this spec must not ship a `schema` composition path ahead of it
- Letting a theme supply a rune template, or retiring `layout` / `blocks` projection in favour of templates (D8)
- Adding a `meta` rune — {% ref "SPEC-080" /%} already is that primitive (D7); what is missing is a template-side placement for a block it already defines
- Changing the schema-table resolvers — that is {% ref "SPEC-146" /%} (D10)
- Widening `LayoutPrimitive` beyond `'definition-list' | 'bar'` — a vocabulary extension governed by {% ref "ADR-036" /%}, decided on its own evidence rather than here

## Open questions

Four that the worked examples surfaced. Each is a shape decision that changes what
the template may contain, so they want answering before the format is fixed.

**Is `sections` a slot name, or a special case?** The `character` example treats it
as a slot with `each`. But `sections` is the content model's *arrival mode*, which
{% ref "SPEC-143" /%} D5 says to read rather than restate — so a template naming it
as a slot may be restating it by another route. The alternative is a distinct form
for "the thing the sections mode produced", which is uglier and more honest.

**May a template name a slot the content model does not produce?** It should be an
error, caught at schema construction with the slot named — the same unresolvable-
source check a schema table already gets and {% ref "SPEC-144" /%} asks for. Worth
confirming rather than assuming, because a silently-empty slot is the failure mode
that wastes an author's afternoon.

**May a slot appear twice in one template?** Instinct says no, for the same
one-node-per-`data-name` reason SPEC-143 already asserts. But composition makes the
temptation concrete — a portrait in the header *and* the footer — so the answer needs
to be stated rather than inherited.

**What does `{% slot %}` leave behind?** Ideally nothing: it is a placeholder and the
primitives supply the structure. But a slot filled with several block nodes may need
a boundary, which is the `value` vs `region` question SPEC-143 settled for declared
runes. The answer here should almost certainly be the same one, and saying so
explicitly is cheaper than rediscovering it.

## Acceptance Criteria

- [ ] A rune can be defined by a Markdoc template that places named slots into other runes
- [ ] Authored content reaches a named slot as a node list, not a string
- [ ] A slot filled twice, never filled, or filled with content the target primitive's content model rejects each has a defined, tested outcome
- [ ] A composition cycle is detected and reported by rune name, at schema construction rather than at render
- [ ] The emitted tree carries the composed rune's `data-rune`; the primitives' markers remain but do not claim the rune's identity (D3)
- [ ] A composed rune's schema.org row retypes its slots via the existing `applySchemaTable` child mechanism, with no new schema code path
- [ ] An author-stated `typeof` on content inside a slot survives the parent's row (`SCHEMA_TYPE_EXPLICIT`)
- [ ] `extractTitle`, breadcrumb resolution and the cross-page registry read the composed rune, not its primitives
- [ ] A composed rune ships no CSS, and a definition that tries to is rejected naming the rune (D2)
- [ ] `refrakt contracts` derives a composed rune's structure by expansion, and the spec states how a primitive's change is reviewed when it diffs many composed contracts (D6)
- [ ] Declaring more than one of slot declaration / template / `transform` is rejected at schema construction (D5)
- [ ] A composed rune can place a declared `blocks` entry from its template, and the rendered result is identical to what the engine's `layout` projection produces for a tree-owning rune with the same block (D7)
- [ ] A composed rune declaring `layout` keys that name a primitive's containers is rejected, naming the key — the projection path is not silently half-applied (D7)
- [ ] The placement tag reuses the engine's existing `renderBlock` closure; no second block-rendering path exists (D7)
- [ ] The tag is resolved in the declaring rune's config and `modifierValues`, from anywhere in its own template's subtree — not only its direct children (D7)
- [ ] A block whose fields all resolve empty removes the marker and emits nothing; a tag naming an undefined block is rejected at schema construction, naming the block (D7)
- [ ] Placing the same block twice is rejected rather than collapsed by `mapDataNames` (D7)
- [ ] The tag is not named `meta`, and the chosen name collides with neither `RuneConfig.block` nor the properties-channel meta tags (D7)
- [ ] A `blocks` theme override reaches a composed rune's placed block exactly as it reaches a projected one, so the theme's authority is unchanged by which placement path is used (D7)
- [ ] The theme-authoring guide states the `layout`-versus-template rule beside {% ref "ADR-028" /%} (D8)
- [ ] A composition template placing a rune that declares a top-level schema `type` is rejected at build, naming both runes; a subordinate emitter (`figure`, `gallery`) is allowed (D9)
- [ ] `recipe` composed from `howto` is covered by a test asserting the rejection, so the counter-example cannot regress into a supported path (D9)
- [ ] Slot substitution sets the ownership marker {% ref "SPEC-146" /%} defines, on both slot-placed and template-placed nodes (D10)
- [ ] A composed rune's content-derived `properties` resolve — the `image` from a slot-placed portrait reaches the entity, asserted against the graph and not just the attributes (D10)
- [ ] An author's nested rune inside a slot is never retyped as part of the composed entity (D10)
- [ ] A composed rune nested inside another cannot reach the inner one's names, and vice versa (D10)
- [ ] {% ref "SPEC-146" /%} has landed and its baseline gates are green before any composed rune declares a `schema` row (D10)
- [ ] The editor offers edits only where `location.file` is the page being edited; template nodes are not editable in place (D11)
- [ ] A template node interpolating an attribute routes its edit affordance to that attribute rather than offering inline text editing (D11)
- [ ] A content-model field that no slot places is a build error naming the field — content is never silently dropped (D11)
- [ ] {% ref "ADR-034" /%} is landed before the editor story; the spec records it as a dependency rather than an assumption (D11)
- [ ] `refrakt inspect` shows both the composition and its expansion
- [ ] One storytelling rune is reimplemented as a composed rune in a spike, and the emitted tree is compared against today's — not necessarily identical, but every difference explained
- [ ] The rune authoring guide documents which tier to reach for, with the table from this spec

## References

- {% ref "SPEC-143" /%} — the declared tier, and the open question this spec must not outrun
- {% ref "SPEC-144" /%} — where a composed rune's cross-page identity comes from
- {% ref "ADR-036" /%} — why the template is Markdoc and not a DSL
- {% ref "ADR-035" /%} — the skin format, which composed runes do not need
- {% ref "SPEC-129" /%} — `include`'s preprocess splice, the mechanism this extends
- {% ref "SPEC-130" /%} — the schema.org table, parent-retypes-children, and the D5 trade
- {% ref "SPEC-063" /%} — file roots and partial resolution; where a template file would live
- {% ref "SPEC-080" /%} — `metaFields` / `blocks` / `LayoutPrimitive`: the metadata primitive D7 places rather than replaces
- {% ref "SPEC-081" /%} — `layout` projection, and the `{ tag, children }` creating form D8 contrasts against a template
- {% ref "ADR-028" /%} — a theme restructures a rune, never redefines it; the rule D8 turns on
- {% ref "ADR-037" /%} — users author composed runes only; why this path is the user-facing one and the declared path is internal
- {% ref "ADR-034" /%} — file-qualified source location; D11's dependency, and what draws the editable line
- {% ref "ADR-008" /%} — the flat per-rune namespace whose boundary name resolution has to cross safely
- {% ref "SPEC-146" /%} — name resolution across rune boundaries; split out of D10, and a dependency of this spec

{% /spec %}
