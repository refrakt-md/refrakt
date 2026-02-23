---
title: Configuration Reference
description: Complete reference for ThemeConfig, RuneConfig, and StructureEntry — the declarative API for theme development
---

# Configuration Reference

Theme configuration is declarative. Instead of writing transform logic, you describe what each rune should produce — which BEM block it maps to, what modifiers it reads, what structural elements to inject — and the identity transform engine handles the rest.

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
| `runes` | Maps rune `typeof` values to their transform configuration |

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
| `source` | `'meta'` reads from child `<meta property="name" content="value">` tags. `'attribute'` reads from the element's own attributes |
| `default` | Fallback value when no meta tag or attribute is found |

For each modifier with a resolved value, the engine:

1. Adds a BEM modifier class: `.rf-hint--note`
2. Sets a data attribute: `data-hint-type="note"` (camelCase → kebab-case)
3. Removes the consumed meta tag from the output

**Example:** The Hint rune with `hintType: 'warning'`:

```html
<!-- Before transform -->
<div typeof="Hint">
  <meta property="hintType" content="warning">
  <p>Be careful!</p>
</div>

<!-- After transform -->
<div class="rf-hint rf-hint--warning" typeof="Hint" data-hint-type="warning" data-rune="hint">
  <!-- meta tag consumed, structural elements injected -->
  <p>Be careful!</p>
</div>
```

### contextModifiers

Adds a BEM modifier class when the rune is nested inside a specific parent rune. The key is the parent's `typeof` value; the value is the modifier suffix.

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

### structure

Injects new HTML elements into the rune's output — headers, icons, badges, labels. This is the most powerful declarative feature.

Each entry is keyed by name and defines a `StructureEntry`:

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

This injects a header div before the rune's content, containing an icon span and a title span. See [StructureEntry](#structureentry) below for the full API.

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
| `parentType` | `string \| undefined` | The parent rune's `typeof` value, if nested |

{% hint type="warning" %}
Use declarative config first. `postTransform` is for edge cases that truly can't be expressed with modifiers, structure, or styles. It makes the config harder to analyze statically — the [inspect and audit tools](/docs/themes/tooling) can't introspect programmatic transforms.
{% /hint %}

## StructureEntry

Defines an element to inject into the rune's output via the `structure` config.

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

  // Attributes
  attrs?: Record<string, string | { fromModifier: string }>;
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

## mergeThemeConfig

Combines the base config with theme-specific overrides.

```typescript
import { baseConfig, mergeThemeConfig } from '@refrakt-md/theme-base';

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
| `runes` | Per-rune shallow merge (override fields replace base fields for that rune) |

{% hint type="note" %}
Per-rune merge is **shallow** — if you override `modifiers` for a rune, you replace the entire `modifiers` object, not individual entries within it. This is intentional: it keeps the merge behavior predictable and avoids deep-merge surprises.
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

Multiple modifiers, conditional structure, content wrapper, text transforms.

```typescript
Recipe: {
  block: 'recipe',
  contentWrapper: { tag: 'div', ref: 'content' },
  modifiers: {
    prepTime: { source: 'meta' },
    cookTime: { source: 'meta' },
    servings: { source: 'meta' },
    difficulty: { source: 'meta', default: 'medium' },
  },
  structure: {
    meta: {
      tag: 'div', before: true,
      conditionAny: ['prepTime', 'cookTime', 'servings', 'difficulty'],
      children: [
        { tag: 'span', ref: 'meta-item', metaText: 'prepTime',
          transform: 'duration', textPrefix: 'Prep: ', condition: 'prepTime' },
        { tag: 'span', ref: 'meta-item', metaText: 'cookTime',
          transform: 'duration', textPrefix: 'Cook: ', condition: 'cookTime' },
        { tag: 'span', ref: 'meta-item', metaText: 'servings',
          textPrefix: 'Serves: ', condition: 'servings' },
        { tag: 'span', ref: 'badge', metaText: 'difficulty',
          condition: 'difficulty' },
      ],
    },
  },
}
```
