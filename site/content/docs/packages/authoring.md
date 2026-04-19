---
title: Building a Custom Package
description: How to author a RunePackage with custom rune schemas, theme config, and pipeline hooks
---

# Building a Custom Package

A refrakt.md community package is an npm package that exports a `RunePackage` object. It can define new runes, extend existing core runes with additional attributes, contribute theme config for the identity transform, and optionally participate in the cross-page pipeline.

## Package Structure

```
my-rune-package/
├── package.json
├── src/
│   ├── index.ts        ← exports the RunePackage object
│   ├── game-item.ts    ← rune schema (one file per rune)
│   └── game-spell.ts
└── styles/
    ├── game-item.css
    └── game-spell.css
```

## The RunePackage Interface

```typescript
import type { RunePackage } from '@refrakt-md/types';

export const myPackage: RunePackage = {
  name: 'my-package',           // short ID for namespacing
  displayName: 'My Package',
  version: '1.0.0',
  runes: { /* ... */ },         // rune definitions
  extends: { /* ... */ },       // optional: extend core runes
  theme: { /* ... */ },         // optional: identity transform config + icons
  behaviors: { /* ... */ },     // optional: client-side behavior functions
  pipeline: { /* ... */ },      // optional: cross-page hooks
};
```

## Defining Runes

Each key in `runes` is the Markdoc tag name. The value is a `RunePackageEntry`:

```typescript
import type { RunePackage } from '@refrakt-md/types';
import { gameItem } from './game-item.js';

export const myPackage: RunePackage = {
  name: 'dnd-5e',
  version: '1.0.0',
  runes: {
    'game-item': {
      transform: gameItem,   // Markdoc Schema
      description: 'A magical item with rarity and properties',
      aliases: ['item', 'magic-item'],
      seoType: 'Product',
      reinterprets: {
        'heading': 'item name',
        'list': 'item properties',
        'blockquote': 'lore text',
      },
      fixture: `{% game-item rarity="rare" %}
## Cloak of Elvenkind

- Weight: 1 lb
- Requires attunement: yes

> Woven from shadowy threads, this cloak renders the wearer nearly invisible.
{% /game-item %}`,
      authoringHints: 'Used for magical items — the rarity attribute sets the item tier (common through legendary).',
      schema: {
        rarity: {
          type: 'string',
          matches: ['common', 'uncommon', 'rare', 'very-rare', 'legendary'],
          default: 'common',
        },
      },
    },
  },
};
```

### RunePackageEntry Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `transform` | Yes | Markdoc Schema — the rune's parse and transform logic |
| `description` | Recommended | Human-readable description shown in the rune catalog |
| `aliases` | No | Alternative tag names that resolve to this rune |
| `seoType` | No | Schema.org type for automatic JSON-LD generation |
| `reinterprets` | No | Documents how Markdown primitives are reinterpreted |
| `fixture` | Recommended | Example Markdoc string for `refrakt inspect` |
| `authoringHints` | No | Short note shown under "Authoring notes" in `refrakt reference` and included in `refrakt write` prompts |
| `schema` | Recommended | Attribute definitions for tooling and validation |

## Writing the Rune Schema

Rune schemas are standard Markdoc `Schema` objects built using `createContentModelSchema` from `@refrakt-md/runes`. See the [Authoring Guide](/docs/authoring/authoring-overview) and [Content Models](/docs/authoring/content-models) for full documentation.

```typescript
// src/game-item.ts
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import type { RenderableTreeNode } from '@markdoc/markdoc';
import {
  createContentModelSchema,
  createComponentRenderable,
  RenderableNodeCursor,
  asNodes,
} from '@refrakt-md/runes';

export const gameItem = createContentModelSchema({
  attributes: {
    rarity: { type: String, required: false, matches: ['common', 'uncommon', 'rare', 'very-rare', 'legendary'] },
  },
  contentModel: {
    type: 'sequence',
    fields: [
      { name: 'headline', match: 'heading', optional: true },
      { name: 'properties', match: 'list', optional: true },
      { name: 'lore', match: 'blockquote', optional: true, greedy: true },
    ],
  },
  transform(resolved, attrs, config) {
    const rarityMeta = new Tag('meta', { content: attrs.rarity ?? 'common' });
    const body = new RenderableNodeCursor(
      Markdoc.transform([
        ...asNodes(resolved.headline),
        ...asNodes(resolved.properties),
        ...asNodes(resolved.lore),
      ], config) as RenderableTreeNode[],
    ).wrap('div');

    return createComponentRenderable('GameItem' as any, {
      tag: 'div',
      properties: { rarity: rarityMeta },
      refs: { body: body.tag('div') },
      children: [rarityMeta, body.next()],
    });
  },
});
```

