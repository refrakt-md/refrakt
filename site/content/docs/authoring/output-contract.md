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

return createComponentRenderable(schema.Hint, {
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

**`type`** — The schema type from the registry (e.g., `schema.Hint`). Sets the `typeof` attribute on the root tag, which the engine uses to look up the rune config.

**`result`** object:

| Field | Type | Description |
|-------|------|-------------|
| `tag` | `string` | HTML tag name for the root element (`'section'`, `'article'`, `'div'`, etc.) |
| `children` | `RenderableTreeNodes` | Content children — the actual output |
| `properties` | `Record<string, Tag \| RenderableNodeCursor>` | Metadata consumed by the engine |
| `refs` | `Record<string, Tag \| RenderableNodeCursor>` | Named structural elements |
| `property` | `string` (optional) | Semantic role marker (e.g., `'contentSection'`) |
| `id` | `string` (optional) | HTML id attribute |
| `class` | `string` (optional) | CSS class to add |

### What it does

1. Sets `property="key"` on each **properties** entry — marks tags as metadata carriers
2. Sets `data-name="key"` on each **refs** entry — labels structural elements for BEM
3. Creates the root tag with `typeof="ComponentName"` — engine lookup key

## Properties vs Refs

These serve fundamentally different purposes:

| Aspect | Properties | Refs |
|--------|-----------|------|
| **Attribute set** | `property="key"` | `data-name="key"` |
| **Purpose** | Carry metadata for modifiers | Label structural elements |
| **Engine reads** | Value from meta tag content | Element for BEM class |
| **After transform** | Meta tag removed from output | Element stays, gets BEM class |
| **Example** | `hintType` meta with content "warning" | `body` div wrapping content |

**Properties** flow: rune emits `<meta property="hintType" content="warning">` -> engine reads it -> adds `rf-hint--warning` class + `data-hint-type="warning"` attribute -> removes the meta tag.

**Refs** flow: rune emits `<div data-name="body">` -> engine reads it -> adds `rf-hint__body` class -> element stays in output.

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
const hintType = new Tag('meta', { content: this.type });

return createComponentRenderable(schema.Hint, {
  properties: {
    hintType,    // gets property="hintType" added
  },
  children: [hintType, children.next()],
  //         ^^^^^^^^ must be in children array too
});
```

The engine:
1. Finds `<meta property="hintType" content="warning">`
2. Reads the value `"warning"`
3. Adds modifier class `rf-hint--warning`
4. Stores `data-hint-type="warning"` on root
5. Removes the meta tag from the output

Meta tags must appear in both `properties` and `children`. The `properties` entry adds the `property` attribute; the `children` array ensures the tag is in the tree for the engine to find.

## The typeof marker

The root tag gets `typeof="ComponentName"`:

```html
<section typeof="Hint" property="contentSection">
```

The identity transform engine uses this to look up the rune config by typeof name, applying BEM classes, modifiers, and structure. The Renderer then outputs the transformed tree as generic HTML.

## Type definitions

Type definitions in `packages/types/src/schema/` enforce the contract between the rune schema and the engine config.

### Schema class

Defines the modifier fields and their defaults:

```typescript
export class Hint {
  hintType: 'check' | 'note' | 'warning' | 'caution' = 'note';
}
```

### Component interface

Maps fields to output element types:

```typescript
export interface HintComponent extends ComponentType<Hint> {
  tag: 'section',
  properties: {
    hintType: 'meta',     // carried via meta tag
  },
  refs: {
    body: 'div',          // structural div element
  }
}
```

The `properties` map tells you how each field is communicated:
- `'meta'` — value in a `<meta>` tag (most common for modifiers)
- `'span'`, `'h1'`, etc. — value in a visible element

The `refs` map tells you what elements the rune produces and their tag names.

---

## Engine config

The engine config in `packages/theme-base/src/config.ts` declaratively describes how to enhance each rune's output. Here's the full interface:

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
// Input:  <meta property="hintType" content="warning">
// Output: class="rf-hint rf-hint--warning" data-hint-type="warning"
```

Sources:
- `'meta'` — reads from a `<meta property="name">` child tag (most common)
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

**Structure tab:** When a rune has a [declarative content model](/docs/authoring/content-models), the editor's structure tab shows the model's fields as a tree. Filled fields show content previews, empty optional fields show an add button, and empty required fields are highlighted. The content model's `template` and `description` field values are surfaced in this UI.

### Universal theming dimensions

These fields enable generic cross-rune styling via data attributes. See [Universal Theming Dimensions](/docs/themes/dimensions) for the complete system and CSS patterns.

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
  <section typeof="Hint" property="contentSection">
    <meta property="hintType" content="warning">
    <div data-name="body">
      <p>Be careful about this.</p>
    </div>
  </section>

Engine identity transform:
```

{% steps %}

### Look up config

Reads `typeof="Hint"` and finds the Hint config.

### Read modifier

Reads `<meta property="hintType" content="warning">`.

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
  <section class="rf-hint rf-hint--warning" data-hint-type="warning">
    <div data-name="header" class="rf-hint__header">
      <span data-name="icon" class="rf-hint__icon"></span>
      <span data-name="title" class="rf-hint__title">warning</span>
    </div>
    <div data-name="body" class="rf-hint__body">
      <p>Be careful about this.</p>
    </div>
  </section>
```
