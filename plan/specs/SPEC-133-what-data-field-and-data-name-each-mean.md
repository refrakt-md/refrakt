{% spec id="SPEC-133" status="draft" source="SPEC-130" tags="runes, transform, engine, contract, data-channel, bem" %}

# What `data-field` and `data-name` each mean

Two attributes label nodes in rune output. One has a single meaning. The other
has six, and the documented contract describes only the first of them.

Give `properties` and `refs` a rule that survives contact with the catalog, and
shrink `data-field` back to the one job it is named for.

## Problem

`createComponentRenderable` splits its input two ways, and the split is
documented crisply in `site/content/extend/rune-authoring/output-contract.md`:

| | Properties | Refs |
|---|---|---|
| Attribute set | `data-field="kebab-name"` | `data-name="key"` |
| Purpose | Carry metadata for modifiers | Label structural elements |
| Engine reads | Value from meta tag content | Element for BEM class |
| **After transform** | **Meta tag removed from output** | **Element stays, gets BEM class** |

That table describes one of the six things `data-field` actually does.

### Measured

Every rune in the catalog (95) rendered through `refrakt inspect`, counting the
elements that carry `data-field` in the output:

| Carrier | Count |
|---------|-------|
| `<meta>` | 85 |
| `li` | 26 |
| `span` | 25 |
| `div` | 25 |
| `section` | 15 |
| `h1`–`h6` | 6 |
| `time` | 4 |
| `article` | 3 |
| `a` | 3 |
| `summary` | 2 |
| `p`, `aside` | 2 |
| **total** | **196** |

**111 of 196 are on elements that survive into the HTML** — the case the
documentation says does not exist.

### The six meanings

1. **Meta value carrier** — read as a modifier, then stripped. *The documented
   one.*
2. **Postprocess sentinel** — a meta kept deliberately so a phase-4 hook can
   read it (`collection`, `aggregate`, `blog`, `backlog`, `relationships`,
   the `plan-*` runes). {% ref "SPEC-082" /%} names this "a separate use of
   `data-field`" and rules it out of scope; the authoring docs never mention it.
3. **Value-bearing visible element** — `<span data-field="name">`,
   `<a data-field="url">`, `<time data-field="date">`. Survives, contributes
   nothing to the field bag (only `<meta>` does), gets no BEM class.
4. **Repeated structural content marker** — `<li data-field="item">`,
   `<div data-field="cell">`, and the same shape for `track`, `step`, `tier`,
   `pin`, `category`, `line-item`, `amount`, `entry`. Survives, no bag entry, no
   BEM class. **Meanings 3 and 4 together account for 97 of the 111.**
5. **The rune root's semantic role** — `data-field="content-section"`, 14
   occurrences, from `property: 'contentSection'` on 29 transforms. Inert;
   removed by this spec (below).
6. **Engine-emitted row key** — `<div data-name="row" data-field="prepTime">`,
   written by the engine itself for metadata displays. Survives *and is styled
   by CSS* (`.rf-work__metadata [data-field="assignee"]`,
   `.rf-beat > span[data-field="label"]`) — the exact inverse of "removed from
   output".

`data-name`, by contrast, means one thing: *label a structural element so the
engine can give it a BEM element class*. Every consumer agrees —
`applyBemClasses`, `autoLabel`, `editHints`, the `sections` / `mediaSlots` join
tables, motion's `staggerItems`, and the component-override slot mapping. It is
not the problem and this spec does not change it.

### The concept, not the mechanism

The mechanism is well defined: `properties` → `data-field` + the bag, `refs` →
`data-name` + BEM. What is not defined is *which map a given node belongs in*.

`properties` has become "everything that is not a ref", and the discriminator
that actually decides runtime behaviour is `n.name === 'meta'`, not the author's
choice of map:

```ts
// component.ts — a non-meta in `properties` gets data-field and nothing else
if (n.name === 'meta' && n.attributes.content !== undefined) {
  values.push(n.attributes.content);          // ← only metas reach the bag
  if (!isSeoMeta) pureDataMetas.add(n);       // ← only metas get dropped
}
```

