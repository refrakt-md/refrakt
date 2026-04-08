---
title: Rune Authoring Overview
description: Mental model, transformation pipeline, and anatomy of a rune
---

# Rune Authoring Overview

Runes are Markdoc tags that **reinterpret** standard Markdown. A heading inside `{% nav %}` becomes a group title; a list inside `{% recipe %}` becomes ingredients. Same primitives, different meaning based on context.

This guide covers how to write runes — the schema code that interprets content, the type definitions that enforce contracts, and the engine configuration that produces styled output.

{% hint type="note" %}
New runes almost always belong in a **community package** (`runes/{your-package}/`), not in the core rune library. The core library is for universal, domain-neutral runes that every project might use. Domain-specific runes (marketing, storytelling, API docs, etc.) belong in packages. See the [community package rune checklist](#community-package-rune) below, and [Building a Custom Package](/docs/packages/authoring) for the full guide.
{% /hint %}

## The pipeline

Rune code lives in stage 2 of the transformation pipeline:

{% steps %}

### Parse

`Markdoc.parse()` turns Markdown source into AST nodes.

### Transform

Rune schemas interpret children, emit `typeof` markers and meta tags.

### Serialize

Tag instances become plain `{$$mdtype:'Tag'}` objects (required for the server/client boundary).

### Identity Transform

The engine adds BEM classes, injects structural elements, and consumes meta tags.

### Render

The Renderer outputs the identity-transformed tree as HTML elements.

{% /steps %}

Your rune defines how Markdown content is **interpreted** (stage 2). The engine config defines how the result is **presented** (stage 4). This separation keeps rune output framework-agnostic.

## Anatomy of a rune

Every core rune has five parts. Here's the Hint rune as an example (core rune — lives in `packages/runes/src/tags/`):

### 1. Schema file

`packages/runes/src/tags/hint.ts`

```typescript
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import type { RenderableTreeNode } from '@markdoc/markdoc';
import { schema } from '../registry.js';
import { createContentModelSchema, createComponentRenderable } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const hintType = ['caution', 'check', 'note', 'warning'] as const;

export const hint = createContentModelSchema({
  attributes: {
    type: { type: String, matches: hintType.slice(), errorLevel: 'critical' },
  },
  contentModel: {
    type: 'sequence',
    fields: [
      { name: 'body', match: 'any', optional: true, greedy: true },
    ],
  },
  transform(resolved, attrs, config) {
    const hintType = new Tag('meta', { content: attrs.type ?? 'note' });
    const body = new RenderableNodeCursor(
      Markdoc.transform(resolved.body ?? [], config) as RenderableTreeNode[],
    ).wrap('div');

    return createComponentRenderable(schema.Hint, {
      tag: 'section',
      property: 'contentSection',
      properties: {
        hintType,
      },
      refs: {
        body: body.tag('div'),
      },
      children: [hintType, body.next()],
    });
  },
});
```

Key points:
- `createContentModelSchema` defines the rune with declarative attributes and content model
- `contentModel` declares how children are resolved (here, a simple greedy body)
- `transform()` receives resolved content, wraps it, creates a meta tag, and calls `createComponentRenderable`
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

`packages/runes/src/config.ts`

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

Tests verify that the schema transform produces the expected output structure. See the [Patterns](/docs/authoring/patterns) page for testing guidelines.

## Rune checklist

### Core rune

For runes that belong in the core library (`packages/runes/src/tags/` — universal, domain-neutral runes only):

| File | Purpose |
|------|---------|
| `packages/runes/src/tags/{name}.ts` | Schema — `createContentModelSchema()` with `transform()` |
| `packages/types/src/schema/{name}.ts` | Type definition — class + component interface |
| `packages/runes/src/config.ts` | Engine config — BEM block, modifiers, structure |
| `packages/runes/src/registry.ts` | Type registration — `useSchema().defineType()` |
| `packages/runes/src/rune.ts` | Rune catalog — `defineRune()` with description |
| `packages/runes/test/{name}.test.ts` | Tests — output structure verification |
| `site/content/runes/{name}.md` | User docs — usage guide with preview examples |

If the rune needs CSS (most do), also add:
- `packages/lumina/styles/runes/{block}.css` — Lumina theme styles

If the rune needs JavaScript interactivity:
- `packages/behaviors/src/{name}.ts` — Progressive enhancement via `@refrakt-md/behaviors`

### Community package rune

For domain-specific runes (marketing, storytelling, API docs, games, etc.) that live in a community package under `runes/{package}/`:

| File | Purpose |
|------|---------|
| `runes/{package}/src/{name}.ts` | Schema — `createContentModelSchema()` with `transform()`, same API as core |
| `runes/{package}/src/index.ts` | Add the rune to the package's `RunePackage.runes` map |
| `runes/{package}/styles/{block}.css` | CSS for the identity transform output |
| `runes/{package}/test/{name}.test.ts` | Tests — output structure verification |
| `site/content/runes/{name}.md` | User docs — usage guide with preview examples |

Theme config (BEM blocks, structure, icons) lives in the `RunePackage.theme.runes` field rather than in a separate config file. See [Building a Custom Package](/docs/packages/authoring) for the full authoring guide.