## Exporting typed component interfaces

Rune packages should export generic TypeScript interfaces for each rune that uses `createComponentRenderable`. These interfaces describe the component override contract — scalar property types and named slot names — parameterized over a framework-specific renderable type.

Create a `src/props.ts` file in your package:

```ts
import type { BaseComponentProps } from '@refrakt-md/types';

export interface GameItemProps<R = unknown> extends BaseComponentProps<R> {
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  body?: R;
}
```

Then export the type from your package's `index.ts`:

```ts
export type { GameItemProps } from './props.js';
```

Component authors consume the interface with their framework's renderable type:

```ts
import type { Snippet } from 'svelte';
import type { GameItemProps } from '@my-scope/game-runes';

let { rarity, body, tag }: GameItemProps<Snippet> = $props();
```

The `BaseComponentProps<R>` base type provides `children?: R` and `tag?: SerializedTag`. Use `PageSectionSlots<R>` for runes with `pageSectionProperties` (adds `eyebrow`, `headline`, `blurb`, `image` slots), and `SplitLayoutProperties` for runes with split layout support (adds `layout`, `ratio`, `valign`, `gap`, `collapse` properties).

## Using Content Pipeline Variables

The content pipeline injects several variables into every page's Markdoc transform config. Your rune schemas can access these via `config.variables` in their transform functions:

| Variable | Type | Description |
|----------|------|-------------|
| `$frontmatter` | `object` | Parsed YAML frontmatter |
| `$page` | `object` | Page metadata: `url`, `filePath`, `draft` |
| `$file.created` | `string` | File creation date (ISO 8601, from git history) |
| `$file.modified` | `string` | File modification date (ISO 8601, from git history) |

Timestamps follow a three-tier resolution order: explicit frontmatter values take highest priority, then git commit timestamps, then filesystem stat as a last resort. When no data is available the variable is `undefined`.

To consume file timestamps in a rune schema's transform function:

```typescript
transform(resolved, attrs, config) {
  const fileVars = config.variables?.file as
    { created?: string; modified?: string } | undefined;
  const created = attrs.created || fileVars?.created || '';
  // ... use in meta tags or rendered output
}
```

## Theme Config

The `theme` field contributes identity transform config and icons for your runes:

```typescript
theme: {
  runes: {
    'GameItem': {                  // keyed by typeof name (PascalCase)
      block: 'game-item',
      modifiers: {
        rarity: { source: 'meta', default: 'common' },
      },
      structure: {
        prepend: [
          {
            tag: 'header',
            'data-name': 'header',
            children: [
              { tag: 'span', 'data-name': 'name' },
              { tag: 'span', 'data-name': 'rarity', text: 'meta:rarity' },
            ],
          },
        ],
      },
    },
  },
  icons: {
    'game-item': {
      common: '<svg ...>',
      rare: '<svg ...>',
    },
  },
},
```

The theme config uses the same `RuneConfig` format documented in the [Theme Config API](/docs/themes/config-api).

## Referencing Your Package

### During Development (Local Files)

Use `runes.local` in `refrakt.config.json` to reference your package without publishing it:

```json
{
  "runes": {
    "local": {
      "game-item": "./packages/my-rune-package/src/game-item.ts",
      "game-spell": "./packages/my-rune-package/src/game-spell.ts"
    }
  }
}
```

### After Publishing

Install and register as a standard package:

```bash
npm install @my-org/dnd-5e
```

```json
{
  "packages": ["@my-org/dnd-5e"]
}
```

## Name Collision Resolution

If your package defines a rune with the same name as a core rune or another package, use `prefer` to specify which package wins:

```json
{
  "packages": ["@my-org/custom", "@refrakt-md/marketing"],
  "runes": {
    "prefer": {
      "hero": "@my-org/custom"
    }
  }
}
```

Use `"__core__"` to force the built-in core rune to win over any package:

```json
{
  "runes": {
    "prefer": {
      "hint": "__core__"
    }
  }
}
```

## Adding Cross-Page Pipeline Hooks

If your runes need to build site-wide indexes or cross-link content, add a `pipeline` field. See [Cross-Page Pipeline](pipeline) for details.
