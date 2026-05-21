---
title: Rune Authoring Overview
description: Mental model, transformation pipeline, and anatomy of a rune
---

# Rune Authoring Overview

Runes are Markdoc tags that **reinterpret** standard Markdown. A heading inside `{% nav %}` becomes a group title; a list inside `{% recipe %}` becomes ingredients. Same primitives, different meaning based on context.

This guide covers how to write runes — the schema code that interprets content, the engine configuration that produces styled output, and the catalog entry that exposes the rune to authors.

{% hint type="note" %}
New runes almost always belong in a **plugin** (`plugins/{your-package}/`), not in the core rune library. The core library is for universal, domain-neutral runes that every project might use. Domain-specific runes (marketing, storytelling, API docs, etc.) belong in plugins. See the [community package rune checklist](#community-package-rune) below, and [Building a Custom Plugin](/extend/plugin-authoring/authoring) for the full guide.
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

Every core rune has four parts. Here's the Hint rune as an example (core rune — lives in `packages/runes/src/tags/`):

### 1. Schema file

`packages/runes/src/tags/hint.ts`

```typescript
import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const hintType = ['caution', 'check', 'note', 'warning'] as const;

export const hint = createContentModelSchema({
  attributes: {
    type: { type: String, matches: hintType.slice(), errorLevel: 'critical', description: 'Visual style: caution, check, note, or warning' },
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
      Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
    );
    const bodyDiv = body.wrap('div');

    return createComponentRenderable({
      rune: 'hint',
      tag: 'section',
      property: 'contentSection',
      properties: {
        hintType,
      },
      refs: {
        body: bodyDiv.tag('div'),
      },
      children: [hintType, bodyDiv.next()],
    });
  },
});
```

Key points:
- `createContentModelSchema` defines the rune with declarative attributes and content model
- `contentModel` declares how children are resolved (here, a simple greedy body)
- `transform()` receives resolved content, wraps it, creates a meta tag, and calls `createComponentRenderable`
- The rune's identity (`rune: 'hint'`) is passed inline — no separate type-definition file is needed
- `properties` carry metadata (consumed by engine for modifiers; each becomes a `data-field` on the wrapped tag)
- `refs` label structural elements (engine adds BEM element classes via `data-name`)

### 2. Engine config entry

`packages/runes/src/config.ts`

```typescript
Hint: {
  block: 'hint',
  defaultDensity: 'compact',
  modifiers: { hintType: { source: 'meta', default: 'note' } },
  contextModifiers: { 'hero': 'in-hero', 'feature': 'in-feature' },
  sections: { header: 'header' },
  editHints: { icon: 'none', title: 'none' },
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

### 3. Catalog entry

`packages/runes/src/index.ts` registers the rune for authors via `defineRune`:

```typescript
hint: defineRune({
  name: 'hint',
  aliases: ['callout', 'alert'],
  schema: hint,
  description: 'Callout/admonition block with type variants (note, warning, caution, check)',
  typeName: 'Hint',
  category: 'Content',
  snippet: ['{% hint type="${1|note,warning,caution,check|}" %}', '$0', '{% /hint %}'],
}),
```

The `typeName` (e.g. `'Hint'`) connects the rune to its config key in `packages/runes/src/config.ts` and to the `rune` name emitted by `createComponentRenderable`. `snippet`, `category`, and `aliases` are consumed by tooling (VSCode extension, block editor, `refrakt reference`).

### 4. Test file

`packages/runes/test/hint.test.ts`

Tests verify that the schema transform produces the expected output structure. See the [Patterns](/extend/rune-authoring/patterns) page for testing guidelines.

## Rune checklist

### Core rune

For runes that belong in the core library (`packages/runes/src/tags/` — universal, domain-neutral runes only):

| File | Purpose |
|------|---------|
| `packages/runes/src/tags/{name}.ts` | Schema — `createContentModelSchema()` with `transform()` |
| `packages/runes/src/config.ts` | Engine config — BEM block, modifiers, structure |
| `packages/runes/src/index.ts` | Catalog entry — `defineRune()` with `typeName`, description, snippet |
| `packages/runes/test/{name}.test.ts` | Tests — output structure verification |
| `site/content/runes/{name}.md` | User docs — usage guide with preview examples |

If the rune needs CSS (most do), also add:
- `packages/lumina/styles/runes/{block}.css` — Lumina theme styles

If the rune needs JavaScript interactivity:
- `packages/behaviors/src/{name}.ts` — Progressive enhancement via `@refrakt-md/behaviors`

### Community package rune

For domain-specific runes (marketing, storytelling, API docs, games, etc.) that live in a plugin under `plugins/{package}/`:

| File | Purpose |
|------|---------|
| `plugins/{package}/src/tags/{name}.ts` | Schema — `createContentModelSchema()` with `transform()`, same API as core |
| `plugins/{package}/src/index.ts` | Add the rune to the plugin's `Plugin.runes` map (as a `PluginRune` — `{ transform, description, aliases, snippet, ... }`) |
| `plugins/{package}/src/config.ts` | Engine config entries, attached to `Plugin.theme.runes` |
| `plugins/{package}/styles/{block}.css` | CSS for the identity transform output |
| `plugins/{package}/test/{name}.test.ts` | Tests — output structure verification |
| `site/content/runes/{name}.md` | User docs — usage guide with preview examples |

Plugin runes use `Plugin.runes` (a `Record<string, PluginRune>` from `@refrakt-md/types`) rather than `defineRune`, but the per-rune fields (`description`, `aliases`, `snippet`, `category`, `seoType`, …) are the same. Engine config (BEM blocks, structure, icons) lives in `Plugin.theme.runes` instead of `packages/runes/src/config.ts`. See [Building a Custom Plugin](/extend/plugin-authoring/authoring) for the full authoring guide.