So a non-meta placed in `properties` behaves like a ref that forgot its BEM
class. Nothing warns; the rune simply renders slightly less styleable HTML.

### A live casing defect

`data-field` is kebab-cased when a rune emits it and camelCase when the engine
does:

```ts
'data-field': toKebabCase(k)          // component.ts — rune-emitted
'data-field': f.name                  // engine.ts:1200 — engine-emitted
```

```html
<section data-field="content-section">        <!-- rune:   kebab -->
<div data-name="row" data-field="prepTime">   <!-- engine: camelCase -->
```

Only three instances in the catalog today (`prepTime`, `cookTime`, `endDate`)
because most field names are single words, but it is systematic for any
multi-word field in a metadata row. It has already cost something: the `Page`
document node compares `data-field === 'contentSection'` against kebab-cased
output and can never match, which is most of why nobody noticed that node was
dead code.

## Direction

Two rules, replacing six meanings:

- **`refs`** — any node that survives into the output and should be
  addressable. Gets `data-name` and a BEM element class.
- **`properties`** — values only. The value reaches the bag; the carrier is an
  implementation detail that disappears.

Under that rule `data-field` shrinks to "a meta that is about to be consumed",
plus the postprocess-sentinel case, which is a genuinely different job and
should say so — either a distinct attribute or a documented, named exception
rather than a footnote in another spec.

Consequences worth naming up front, because they are what make this a spec
rather than a refactor:

- **~97 elements move from `properties` to `refs`** and gain BEM element
  classes they do not have today (`.rf-playlist__track`, `.rf-budget__category`,
  `.rf-datatable__cell`). New selectors, new CSS coverage entries.
- **The component-override interface changes for those runes.** Properties map
  to scalar props and refs to named slots, so `track` moves from a scalar prop
  to a slot. That is arguably a correction — it *is* repeated content, not a
  scalar — but it is a breaking change to any registered component.
- **CSS selecting engine-emitted rows follows the casing fix.**
- **HTML output changes across many runes**, so the structure contract and the
  CSS coverage test both move in the same commit.

## Moved here from {% ref "SPEC-130" /%}: `property: 'contentSection'`

29 runes pass `property: 'contentSection'` to `createComponentRenderable`, which
maps the `property` *field* to `data-field`, kebab-cased:

```html
<section data-field="content-section" typeof="FAQPage" class="rf-accordion" …>
```

It is meaning 5 above, and it is inert. Every reference in the repo outside the
29 declarations:

| Where | What it is |
|-------|-----------|
| `documents/page.ts` | the `Page` document node — dead and broken (below) |
| `transform/test/html.test.ts` | a hand-built fixture checking `$$mdtype` stripping; not pipeline output |
| `plugins/marketing/test/hero-content-model.test.ts` | asserts the attribute exists — a characterisation test of today's output |
| `site/content/extend/rune-authoring/` (4 pages) | documented as part of the output contract |

Zero hits in the engine, the Svelte renderer, the framework adapters, the
editor, behaviors, the language server, any stylesheet, or
`contracts/structures.json` — which is its own small indictment, since
`contracts` claims to describe the complete HTML structure and omits an
attribute present on every section rune on every page.

**The one consumer that ever existed is dead code, and was broken anyway.**
`Page` splits children on `c.attributes['data-field'] === 'contentSection'` —
camelCase, against an attribute kebab-cased at emission, so it could never have
matched. It is also never registered: `documents` is exported from
`packages/runes/src/index.ts` and no Markdoc config consumes it, so the node
never runs. The casing defect above is why the mismatch went unnoticed.

Deleting `Page` has a bonus: it stamps `typeof="PageSection"` on every wrapper
it makes, and `PageSection` is not a schema.org type at all. Dead today, but an
invented type waiting to be revived. Its config entry (`PageSection: { block:
'page-section' }` in `coreConfig`) and
`packages/lumina/styles/runes/page-section.css` go with it — the CSS exists only
because the coverage test derives it from that config entry, a closed loop of
dead code keeping itself alive.

