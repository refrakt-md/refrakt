---
title: Theme Config API
description: Complete reference for ThemeConfig, RuneConfig, and StructureEntry — the declarative API for theme development
---

# Theme Config API

Theme configuration is declarative. Instead of writing transform logic, you describe what each rune should produce — which BEM block it maps to, what modifiers it reads, how it projects metadata (`metaFields`/`blocks`) and assembles its structure (`layout`) — and the identity transform engine handles the rest.

## ThemeConfig

The top-level configuration object passed to `createTransform()`.

```typescript
interface ThemeConfig {
  prefix: string;       // BEM prefix, e.g., 'rf' → .rf-hint
  tokenPrefix: string;  // CSS variable prefix, e.g., '--rf' → --rf-color-text
  icons: Record<string, Record<string, string>>;  // SVG icons by group and variant
  runes: Record<string, RuneConfig>;               // Per-rune configuration
}
```

| Field | Description |
|-------|-------------|
| `prefix` | Prepended to all BEM class names. `'rf'` produces `.rf-hint`, `.rf-hint--note`, `.rf-hint__icon` |
| `tokenPrefix` | Convention for CSS custom property naming. Used by documentation and tooling, not the engine itself |
| `icons` | SVG strings organized by group and variant. Structural groups (e.g., `hint`) are used by `StructureEntry.icon` config to inject icons into rune headers. The `global` group is used by the `{% icon %}` content rune to resolve author-chosen icons by name |
| `runes` | Maps each rune's `typeName` (PascalCase, e.g. `Hint`) to its transform configuration. The engine matches the kebab-cased key against the `data-rune` attribute on the tag |
| `tints` / `backgrounds` / `frames` | Named preset registries — colour tints, `bg` layers, and `frame` media-surface chrome (SPEC-086). All share the same `extends` resolution. See [Surface chrome](/extend/theme-authoring/surface-chrome) for `frames`. |

## RuneConfig

Each entry in `runes` describes how a single rune type is transformed. All fields except `block` are optional.

### block

The BEM block name, without the prefix. This is the only required field.

```typescript
Grid: { block: 'grid' }
// → class="rf-grid"
```

The engine always produces the block class (`.rf-grid`) and sets `data-rune="grid"` on the root element.

### modifiers

Reads values from meta tags or HTML attributes and produces BEM modifier classes plus data attributes.

```typescript
modifiers: {
  hintType: { source: 'meta', default: 'note' },
  align: { source: 'meta', default: 'center' },
}
```

| Property | Description |
|----------|-------------|
| `source` | `'meta'` reads the field value from the rune's `data-rune-fields` bag (a JSON object on the root). `'attribute'` reads from the element's own attributes |
| `default` | Fallback value when the field is absent |

For each modifier with a resolved value, the engine:

1. Adds a BEM modifier class: `.rf-hint--note`
2. Sets a data attribute: `data-hint-type="note"` (camelCase → kebab-case)
3. Strips the `data-rune-fields` bag from the output (it is an internal,
   pre-engine data channel — never a theming hook; themes target the BEM classes
   and the `data-*` attributes above)

**Example:** The Hint rune with `hintType: 'warning'`:

```html
<!-- Before transform — field data rides the data-rune-fields bag (camelCase keys) -->
<div data-rune="hint" data-rune-fields='{"hintType":"warning"}'>
  <p>Be careful!</p>
</div>

<!-- After transform -->
<div class="rf-hint rf-hint--warning" data-rune="hint" data-hint-type="warning">
  <!-- bag consumed, structural elements injected -->
  <p>Be careful!</p>
</div>
```

### contextModifiers

Adds a BEM modifier class when the rune is nested inside a specific parent rune. The key is the parent's `typeName` (matched against `data-rune` after kebab-casing); the value is the modifier suffix.

```typescript
// Hint config
contextModifiers: { 'Hero': 'in-hero', 'Feature': 'in-feature' }

// When Hint is inside a Hero:
// class="rf-hint rf-hint--note rf-hint--in-hero"
```

This enables context-aware styling — a Hint inside a Hero can be more compact, a CTA inside Pricing can be left-aligned.

### staticModifiers

BEM modifier classes that are always applied, regardless of meta tag values. Useful for rune variants that share a block but have fixed differences.

