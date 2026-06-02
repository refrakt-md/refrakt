{% spec id="SPEC-082" status="draft" source="SPEC-080" tags="theme, runes, serialization, data-channel, transform, engine, contract, migration" %}

# Typed node data channel

Replace the `<meta data-field>` side channel — by which a rune transform passes
computed field data to the engine across the serialize boundary — with a typed
`data` bag carried on the serialized node. Extracted from `SPEC-081` (Concern
B) so it can be planned and sequenced on its own. Sibling to `SPEC-081`
(declarative structure assembly); both extend
`SPEC-080` and harden the rune output contract before third-party themes and
additional framework renderers depend on its current shape.

We start here because it is the channel the *whole* model rides on, and
because it clears the most accreted cruft. It is also **lower-risk than it
first looks**: the engine consumes and strips this channel before any renderer
sees the tree (just as it strips `<meta data-field>` today), so — contrary to
an earlier framing — this needs **no** framework-adapter changes. The fix is
confined to the schema, the engine, and the `createComponentRenderable` helper.

## Background — how data crosses the boundary today

Markdoc transform emits `Tag` instances; crossing the serialize boundary
(notably SvelteKit server→client) flattens them to
`{ $$mdtype:'Tag', name, attributes, children }` with string→string
attributes. There is no typed slot for "the status is `warning`, the rating is
`4`", so the rune smuggles that data as child nodes —
`<meta data-field="status" content="warning">` — and a later engine pass reads
them via `readMeta` into `modifierValues`, uses them for BEM classes /
`metaFields` / `blocks`, then strips them.

Two distinct kinds of `<meta>` live in the tree, and the mechanism conflates
them:

- **Engine-input metas** (`data-field=…`) — internal data for the engine.
  Must not render.
- **Output metas** (`property=…`, schema.org / SEO) — genuine HTML output.
  Must render.

## Problem

1. **Stringly-typed; presence collapses.** Absent, `""`, and `"false"` blur
   together — the `codegroup` `title=""` case forced a `renderWhenEmpty` flag
   and a present-but-empty path through three layers.
2. **Emit / read / strip must agree across three places,** and keys are
   kebab-cased in transit (`endDate → data-field="end-date"`), so the engine
   maintains a kebab-matching set.
3. **A defensive leak filter** exists solely to drop unconsumed `data-field`
   metas before they render.
4. **SEO double-booking.** `testimonial` emits `<meta property="ratingValue">`
   for schema.org *and* carries the rating for the engine; one mechanism serves
   output and internal data flow.
5. **Implicit, untyped contract.** The transform↔engine interface is "matching
   string keys," not a type.
6. **Type loss + tree inflation.** Every field becomes a node, and every value
   becomes a string — numbers, booleans, and lists must be re-parsed downstream
   (`ratingTotal` via `parseInt`, `splitOn` re-splitting a joined string).

## Direction

### The carrier is `attributes`, not a new node field

Markdoc's `Tag` is only `{ name, attributes, children }`, and `serialize()`
whitelists exactly those fields — so a separate typed slot on the node would
have to be threaded through `serialize` and every boundary, and would still
have nowhere to live during the Markdoc transform phase where the data is
*produced*. And it would buy little, because the engine strips the internal
channel before any renderer runs. So the carrier is the existing `attributes`
map, used with discipline:

- The rune schema writes field data to a **single reserved attribute** holding
  a JSON-encoded typed object:

  ```ts
  attributes['data-rune-fields'] =
    JSON.stringify({ status: 'warning', rating: 4, currency: 'USD' });
  // type FieldValue = string | number | boolean | string[]
  ```

- The engine parses `data-rune-fields` **once** into a typed `fields` object,
  resolves `modifierValues` / `metaFields` from it, and **deletes the key**
  before output — one trivial strip that replaces the meta-strip filter, the
  kebab-matching set, *and* the unconsumed-meta leak filter.
- Values arrive **typed** (JSON preserves numbers / booleans / string lists),
  and presence is `key in fields` / `undefined` — the stringly presence-collapse
  is gone, and keys stay as authored (no kebab transit).
