---
title: Model API
description: API reference for the Model base class, decorators, and helper utilities
---

# Model API

Every rune is a class that extends `Model`. This page covers the base class lifecycle, the decorators that configure it, and the helper utilities for processing and querying content.

## Model lifecycle

{% steps %}

### Constructor

`new Model(node, config)` — runs `@id` decorators to generate IDs.

### processChildren

`processChildren(nodes)` — runs `@group` decorators to partition children into named streams. Your override can restructure children before grouping.

### transform

`transform()` — your implementation calls `transformChildren()`, builds output, and returns `RenderableTreeNodes` via `createComponentRenderable()`.

{% /steps %}

### `processChildren(nodes: Node[]): Node[]`

Called with the rune's child AST nodes before transformation. This is where you restructure content — for example, converting headings into list items for Steps, or splitting by heading level for Accordion items.

Always call `super.processChildren()` to run `@group` decorators:

```typescript
processChildren(nodes: Node[]) {
  const restructured = headingsToList({ level: this.headingLevel })(nodes);
  return super.processChildren(restructured);
}
```

### `transformChildren(handlers?): RenderableNodeCursor`

Transforms child nodes using Markdoc's transform pipeline. Returns a `RenderableNodeCursor` for querying the result.

Optional `handlers` parameter lets you override how specific node types or tag names are transformed:

```typescript
const children = this.transformChildren({
  // Override how list nodes are transformed
  list: 'ol',

  // Override how list items are transformed
  item: (node, config) => {
    return Markdoc.transform(
      new Ast.Node('tag', {}, node.children, 'step'), config
    );
  },
});
```

Handler values can be:
- A tag name string — wraps in that element
- A Schema — delegates to another rune's schema
- A function `(node, config) => RenderableTreeNodes` — custom transform

### `transform(): RenderableTreeNodes`

Your main implementation. Must return the final renderable output, typically via `createComponentRenderable()`. Called after `processChildren()` has run.

---

## Decorators

### `@attribute(options)`

Declares a tag attribute that users write in Markdoc syntax.

```typescript
@attribute({ type: String, required: false, matches: ['note', 'warning', 'caution', 'check'] })
type: string = 'note';
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `type` | `String \| Number \| Boolean \| Array \| Object` | The attribute's data type |
| `required` | `boolean` | Whether the attribute must be provided |
| `matches` | `string[] \| RegExp` | Enum constraint or pattern validation |
| `default` | `any` | Default value (also set via property initializer) |
| `errorLevel` | `'warning' \| 'error' \| 'critical'` | Validation error severity |
| `render` | `boolean` | Whether to include in rendered output attributes |
| `description` | `string` | Human-readable description for tooling |

**Examples:**

```typescript
// Required string
@attribute({ type: String, required: true })
name: string;

// Optional number with undefined default
@attribute({ type: Number, required: false })
headingLevel: number | undefined = undefined;

// Boolean with default
@attribute({ type: Boolean, required: false })
open: boolean = false;

// Enum constraint
const modes = ['click', 'scroll', 'auto'] as const;
@attribute({ type: String, required: false, matches: modes.slice() })
mode: typeof modes[number] = 'click';
```

### `@group(options)`

Partitions child nodes into a named `NodeStream`. Groups consume nodes **in declaration order** — each group takes matching nodes from where the previous group left off.

```typescript
@group({ include: ['heading', 'paragraph'] })
header: NodeStream;

@group({ include: ['list', 'tag'] })
body: NodeStream;
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `include` | `NodeFilter[]` | Which node types to include |
| `section` | `number` | HR-delimited section index (0-based) |

**NodeFilter types:**

```typescript
// String — match by node type
'heading'
'paragraph'
'list'
'tag'
'image'

// Object — match with conditions
{ node: 'paragraph', descendant: 'image' }    // paragraph containing an image
{ node: 'list', descendantTag: 'icon' }        // list containing an {% icon %} tag

// Function — custom predicate
(node: Node) => node.type === 'tag' && node.tag === 'step'
```

**Section-based grouping** uses `---` (horizontal rule) as a delimiter:

```typescript
@group({ section: 0 })          // Content before first ---
main: NodeStream;

@group({ section: 1 })          // Content after first ---
side: NodeStream;
```

### `@groupList(options)`

Splits children into an array of `NodeStream[]` by a delimiter node type.

```typescript
@groupList({ delimiter: 'hr' })
sections: NodeStream[];
```

### `@id(options)`

Auto-generates a unique ID for the rune instance.

```typescript
@id({ generate: true })
id: string;
```