```typescript
// FeaturedTier shares the 'tier' block but always gets --featured
FeaturedTier: { block: 'tier', staticModifiers: ['featured'] }
// → class="rf-tier rf-tier--featured"
```

### metaFields

A pure-data manifest of the rune's meta-bearing fields — domain semantics only (type, label, sentiment, optional rich rendering). Blocks reference these fields by name; the engine resolves them against modifier values and renders them. This is the SPEC-080 replacement for hand-built metadata in `structure`.

```typescript
metaFields: {
  difficulty: {
    metaType: 'category',
    label: 'Difficulty',
    condition: 'difficulty',
    sentimentMap: { easy: 'positive', medium: 'neutral', hard: 'caution' },
  },
}
```

| Field | Description |
|-------|-------------|
| `metaType` | Visual shape — `'status'`/`'category'`/`'tag'` render as chips; `'id'`/`'quantity'`/`'temporal'`/`'code'` render bare. Also drives typography (monospace for `id`/`code`, tabular-nums for `quantity`/`temporal`) |
| `label` | Human-readable label — the `<dt>` in a def-list, the in-chip label in a bar |
| `sentimentMap` | Maps the resolved value to a sentiment colour (`positive`/`negative`/`caution`/`neutral`) |
| `condition` / `renderWhenEmpty` | Render only when the named modifier is truthy (or merely present) |
| `href` / `rating` / `icon` | Rich renderings — link, rating widget, leading icon |
| `splitOn` / `transform` / `tag` | Delimited collection → one chip per item; value transform (`duration`/`uppercase`/`capitalize`); element tag override |

See [Blocks & layout](/extend/theme-authoring/blocks-and-layout) for the full field reference.

### blocks

Named metadata blocks projected from `metaFields`. Each block is a flat list of fields rendered by a layout primitive — `bar` (horizontal flex row) or `definition-list` (`<dl>` of labelled pairs). Render shape (chip vs bare) is intrinsic to each field's `metaType`, not the block's layout.

```typescript
blocks: {
  metadata: { fields: ['prepTime', 'cookTime', 'servings', 'difficulty'], layout: 'definition-list' },
  eyebrow: { fields: ['plotType', { field: 'structure', align: 'end' }], layout: 'bar' },
}
```

A field may be given as `{ field, align }` to push it to the row end (`bar` only). A block becomes an addressable element (`.rf-{block}__{name}`) placed via `layout`.

### layout

The recursive skeleton (SPEC-081). The transform emits **flat `data-name` slots**; `layout` declares how they are grouped and ordered. Keyed by a container's `data-name`, or the reserved `'root'` for the rune's top-level children.

```typescript
layout: {
  root: ['media', 'content'],
  content: { tag: 'div', children: ['eyebrow', 'body', 'footer'] },
  preamble: { tag: 'header', children: ['eyebrow', 'headline', 'blurb'] },
}
```

Each value is a `LayoutEntry`:

- a bare `string[]` **orders** an existing container's children;
- `{ tag, children, attrs? }` **creates** a wrapper element (`<tag data-name=key>`) and fills it from the flat transform slots.

Projected `blocks` and transform slots a list doesn't name are appended in transform order — rune content is never dropped. See [Blocks & layout](/extend/theme-authoring/blocks-and-layout) for name resolution and worked examples.

### variants

Modifier-keyed config deltas (SPEC-091): a rune's *structure* can vary by a modifier without branching in the transform. The outer key is a declared modifier (the axis), the inner key one of its values, and the payload a partial `RuneConfig` merged over base — in declaration order — before assembly.

```typescript
variants: {
  'media-position': {
    cover: {
      layout: {
        root: ['cover-band', 'body'],
        'cover-band': { tag: 'div', children: ['media', 'preamble'] },
      },
    },
  },
}
```

Selection rides the modifier system — the modifier's own `default` picks the active value, so there is no separate condition language and no `defaultVariants`. A delta may override assembly/decoration fields (`layout`, `structure`, `styles`, `contentWrapper`, `staticModifiers`, `autoLabel`, `editHints`) but **not** identity fields (`block`, `modifiers`, `sections`); every axis must be a declared modifier. Both invariants are checked at config load. Requires the rune to be on the flat-slot + base-`layout` model. See the variants section in [Blocks & layout](/extend/theme-authoring/blocks-and-layout).

