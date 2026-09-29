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

Two existing mechanisms supply most of it, and it matters which one does what.

**AST substitution is a solved shape.** `{% include %}`
(`packages/runes/src/tags/include.ts`, SPEC-129) clones a file's parsed AST and
substitutes `variables` bindings into it. That is the substitution *technique* a
template needs — cloning a parsed tree and filling named holes — and it is already
written.

**But the timing is a rune's transform, not preprocess.** `include` splices during
preprocess so that `data` and `snippet` inside the pasted file get preprocessed; a
composition cannot use that timing, because at preprocess the content model has not
resolved and no slot has a value (D4). A template renders where `transform` would
have, and calls `Markdoc.transform` on its result so the primitives inside it are
transformed normally — exactly as `character.ts` already does with
`resolved.items`. No new pipeline stage either way.

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

**So for `properties`, the problem is not ambiguity — it is unreachability, and it
is confined to properties whose source is a node rather than an attribute.** Take a
table mapping a node, as `castMemberSchema` does (`{ name: 'name', role: 'jobTitle',
portrait: 'image' }`), and a template that parks the portrait inside `{% card %}`:

```html
<article data-rune="member" data-rune-fields='{"name":"Veshra"}'>
  <div data-rune="card">                                  <!-- boundary -->
    <img data-name="portrait" data-owner="member" src="v.jpg">
  </div>
</article>
```

`findAllByName(root, 'portrait')` visits the `<article>` (exempt, it is `top`), then
hits `div[data-rune="card"]` and returns. Nothing inside the card is ever visited.
`stamp` falls back to the field bag (`:309-312`), which holds no image because an
image is a node and not a scalar. Measured against today's applier, with the same
table over both tree shapes:

```json
// composed — portrait slot-placed inside {% card %}
{ "@type": "Person", "name": "Veshra", "@context": "https://schema.org" }

// declared — portrait at the rune's own root
{ "@type": "Person", "image": "v.jpg", "name": "Veshra", "@context": "https://schema.org" }
```

The `image` is gone, with no diagnostic. What survives is what the bag holds, so
**attribute-derived properties work and node-derived ones vanish** — the worst
possible split, because the simple case looks correct.

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

### What the two schema-bearing cases actually emit

Both of these were built as trees and run through today's `applySchemaTable` +
`collectJsonLd`. They work **without** {% ref "SPEC-146" /%}, which is worth knowing
before reading its Problem 2 as a blanket veto on composed entities.

**`character` — every property is an attribute.** `characterSchema` is
`{ type: 'Person', properties: { name: 'name', role: 'jobTitle' } }`: it never maps
the portrait. Both sources are attributes, so both sit in the field bag on the root,
where nesting cannot reach them. With the definition above and this page:

```md
{% character name="Veshra" role="antagonist" status="alive" %}
![portrait](veshra.jpg)

A necromancer raised in the shadow of the Ashen Spire.

## Backstory
...
{% /character %}
```

measured output:

```json
{ "@type": "Person", "name": "Veshra", "jobTitle": "antagonist",
  "@context": "https://schema.org" }
```

**`children` retyping also crosses a composition today.** An Organization whose
members are `Person`s, with the members placed inside a `{% grid %}`:

```md
---
rune: troupe
tag: section
attributes:
  name: { type: string, required: true }
content:
  type: sequence
  fields:
    member: { match: list-item, greedy: true }
schema:
  type: Organization
  properties: { name: name }
  children:
    member: { type: Person, property: employee, text: { member: name }, textTag: span }
---

{% grid columns=3 %}
{% slot name="member" each %}
  {% card %}{% slot /%}{% /card %}
{% /slot %}
{% /grid %}
```

measured output:

```json
{ "@type": "Organization", "name": "The Bone Choir",
  "@context": "https://schema.org",
  "employee": [ { "@type": "Person", "name": "Veshra" },
                { "@type": "Person", "name": "Kel" } ] }
```

This works because `findChildren` has no boundary guard and walks straight through
the `grid` — which is exactly why it over-matches. The missing guard that gives it
reach is {% ref "SPEC-146" /%}'s Problem 1.

**So five resolution paths, and composition breaks one:**

