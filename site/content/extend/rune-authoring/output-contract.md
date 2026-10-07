---
title: Output Contract
description: What runes produce and how the identity transform engine consumes it
---

# Output Contract

Rune schemas produce structured output that the identity transform engine consumes. This page covers the contract between those two layers — what `createComponentRenderable` expects, how meta tags carry configuration, and how the engine config turns it all into styled HTML.

## createComponentRenderable

The function that produces the output Tag for a rune:

```typescript
import { createComponentRenderable } from '../lib/index.js';

return createComponentRenderable({
  rune: 'hint',
  tag: 'section',
  property: 'contentSection',
  properties: {
    hintType,
  },
  refs: {
    body: children.tag('div'),
  },
  children: [hintType, children.next()],
});
```

### Parameters

`createComponentRenderable` takes a single object containing the rune's identity and the transform result:

| Field | Type | Description |
|-------|------|-------------|
| `rune` | `string` | Rune name in kebab-case (e.g. `'hint'`, `'accordion-item'`). Becomes `data-rune` on the root, which the engine uses to look up the rune config. |
| `tag` | `string` | HTML tag name for the root element (`'section'`, `'article'`, `'div'`, etc.) |
| `children` | `RenderableTreeNodes` | Content children — the actual output |
| `properties` | `Record<string, Tag \| RenderableNodeCursor>` | Metadata tags consumed by the engine (each gets `data-field="kebab-name"`) |
| `refs` | `Record<string, Tag \| RenderableNodeCursor>` | Named structural elements (each gets `data-name="key"`) |
| `property` | `string` (optional) | Semantic role for the root tag (e.g., `'contentSection'`) — becomes `data-field` |
| `id` | `string` (optional) | HTML id attribute |
| `class` | `string` (optional) | CSS class to add |

### What it does

1. Sets `data-field="kebab-name"` on each **properties** entry — marks tags as metadata carriers
2. Sets `data-name="key"` on each **refs** entry — labels structural elements for BEM
3. Creates the root tag with `data-rune="kebab-name"` — engine lookup key

It never sets `typeof` or `property`. Structured data is declared once, as a table on `createContentModelSchema({ schema })`, and applied after the transform — see *Declaring schema.org output* in [Building a Custom Plugin](/extend/plugin-authoring/authoring).

## Declaring slots instead of a transform

Most runes do one thing in their transform: take each resolved field, give it a name, and hand the lot to `createComponentRenderable`. When that is *all* a rune does, it declares it with `emits` and writes no `transform` at all (SPEC-143):

```typescript
export const work = createContentModelSchema({
  attributes: { /* … */ },
  contentModel: () => ({
    type: 'sections',
    sectionHeading: 'heading:2',
    fields: [
      { name: 'title', match: 'heading', optional: false },
      { name: 'description', match: 'paragraph', optional: true, greedy: true },
    ],
    sectionModel: { type: 'sequence', fields: [{ name: 'body', match: 'any', optional: true, greedy: true }] },
  }),
  emits: {
    rune: 'work',
    tag: 'article',
    properties: {
      status: 'draft',
      created: { from: ['attrs.created', 'file.created'], default: '' },
    },
    slots: {
      title: { as: 'region', el: 'header' },
      blurb: { from: 'description', as: 'region', omitWhenEmpty: true },
      body: { from: 'sections', as: 'region' },
    },
  },
});
```

`createContentModelSchema` builds the transform from the declaration once, when the module loads, and calls it exactly where it would call a hand-written one. Nothing downstream — the schema.org table, serialization, the engine, `layout`, contracts — can tell the difference, so moving a rune to `emits` is proved by its output not changing.

### The declaration

| Field | Description |
|-------|-------------|
| `rune`, `tag`, `property` | The renderable's identity — what `createComponentRenderable` would have been given. |
| `properties` | Property metas, in the data form of `fieldMetas`: a default string reads the attribute of the same name; `{ from: ['attrs.x', 'file.x'], default }` takes the first non-empty source. |
| `slots` | The named content slots, emitted in declaration order. |

Each slot is `'value'`, `'region'`, or an object:

