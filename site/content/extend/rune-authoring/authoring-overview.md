---
title: Rune Authoring Overview
description: Mental model, transformation pipeline, and anatomy of a rune
documents:
  - packages/runes/src/config.ts
  - packages/runes/src/index.ts
  - packages/runes/src/lib/preprocess.ts
  - packages/transform/src/engine.ts
---

# Rune Authoring Overview

Runes are Markdoc tags that **reinterpret** standard Markdown. A heading inside `{% nav %}` becomes a group title; a list inside `{% recipe %}` becomes ingredients. Same primitives, different meaning based on context.

This guide covers how to write runes — the schema code that interprets content, the engine configuration that produces styled output, and the catalog entry that exposes the rune to authors.

{% hint type="note" %}
New runes almost always belong in a **plugin** (`plugins/{your-package}/`), not in the core rune library. The core library is for universal, domain-neutral runes that every project might use. Domain-specific runes (marketing, storytelling, API docs, etc.) belong in plugins. See the [community package rune checklist](#community-package-rune) below, and [Building a Custom Plugin](/extend/plugin-authoring/authoring) for the full guide.

A rune built only out of existing runes needs no code at all: it is a Markdown file, in a plugin or in your own project. See [Composed Runes](/extend/rune-authoring/composed-runes).
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
const { Tag } = Markdoc;
import {
  createContentModelSchema,
  bodyOnly,
  createComponentRenderable,
  renderNodes,
} from '../lib/index.js';

const hintType = ['caution', 'check', 'note', 'warning'] as const;

export const hint = createContentModelSchema({
  attributes: {
    type: { type: String, matches: hintType.slice(), errorLevel: 'critical', description: 'Visual style: caution, check, note, or warning' },
  },
  contentModel: bodyOnly(),
  transform(resolved, attrs, config) {
    const hintType = new Tag('meta', { content: attrs.type ?? 'note' });
    const body = renderNodes(resolved.body, config);
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
      children: [bodyDiv.next()],
    });
  },
});
```

Key points:
- `createContentModelSchema` defines the rune with declarative attributes and content model
- `contentModel` declares how children are resolved — `bodyOnly()` is the preset for the common case of one greedy `body` field
- `transform()` receives resolved content, renders it (`renderNodes` transforms a resolved field and returns a cursor over the result), wraps it, creates a meta tag, and calls `createComponentRenderable`
- A meta in `properties` is not also listed in `children`: its value travels in the `data-rune-fields` bag. When every property is a plain attribute read, `fieldMetas(attrs, config, { status: 'draft' })` builds the whole map from one declaration, each key reading the attribute of the same name
- The rune's identity (`rune: 'hint'`) is passed inline — no separate type-definition file is needed
- `properties` carry metadata (consumed by engine for modifiers; each becomes a `data-field` on the wrapped tag)
- `refs` label structural elements (engine adds BEM element classes via `data-name`)

Hint's transform only names its one field. A rune whose every output slot comes from exactly one resolved field, wrapped but not restructured, can say so as data instead — `emits: { rune: 'hint', tag: 'section', property: 'contentSection', properties: { hintType: { from: ['attrs.type'], default: 'note' } }, slots: { body: 'region' } }` — and write no `transform`. See [Declaring slots instead of a transform](/extend/rune-authoring/output-contract#declaring-slots-instead-of-a-transform) for the declaration and the family test that decides which form a rune takes.

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

## Resolving before the transform — `preprocess`

Most runes only interpret their children during the transform. A few have to act **before** it, because what they produce is input the transform should see as if the author had typed it: `include` pastes a partial's syntax tree, `snippet` turns a file into a code fence, `data` turns a CSV into a table or into its body repeated once per row. Those declare a `preprocess` hook on the schema, beside `transform`:

```typescript
import Markdoc from '@markdoc/markdoc';
import { createContentModelSchema } from '@refrakt-md/runes';
const { Ast } = Markdoc;