| Path | Resolver | Through a composition today |
|---|---|---|
| `properties` from an **attribute** | `stamp` → bag fallback | works |
| `properties` from a **node** | `findAllByName` | **fails silently** |
| `text` | `findByName` (same walk) | fails silently |
| `entities` | `buildEntity` — node first, then bag (`:384-395`) | node source fails, attribute source works |
| `children` | `findChildren` | works, and over-matches |

**Which creates an authoring trade worth stating.** A composed rune can sidestep the
gap entirely by declaring a schema-bearing value as an *attribute* —
`image: { type: string }` mapped `{ image: image }` — which works today and reads
less like markdown. Harvesting the author's `![portrait](…)` from a slot is the nicer
authoring experience and needs SPEC-146. Both are legitimate; only one is available
before that lands.

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

### D4 — the template renders at transform time, where `transform` would have run

An earlier draft put substitution at **preprocess**, through `include`'s splice path,
on the grounds that the primitives' own transforms would then run on the spliced tree
unmodified. That is wrong, and the reason is decisive: **at preprocess the content
model has not resolved anything.** Field matching, `sections`, `emitAttributes` and
`headingExtract` all run inside the rune's transform at stage 2, so a template spliced
at preprocess has no `resolved.title`, no `$item`, no heading text — nothing to bind a
slot to.

So the template renders where a `transform` would have: **after field resolution, at
the one call site {% ref "SPEC-143" /%} substitutes at** (`lib/index.ts:865`). A
template is an alternative to `transform`, not to parsing. The generated transform
resolves fields as usual, binds them, substitutes into a clone of the template AST, and
calls `Markdoc.transform` on the result — which is not a new move:
`plugins/storytelling/src/tags/character.ts` already does
`Markdoc.transform(asNodes(resolved.items), config)`.

