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

## Adding CLI Commands and MCP Tools

A package can contribute CLI commands and MCP tools by exporting a `cli-plugin` entry point alongside its main `RunePackage` export. The refrakt CLI dispatches `refrakt <namespace> <command>` to the matching plugin, and the MCP server (`@refrakt-md/mcp`) registers each command as a tool under `<namespace>.<name>`.

### Minimal `cli-plugin` export

```ts
// src/cli-plugin.ts
import type { CliPlugin } from '@refrakt-md/types';

const plugin: CliPlugin = {
  namespace: 'mypkg',
  commands: [
    {
      name: 'hello',
      description: 'Say hi',
      handler: (args) => {
        console.log('hello', args);
      },
    },
  ],
};

export default plugin;
```

Add the export to the package's `package.json`:

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./cli-plugin": "./dist/cli-plugin.js"
  }
}
```

That's the minimum for legacy plugins. The `handler` receives the argv tail (everything after `refrakt mypkg hello`) and is responsible for parsing and printing.

### Making your commands MCP-friendly

To get clean structured I/O when the command runs through `@refrakt-md/mcp`, declare three additional fields on each `CliPluginCommand`:

```ts
interface CliPluginCommand {
  name: string;
  description: string;
  handler: (args: string[]) => void | Promise<void>;
  inputSchema?: JSONSchema7;            // NEW — used by MCP for input validation
  outputSchema?: JSONSchema7;           // NEW — optional, for structured output declaration
  mcpHandler?: (input: unknown) => Promise<unknown>;  // NEW — bypasses argv parsing
}
```

#### `inputSchema`

A JSON Schema describing the structured input shape. Tools without one fall back to `{ type: 'object', additionalProperties: true }` and surface only the command's `description`. Schemas with `enum` values, `required` fields, and per-field descriptions give MCP clients autocomplete and inline validation.

```ts
{
  name: 'create',
  description: 'Scaffold a new entity',
  handler: createArgvHandler,
  inputSchema: {
    type: 'object',
    required: ['type', 'title'],
    properties: {
      type: { type: 'string', enum: ['work', 'spec', 'bug'] },
      title: { type: 'string' },
      id: { type: 'string', description: 'Override the auto-assigned ID.' },
    },
    additionalProperties: false,
  },
}
```

#### `mcpHandler`

A function that accepts the structured input directly and returns the result. When MCP invokes a tool with an `mcpHandler`, it bypasses argv serialization entirely — the cleanest path. Without an `mcpHandler`, MCP falls back to **argv-shimming**: it serializes the input object into argv strings, calls the legacy `handler`, captures stdout, and tries to parse it as JSON. This works but loses structured I/O.

```ts
{
  name: 'create',
  // ... same as above
  mcpHandler: async (input) => {
    const opts = input as { type: string; title: string; id?: string };
    return runCreate(opts);  // returns { id, file, type } directly
  },
}
```

The argv `handler` and `mcpHandler` should call the same underlying logic — typically a `runX(opts)` function that takes a typed options object — so behavior is consistent across both surfaces.

#### `outputSchema`

Optional. JSON Schema describing the tool's structured output. Most plugins omit this and let MCP clients infer the shape from the handler's return value, but it's useful for clients that want to validate or unpack results programmatically.

### Linting your plugin export

`refrakt package validate` includes a `cli-plugin` lint pass that catches structural issues before publish:

- **Errors**: missing `namespace`, missing `commands` array, command without `name`/`description`/`handler`, invalid `inputSchema` (must be a JSON Schema object).
- **Warnings**: missing `inputSchema` (recommended for MCP exposure), `inputSchema` without `mcpHandler` (MCP will fall back to argv-shimming), namespace clashes with another installed plugin.

Run it from your package directory:

```bash
npx refrakt package validate
```

### Excluding commands from MCP

Some commands don't fit MCP's request/response model — long-running servers, multi-file generators, interactive UIs. The MCP server has a built-in exclusion list for known cases (`plan.serve`, `plan.build`). External plugins can effectively opt out of MCP exposure by omitting `inputSchema` and `mcpHandler` — those commands appear with the generic schema and run via argv-shim, which works for some but is fragile for long-running ones.

For commands that should never appear as MCP tools, future versions may add an explicit `mcpExposed: false` flag. For now, file an issue if your plugin needs the exclusion machinery.
