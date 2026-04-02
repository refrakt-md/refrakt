---
title: Declarative Content Models
description: Define rune content structure with contentModel
---

# Content Models

The `createContentModelSchema` factory defines how a rune's children are parsed using a declarative `contentModel` object. The resolver engine matches children by type and position, then hands the resolved fields to your `transform` function.

## createContentModelSchema

```typescript
import { createContentModelSchema } from '@refrakt-md/runes';

export const myRune = createContentModelSchema({
  base: splitLayoutAttributes,   // optional — base attribute record to merge
  attributes: {                  // tag attributes
    type: { type: String, required: false, matches: ['a', 'b'], default: 'a' },
  },
  contentModel: {                // how children are resolved (see patterns below)
    type: 'sequence',
    fields: [
      { name: 'headline', match: 'heading' },
      { name: 'body', match: 'any', optional: true, greedy: true },
    ],
  },
  transform(resolved, attrs, config) {
    // resolved.headline — single AST Node
    // resolved.body — AST Node[] (greedy)
    // attrs.type — resolved attribute value
    // return createComponentRenderable(...)
  },
  deprecations: { oldName: { newName: 'type' } },  // optional
});
```

The `contentModel` can also be a function `() => ContentModel` — useful when the model references schemas that would cause circular imports.

---

## Structural patterns

### Sequence

Fields matched left-to-right against children by node type. The simplest pattern.

```typescript
contentModel: {
  type: 'sequence',
  fields: [
    { name: 'headline', match: 'heading' },
    { name: 'description', match: 'paragraph', optional: true },
    { name: 'body', match: 'any', optional: true, greedy: true },
  ],
},
```

The resolver walks children in order. Each field consumes the next matching node (or all consecutive matches if `greedy: true`). Non-matching nodes are skipped.

### Delimited

Children split into named zones by a delimiter node (typically `---`). Each zone is a sequence.

```typescript
contentModel: {
  type: 'delimited',
  delimiter: 'hr',
  zones: [
    {
      name: 'content',
      type: 'sequence',
      fields: [
        { name: 'eyebrow', match: 'paragraph', optional: true },
        { name: 'headline', match: 'heading', optional: false },
        { name: 'blurb', match: 'paragraph', optional: true },
        { name: 'actions', match: 'list|fence', optional: true, greedy: true },
      ],
    },
    {
      name: 'media',
      type: 'sequence',
      fields: [
        { name: 'media', match: 'any', optional: true, greedy: true },
      ],
    },
  ],
},
```

This is the hero rune's content model. Authors write content above `---` and media below it. If no `---` is present, all content goes to the first zone.

In the transform function, resolved fields are nested by zone name:

```typescript
transform(resolved, attrs, config) {
  const contentZone = (resolved.content ?? {}) as ResolvedContent;
  const mediaZone = (resolved.media ?? {}) as ResolvedContent;

  // contentZone.headline — single AST Node
  // contentZone.eyebrow — single AST Node or undefined
  // mediaZone.media — AST Node[] (greedy)
}
```

### Sections

Children split at heading boundaries. Each section can optionally be emitted as a child rune tag for downstream schema processing.

```typescript
contentModel: () => ({
  type: 'sections',
  sectionHeading: 'heading',          // auto-detect level from first heading
  emitTag: 'accordion-item',          // convert sections to child rune tags
  emitAttributes: { name: '$heading' }, // $heading = heading text
  fields: [                            // preamble fields (before first heading)
    { name: 'header', match: 'heading|paragraph', optional: true, greedy: true },
    { name: 'items', match: 'tag', optional: true, greedy: true },
  ],
  sectionModel: {                      // content model for each section's body
    type: 'sequence',
    fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
  },
}),
```

This is the accordion rune's content model. Each heading becomes an `accordion-item` tag with the heading text as its `name` attribute. The section body is resolved against `sectionModel`.

In the transform function:

```typescript
transform(resolved, attrs, config) {
  // resolved.header — preamble AST Nodes (before first heading)
  // resolved.items — explicit child tags from preamble
  // resolved.sections — AST tag nodes (emitted accordion-item tags)

  const allItems = [...asNodes(resolved.items), ...asNodes(resolved.sections)];
  // Transform and render...
}
```

