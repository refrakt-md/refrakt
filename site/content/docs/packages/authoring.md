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
import { GameItemModel } from './game-item.js';

export const myPackage: RunePackage = {
  name: 'dnd-5e',
  version: '1.0.0',
  runes: {
    'game-item': {
      transform: GameItemModel.schema,   // Markdoc Schema
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
      prompt: 'Use for magical items. The rarity attribute sets item tier.',
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
| `prompt` | No | Appended to AI prompt descriptions for `refrakt write` |
| `schema` | Recommended | Attribute definitions for tooling and validation |

## Writing the Rune Schema

Rune schemas are standard Markdoc `Schema` objects built using the same Model API documented in the [Authoring Guide](/docs/authoring/authoring-overview). Use `@refrakt-md/runes` model utilities:

```typescript
// src/game-item.ts
import {
  createComponentRenderable,
  BaseModel,
  attribute,
  group,
} from '@refrakt-md/runes';

export class GameItemModel extends BaseModel {
  @attribute() rarity?: string;

  transform() {
    const { headings, items, quotes } = this.processChildren();
    return createComponentRenderable('GameItem', {
      tag: this.tag,
      properties: {
        rarity: this.rarity,
      },
      children: [...headings, ...items, ...quotes],
    });
  }
}

export default GameItemModel.schema;
```

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

The theme config uses the same `RuneConfig` format documented in the [Engine Config Pattern](/docs/themes/configuration).

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