### structure (legacy)

{% hint type="warning" %}
`structure` is a **legacy** field, superseded by `metaFields` + `blocks` + `layout` above. No first-party rune declares it — the engine keeps a back-compat branch only for injecting icons/badges into runes that don't project metadata. New runes should use the block-and-layout model. The [StructureEntry](#structureentry) API below documents the legacy injection shape.
{% /hint %}

It injects new HTML elements into a rune's output — headers, icons, badges — keyed by name, each defining a `StructureEntry`:

```typescript
structure: {
  header: {
    tag: 'div',
    before: true,
    children: [
      { tag: 'span', ref: 'icon', icon: { group: 'hint', variant: 'hintType' } },
      { tag: 'span', ref: 'title', metaText: 'hintType' },
    ],
  },
}
```

### contentWrapper

Wraps all content children (non-structural) in a container element.

```typescript
// Recipe config
contentWrapper: { tag: 'div', ref: 'content' }

// Output: recipe's structural header comes first, then content is wrapped
// <div class="rf-recipe">
//   <div class="rf-recipe__meta">...</div>       ← structure (before)
//   <div class="rf-recipe__content">              ← contentWrapper
//     <ul>ingredients...</ul>
//     <ol>steps...</ol>
//   </div>
// </div>
```

The `ref` value becomes the element's `data-name`, which the engine converts to a BEM element class (`rf-recipe__content`).

### autoLabel

Maps child element tag names (or `property` attribute values) to `data-name` attributes. The engine then adds BEM element classes for these.

```typescript
// AccordionItem config
autoLabel: { name: 'header' }

// A child with tag name "name" gets data-name="header"
// → class="rf-accordion-item__header"
```

```typescript
// Details config
autoLabel: { summary: 'summary' }

// The <summary> child gets data-name="summary"
// → class="rf-details__summary"
```

### styles

Maps modifier values to CSS custom properties or inline style declarations. Useful when CSS needs dynamic values that can't be expressed as BEM classes.

**Simple form** — sets a CSS custom property:

```typescript
styles: { columns: '--sb-columns' }
// With columns=3: style="--sb-columns: 3"
```

**Template form** — interpolates the value into a CSS property:

```typescript
styles: {
  columns: {
    prop: 'grid-template-columns',
    template: 'repeat({}, 1fr)'
  }
}
// With columns=3: style="grid-template-columns: repeat(3, 1fr)"
```

Multiple style entries produce semicolon-separated values. Existing inline styles on the tag are preserved.

### defaultDensity

Controls how much detail a rune shows by default. The engine emits `data-density` on the root element.

```typescript
Accordion: { block: 'accordion', defaultDensity: 'full' }
Details: { block: 'details', defaultDensity: 'compact' }
Breadcrumb: { block: 'breadcrumb', defaultDensity: 'minimal' }
```

| Value | Behavior |
|-------|----------|
| `'full'` | All sections visible, generous spacing (default) |
| `'compact'` | Descriptions truncated, secondary metadata hidden |
| `'minimal'` | Title and primary metadata only |

Resolution order: author attribute > rendering context > config default > `'full'`. The engine automatically applies `compact` inside Grid/Bento/Gallery and `minimal` inside backlog/decision-log contexts.

