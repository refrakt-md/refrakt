---
rune: symbol
title: API symbol
role: canonical
notes: >
  Group A, resolved — the one Group A rune that kept its type, because it
  had something to say. `name` comes from the symbol's own heading,
  `description` from the lead paragraph (WORK-567).
---
{% symbol kind="function" lang="typescript" since="1.0.0" %}

## renderContent

Transforms a Markdoc document into a renderable tree.

```typescript
renderContent(source: string, options?: RenderOptions): RenderTree
```

- **source** `string` -- Raw Markdoc content to parse and transform

> Returns `RenderTree` -- A framework-agnostic tree for rendering.

{% /symbol %}