| Key | Default | Description |
|-----|---------|-------------|
| `from` | the slot's name | The content field it comes from, or `attrs.<name>` for an attribute. A slot named after its field needs only its kind: `body: 'region'`. |
| `as` | — | `value`: the field is already one node, and that node gets the name (an attribute value is rendered as text in a `span`). `region`: the field's nodes go inside one boundary element, which gets the name. |
| `el` | `div` (region), `span` (attribute value) | The boundary element. State it only when it means something — `header` for a heading group. |
| `omitWhenEmpty` | `false` | Emit nothing when the field resolved to nothing, instead of an empty boundary. |
| `role` | derived | The slot's [section role](/extend/theme-authoring/config-api#sections). Defaults to the slot name when that is a role, else to the field's name when that is one — `title`, `body` and `blurb ← description` need nothing. |

The rune's `sections` join table is derived from the slots, so it is not written a second time. A `sections` option beside `emits` may only add roles for names `layout` creates (a `preamble` header), never restate a slot's.

A region's children carry **no** `data-name` of their own: the boundary is what `layout`, `projection` and the editor address, and it is what keeps an authored body opaque to a theme.

**Sections.** A slot reading the `sections` field of a `sections` content model renders them the way the model delivers them — the declaration does not say it again. Without `emitTag`, each resolved entry becomes a `<section data-name="{slug}">` holding its heading and body (the slug is a known section's canonical slug, else the heading text; a known section's heading carries `data-known-section`; a top-level `---` inside the body is a separator and is dropped). With `emitTag`, the emitted child runes render as themselves.

### What it cannot say

The declaration names slots. It cannot nest one slot in another, order slots other than by listing them, or create containers — those are `layout`'s. Every value is data: no function, no computed default, no predicate, so a declaration survives `JSON.parse(JSON.stringify(…))` unchanged. A declaration that tries any of these is rejected when the schema is constructed, naming the rune and the slot — never applied in part. So is one that would put a `data-name` on two nodes (a `value` read from a greedy field), a slot sharing a name with a property, a `from` naming no field of the content model, and a rune with both `transform` and `emits`, or neither.

### The family test: does this rune need a transform?

> **Does every output slot come from exactly one resolved field, wrapped but not restructured?**

If yes, declare it with `emits`. If the rune **unwraps** a rendered node to take its children, **filters** rendered output (keep only the `img`, only the child runes of one type), **reorders** or **merges** fields into one slot, splits one field into several slots by inspecting it, or reads the raw AST node, it keeps a `transform` — that is what the escape hatch is for, and `recipe` is the standing example. Do not grow the declaration to fit one more rune; the test is the boundary.

## Properties vs Refs

### The rule

One question decides the map, and you can answer it without reading the engine:

> **Does this node survive into the rendered HTML?**
>
> - **Yes, and someone might want to address it** → `refs`. It gets `data-name` and a BEM element class.
> - **No — it exists only to carry a value** → `properties`. The value reaches the field bag; the carrier disappears.

`properties` is *values only*. `refs` is *everything that stays*.

The mechanism behind it:

| Aspect | Properties | Refs |
|--------|-----------|------|
| **Attribute set** | `data-field="kebab-name"` | `data-name="key"` |
| **Purpose** | Carry a value for modifiers | Label a structural element |
| **Engine reads** | Value from meta tag content | Element for BEM class |
| **After transform** | Meta tag removed from output | Element stays, gets BEM class |
| **Example** | `hintType` meta with content "warning" | `body` div wrapping content |

**Properties** flow: rune emits `<meta data-field="hint-type" content="warning">` -> engine reads it -> adds `rf-hint--warning` class + `data-hint-type="warning"` attribute on the root -> removes the meta tag.

**Refs** flow: rune emits `<div data-name="body">` -> engine reads it -> adds `rf-hint__body` class -> element stays in output.

### What the catalog emits today

The row above that says "meta tag removed from output" describes only one of the things `data-field` currently does. **Most `data-field` attributes in the catalog are on elements that survive** — `<li data-field="item">`, `<span data-field="name">`, `<time data-field="date">`, `<a data-field="url">`. Render the catalog and count for yourself:

```bash
npx refrakt inspect <rune> --site main
```

Only `<meta>` carriers reach the field bag. The discriminator in `createComponentRenderable` is literally `n.name === 'meta'`, not which map you chose — so **a non-meta placed in `properties` behaves like a ref that forgot its BEM class**. Nothing warns you; the rune just renders less styleable HTML.