**What the preprocess timing bought is real but narrow, and giving it up is the right
trade.** `include` exists so that `data` and `snippet` inside a pasted file are
preprocessed ({% ref "SPEC-129" /%}'s whole reason). A template containing only
ordinary runes never needed it. So: **a composition template may not contain the
preprocessor runes** — `data`, `snippet`, `include` — and one that does is rejected at
definition load rather than failing mysteriously at render.

This also simplifies D7: a `{% metablock %}` placeholder placed at transform time is
consumed by the engine immediately afterwards, rather than having to survive three
stages as a marker.

### D4a — a node-sourced value becomes an attribute through the content model, not the template

The asymmetry is worth stating because it is the first thing an author will hit.
Attribute → anywhere is free: `{% $attrs.name %}` in content, `tone=$attrs.role` in an
attribute, `{% if $attrs.bidirectional %}` in a conditional — all ordinary Markdoc
variables. The reverse, a heading's text used as a child rune's attribute, needs the
value flattened, and **the content model already does that**:

```yaml
content:
  type: sections
  sectionHeading: heading
  emitAttributes: { heading: $heading }     # heading text, as a string
```

```md
{% slot name="sections" each %}
  {% details summary=$item.heading %}{% slot /%}{% /details %}
{% /slot %}
```

`$heading` resolves to flattened heading text (`packages/runes/src/lib/resolver.ts:491-492`),
`$field` to a `headingExtract` field (`:493-494`), and `'$a|$b'` gives an ordered
fallback (`:204-207`). `character` already relies on this, via
`emitTag: 'character-section'` with `emitAttributes: { name: '$heading' }`.

**The template must not do the extraction itself.** An attribute is a scalar and a
heading can be rich — `## The **Bone** Witch` — so flattening discards the emphasis.
Declaring it in the content model makes that loss a choice the rune author made;
inferring it from an attribute position would make it a surprise. There is no
non-lossy alternative, since a node list cannot live in an attribute at all.

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
**stage 4**. A template renders at the rune's transform, **stage 2** (D4). So even
with the corrected timing the tag still precedes its values by two stages: it cannot
render metadata, only mark where metadata goes, and the engine substitutes it. That
is idiomatic here — the engine already consumes and strips meta tags, and deferred
sentinels (`breadcrumb auto`) work this way.

The correction to D4 shortens the marker's life from three stages to one hop —
transform to engine, the same distance any meta tag travels — which is a smaller
thing to get right than a marker surviving preprocess as well.

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

### D12 — the placeable set is the intersection of two exclusions, stated in one place

Two separate rules shrink what a template may place, and nobody will derive the
intersection from two decisions in different sections.

**D9 excludes runes that emit a peer schema type.** **`requiresParent` excludes runes
that need a specific ancestor** — SPEC-084's hard nesting requirement, validated by the
engine "when the rune appears without that parent as its **nearest ancestor**". A
composition's own rune is the nearest ancestor of anything its template places, so a
parent-requiring rune placed directly always fails the check. Thirteen runes declare
one:

| Rune | Requires | |
|---|---|---|
| `AccordionItem` | `Accordion` | core |
| `BreadcrumbItem` | `Breadcrumb` | core |
| `Tab`, `TabPanel` | `TabGroup` | core |
| `JuxtaposePanel` | `Juxtapose` | core |
| `BentoCell` | `Bento` | marketing |
| `Definition` | `Feature` | marketing |
| `Step` | `Steps` | marketing |
| `Tier`, `FeaturedTier` | `Pricing` | marketing |
| `ItineraryDay`, `ItineraryStop` | `Itinerary` | places |
| `MapPin` | `Map` | places |

The two lists overlap but are not the same: `Step` and `Tier` fail both rules, `Tab` and
`BentoCell` only this one. **The placeable set is the intersection**, and the authoring
guide must state it as one list rather than leaving an author to compute it.

**The workable pattern is to place the parent.** A template reaches for
`{% steps %}` or `{% pricing %}` and lets that rune's own content model produce its
children from the slot content — which is also the arrangement that keeps the child
runes' schema rows correct, since the parent is their declared retyper (D9). So this is
a constraint on *how* to compose a list, not a bar on composing one.

### D13 — a composed rune's strings need a keying name, or they are untranslatable

i18n keys are auto-derived as `{scope}.{block}.{ref}`
(`packages/transform/src/types.ts:123`, `:145`, `:591`), with `scope` defaulting to
`core` and set per plugin. A composed rune has **no block** — that is D2, and it is
load-bearing for the CSS story. So its `metaFields` labels have no derivable key, and a
user rune has no plugin to supply a scope either.

Literal text in the template is worse: `{% badge %}antagonist{% /badge %}`, or a
`summary=` label, is not in `metaFields` at all, so no keying scheme reaches it.

**This is a genuine tension between D2 and {% ref "SPEC-035" /%}, and it wants deciding
rather than discovering.** Three candidates, none obviously right:

1. **A keying name that is not a BEM block.** The rune has a name; use it as the i18n
   scope without introducing a block. Preserves D2, costs one more identifier.
2. **Require an explicit `i18nKey`** on anything translatable, and treat an unkeyed
   label as single-locale by declaration.
3. **State that composed runes are single-locale** — honest, and probably unacceptable
   for a hosted product with international users.

Option 1 is the one I would pursue, because it separates "a name for keying" from "a
name for CSS", which were only ever conflated by convenience. Literal template text
needs its own answer under any of the three.

### D14 — universal attributes apply to a nominated chrome carrier, not the empty root

A composed rune gets the universal attribute surface — `width`, `spacing`, `inset`,
`elevation`, `substrate`, `scrim`, `reveal`, `tint` — and its *applicability* resolves
correctly, because that derives from `sections` / `mediaSlots` / `frameTarget`, which a
composed rune declares (`packages/runes/src/schema-universals.ts`; applicability is rune
identity per {% ref "ADR-028" /%}).

The problem is where they land. The engine applies them to the rune's own root, and a
composed rune's root is a semantically necessary but **visually empty** wrapper around a
primitive that already carries chrome. `width="wide"` plausibly behaves: the outer box
widens and the card follows. `elevation="raised"` plausibly produces a shadow around a
shadow, and `substrate` / `scrim` decorate a wrapper no theme designed.

**Not yet verified** — it depends on Lumina's dimension CSS, and confirming it is the
first task here rather than an assumption to build on. But the failure mode is the kind
that reads as "composition is second-class", so the design should anticipate it: a
composition **nominates a chrome carrier**, the placed rune that universal attributes
apply to, defaulting to the single top-level placed rune when the template has exactly
one. Where it has several, the default is ambiguous and the declaration is required.

### D15 — a rune may declare several templates, selected by a declared attribute

One rune, several assemblies of the same slots, still entirely declarative. This is the
largest capability increase available for the cost — and an earlier draft got both its
mechanism and its name wrong, so both corrections are recorded.

#### It is not {% ref "SPEC-091" /%}'s `variants`, because of when each runs

`variants` is `Record<axis, Record<value, Partial<RuneConfig>>>`, and selection "rides
the modifier system": the **engine** resolves each axis's modifier value and merges the
delta over base *before layout assembly* — stage 4. A template renders at the rune's
transform, stage 2 (D4). By the time the engine merges a delta, the template is already
a tree. So a `variants` delta cannot select a template; the earlier draft claiming it
could was the D4 error repeated.

**What survives is the selection input.** A variant axis is a declared attribute, and a
transform has `attrs` — so template selection is a transform-time switch on an attribute,
needing no engine involvement at all. It borrows `variants`' conventions (a closed value
set, the attribute's own `default` supplying the active value, no cross-axis compounds)
without claiming its machinery.

**And the two then compose, at their own stages, with their own owners:**

| | Stage | Decides | Theme-overridable |
|---|---|---|---|
| Template selection | transform | which **assembly** of the slots | **no** — it is the rune's own output |
| `variants` deltas | engine | which **decoration** of that assembly | yes — not an identity field |

That is D8's authority split one level down: the author composes, the theme decorates.
Both may apply to the same rune on the same axis.

#### It is not an "arrangement" either, by {% ref "ADR-030" /%}'s own test

ADR-030 draws a deliberate line between two words, and a whole-rune template sits outside
both:

- **Rule 1** — an arrangement names a *topology*, "the shape of the relationship between
  a container and its children": `stack`, `row`, `grid`, `split`, `ladder`, `rail`. It is
  explicit that `timeline`, `steps` and `playlist` are **not** arrangements, they are
  "runes that use one". **Rule 5b** requires an enabling topology to have "a contract
  statable **without naming any rune**". A `character`'s compact assembly is
  rune-specific by construction and fails that test outright.
- **Rule 2** — "variants are modifiers, not names": direction, marker, wrap, density.
  A template is not a modifier on a topology.

So this is a **third thing**, and naming it either would break a distinction someone
thought carefully about. It is a named alternative assembly of *one rune's own* slots, and
`template` is what it actually is.

**Rule 2's combinatorial-explosion argument does not bite, and it is worth saying why.**
That rule guards a *shared* vocabulary — naming `timeline` "immediately owes
`timeline-horizontal`, `timeline-grouped`". A template name is **rune-local**:
`character`'s `compact` obliges nothing of `realm`, so there is no shared namespace to
explode. Rune-locality is the property that makes names safe here and unsafe there.

#### Several templates in one file, keyed by value

Keeps {% ref "ADR-037" /%}'s one-file-per-rune shape. With one assembly the body *is* the
template; with several it is a sectioned document — the same `sections` pattern refrakt
uses everywhere, so the definition format eats its own dog food.

```md
---
rune: character
tag: article
attributes:
  name:   { type: string, required: true }
  role:   { type: string, matches: [protagonist, antagonist, supporting, minor], default: supporting }
  layout: { type: string, matches: [full, compact], default: full }
content:
  type: sections
  sectionHeading: heading
  preamble:
    portrait:    { match: image, optional: true }
    description: { match: paragraph, optional: true, greedy: true }
schema:
  type: Person
  properties: { name: name, role: jobTitle }
templates: { by: layout }
---

## full

{% card %}
{% slot name="portrait" /%}

# {% $attrs.name %}

{% slot name="description" /%}

{% slot name="sections" each %}
  {% details summary=$item.heading %}{% slot /%}{% /details %}
{% /slot %}
{% /card %}

## compact

{% bar %}
{% slot name="portrait" /%}
**{% $attrs.name %}** — {% slot name="description" /%}
---
{% details summary="Details" %}
  {% slot name="sections" each %}{% slot /%}{% /slot %}
{% /details %}
{% /bar %}
```

`{% character name="Veshra" %}` renders `full` (the attribute's `default`);
`layout="compact"` renders the other. Same content, same schema row, different assembly.

#### Why keyed sections rather than `{% if %}` inside one template

`{% if %}` already works, so this is a real choice, and the deciding factor is tooling
visibility. **Contracts already model this shape**: `packages/transform/src/contracts.ts:98-99`
declares `variants?: Record<string, Record<string, RuneContract>>` and `:372-379` expands
each axis value into its own `RuneContract`. A keyed declaration maps straight onto that,
with no new contract shape. Conditional branches inside one template hide the arity from
`contracts`, `inspect` and the generated reference, all of which would report one assembly
where three exist.

#### Three constraints, each mechanically checkable

1. **The selecting attribute must declare `matches`.** Without a closed value set there is
   nothing to check coverage against. A `default` is wanted too, mirroring `variants`'
   "the modifier's own `default` already provides the active value".
2. **Section names and `matches` values correspond exactly, both directions** — a value
   with no section is an error, a section with no value is an error. The same bidirectional
   shape the config-schema drift test already uses.
3. **Every declared content-model field is placed by every template.** D11 makes an
   unplaced field a build error because content is never silently dropped; with several
   templates that check runs per template. A compact assembly that wants less prominence
   therefore *places the content differently* — inside a `{% details %}`, as above — rather
   than omitting it.

Cost: N templates means N contract expansions, N chrome carriers to nominate (D14), and
probably a fixture per assembly, which {% ref "SPEC-102" /%}'s `<rune>.<scenario>.md`
already accommodates.

### D17 — a template's `{% if %}` hides what it wraps from a nested rune's content model

Slot-presence conditionals are useful for content and for wrappers, and they have a hard
limit that is silent when crossed.

Content models match **AST children, before transformation**, and `{% if %}` is still an
unresolved tag node at that point. So anything a template wraps in a conditional is
invisible to the structural matching of the rune it sits inside.

**The worked case is `card`'s media zone.** `splitMediaBodyFooter`
(`packages/runes/src/tags/common.ts:160-173`) iterates a flat AST node list checking
`n.type === 'hr'`, and does not recurse. So this does not work:

```md
{% card %}
{% if $slots.image %}
{% slot name="image" /%}
---
{% /if %}
…body…
{% /card %}
```

The `hr` is nested inside the `if` and the split never sees it — the card silently gets
one zone instead of two. The correct form emits both unconditionally and relies on the
consuming rune's empty-zone guard, which `card` has at `card.ts:111`
(`if (mediaNodes.length > 0)`):

```md
{% card %}
{% slot name="image" /%}
---
…body…
{% /card %}
```

An absent optional image yields an empty media zone, and `card` omits the media div.

**The rule:** use `{% if %}` around whole rune invocations and around content; never
around anything a nested rune matches structurally — delimiters, and positional
`sequence` fields alike. Where a conditional is genuinely needed inside a nested rune's
body, the consuming rune's empty-input guard is the mechanism, not the conditional.

This bounds the slot-presence conditional rather than removing it, and the bound is worth
a diagnostic: a template placing a conditional that contains a delimiter, inside a rune
whose content model reads one, is checkable at definition load.

### D16 — the theme can already style a composed rune in context

Worth recording because it materially softens D2 and requires **no new mechanism**.
`contextModifiers` keys on the parent's kebab-case `data-rune` and adds a BEM modifier
when a rune is nested inside it. A composed rune sets its own `data-rune` (D3), so a
theme can write `contextModifiers: { character: 'in-character' }` on `card` and get
`.rf-card--in-character` today.

So a composed rune is not unstyleable — it is **theme-styleable in context**, which is
the same authority split the rest of this spec argues for: the author composes, the theme
decorates. This is a documentation obligation, not work.

### D18 — `card` is the canonical media-split primitive, and composing over it deletes work

The split-layout *vocabulary* is already unified and the *mechanism* is not, which is the
largest single duplication the plugin audits found.

`SplitLayoutModel` is `splitLayoutAttributes` — `media-position`
(`top | bottom | start | end | cover`), `media-ratio` (`1/3 … 2/3`), `valign` — and its
own comment states the intent: *"Shared layout attributes for media+content runes — same
vocabulary as `bento-cell`, so **every media-bearing surface (card, recipe, hero, feature,
step, realm, faction, playlist) speaks one language**."* Eight runes declare
`base: SplitLayoutModel`. Each still implements its own split.

**`card` is the one that embodies it.** It carries `base: SplitLayoutModel`
(`packages/runes/src/tags/card.ts:49`), splits media / body / footer on `---`, and is
described as *"usable standalone or inside a collection body template"*. `mediatext` is a
narrower second.

So a composition wanting a media-first layout places `{% card %}` and passes the split
attributes through — which makes `card` the {% ref "SPEC-151" /%}-era answer to "what
primitive gives me a split?" and D14's chrome carrier in the common case.

**And composing over it deletes imperative work rather than reproducing it.** `recipe`
hand-rolls three helpers that `card` already performs:

| `recipe` does | `card` already does |
|---|---|
| `extractMediaImage` — unwrap `<p><img>` to a bare `<img>` | `extractMediaImage(mediaCursor)` at `card.ts:115` |
| `buildLayoutMetas(attrs)` — split attributes into metas | carries `splitLayoutAttributes` itself |
| `pageSectionProperties(header)` — harvest headline/blurb | replaced by naming them as content-model fields |

**Which makes `recipe` and `howto` composable, blocked only on {% ref "SPEC-146" /%}.**
Neither has a custom content model, a `postTransform`, a behaviour or a pipeline hook;
recipe's `delimited`/zoned model and howto's flat `sequence` are both declarable in
frontmatter. The only gap is `headline` / `blurb`, which is
{% ref "SPEC-151" /%} D3's six-rune case.

This corrects a claim that reached {% ref "SPEC-151" /%}: {% ref "SPEC-143" /%} D4 gates
the *declared* emit path, not composability, so its exclusion of `recipe` and `howto` says
nothing about this path.

**A consequence worth stating, because it closes an earlier question.** If both are
compositions, neither needs a `by`/`rows` variant schema to merge them —
`{% howto type="recipe" %}` was floated as a way to share one rune between two
schema.org types, and two composition files with different schema tables cost less while
keeping both rune names findable. The variant form stays right for its actual case: *one
authored shape, several schema.org types*, which is `playlist`'s five and
`organization`'s org types. `recipe` and `howto` are two shapes sharing a layout, which is
a different thing.

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
- [ ] The template renders at the rune's transform, after field resolution, at the call site {% ref "SPEC-143" /%} substitutes at — not at preprocess (D4)
- [ ] A template containing `data`, `snippet` or `include` is rejected at definition load, naming the rune and the offending tag (D4)
- [ ] Runes placed by a template are transformed normally, verified by composing from a behaviour-driven primitive and confirming its markup and behavior binding are unchanged (D4)
- [ ] A node-sourced value reaches a child rune's attribute only through the content model's `emitAttributes`; a template cannot flatten a node itself (D4a)
- [ ] `emitAttributes`' existing `$heading`, `$field` and `'$a|$b'` forms all work from a composition template, asserted per form (D4a)

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
- [ ] A template placing a rune that declares `requiresParent` is rejected at definition load, naming both runes and the required parent (D12)
- [ ] The authoring guide states the placeable set as one list — the intersection of the no-peer-schema and no-required-parent exclusions — not as two rules to combine (D12)
- [ ] A composed rune's `metaFields` labels resolve through a keying scheme that does not require a BEM block, or an unkeyed label is rejected rather than silently untranslated (D13)
- [ ] Literal text in a template has a stated translation story, even if that story is "it has none" (D13)
- [ ] Whether universal attributes on a composed root produce double chrome is verified against Lumina before the carrier mechanism is designed (D14)
- [ ] Universal attributes apply to the nominated chrome carrier; a template with several top-level placed runes and no nomination is rejected (D14)
- [ ] A rune may declare several templates in one file, keyed by the values of a declared attribute, selected at transform time (D15)
- [ ] The selecting attribute must declare `matches`; one without it is rejected, naming the rune (D15)
- [ ] Template section names and the attribute's `matches` values correspond exactly in both directions, each mismatch reported by name (D15)
- [ ] Every declared content-model field is placed by every template; one that omits a field is the same build error as a single template omitting it (D15)
- [ ] Templates and `variants` deltas both apply to the same rune on the same axis, at their own stages, with the theme able to override the delta and not the template (D15)
- [ ] `refrakt contracts` records one expansion per template under the existing `variants` contract shape, adding no new shape (D15)
- [ ] `{% if $slots.<name> %}` tests whether a slot is filled, so an optional slot's wrapper can be omitted rather than rendered empty
- [ ] A conditional containing a structural delimiter, placed inside a rune whose content model reads one, is reported at definition load (D17)
- [ ] An optional slot placed into `card`'s media zone renders the card without a media div when unfilled, and with one when filled — the D17 worked case, asserted both ways
- [ ] The theme-authoring guide documents `contextModifiers` keyed on a composed rune as the supported way to style a primitive inside one (D16)
- [ ] A composition placing `{% card %}` and passing the split attributes through renders the same media split as a rune declaring `base: SplitLayoutModel` itself, asserted for `start`, `end` and `cover` (D18)
- [ ] A composed rune placing `{% card %}` inherits `extractMediaImage`'s unwrapping, so `![x](y)` in a media slot emits a bare `<img>` and not `<p><img>` (D18)
- [ ] `recipe` and `howto` are confirmed composable once {% ref "SPEC-146" /%} lands, or the reason either is not is recorded against D18's claim
- [ ] The rune authoring guide documents which tier to reach for, with the table from this spec

## References

- {% ref "SPEC-143" /%} — the declared tier, and the open question this spec must not outrun
- {% ref "SPEC-144" /%} — where a composed rune's cross-page identity comes from
- {% ref "ADR-036" /%} — why the template is Markdoc and not a DSL
- {% ref "ADR-035" /%} — the skin format, which composed runes do not need
- {% ref "SPEC-129" /%} — `include`'s AST substitution technique, which this reuses at a different stage (D4)
- {% ref "SPEC-130" /%} — the schema.org table, parent-retypes-children, and the D5 trade
- {% ref "SPEC-063" /%} — file roots and partial resolution; where a template file would live
- {% ref "SPEC-080" /%} — `metaFields` / `blocks` / `LayoutPrimitive`: the metadata primitive D7 places rather than replaces
- {% ref "SPEC-081" /%} — `layout` projection, and the `{ tag, children }` creating form D8 contrasts against a template
- {% ref "ADR-028" /%} — a theme restructures a rune, never redefines it; the rule D8 turns on
- {% ref "ADR-037" /%} — users author composed runes only; why this path is the user-facing one and the declared path is internal
- {% ref "ADR-034" /%} — file-qualified source location; D11's dependency, and what draws the editable line
- {% ref "SPEC-084" /%} — `requiresParent`, the nearest-ancestor check D12 turns on
- {% ref "SPEC-091" /%} — `variants`; D15 borrows its conventions but not its machinery, which runs two stages later
- {% ref "ADR-030" /%} — arrangements name topologies, variants are modifiers; the distinction D15 sits outside of, and why rule 2 does not bite
- {% ref "SPEC-147" /%} — replacing the storytelling plugin; the first substantial exercise of this mechanism, and where its gaps were measured
- {% ref "SPEC-148" /%} — the places audit; the per-property method, and where D17 was found
- {% ref "SPEC-151" /%} — the marketing audit; where the six-rune `pageSectionProperties` count and D18's correction are recorded
- {% ref "SPEC-035" /%} — i18n keying, and the tension D13 records
- {% ref "SPEC-125" /%} — universal attribute applicability, which D14 leaves intact while moving where they apply
- {% ref "ADR-008" /%} — the flat per-rune namespace whose boundary name resolution has to cross safely
- {% ref "SPEC-152" /%} — the plan audit; `section` as the document counterpart to D18's `card`, and four runes already hand-rolling this mechanism
- {% ref "SPEC-146" /%} — name resolution across rune boundaries; split out of D10, and a dependency of this spec

{% /spec %}
