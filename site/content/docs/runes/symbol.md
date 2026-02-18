---
title: Symbol
description: Code construct documentation for functions, classes, interfaces, enums, and type aliases
---

# Symbol

Code construct documentation. Headings become the construct name, code fences become type signatures, lists become parameter definitions, and blockquotes become typed annotations (returns, throws, deprecation).

The `kind` attribute controls how Markdown primitives are reinterpreted -- functions get parameter lists, classes get member groups, enums get member definitions.

## Function documentation

A function with signature, parameters, return value, and exception documentation.

{% preview source=true %}

{% symbol kind="function" lang="typescript" since="1.0.0" %}

## renderContent

Transforms a Markdoc document into a renderable tree using the specified rune definitions.

```typescript
renderContent(source: string, options?: RenderOptions): RenderTree
```

- **source** `string` -- Raw Markdoc content to parse and transform
- **options** `RenderOptions` *(optional)* -- Configuration for the render pass
  - **runes** `RuneMap` -- Custom rune definitions to merge with defaults
  - **variables** `Record<string, any>` -- Template variables available in content

> Returns `RenderTree` -- A framework-agnostic tree for rendering.

> Throws `ParseError` if the source contains invalid Markdoc syntax.

{% /symbol %}

{% /preview %}

## Class documentation

Classes, interfaces, and modules use `###` headings for member groups (Constructor, Properties, Methods) and `####` headings for individual members.

{% preview source=true %}

{% symbol kind="class" lang="typescript" since="1.0.0" %}

## ContentParser

The core parsing engine that transforms raw Markdoc source into an abstract syntax tree.

```typescript
class ContentParser extends EventEmitter
```

### Constructor

```typescript
new ContentParser(config: ParserConfig)
```

- **config** `ParserConfig` -- Parser configuration
  - **strictMode** `boolean` -- Reject unknown runes. *Default: `false`*
  - **maxDepth** `number` -- Maximum nesting depth. *Default: `10`*

### Methods

#### parse

Parse a Markdoc source string into a raw AST.

```typescript
parse(source: string): ASTNode
```

- **source** `string` -- Raw Markdoc content

> Returns `ASTNode` -- The root node of the parsed abstract syntax tree.

#### transform

Transform a parsed AST into a renderable tree.

```typescript
transform(ast: ASTNode, variables?: Record<string, any>): RenderTree
```

- **ast** `ASTNode` -- A parsed AST from the `parse` method
- **variables** `Record<string, any>` *(optional)* -- Template variables

> Returns `RenderTree` -- A framework-agnostic renderable tree.

> Throws `TransformError` if a rune's reinterpretation rules fail.

{% /symbol %}

{% /preview %}

## Enum documentation

Enum members are defined as a list with **name** `"value"` -- description format.

{% preview source=true %}

{% symbol kind="enum" lang="typescript" since="1.2.0" %}

## RuneCategory

Classification categories for runes in the registry.

```typescript
enum RuneCategory
```

- **Layout** `"layout"` -- Core structural runes (section, grid, columns)
- **Content** `"content"` -- Content structure runes (tabs, accordion, callout)
- **Data** `"data"` -- Data display and reference runes (datatable, chart, codegroup)
- **Interactive** `"interactive"` -- User interaction runes (form, quiz, poll)

{% /symbol %}

{% /preview %}

## Type alias

Type aliases are the simplest form -- just a name, description, and type definition.

{% preview source=true %}

{% symbol kind="type" lang="typescript" %}

## RuneMap

A mapping of rune names to their definitions. Used to register custom runes or override built-in rune behavior.

```typescript
type RuneMap = Record<string, RuneDefinition>
```

{% /symbol %}

{% /preview %}

## Heading level shifting

Use the `headingLevel` attribute to shift all heading interpretations. This lets symbols nest inside other runes like `{% tabs %}` or `{% section %}` without heading conflicts.

```markdoc
{% symbol kind="class" headingLevel=3 %}
### MyClass (name is now ###)
#### Methods (group is now ####)
##### doSomething (member is now #####)
{% /symbol %}
```

## Deprecated construct

Set the `deprecated` attribute to mark a construct as deprecated. Add a `source` attribute to link to the source code.

{% preview source=true %}

{% symbol kind="function" deprecated="2.0.0" source="https://github.com/example/blob/main/src/legacy.ts#L42" %}

## legacyRender

This function is deprecated. Use `renderContent` instead.

```typescript
legacyRender(source: string): any
```

{% /symbol %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `kind` | `string` | `"function"` | Construct type: `function`, `class`, `interface`, `enum`, `type`, `module`, `hook`, `component` |
| `lang` | `string` | `"typescript"` | Programming language: `typescript`, `javascript`, `python`, `rust`, `go`, etc. |
| `since` | `string` | -- | Version when this construct was introduced |
| `deprecated` | `string` | -- | Version when deprecated, or `"true"` for general deprecation |
| `source` | `string` | -- | URL to source code (GitHub permalink, etc.) |
| `headingLevel` | `number` | `2` | Base heading level for construct name (shifts all heading interpretations) |
