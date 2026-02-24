---
title: Rune Authoring Overview
description: Mental model, transformation pipeline, and anatomy of a rune
---

# Rune Authoring Overview

Runes are Markdoc tags that **reinterpret** standard Markdown. A heading inside `{% nav %}` becomes a group title; a list inside `{% recipe %}` becomes ingredients. Same primitives, different meaning based on context.

This guide covers how to write runes — the schema code that interprets content, the type definitions that enforce contracts, and the engine configuration that produces styled output.

## The pipeline

Rune code lives in stage 2 of the transformation pipeline:

```
Markdown source
    |
    v
1. Parse        Markdoc.parse() -> AST nodes
    |
    v
2. Transform    Rune schemas interpret children,     <-- your code here
    |           emit typeof markers and meta tags
    v
3. Serialize    Tag instances -> plain {$$mdtype:'Tag'} objects
    |           (required for server/client boundary)
    v
4. Identity     Engine adds BEM classes, injects
   Transform    structural elements, consumes meta
    |
    v
5. Render       Svelte dispatches on typeof ->
                registered component or HTML element
```

Your rune defines how Markdown content is **interpreted** (stage 2). The engine config defines how the result is **presented** (stage 4). This separation keeps rune output framework-agnostic.

## Anatomy of a rune

Every rune has five parts. Here's the Hint rune as an example:

### 1. Schema file

`packages/runes/src/tags/hint.ts`

```typescript
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const hintType = ['caution', 'check', 'note', 'warning'] as const;

class HintModel extends Model {
  @attribute({ type: String, matches: hintType.slice(), errorLevel: 'critical' })
  type: typeof hintType[number] = 'note';

  transform() {
    const hintType = new Tag('meta', { content: this.type });
    const children = this.transformChildren().wrap('div');

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
  }
}

export const hint = createSchema(HintModel);
```

Key points:
- Extends `Model` base class
- `@attribute` declares the `type` attribute with enum validation
- `transform()` wraps children in a `div`, creates a meta tag for the hint type, and calls `createComponentRenderable` to produce output
- `properties` carry metadata (consumed by engine for modifiers)
- `refs` label structural elements (engine adds BEM element classes)

### 2. Type definition

`packages/types/src/schema/hint.ts`

```typescript
import { ComponentType } from "../interfaces.js";

export class Hint {
  hintType: 'check' | 'note' | 'warning' | 'caution' = 'note';
}

export interface HintComponent extends ComponentType<Hint> {
  tag: 'section',
  properties: {
    hintType: 'meta',
  },
  refs: {
    body: 'div',
  }
}
```

The class defines modifier fields with defaults. The interface maps those fields to output element types — `hintType: 'meta'` means the value is carried via a meta tag, `body: 'div'` means the body ref is a div element.

### 3. Engine config entry

`packages/theme-base/src/config.ts`

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
},
```

This is purely declarative. The engine reads the `hintType` meta tag, adds a modifier class like `rf-hint--warning`, injects a header with an icon and title, and applies BEM element classes to all named children.

### 4. Registry entries

`packages/runes/src/registry.ts` — type registration:

```typescript
Hint: useSchema(Hint).defineType<HintComponent>('Hint'),
```

`packages/runes/src/rune.ts` usage in the rune catalog:

```typescript
hint: defineRune({
  name: 'hint',
  schema: hint,
  description: 'Callouts and admonitions for supplementary information',
  reinterprets: { paragraph: 'callout body' },
  type: schema.Hint,
}),
```

### 5. Test file

`packages/runes/test/hint.test.ts`

Tests verify that the schema transform produces the expected output structure. See the [Patterns](/docs/patterns) page for testing guidelines.

## Rune checklist

Every new rune needs:

| File | Purpose |
|------|---------|
| `packages/runes/src/tags/{name}.ts` | Schema — Model class with `transform()` |
| `packages/types/src/schema/{name}.ts` | Type definition — class + component interface |
| `packages/theme-base/src/config.ts` | Engine config — BEM block, modifiers, structure |
| `packages/runes/src/registry.ts` | Type registration — `useSchema().defineType()` |
| `packages/runes/src/rune.ts` | Rune catalog — `defineRune()` with description |
| `packages/runes/test/{name}.test.ts` | Tests — output structure verification |
| `site/content/docs/runes/{name}.md` | User docs — usage guide with preview examples |

If the rune needs CSS (most do), also add:
- `packages/lumina/styles/runes/{block}.css` — Lumina theme styles

If the rune needs JavaScript interactivity, choose one of:
- `packages/behaviors/src/{name}.ts` — Progressive enhancement (preferred)
- `packages/lumina/sveltekit/components/{Name}.svelte` — Full Svelte component