Write new runes against the rule, not against the catalog. Existing runes are being migrated; until then, expect to see `data-field` on elements that stay.

### The one documented exception: postprocess sentinels

A meta tag kept deliberately so a phase-4 `postProcess()` hook can find it later is **not** a consumed modifier — it must survive the engine, not be stripped by it. The `collection`, `aggregate`, `blog`, `backlog`, `relationships` and `plan-*` runes all do this.

This is a genuinely different job from both maps above. It stays in `properties` today and is called out here rather than left implicit: if you are writing a sentinel, you are taking the exception knowingly, not discovering it by accident.

### Schema-relevant nodes

Three idioms recur once a rune also publishes structured data. They follow from the rule rather than competing with it:

| The node is… | Map | Why |
|---|---|---|
| A **value-only source** — a computed string with no visible carrier | `properties` | Nothing survives, so there is nothing to address. |
| A node the schema **stamps in place** — an element that gets `typeof`/`property` added to it | `refs` | It survives, so it needs a name. The schema annotates the node the ref already gives you. |
| **Both** — visible *and* value-bearing, like `<time data-field="date">` | `refs`, with a named entry | It survives, so the rule puts it in `refs`; give it a name so the schema mapping can reach it by that name rather than by attribute. |

The third case is the common one and the one worth getting right. Name it in `refs`, and its value reaches the schema by the mapping stamping the node in place — not by emitting a duplicate meta beside it.

**Do not style off the schema channel.** CSS selects the BEM element class (`.rf-lore__title`), never `[property="headline"]`. A rune's appearance must not depend on its structured-data output, or correcting the schema becomes a visual regression. This is enforced by a test.

### Component override mapping

When a rune has a registered component override, the renderer automatically maps properties and refs to a framework-native interface:

| Output contract | Component receives | Example |
|----------------|-------------------|---------|
| **Properties** (meta tags with `data-field`) | Scalar string props | `prepTime="15 min"` |
| **Refs** (elements with `data-name`) | Named snippets/slots | `{@render ingredients?.()}` |
| Everything else | Default `children` slot | `{@render children?.()}` |

This means the properties and refs you define in `createComponentRenderable` directly determine the component author's API. Use `refrakt inspect <rune> --interface` to see the resulting interface.

## Meta tags

Meta tags are the bridge between rune schemas and the engine. They carry configuration values without producing visible output.

```typescript
// In the rune's transform():
const hintType = new Tag('meta', { content: attrs.type ?? 'note' });

return createComponentRenderable({
  rune: 'hint',
  tag: 'section',
  properties: {
    hintType,    // its content lands in the rune's field bag
  },
  children: [children.next()],
});
```

`createComponentRenderable` copies each property meta's `content` into the root's `data-rune-fields` attribute, keyed by the property name: `{"hintType":"warning"}`. The meta itself is dropped from the output, so it does not need to be in `children`, and is filtered out if it is.

The engine:
1. Reads `hintType: "warning"` from `data-rune-fields`
2. Adds modifier class `rf-hint--warning`
3. Stores `data-hint-type="warning"` on root
4. Strips `data-rune-fields` from the rendered output

When every property is an attribute read, `fieldMetas` builds the whole `properties` map from one declaration. A bare string is the default for the attribute of the same name, and `from` reads a differently named one: `fieldMetas(attrs, config, { hintType: { from: ['attrs.type'], default: 'note' } })`.

## The data-rune marker

The root tag gets `data-rune="kebab-name"`:

```html
<section data-rune="hint" data-field="content-section">
```

The identity transform engine uses `data-rune` to look up the rune config (keyed by the matching `typeName` in `packages/runes/src/config.ts`), then applies BEM classes, modifiers, and structure. The Renderer outputs the transformed tree as generic HTML.

Runes that contribute Schema.org structured data also carry a `typeof` attribute (e.g. `typeof="FAQPage"`), stamped from the rune's declarative schema table rather than by the transform. Most runes don't have one.

---

## Engine config

The engine config in `packages/runes/src/config.ts` declaratively describes how to enhance each rune's output. Here's the full interface:

### `block`

BEM block name, without prefix. Combined with the theme prefix to form the CSS class:

```typescript
Hint: {
  block: 'hint',    // -> .rf-hint
}
```

### `modifiers`

Maps modifier names to their sources. The engine reads the value, adds a BEM modifier class, and stores the value as a data attribute:

```typescript
modifiers: {
  hintType: { source: 'meta', default: 'note' },
}
// Input:  <meta data-field="hint-type" content="warning">
// Output: class="rf-hint rf-hint--warning" data-hint-type="warning"
```

Sources:
- `'meta'` — reads from a `<meta data-field="name">` child tag (most common)
- `'attribute'` — reads from a root element attribute

### `structure`

Injects structural elements that don't exist in the rune's output. Keyed by `data-name`:

```typescript
structure: {
  header: {
    tag: 'div',
    before: true,                // insert before existing children
    children: [
      { tag: 'span', ref: 'icon', icon: { group: 'hint', variant: 'hintType' } },
      { tag: 'span', ref: 'title', metaText: 'hintType' },
    ],
  },
},
```

**StructureEntry options:**

| Option | Description |
|--------|-------------|
| `tag` | HTML element to create |
| `ref` | Override data-name (defaults to the structure key) |
| `before` | Insert before existing children |
| `children` | Nested structure entries |
| `icon` | Inject SVG icon: `{ group, variant }` |
| `metaText` | Inject text from a modifier value |
| `condition` | Only inject if the named modifier has a truthy value |
| `conditionAny` | Only inject if any of the named modifiers has a value |
| `transform` | Transform metaText: `'duration'`, `'uppercase'`, `'capitalize'` |
| `textPrefix` / `textSuffix` | Static text around metaText |
| `label` | Emits `<span data-meta-label>` child for styled labels |
| `labelHidden` | Makes label visually hidden (sr-only) but accessible |
| `metaType` | Emits `data-meta-type`: `'status'`, `'category'`, `'quantity'`, `'temporal'`, `'tag'`, `'id'` |
| `metaRank` | Emits `data-meta-rank`: `'primary'`, `'secondary'` |
| `sentimentMap` | Maps modifier values to `data-meta-sentiment`: `'positive'`, `'negative'`, `'caution'`, `'neutral'` |
| `attrs` | Extra attributes, can reference modifiers |

### `contentWrapper`

Wraps content children (non-structural) in a container:

```typescript
contentWrapper: { tag: 'div', ref: 'content' },
// Wraps children in <div data-name="content" class="rf-recipe__content">
```

### `autoLabel`

Maps child tag names or property values to `data-name` attributes:

```typescript
autoLabel: { summary: 'header' },
// <summary> -> <summary data-name="header" class="rf-details__header">
```

### `contextModifiers`

Adds BEM modifiers when the rune is nested inside a parent rune:

```typescript
contextModifiers: { 'Hero': 'in-hero', 'Feature': 'in-feature' },
// When inside a Hero: class adds "rf-hint--in-hero"
```

### `styles`

Maps modifier values to CSS custom properties as inline styles:

```typescript
// Simple form: modifier value -> CSS custom property
styles: { columns: '--bento-columns' },
// -> style="--bento-columns: 4"

// Template form: modifier value interpolated into template
styles: {
  columns: { prop: 'grid-template-columns', template: 'repeat({}, 1fr)' }
},
// -> style="grid-template-columns: repeat(3, 1fr)"
```

### `staticModifiers`

Modifier classes always applied, regardless of content:

```typescript
staticModifiers: ['featured'],
// -> class always includes "rf-tier--featured"
```

### `postTransform`

Programmatic escape hatch for logic that can't be expressed declaratively:

```typescript
postTransform: (node, { modifiers, parentType }) => {
  // Modify the node after all declarative processing
  return node;
},
```

Use sparingly. If you need this, consider whether the logic belongs in the rune schema instead.

### `editHints`

Declares how named sections (`data-name` elements) should behave when clicked in the block editor. Keys are `data-name` values; values are edit modes.

```typescript
Recipe: {
  block: 'recipe',
  modifiers: { ... },
  structure: { ... },
  editHints: {
    headline: 'inline',
    eyebrow: 'inline',
    blurb: 'inline',
    ingredient: 'inline',
    step: 'inline',
    media: 'image',
  },
},
```