So the removal is: the `property:` line from 29 transforms, the `Page` /
`DocPage` document nodes, the `PageSection` config entry and its CSS, the
marketing characterisation test, and four docs pages. With
`property: 'contentSection'` gone, `TransformResult.property` has exactly one
remaining user — `error.ts`, whose `data-field="error"` is equally unread — so
**the field itself can go**, taking with it a name that collides with both the
`properties` map and the RDFa `property` attribute.

`PageSectionSlots` in `packages/types` is unrelated and stays — it types the
`eyebrow` / `headline` / `blurb` header slots.

**Why it moved.** {% ref "SPEC-130" /%} found this while sweeping the same call
sites and scoped it in on those grounds, but it is not the schema.org channel
and never was — it is meaning 5 of the attribute this spec is about. It belongs
here, and SPEC-130 keeps only the parts that touch emission.

## Open questions

- **Do the postprocess sentinels get their own attribute?** They are neither a
  consumed modifier nor a structural label, and {% ref "SPEC-082" /%} already
  had to carve them out by hand. A `data-sentinel` (or similar) would make the
  remaining `data-field` rule exceptionless. Against: it is a rename touching
  every sentinel rune and its hook, for clarity rather than behaviour.
- **Does the engine keep writing `data-field` at all?** Meaning 6 is the engine
  labelling its *own* output, which is closer to what `data-name` is for — the
  rows already carry `data-name="row"`. Folding the key into `data-name` (or a
  `data-row-field`) would remove the casing question entirely rather than fixing
  it. Check what the CSS needs first.
- **Do value-bearing visible elements need both?** A `<time data-field="date">`
  is structural *and* carries a value. Under the two rules it becomes a ref —
  but if its value is also wanted in the bag, the rune must emit a meta as well,
  which is the duplication {% ref "SPEC-130" /%} documents for schema carriers.
  Decide whether `refs` entries can opt into the bag.
- **Migration shape.** The ~97 moves are mechanical but not uniform, and each
  one changes rendered HTML. Per-package batches with the structure contract
  regenerated per batch, or one sweep? The CSS coverage test will demand new
  selectors either way.
- **Is this worth doing at all?** Stated plainly because it deserves an honest
  answer: nothing is *broken* today except the casing defect and the dead
  `Page` node. The case is that six meanings on one attribute is how the
  `Page` bug survived, how `data-field` ended up in stylesheets, and why
  {% ref "SPEC-130" /%} needed a paragraph to explain which attribute its table
  keys on. The cost is a wide HTML diff and a breaking component-interface
  change.

## Acceptance Criteria
- [ ] `properties` and `refs` have a stated rule that predicts which map a node belongs in, and the authoring docs describe what the catalog actually emits
- [ ] Nodes that survive into the output are addressed by `data-name` and carry a BEM element class — the ~97 content markers and value-bearing elements included
- [ ] `data-field` on rune output means one thing: a meta about to be consumed and removed
- [ ] The postprocess sentinels are either given their own attribute or documented as a named exception, not left as a footnote in another spec
- [ ] `data-field` casing is consistent between rune-emitted and engine-emitted output, or the engine stops emitting it
- [ ] `property: 'contentSection'` is gone from all 29 transforms, along with the dead `Page` / `DocPage` nodes, the `PageSection` config entry and its CSS — and `TransformResult.property` with them
- [ ] `refrakt contracts` describes the attributes it currently omits, and the CSS coverage test accounts for the new BEM element selectors
- [ ] No stylesheet depends on an attribute whose meaning this spec changes

## References

- {% ref "SPEC-130" /%} — declarative schema.org mapping; where this was found, and the source of the `contentSection` removal
- {% ref "SPEC-082" /%} — the typed data channel; carved the postprocess sentinels out by hand
- {% ref "SPEC-080" /%} — the block / field / layout vocabulary these attributes serve
- {% ref "ADR-008" /%} — properties and refs share one flat namespace with enforced uniqueness

{% /spec %}