- `attributes` stays `Record<string, string>` — the value is a JSON *string*,
  so there is **no type widening** and no ripple through the Renderer, the BEM
  logic, or the adapters.
- Because the engine strips the reserved key before the tree reaches any
  renderer, **no adapter sees it** — it crosses `serialize()` for free (just an
  attribute) and is gone by render time.

*(Optional later refinement — step 4: `serialize()` could promote the parsed
object to a first-class `fields` POJO field and drop the reserved attribute, if
a typed top-level slot proves worth the serialize / boundary edits. Deferred —
the reserved attribute already delivers the wins.)*

### Output metas stay output

schema.org / SEO `<meta property=…>` remain real children. The migration
*splits* the two concerns runes currently conflate — `testimonial` emits the
SEO `ratingValue` meta as output **and** puts `rating: 4` in the `fields`
attribute — which is cleaner than one dual-purpose node.

### What this removes

- The `readMeta`-as-data path, the kebab-matching set, the unconsumed-meta leak
  filter, the meta-strip step, and the re-parse dance.
- The *reason* `renderWhenEmpty` had to exist (presence is now `key in fields`
  / `undefined`) — the flag may remain as explicit authorial intent, but it is
  no longer a workaround for a stringly channel.

## Migration

Smaller than a separate-bag approach: the engine sits between the channel and
every renderer, so adapters never see it and need no changes. The work is
confined to `createComponentRenderable`, the schemas, and the engine. Sequence
so behavior stays invariant until step 3.

1. **Schema writes the reserved attribute (dual-emit).**
   `createComponentRenderable` populates `data-rune-fields` **and** keeps
   emitting `<meta data-field>` (belt and suspenders). No output change.
2. **Engine reads `fields` (dual-read).** `modifierValues` / `metaFields`
   prefer the parsed `data-rune-fields`, fall back to legacy metas. No output
   change.
3. **Drop the metas; delete the cruft.** Schemas stop emitting
   `<meta data-field>`; the engine drops the legacy meta read, the meta-strip
   filter, and the kebab-matching set — keeping only the single reserved-key
   parse + strip. SEO `property` metas untouched.
4. **(Optional) Promote to a first-class `fields` field** via `serialize()`,
   if a typed top-level slot earns the serialize / boundary edits. This is the
   only step that would touch the serialize boundary; defer until proven worth
   it.

Steps 1–3 need zero adapter work and are individually shippable and reversible.

## Non-goals

- Not changing the two-layer model, the SPEC-080 block / field / layout
  vocabulary, or the structural assembly (`SPEC-081` — separate, independent).
- Not removing genuine output `<meta property>` / schema.org tags.
- Not widening `attributes` to a typed union — it stays `Record<string,
  string>`; the reserved value is a JSON *string*, parsed only by the engine.
- Not threading a new node field through the framework adapters (the engine
  strips the channel before render; adapters are out of scope).

## Open questions

- **Naming.** Internal concept: `fields` (matches `metaFields` / `data-field`;
  the node's resolved field values). Reserved attribute key: `data-rune-fields`
  vs `data-fields` vs `data-rf-fields` — pick before step 1.
- **Value type.** Keep `fields` flat and scalar (`string | number | boolean |
  string[]`) and let structure live in config (`metaFields`), or allow nested
  objects? Leaning flat — the config already holds the shape.
- **`modifiers.source`.** Today `modifiers: { x: { source: 'meta' } }`. Does it
  become `source: 'fields'` (default), or does `source` disappear once `fields`
  is the only channel?
- **First-class promotion (step 4).** Is a typed top-level `fields` POJO field
  worth the `serialize()` + boundary edits, or does the reserved JSON attribute
  stay the end state? Decide after steps 1–3 land.
- **Editor / `inspect`.** Both read `data-field` metas off the tree today; they
  switch to reading the parsed `fields`. Confirm `inspect --json` surfaces it.

## Relationship to other specs

Sibling to `SPEC-081` (declarative structure assembly); both extend `SPEC-080`
(block-and-layout model). The two are independent and can land in either order.
Doing this one first clears the data-channel cruft everything rides on before
more is built on top of it.

{% /spec %}