Generated IDs follow the pattern `{tag-name}-{index}` (e.g., `nav-0`, `tabs-1`). The index increments per tag name within a page to avoid collisions. IDs are tracked in `config.variables.generatedIds`.

---

## NodeStream

A lazy wrapper for a group of AST nodes. Created by `@group` decorators.

### Methods

**`transform(): RenderableNodeCursor`** — Transform all nodes and return a queryable cursor.

```typescript
const header = this.header.transform();
const heading = header.headings().next();
```

**`useNode(type, handler): NodeStream`** — Override how a specific node type is transformed.

```typescript
const definitions = this.definitions
  .useNode('item', (node, config) => {
    return Markdoc.transform(
      new Ast.Node('tag', {}, node.children, 'definition'), config
    );
  })
  .useNode('list', (node, config) => {
    return new Tag('dl', {}, node.transformChildren(config));
  })
  .transform();
```

**`useTag(name, handler): NodeStream`** — Override how a specific Markdoc tag is transformed.

**`wrapTag(tag, attributes): NodeStream`** — Wrap all nodes in a parent element before transformation.

**`push(node): void`** — Add a node to the stream.

---

## RenderableNodeCursor

A query interface for navigating transformed output. Returned by `NodeStream.transform()` and `Model.transformChildren()`.

### Filtering methods

All filtering methods return a new `RenderableNodeCursor` — they don't mutate.

```typescript
const children = this.transformChildren();

// Filter by tag name
children.tag('div')           // only <div> elements
children.tags('h1', 'h2')    // <h1> or <h2> elements
children.headings()           // shorthand for tags('h1', 'h2', ..., 'h6')

// Filter by typeof attribute
children.typeof('Step')       // only elements with typeof="Step"

// Limit results
children.limit(1)             // first element only
children.slice(1, 3)          // elements at index 1 and 2
```

### Structural methods

```typescript
// Wrap all nodes in a container element
const container = children.wrap('div');
const styledContainer = children.wrap('div', { class: 'custom' });

// Flatten nested tag trees into a flat list
children.flatten()

// Merge cursors
cursor1.concat(cursor2)
```

### Consuming output

```typescript
// Get count
children.count()              // number of nodes

// Get all nodes as array
children.toArray()            // RenderableTreeNode[]

// Iterator — advances an internal offset each call
children.next()               // first node
children.next()               // second node (advances)
```

The `next()` method is stateful — each call returns the next node and advances the cursor's internal offset. This is used when building `children` arrays for `createComponentRenderable`:

```typescript
const tabList = tabs.wrap('ul');
const panelList = panels.wrap('ul');

children: [tabList.next(), panelList.next()]
//         ^^ first call     ^^ second call on different cursors
```

---

## headingsToList

Restructures AST nodes by splitting on headings at a specific level. Each heading becomes a list item containing the heading and its following content.

```typescript
import { headingsToList } from '../util.js';

// With explicit level
const items = headingsToList({ level: 2 })(nodes);

// Auto-detect from first heading
const items = headingsToList({ level: this.headingLevel })(nodes);
// When this.headingLevel is undefined, finds the first heading
// and uses its level. If no headings exist, returns nodes unchanged.
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `level` | `number \| undefined` | Heading level to split on. Auto-detects from first heading when undefined. |
| `include` | `NodeFilter[]` | Content patterns to include under each heading. When set, stops collecting at the first non-matching node. |

**Return value:**

When headings are found: `[...head, list, ...tail]` where `list` is a synthetic list node with item children, each containing a heading and its content.

When no headings match: returns the original `nodes` array unchanged.

---

## Common helpers

`packages/runes/src/tags/common.ts` provides shared utilities:

### `pageSectionProperties(cursor)`

Extracts standard page section properties from a header cursor:

```typescript
const header = this.header.transform();

return createComponentRenderable(schema.MyRune, {
  properties: {
    ...pageSectionProperties(header),
    // Extracts: eyebrow, headline, image, blurb
  },
  // ...
});
```

Returns `{ eyebrow, headline, image, blurb }` where:
- `eyebrow` — first heading if there are 2+ headings
- `headline` — first (or only) heading
- `image` — first `<img>` element
- `blurb` — first `<p>` element

### `SplitablePageSectionModel`

Base class for runes that support split layout:

```typescript
class StepsModel extends SplitablePageSectionModel {
  // Inherits:
  // @attribute split: boolean = false
  // @attribute mirror: boolean = false
}
```

### `name(cursor)` / `description(cursor)`

Quick helpers for extracting a single heading or paragraph:

```typescript
const title = name(children);     // first heading, limited to 1
const desc = description(children); // first paragraph, limited to 1
```