Key options:
- `sectionHeading: 'heading'` — auto-detects level from first heading. Use `'heading:2'` to fix at h2.
- `emitTag` + `emitAttributes` — converts sections into child rune AST nodes. `$heading` references the heading text, `$fieldName` references heading-extracted fields.
- `headingExtract` — regex extraction from heading text (e.g., parsing `"9:00 AM - Colosseum"` into `{ time, location }`).
- `implicitSection` — when no headings found, wraps all content in a single emitted tag.

### Custom

Escape hatch for runes whose parsing is genuinely stateful and can't be expressed declaratively.

```typescript
contentModel: {
  type: 'custom',
  processChildren: (nodes, attributes) => {
    // Imperative AST manipulation
    return restructuredNodes;
  },
  description: 'Converts lists to form fields, blockquotes to selection groups',
},
```

Always provide a `description` — it's surfaced in editor UI and tooling. Use sparingly; most runes fit one of the three declarative patterns.

---

## Conditional models

Branch the content model based on attributes or content shape:

```typescript
contentModel: {
  when: [
    {
      condition: { hasChild: 'heading' },
      model: { type: 'sections', sectionHeading: 'heading', ... },
    },
  ],
  default: { type: 'sequence', fields: [...] },
},
```

Condition types:
- `{ attribute: 'name', in: ['a', 'b'] }` — attribute value is in the set
- `{ attribute: 'name', exists: true }` — attribute is present (truthy)
- `{ hasChild: 'heading' }` — a child matching the node type exists

---

## Field definitions

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Field name — becomes the key in resolved output |
| `match` | `string` | Node type to match (see patterns below) |
| `optional` | `boolean` | Whether the field can be absent. Default `false` |
| `greedy` | `boolean` | Consume all consecutive matching nodes. Default `false` |
| `template` | `string` | Markdoc snippet for editor insertion (e.g., `'- Ingredient'`) |
| `description` | `string` | Human-readable hint for editor UI |
| `itemModel` | `ItemModel` | Structured extraction from list items |
| `emitTag` | `string` | Convert matched list items to child rune tags |

### Match patterns

| Pattern | Matches |
|---------|---------|
| `paragraph` | Paragraph nodes |
| `heading` | Any heading |
| `heading:2` | Only h2 headings |
| `list` | Any list |
| `list:ordered` | Ordered lists (`1.`, `2.`) |
| `list:unordered` | Unordered lists (`-`, `*`) |
| `blockquote` | Blockquotes (`>`) |
| `fence` | Fenced code blocks |
| `image` | Images |
| `hr` | Horizontal rules (`---`) |
| `tag:NAME` | Markdoc tag with specific name |
| `any` | Any node type |

Use `|` to match alternatives: `'list|fence'` matches either lists or code blocks.

---

## Item models

When a list field contains structured items, declare an `itemModel` to extract inline fields from each list item:

```typescript
{
  name: 'tracks',
  match: 'list',
  itemModel: {
    fields: [
      { name: 'name', match: 'strong' },
      { name: 'src', match: 'link', extract: 'href', optional: true },
      { name: 'artist', match: 'em', optional: true },
      { name: 'duration', match: 'text', pattern: /\((\d+:\d+)\)/, optional: true },
      { name: 'description', match: 'paragraph', optional: true, greedy: true },
    ],
  },
},
```

Item field options:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Field name in extracted output |
| `match` | `string` | `strong`, `em`, `link`, `image`, `code`, `text`, `list`, `paragraph` |
| `extract` | `string` | Attribute to extract instead of text (e.g., `'href'` on a link) |
| `pattern` | `RegExp \| 'remainder'` | Regex capture or remaining text after other patterns match |
| `optional` | `boolean` | Whether the field can be absent |
| `greedy` | `boolean` | Consume all matching inline nodes |
| `itemModel` | `ItemModel` | Nested extraction for sub-lists |

---

## The transform function

The `transform(resolved, attrs, config)` callback receives:

- **`resolved`** — an object keyed by field or zone names, containing AST `Node` objects (not yet rendered)
- **`attrs`** — resolved attribute values
- **`config`** — the Markdoc config for calling `Markdoc.transform()`

### What resolved contains