export const stamp = createContentModelSchema({
  attributes: { text: { type: String, required: true } },
  contentModel: { type: 'sequence', fields: [] },
  preprocess(node, page, ctx) {
    // Return a replacement, an array to splice in its place, or nothing.
    return new Ast.Node('paragraph', {}, [
      new Ast.Node('inline', {}, [new Ast.Node('text', { content: String(node.attributes.text) })]),
    ]);
  },
  transform() {
    throw new Error('{% stamp %} reached the transform unresolved.');
  },
});
```

The hook receives **its own tag node**, not the page:

- Return a `Node` to replace the tag, a `Node[]` to splice several nodes in its place (an empty array removes it), or nothing to leave it alone.
- `ctx` is the page's `PreprocessContext` — `ctx.sandbox` for project files, `ctx.variables` for the page-variable surface, `ctx.warn` / `ctx.error` for diagnostics — plus `ctx.ancestors`, the enclosing nodes from the `document` down to the direct parent. `data` reads it to refuse a per-row body inside `{% chart %}`.
- Attribute values arrive unevaluated. A `$variable` is a `Variable` node to resolve against `ctx.variables`, and a function call has not run yet.

One walk visits the page and calls each rune's hook where it meets the tag. **The walk then continues into whatever the hook returned**, so a hook never resolves the runes its own output contains. The order between preprocessing runes is tree order, not a list anyone maintains. A `{% snippet path=$row.path %}` inside a `{% data %}` body is reached after `data` has bound the row. A `{% data %}` inside an included file is reached after `include` has pasted it. A rune added later composes the same way, with no registration step.

A rune with a `preprocess` hook normally never reaches its own `transform`. Keep the schema anyway: `refrakt inspect`, the contracts generator, attribute validation and the rune reference all read it. Make the `transform` throw an error that names the likely cause. For the core preprocessing runes that cause is a `{% partial %}`, which Markdoc expands during the transform, after preprocess has run.

### Rune hook or plugin hook?

A plugin can also declare `pipeline.preprocess`, which receives the **whole page AST** and runs once per page. Reach for the rune-level hook when the job is "find my tag and replace it" — that is every preprocessing rune in core, and the narrower hook gets tree-order composition for free. Keep the plugin-level hook for work that is genuinely cross-cutting: rewriting nodes that are not your own tag, or a decision that needs to see the page as a whole. Plugin hooks run after the core walk, in plugin order.

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

If the rune names something other pages should find (an entity, or an edge between two), declare it with a [`registers` block](/extend/rune-authoring/registration) on the schema rather than writing a `register` pipeline hook.

Plugin runes use `Plugin.runes` (a `Record<string, PluginRune>` from `@refrakt-md/types`) rather than `defineRune`, but the per-rune fields (`description`, `aliases`, `snippet`, `category`, `seoType`, …) are the same. Engine config (BEM blocks, structure, icons) lives in `Plugin.theme.runes` instead of `packages/runes/src/config.ts`. See [Building a Custom Plugin](/extend/plugin-authoring/authoring) for the full authoring guide.

A `PluginRune` carries exactly one emit path: a `transform`, or a `template` — a composed rune's definition ([Composed Runes](/extend/rune-authoring/composed-runes) is the full guide), whose YAML frontmatter declares its input and whose Markdoc body places the content model's fields into slots of existing runes (`{% slot name="body" /%}`). A composed rune has no BEM block and ships no CSS: its engine config is generated from the definition (`defineComposedRune`), so it has no `Plugin.theme.runes` entry, and an entry carrying both `transform` and `template` is rejected by name. A composed rune has no `layout` either, so a declared `metaFields` + `blocks` entry is placed by its template: `{% metablock name="metadata" /%}` marks where the block goes, and the engine renders it there from the rune's own values, exactly as `layout` projection would. The tag is template vocabulary only — on a page it is an undefined tag — and a name that matches no declared block, or a block placed twice, is rejected when the definition is built.
