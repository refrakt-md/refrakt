{% spec id="SPEC-082" status="draft" source="SPEC-080" tags="theme, runes, serialization, data-channel, transform, engine, adapters, renderer, contract, migration" %}

# Typed node data channel

Replace the `<meta data-field>` side channel — by which a rune transform passes
computed field data to the engine across the serialize boundary — with a typed
`data` bag carried on the serialized node. Extracted from `SPEC-081` (Concern
B) so the cross-cutting adapter migration can be planned and sequenced on its
own. Sibling to `SPEC-081` (declarative structure assembly); both extend
`SPEC-080` and harden the rune output contract before third-party themes and
additional framework renderers depend on its current shape.

We start here because it is the channel the *whole* model rides on and the
riskiest surface to change (it touches every framework adapter) — de-risking it
first means later work writes into a typed channel instead of the meta side
channel.

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

### The `data` bag

Add an optional typed bag to the serialized node — the engine's **input**,
distinct from `attributes` (which, on output, the engine writes as
presentational `data-*` HTML):

```ts
interface SerializedTag {
  $$mdtype: 'Tag';
  name: string;
  attributes: Record<string, string>;
  data?: Record<string, FieldValue>;   // NEW — engine input, never rendered
  children: RendererNode[];
}
type FieldValue = string | number | boolean | string[];
```

- **Produced** by the rune schema: `createComponentRenderable`'s `properties`
  populate `node.data` instead of emitting `<meta data-field>` children.
- **Consumed** by the engine: `modifierValues` / `metaFields` resolution read
  `node.data[key]` directly — no `readMeta`, no kebab transit (keys stay as
  authored), no strip pass, values arrive typed.
- **Never rendered:** the Renderer and every adapter treat `data` as opaque
  pass-through metadata; it is not `attributes` and not `children`, so there is
  nothing to strip and nothing to leak.

### Output metas stay output

schema.org / SEO `<meta property=…>` remain real children. The migration
*splits* the two concerns runes currently conflate — `testimonial` emits the
SEO `ratingValue` meta as output **and** puts `rating: 4` in `node.data` —
which is cleaner than one dual-purpose node.

### What this removes

- The `readMeta`-as-data path, the kebab-matching set, the unconsumed-meta leak
  filter, the meta-strip step, and the re-parse dance.
- The *reason* `renderWhenEmpty` had to exist (presence is now `key in
  node.data` / `undefined`) — the flag may remain as explicit authorial intent,
  but it is no longer a workaround for a stringly channel.

## Migration

This is the cross-cutting part. It touches the serialize step, every framework
adapter (svelte / astro / nuxt / next / react / vue / eleventy), and the
Renderer. Sequence it so no renderer ever reads metas while another reads
`data`; behavior stays invariant until step 4.

1. **Carry `data` end-to-end (pure plumbing).** Add `data?` to the node type;
   the serialize step preserves it; every adapter and the Renderer pass it
   through and never render it. No behavior change — shippable on its own.
2. **Populate `data` in schemas (dual-emit).** `createComponentRenderable`
   writes `node.data` **and** still emits `<meta data-field>` (belt and
   suspenders). No output change.
3. **Engine reads `data` (dual-read).** `modifierValues` prefers `node.data`,
   falls back to legacy metas. No output change.
4. **Stop emitting data-field metas; delete the cruft.** Schemas drop the meta
   emission; the engine drops the legacy meta read, the strip filter, and the
   kebab set. SEO `property` metas untouched.
5. **Remove dual paths; tighten types.** Optional per-rune typed `data`
   interfaces where they earn their keep.

Each step is independently shippable and reversible.

## Non-goals

- Not changing the two-layer model, the SPEC-080 block / field / layout
  vocabulary, or the structural assembly (`SPEC-081` — separate, independent).
- Not removing genuine output `<meta property>` / schema.org tags.
- Not introducing per-framework data formats — one `data` shape across all
  adapters.

## Open questions

- **Naming.** `data` risks confusion with HTML `data-*`. Candidates: `props`,
  `fields`, `meta`. `data` is the working name; pick before step 1.
- **Value type.** Keep `node.data` flat and scalar (`string | number | boolean
  | string[]`) and let structure live in config (`metaFields`), or allow nested
  objects? Leaning flat — the config already holds the shape.
- **`modifiers.source`.** Today `modifiers: { x: { source: 'meta' } }`. Does it
  become `source: 'data'` (default), or does `source` disappear once `data` is
  the only channel?
- **Markdoc Renderable compatibility.** Is `data` strictly owned by refrakt's
  serialize step + adapters, or must it survive Markdoc's own `renderers` for
  any consumer that bypasses refrakt's serialize? (Output metas are the
  portable fallback in that unlikely case.)
- **Editor / `inspect`.** Both read `data-field` metas off the tree today; they
  switch to `node.data`. Confirm `inspect --json` surfaces it.

## Relationship to other specs

Sibling to `SPEC-081` (declarative structure assembly); both extend `SPEC-080`
(block-and-layout model). The two are independent and can land in either order.
Doing this one first clears the data-channel cruft everything rides on before
more is built on top of it.

{% /spec %}