| Pattern | Shape |
|---------|-------|
| Sequence | `resolved.fieldName` — single `Node` or `Node[]` (greedy) |
| Delimited | `resolved.zoneName` — `ResolvedContent` object with the zone's field values |
| Sections | `resolved.sections` — `Node[]` (emitted tag nodes) + preamble field keys |

### Transform pattern

The transform function must:
1. Call `Markdoc.transform()` on AST nodes to produce renderable output
2. Build structural elements using `RenderableNodeCursor` and `Tag`
3. Return `createComponentRenderable()` output

```typescript
transform(resolved, attrs, config) {
  const contentZone = (resolved.content ?? {}) as ResolvedContent;

  // 1. Transform AST nodes into renderable output
  const headerAstNodes = [contentZone.eyebrow, contentZone.headline, contentZone.blurb]
    .filter(Boolean) as Node[];
  const header = new RenderableNodeCursor(
    Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
  );

  // 2. Create meta tags for attributes
  const typeMeta = new Tag('meta', { content: attrs.type });

  // 3. Return structured output
  return createComponentRenderable(schema.MyRune, {
    tag: 'section',
    property: 'contentSection',
    properties: { type: typeMeta },
    refs: { ...pageSectionProperties(header), body: bodyDiv },
    children: [typeMeta, header.wrap('header').next(), bodyDiv.next()],
  });
},
```

---

## Worked example: Recipe

The recipe rune uses a delimited content model with two zones. Unordered lists become ingredients, ordered lists become steps, and blockquotes become tips.

```typescript
export const recipe = createContentModelSchema({
  base: SplitLayoutModel,
  attributes: {
    prepTime: { type: String, required: false, default: '' },
    cookTime: { type: String, required: false, default: '' },
    servings: { type: Number, required: false },
    difficulty: { type: String, required: false,
      matches: ['easy', 'medium', 'hard'], default: 'medium' },
  },
  contentModel: {
    type: 'delimited',
    delimiter: 'hr',
    zones: [
      {
        name: 'content',
        type: 'sequence',
        fields: [
          { name: 'eyebrow', match: 'paragraph', optional: true },
          { name: 'headline', match: 'heading', optional: true },
          { name: 'blurb', match: 'paragraph', optional: true },
          { name: 'ingredients', match: 'list:unordered', optional: true,
            template: '- Ingredient' },
          { name: 'steps', match: 'list:ordered', optional: true,
            template: '1. Step' },
          { name: 'tips', match: 'blockquote', greedy: true, optional: true },
        ],
      },
      {
        name: 'media',
        type: 'sequence',
        fields: [
          { name: 'media', match: 'any', optional: true, greedy: true },
        ],
      },
    ],
  },
  transform(resolved, attrs, config) {
    const contentZone = (resolved.content ?? {}) as ResolvedContent;
    const mediaZone = (resolved.media ?? {}) as ResolvedContent;

    // Transform header fields (eyebrow, headline, blurb)
    const headerAstNodes = [
      contentZone.eyebrow, contentZone.headline, contentZone.blurb,
    ].filter(Boolean) as Node[];
    const header = new RenderableNodeCursor(
      Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
    );

    // Transform and extract ingredient/step list items
    // ... (extract <li> elements from rendered <ul>/<ol>)
    // ... (annotate with data-name, schema.org properties)

    // Create attribute meta tags
    const prepTimeMeta = new Tag('meta', { content: attrs.prepTime });
    // ...

    return createComponentRenderable(schema.Recipe, {
      tag: 'article',
      property: 'contentSection',
      properties: { prepTime: prepTimeMeta, difficulty: difficultyMeta, ... },
      refs: { ...pageSectionProperties(header), ingredients, steps, tips, ... },
      children: [prepTimeMeta, ..., mainContent.next()],
    });
  },
});
```

See `runes/learning/src/tags/recipe.ts` for the full implementation.

---

## Editor integration

Content models are automatically introspectable — the `schemaContentModels` WeakMap stores each rune's content model at schema creation time. The editor's structure tab uses this to show the model's fields as a tree:

- **Filled fields** show a content preview
- **Empty optional fields** show an add button
- **Empty required fields** are highlighted as missing

The `template` field on `ContentFieldDefinition` provides the Markdoc snippet inserted when the user clicks add. The `description` field provides a tooltip in the editor UI.

See [Editor support](/docs/authoring/output-contract#editor-support) for how `editHints` connect data-name values to inline editing popovers.