See [Dimensions](/extend/theme-authoring/dimensions#density) for the full CSS patterns and density interactions.

### sections

Maps structural ref names (`data-name` values) to standard section roles. The engine emits `data-section` on matching elements, enabling generic layout styling.

```typescript
Budget: {
  block: 'budget',
  sections: { header: 'header', title: 'title', footer: 'footer' },
}
```

Available roles: `'header'`, `'preamble'`, `'title'`, `'description'`, `'body'`, `'footer'`, `'media'`.

See [Dimensions](/extend/theme-authoring/dimensions#sections) for role descriptions and CSS.

### mediaSlots

Maps ref names to media treatment types. The engine emits `data-media` on matching elements.

```typescript
Figure: { block: 'figure', mediaSlots: { media: 'cover' } }
```

Available types: `'portrait'`, `'cover'`, `'thumbnail'`, `'hero'`, `'icon'`.

See [Dimensions](/extend/theme-authoring/dimensions#media-slots) for treatment descriptions and CSS.

### checklist

When `true`, the engine scans `<li>` text for checkbox markers (`[x]`, `[ ]`, `[>]`, `[-]`), strips the marker, and emits `data-checked` on the element.

```typescript
Work: { block: 'work', checklist: true }
```

See [Dimensions](/extend/theme-authoring/dimensions#checklist) for marker values and CSS.

### sequence

Ordered list style. The engine emits `data-sequence` on `<ol>` elements within the rune.

```typescript
Steps: { block: 'steps', sequence: 'connected' }
```

| Value | Visual treatment |
|-------|-----------------|
| `'numbered'` | Counter circles |
| `'connected'` | Vertical line with dots |
| `'plain'` | No visual indicators |

Use `sequenceDirection` to control orientation:

```typescript
Timeline: {
  block: 'timeline',
  sequence: 'connected',
  sequenceDirection: { fromModifier: 'direction', default: 'vertical' },
}
```

See [Dimensions](/extend/theme-authoring/dimensions#sequence) for CSS patterns.

### parent

Groups a rune under a parent rune in the block editor palette. Advisory only — a rune may declare a typical `parent` yet still be valid standalone. Does not affect rendering.

```typescript
AccordionItem: { block: 'accordion-item', parent: 'Accordion' }
```

### frameTarget

SPEC-086 — which surface `frame` chrome decorates: `'media'` (the `[data-section="media"]` zone) or `'self'` (the rune root, for runes whose body *is* the media, like `figure`/`showcase`). Defaults to `'media'` when the rune declares a media section; `frame` on a rune with no resolvable target emits a build warning. See [Surface chrome](/extend/theme-authoring/surface-chrome).

```typescript
Figure: { block: 'figure', frameTarget: 'self' }
```

### requiresParent

A hard nesting requirement (SPEC-084): the rune is only meaningful inside the named parent (PascalCase `typeName`). Unlike `parent` (an advisory editor grouping), this is **validated** — the engine warns when the rune appears without that parent as its nearest ancestor rune.

```typescript
BreadcrumbItem: { block: 'breadcrumb-item', parent: 'Breadcrumb', requiresParent: 'Breadcrumb' }
```

### defaultWidth

Sets the default page grid width for the rune. The engine emits `data-width` on the root element.

```typescript
Hero: { block: 'hero', defaultWidth: 'full' }
```

| Value | Behavior |
|-------|----------|
| `'content'` | Standard content width (default) |
| `'wide'` | Wider than content, narrower than full |
| `'full'` | Edge-to-edge |

### childDensity

Imposes a density level on all nested runes. Useful for runes that display children in a compact context.

```typescript
Grid: { block: 'grid', childDensity: 'compact' }
Backlog: { block: 'backlog', childDensity: 'minimal' }
```

### editHints

Declares how named sections are edited in the block editor. Keys are `data-name` values; values are edit mode hints.

```typescript
Hint: {
  block: 'hint',
  editHints: { icon: 'none', title: 'inline' },
}
```

| Hint | Behavior |
|------|----------|
| `'inline'` | Inline text editing |
| `'link'` | Link editing |
| `'code'` | Code editing |
| `'image'` | Image picker |
| `'icon'` | Icon picker |
| `'none'` | Not editable (generated content) |

### rootAttributes

Extra attributes set on the root element unconditionally.

```typescript
Sandbox: { block: 'sandbox', rootAttributes: { 'data-interactive': 'true' } }
```

### projection

Declarative tree reshaping by `data-name`, applied *after* assembly. Per SPEC-081 it is the escape hatch for bending a tree a theme does **not** own (a third-party rune's output); a rune declaring its *own* structure should use `layout` instead.

```typescript
Comparison: {
  block: 'comparison',
  projection: {
    hide: ['meta'],   // drop elements by data-name (the only retained op)
  },
}
```

- **`hide`** — drop elements by `data-name`. **Retained.**
- **`group`** (`{ tag, members, slot? }`) and **`relocate`** (`{ into, position? }`) — **deprecated**: a `layout` tag-entry *is* a group, and you place a slot wherever you name it in the `layout` tree. The contract generator emits a deprecation warning for both.

### Advanced modifier options

Modifiers support additional fields beyond `source` and `default`:

| Property | Description |
|----------|-------------|
| `noBemClass` | When `true`, skips BEM modifier class generation — only the data attribute is emitted |
| `valueMap` | Maps modifier values before emitting (e.g., `{ 'GET': 'read', 'POST': 'write' }`) |
| `mapTarget` | Custom data attribute name for the mapped value (instead of the default) |

```typescript
modifiers: {
  method: {
    source: 'meta',
    default: 'GET',
    valueMap: { GET: 'read', POST: 'write', PUT: 'write', DELETE: 'danger' },
    mapTarget: 'intent',
  },
}
// Emits: data-method="GET" data-intent="read"
```

### postTransform

A programmatic escape hatch that runs after all declarative processing. Receives the fully transformed node and resolved modifier values.

```typescript
postTransform(node, ctx) {
  return {
    ...node,
    attributes: {
      ...node.attributes,
      'data-custom': `cols-${ctx.modifiers.columns}`,
    },
  };
}
```

The `ctx` object contains:

| Property | Type | Description |
|----------|------|-------------|
| `modifiers` | `Record<string, string>` | All resolved modifier values |
| `parentType` | `string \| undefined` | The parent rune's `data-rune` value (kebab-case), if nested |
| `fields` | `Record<string, unknown>` | The parsed SPEC-082 `data-rune-fields` bag — for non-modifier field values (the engine strips the bag attribute before `postTransform` runs) |

{% hint type="warning" %}
Use declarative config first. `postTransform` is for edge cases that truly can't be expressed with modifiers, structure, or styles. It makes the config harder to analyze statically — the [inspect and audit tools](/docs/cli/inspect) can't introspect programmatic transforms.
{% /hint %}

## StructureEntry

Defines an element injected into a rune's output via the **legacy** `structure` config (see [structure (legacy)](#structure-legacy)). New runes project metadata with `metaFields` + `blocks` instead; this API is documented for the back-compat injection path.

```typescript
interface StructureEntry {
  tag: string;                // HTML tag name ('div', 'span', 'a', etc.)
  ref?: string;               // Sets data-name (overrides the structure key)
  before?: boolean;           // Insert before content children (default: after)
  children?: (string | StructureEntry)[];  // Nested entries or text

  // Content
  metaText?: string;          // Inject resolved modifier value as text
  icon?: { group: string; variant: string };  // Icon from config.icons

  // Conditional
  condition?: string;         // Only render if named modifier is truthy
  conditionAny?: string[];    // Only render if any named modifier is truthy

  // Text transforms
  transform?: 'duration' | 'uppercase' | 'capitalize';
  textPrefix?: string;        // Prepend to metaText value
  textSuffix?: string;        // Append to metaText value

  // Labels
  label?: string;             // Emits <span data-meta-label>Label</span> child
  labelHidden?: boolean;      // Label visually hidden but accessible (sr-only)

  // Metadata dimensions (see Dimensions page)
  metaType?: 'status' | 'category' | 'quantity' | 'temporal' | 'tag' | 'id';
  sentimentMap?: Record<string, 'positive' | 'negative' | 'caution' | 'neutral'>;

  // Repetition — generate copies of a template element
  repeat?: {
    count: string;            // Modifier name providing the total count
    max?: number;             // Cap to prevent runaway generation (default 10)
    filled?: string;          // Modifier name for how many are "filled"
    element: StructureEntry;  // Template for each generated element
    filledElement?: StructureEntry;  // Optional template for filled elements
  };

  // Attributes — literal strings, or references to a modifier / page data
  attrs?: Record<string, string | { fromModifier: string } | { fromPageData: string }>;
}
```

### Structural injection example

The Api rune demonstrates most structure features:

```typescript
Api: {
  block: 'api',
  contentWrapper: { tag: 'div', ref: 'body' },
  modifiers: {
    method: { source: 'meta', default: 'GET' },
    path: { source: 'meta' },
    auth: { source: 'meta' },
  },
  structure: {
    header: {
      tag: 'div', before: true,
      children: [
        { tag: 'span', ref: 'method', metaText: 'method' },
        { tag: 'code', ref: 'path', metaText: 'path' },
        { tag: 'span', ref: 'auth', metaText: 'auth', condition: 'auth' },
      ],
    },
  },
}
```

This produces:

```html
<div class="rf-api rf-api--GET" data-method="GET" data-rune="api">
  <div data-name="header" class="rf-api__header">
    <span data-name="method" class="rf-api__method">GET</span>
    <code data-name="path" class="rf-api__path">/api/users</code>
    <!-- auth span only present if auth modifier has a value -->
  </div>
  <div data-name="body" class="rf-api__body">
    <!-- content children -->
  </div>
</div>
```

### Conditional elements

Use `condition` to only inject an element when a modifier has a truthy value:

```typescript
{ tag: 'span', ref: 'auth', metaText: 'auth', condition: 'auth' }
// Only renders if the 'auth' modifier is present
```

Use `conditionAny` to render when at least one of several modifiers is present:

```typescript
{
  tag: 'div', ref: 'meta', before: true,
  conditionAny: ['prepTime', 'cookTime', 'servings', 'difficulty'],
  children: [...]
}
// Only renders if any of those modifiers has a value
```

### Dynamic attributes

The `attrs` field sets attributes on the injected element. Values can be literal strings or references to modifier values:

```typescript
{
  tag: 'a', ref: 'register', condition: 'url',
  attrs: { href: { fromModifier: 'url' } },
  children: ['Register'],
}
// → <a href="https://example.com" class="rf-event__register">Register</a>
```

### Repeated elements

The `repeat` field generates multiple copies of a template `element` — useful for star ratings, progress dots, and similar patterns. `count` and `filled` are **modifier names**.

```typescript
{
  tag: 'div', ref: 'rating',
  repeat: {
    count: 'maxRating',   // modifier holding the total
    filled: 'rating',     // modifier holding how many are filled
    element: { tag: 'span', ref: 'star' },
  },
}
// With maxRating=5, rating=3:
// Produces 5 <span> elements, first 3 with data-filled="true"
```

Each generated element gets `data-filled="true"` or `data-filled="false"` based on whether its index is less than the filled count.

### Text transforms

Built-in transforms applied to `metaText` values:

| Transform | Input | Output |
|-----------|-------|--------|
| `duration` | `PT1H30M` | `1h 30m` |
| `uppercase` | `get` | `GET` |
| `capitalize` | `warning` | `Warning` |

```typescript
{ tag: 'span', ref: 'meta-item', metaText: 'prepTime',
  transform: 'duration', textPrefix: 'Prep: ' }
// With prepTime="PT45M": "Prep: 45m"
```

### Labels

The `label` field emits a separate `<span data-meta-label>` child element before the value text. This enables independent styling — themes can make labels thin and muted, or hide them entirely.

```typescript
{ tag: 'span', ref: 'meta-item', metaText: 'prepTime',
  label: 'Prep:', metaType: 'temporal' }
```

Set `labelHidden: true` to make the label visually hidden but accessible to screen readers (sr-only pattern). Use this for values that are self-explanatory, like ID badges.

### Metadata dimensions

Two fields enable generic cross-rune badge styling. When present, the engine emits `data-meta-*` attributes on the generated element. Themes style these attributes generically instead of writing per-rune badge CSS.

| Field | Attribute emitted | Description |
|-------|-------------------|-------------|
| `metaType` | `data-meta-type` | Visual shape — `'status'`, `'category'`, `'quantity'`, `'temporal'`, `'tag'`, `'id'` |
| `sentimentMap` | `data-meta-sentiment` | Maps modifier values to colors — `'positive'`, `'negative'`, `'caution'`, `'neutral'` |

```typescript
{ tag: 'span', ref: 'badge', metaText: 'difficulty',
  metaType: 'category',
  sentimentMap: { easy: 'positive', medium: 'neutral', hard: 'caution' } }
```

When `difficulty="easy"`, the engine emits:

```html
<span data-meta-type="category"
      data-meta-sentiment="positive" data-difficulty="easy">
  easy
</span>
```

See [Universal Theming Dimensions](/extend/theme-authoring/dimensions) for the full CSS system.

## mergeThemeConfig

Combines the base config with theme-specific overrides.

```typescript
import { baseConfig } from '@refrakt-md/runes';
import { mergeThemeConfig } from '@refrakt-md/transform';

const myConfig = mergeThemeConfig(baseConfig, {
  // Override the BEM prefix (optional)
  prefix: 'my',

  // Add icon SVGs (merged by group)
  icons: {
    hint: {
      note: '<svg>...</svg>',
      warning: '<svg>...</svg>',
    },
  },

  // Override specific rune configs (shallow merge per rune)
  runes: {
    Hint: {
      // This replaces only the 'modifiers' field of the Hint config
      // All other fields (block, contextModifiers, structure) are preserved
      modifiers: {
        hintType: { source: 'meta', default: 'info' }, // different default
      },
    },
  },
});
```

Merge behavior:

| Field | Strategy |
|-------|----------|
| `prefix` | Override replaces base |
| `tokenPrefix` | Override replaces base |
| `icons` | Shallow merge by group (override groups replace base groups) |
| `runes` | Per-rune merge: most fields replace, but `metaFields`, `blocks`, `layout`, and `variants` merge **by inner key** |

{% hint type="note" %}
Per-rune merge is **shallow for most fields** — overriding `modifiers` replaces the entire `modifiers` object, not individual entries. The block-and-layout fields are the exception: `metaFields`, `blocks`, `layout`, and `variants` merge **by inner key**, so a theme can re-point a single field, swap one block's primitive, reshape one container, or add one variant without restating the whole map. When overriding a wrapper-creating `layout` entry, restate its `tag` (the entry is replaced as a whole).
{% /hint %}

## Real-world examples

### Simple rune: Grid

Minimal config — just a block name. CSS handles everything.

```typescript
Grid: { block: 'grid' }
```

### Modifier rune: Hint

Reads a modifier, adds context-awareness, injects a header with icon and title.

```typescript
Hint: {
  block: 'hint',
  modifiers: { hintType: { source: 'meta', default: 'note' } },
  contextModifiers: { 'Hero': 'in-hero', 'Feature': 'in-feature' },
  structure: {
    header: {
      tag: 'div', before: true,
      children: [
        { tag: 'span', ref: 'icon', icon: { group: 'hint', variant: 'hintType' } },
        { tag: 'span', ref: 'title', metaText: 'hintType' },
      ],
    },
  },
}
```

### Complex rune: Recipe

The current block-and-layout model: a `metaFields` manifest, a projected `blocks` metadata def-list, and a `layout` skeleton that assembles flat slots into a media + content split. (This is the actual `@refrakt-md/learning` config, trimmed.)

```typescript
Recipe: {
  block: 'recipe',
  defaultDensity: 'full',
  sequence: 'numbered',
  sections: { preamble: 'preamble', headline: 'title', blurb: 'description', media: 'media' },
  mediaSlots: { media: 'cover' },
  modifiers: {
    'media-position': { source: 'meta', default: 'top', noBemClass: true },
    prepTime: { source: 'meta', noBemClass: true },
    cookTime: { source: 'meta', noBemClass: true },
    servings: { source: 'meta', noBemClass: true },
    difficulty: { source: 'meta', default: 'medium' },
  },
  metaFields: {
    prepTime: { metaType: 'temporal', label: 'Prep', condition: 'prepTime', transform: 'duration' },
    cookTime: { metaType: 'temporal', label: 'Cook', condition: 'cookTime', transform: 'duration' },
    servings: { metaType: 'quantity', label: 'Serves', condition: 'servings' },
    difficulty: {
      metaType: 'category', label: 'Difficulty', condition: 'difficulty',
      sentimentMap: { easy: 'positive', medium: 'neutral', hard: 'caution' },
    },
  },
  blocks: {
    metadata: { fields: ['prepTime', 'cookTime', 'servings', 'difficulty'], layout: 'definition-list' },
  },
  layout: {
    root: ['media', 'content'],
    content: { tag: 'div', children: ['preamble', 'metadata', 'ingredients', 'steps', 'tips'] },
    preamble: { tag: 'header', children: ['eyebrow', 'headline', 'blurb'] },
  },
}
```

`metaFields` declares the facts once; the `metadata` block projects them as a labelled def-list; `layout` nests that block in the content column under the header, beside the media. The `metaType`/`sentimentMap` fields drive generic badge styling — no rune-specific CSS. See [Blocks & layout](/extend/theme-authoring/blocks-and-layout) and [Dimensions](/extend/theme-authoring/dimensions) for the full system.
