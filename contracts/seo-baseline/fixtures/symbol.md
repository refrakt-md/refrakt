---
rune: symbol
title: API symbol
role: canonical
notes: Group A — emits TechArticle with no name or description, despite a full signature and prose.
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