**Edit modes:**

| Mode | Behavior | Typical usage |
|------|----------|---------------|
| `inline` | Contenteditable with formatting toolbar (bold, italic, code, link) | headline, eyebrow, blurb, list items |
| `link` | URL + display text fields | action buttons, CTA links |
| `code` | Code editor popover | terminal commands, code snippets |
| `image` | File picker + alt text editor | media, cover images |
| `icon` | Icon picker gallery with search | feature icons, decorative icons |
| `none` | Not directly editable — click falls through to rune edit panel | decorative elements |

Only elements with a `data-name` attribute can be editable. The `data-name` comes from either `refs` in `createComponentRenderable` or `autoLabel` in the engine config.

The editor resolves hints at click time from the engine config — no extra attributes appear in the rendered HTML.

**Structure tab:** When a rune has a [declarative content model](/extend/rune-authoring/content-models), the editor's structure tab shows the model's fields as a tree. Filled fields show content previews, empty optional fields show an add button, and empty required fields are highlighted. The content model's `template` and `description` field values are surfaced in this UI.

### Universal theming dimensions

These fields enable generic cross-rune styling via data attributes. See [Universal Theming Dimensions](/extend/theme-authoring/dimensions) for the complete system and CSS patterns.

```typescript
Recipe: {
  block: 'recipe',
  defaultDensity: 'full',       // → data-density="full"
  sections: { meta: 'header', title: 'title', content: 'body' },  // → data-section
  mediaSlots: { media: 'cover' },  // → data-media
  checklist: true,              // → data-checked on list items
  sequence: 'numbered',         // → data-sequence on <ol> elements
}
```

| Field | Attribute emitted | Description |
|-------|-------------------|-------------|
| `defaultDensity` | `data-density` | Detail level: `'full'`, `'compact'`, `'minimal'` |
| `sections` | `data-section` | Maps ref names to section roles: `'header'`, `'title'`, `'description'`, `'body'`, `'footer'`, `'media'`, `'preamble'` |
| `mediaSlots` | `data-media` | Maps ref names to media types: `'portrait'`, `'cover'`, `'thumbnail'`, `'hero'`, `'icon'` |
| `checklist` | `data-checked` | Detects `[x]`/`[ ]`/`[>]`/`[-]` markers on `<li>` elements |
| `sequence` | `data-sequence` | Ordered list style: `'numbered'`, `'connected'`, `'plain'` |
| `sequenceDirection` | `data-sequence-direction` | Direction from modifier: `{ fromModifier: 'direction', default: 'vertical' }` |

Metadata dimensions (`metaType`, `metaRank`, `sentimentMap`) are declared on individual `StructureEntry` children, not on the `RuneConfig`. See the [StructureEntry options](#structure) table above.

---

## Putting it together

Here's the full flow for a Hint with `type="warning"`:

```
Rune transform():
  <section data-rune="hint" data-field="content-section">
    <meta data-field="hint-type" content="warning">
    <div data-name="body">
      <p>Be careful about this.</p>
    </div>
  </section>

Engine identity transform:
```

{% steps %}

### Look up config

Reads `data-rune="hint"` and finds the Hint config (matched by `typeName`).

### Read modifier

Reads `<meta data-field="hint-type" content="warning">`.

### Add modifier class

Adds class: `rf-hint rf-hint--warning`.

### Set data attribute

Adds `data-hint-type="warning"` to the root element.

### Inject structure

Injects `structure.header` before children:

```html
<div data-name="header" class="rf-hint__header">
  <span data-name="icon" class="rf-hint__icon" />
  <span data-name="title" class="rf-hint__title">warning</span>
</div>
```

### Add BEM element class

Adds `rf-hint__body` to the body ref.

### Clean up

Removes the consumed meta tag from the output.

{% /steps %}

```

Final output:
  <section data-rune="hint" data-field="content-section" class="rf-hint rf-hint--warning" data-hint-type="warning">
    <div data-name="header" class="rf-hint__header">
      <span data-name="icon" class="rf-hint__icon"></span>
      <span data-name="title" class="rf-hint__title">warning</span>
    </div>
    <div data-name="body" class="rf-hint__body">
      <p>Be careful about this.</p>
    </div>
  </section>
```
