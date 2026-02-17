# Rune: `{% symbol %}` — High-Level Plan

> **Package:** @refrakt-md/runes
> **Category:** Data & Documentation Rune
> **Status:** Draft (refined)

---

## Purpose

Document code constructs — functions, classes, interfaces, enums, modules, type aliases — using natural Markdown. Transforms headings, lists, code blocks, and blockquotes into structured, navigable SDK documentation with type-aware rendering.

---

## Attributes

| Attribute | Type | Required | Default | Description |
|---|---|---|---|---|
| `kind` | string | No | `"function"` | Construct type — `function`, `class`, `interface`, `enum`, `type`, `module`, `hook`, `component` |
| `lang` | string | No | `"typescript"` | Programming language — `typescript`, `javascript`, `python`, `rust`, `go`, etc. |
| `since` | string | No | — | Version when this construct was introduced |
| `deprecated` | string | No | — | Version when deprecated, or `"true"` for general deprecation |
| `source` | string | No | — | URL to source code (GitHub permalink, etc.) |
| `headingLevel` | number | No | `2` | Base heading level for construct name (shifts all heading interpretations) |

---

## Markdown Reinterpretation

### Universal Rules (all kinds)

| Markdown Primitive | Interpretation |
|---|---|
| Base heading (`##` at default level) | Construct name |
| First fenced code block after name | Type signature / declaration |
| Paragraph after name (before first fence or list) | Description prose |
| Image | Diagram or visual explanation |
| Horizontal rule (`---`) | Visual separator between sections |

### Reinterpretation by Kind

| Primitive | function / hook | class / interface / module | enum | type |
|---|:---:|:---:|:---:|:---:|
| Base heading = name | yes | yes | yes | yes |
| First fence = signature | yes | yes (declaration) | yes | yes |
| `###` group labels (Constructor, Properties, Methods, Events) | no | yes | no | no |
| `####` member names | no | yes | no | no |
| Unordered list = parameter/property definitions | yes | yes (per member) | no | no |
| **Bold** at start of list item = param name | yes | yes (per member) | no | no |
| `` `code` `` after bold = type annotation | yes | yes (per member) | no | no |
| *Italic* in list item = optional marker / default | yes | yes (per member) | no | no |
| Nested list under parameter = object properties | yes | yes (per member) | no | no |
| `> Returns` blockquote | yes | yes (per method) | no | no |
| `> Throws` blockquote | yes | yes (per method) | no | no |
| `> Deprecated` blockquote | yes | yes | yes | yes |
| Blockquote (other) | general notes | general notes | general notes | general notes |
| Unordered list = enum member definitions | no | no | yes | no |

### Heading Level Shifting

The `headingLevel` attribute shifts all heading interpretations. Default is `2`:

| headingLevel | Name | Group | Member |
|---|---|---|---|
| `2` (default) | `##` | `###` | `####` |
| `3` | `###` | `####` | `#####` |
| `4` | `####` | `#####` | `######` |

This allows `{% symbol %}` to be nested inside other runes like `{% section %}` or `{% tabs %}` without heading conflicts.

### Code Block Disambiguation

- **First bare fence** after the construct name → signature/declaration
- **`{% codegroup %}`** → usage examples (handled by codegroup rune)
- **Subsequent bare fences** → treated as description content (additional code context)
- For class members (`####`), the first fence after the member heading → that member's signature

### Blockquote Prefix Conventions

Blockquote meaning is determined by the first word(s), case-insensitive:

| Prefix (any of) | Meaning |
|---|---|
| Returns, Return, Return value | Return value description |
| Throws, Throw, Raises | Exception/error documentation |
| Deprecated, Deprecation | Deprecation notice with migration guidance |
| *(anything else)* | General notes or remarks |

---

## Authoring Examples

### Function Documentation

````markdoc
{% symbol kind="function" lang="typescript" since="1.0.0" %}

## renderContent

Transforms a Markdoc document into a renderable tree using the specified rune definitions. The source string is parsed, validated against known rune schemas, and transformed into a framework-agnostic tree structure.

```typescript
renderContent(source: string, options?: RenderOptions): RenderTree
```

- **source** `string` — Raw Markdoc content to parse and transform
- **options** `RenderOptions` *(optional)* — Configuration for the render pass
  - **runes** `RuneMap` — Custom rune definitions to merge with defaults
  - **variables** `Record<string, any>` — Template variables available in content
  - **strict** `boolean` — Throw on unknown runes instead of using fallback. *Default: `false`*
  - **validate** `boolean` — Run validation pass before transformation. *Default: `true`*

> Returns `RenderTree` — A framework-agnostic tree that can be passed to any implementation adapter for rendering.

> Throws `ParseError` if the source contains invalid Markdoc syntax.

> Throws `ValidationError` if `strict` is `true` and an unknown rune is encountered.

{% codegroup %}
```typescript
import { renderContent } from '@refrakt-md/core';

const tree = renderContent('{% hero %}\n# Hello World\n{% /hero %}', {
  strict: true,
  variables: { siteName: 'My Site' }
});
```

```javascript
const { renderContent } = require('@refrakt-md/core');

const tree = renderContent('{% hero %}\n# Hello World\n{% /hero %}');
```
{% /codegroup %}

{% callout type="tip" %}
For large documents, consider using `renderContentAsync` which supports streaming parsing and returns a `Promise<RenderTree>`.
{% /callout %}

{% /symbol %}
````

### Class Documentation

````markdoc
{% symbol kind="class" lang="typescript" since="1.0.0" %}

## ContentParser

The core parsing engine that transforms raw Markdoc source into an abstract syntax tree. Handles tokenization, rune resolution, and Markdown primitive reinterpretation.

```typescript
class ContentParser extends EventEmitter
```

### Constructor

```typescript
new ContentParser(config: ParserConfig)
```

- **config** `ParserConfig` — Parser configuration
  - **runeRegistry** `RuneRegistry` — Registry of available rune definitions
  - **strictMode** `boolean` — Reject unknown runes. *Default: `false`*
  - **maxDepth** `number` — Maximum nesting depth for runes. *Default: `10`*

---

### Properties

- **runes** `ReadonlyMap<string, RuneDefinition>` — Map of registered rune definitions
- **errors** `ParseError[]` — Accumulated errors from the last parse operation
- **stats** `ParseStats` — Performance statistics from the last parse

---

### Methods

#### parse

Parse a Markdoc source string into a raw AST.

```typescript
parse(source: string): ASTNode
```

- **source** `string` — Raw Markdoc content

> Returns `ASTNode` — The root node of the parsed abstract syntax tree.

#### transform

Transform a parsed AST into a renderable tree by applying rune reinterpretation rules.

```typescript
transform(ast: ASTNode, variables?: Record<string, any>): RenderTree
```

- **ast** `ASTNode` — A parsed AST from the `parse` method
- **variables** `Record<string, any>` *(optional)* — Template variables

> Returns `RenderTree` — A framework-agnostic renderable tree.

> Throws `TransformError` if a rune's reinterpretation rules fail.

#### validate

Run validation checks on a parsed AST without transforming it.

```typescript
validate(ast: ASTNode): ValidationResult
```

- **ast** `ASTNode` — A parsed AST to validate

> Returns `ValidationResult` — Object containing `valid: boolean` and `errors: ValidationError[]`.

---

### Events

- **rune:enter** — Emitted when the parser enters a rune node. Payload: `{ name: string, attributes: object, depth: number }`
- **rune:exit** — Emitted when the parser exits a rune node. Payload: `{ name: string }`
- **warning** — Emitted for non-fatal issues. Payload: `{ message: string, line: number, column: number }`

{% /symbol %}
````

### Interface Documentation

````markdoc
{% symbol kind="interface" lang="typescript" since="1.0.0" %}

## ThemeImplementation

Defines the contract that a framework-specific theme implementation must satisfy. Each implementation maps rune names to framework components and handles the rendering lifecycle.

```typescript
interface ThemeImplementation<T extends FrameworkAdapter>
```

### Properties

- **name** `string` — Theme identity name (e.g., "lumina")
- **framework** `string` — Target framework identifier (e.g., "sveltekit", "astro")
- **version** `string` — Implementation version (should match identity version)
- **adapter** `T` — Framework-specific adapter instance

### Methods

#### getComponent

Resolve a rune name to its framework component, accounting for context overrides.

```typescript
getComponent(rune: string, context?: RuneContext): FrameworkComponent<T>
```

- **rune** `string` — Rune name to resolve
- **context** `RuneContext` *(optional)* — Parent rune context for context-aware resolution

> Returns `FrameworkComponent<T>` — The resolved component for the target framework.

> Throws `UnknownRuneError` if the rune is not supported and no fallback is configured.

#### getLayout

Resolve a layout name to its framework layout component.

```typescript
getLayout(name: string): FrameworkLayout<T>
```

- **name** `string` — Layout name as declared in the theme manifest

> Returns `FrameworkLayout<T>` — The resolved layout component with region slot mappings.

{% /symbol %}
````

### Enum Documentation

````markdoc
{% symbol kind="enum" lang="typescript" since="1.2.0" %}

## RuneCategory

Classification categories for runes in the registry. Used for documentation generation, marketplace filtering, and content analysis dashboards.

```typescript
enum RuneCategory
```

- **Layout** `"layout"` — Core structural runes (section, grid, columns)
- **Content** `"content"` — Content structure runes (tabs, accordion, callout)
- **Data** `"data"` — Data display and reference runes (datatable, chart, codegroup)
- **Commercial** `"commercial"` — Landing page and conversion runes (pricing, cta, testimonial)
- **Specialized** `"specialized"` — Domain-specific content runes (recipe, event, timeline)
- **Interactive** `"interactive"` — User interaction runes (form, quiz, poll)
- **Creative** `"creative"` — Experimental and visual runes (bento, storyboard, reveal)
- **Integration** `"integration"` — External platform runes (feed, map, embed)

{% /symbol %}
````

### Type Alias Documentation

````markdoc
{% symbol kind="type" lang="typescript" since="1.0.0" %}

## RuneMap

A mapping of rune names to their definitions. Used to register custom runes or override built-in rune behavior.

```typescript
type RuneMap = Record<string, RuneDefinition>
```

{% codegroup %}
```typescript
import type { RuneMap } from '@refrakt-md/runes';

const customRunes: RuneMap = {
  'product-card': {
    name: 'product-card',
    category: RuneCategory.Commercial,
    attributes: { /* ... */ },
    reinterprets: { /* ... */ }
  }
};
```
{% /codegroup %}

{% /symbol %}
````

### React Hook Documentation

````markdoc
{% symbol kind="hook" lang="typescript" since="2.0.0" %}

## useRuneContext

Access the current rune nesting context within a framework component. Returns the parent rune's name and attributes, enabling context-aware rendering at the component level.

```typescript
useRuneContext(): RuneContext | null
```

> Returns `RuneContext | null` — The parent rune context, or `null` if the component is not nested inside a rune.

{% codegroup %}
```tsx
import { useRuneContext } from '@refrakt-md/react';

function List({ items }) {
  const context = useRuneContext();

  if (context?.rune === 'pricing') {
    return <PricingList items={items} />;
  }

  return <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>;
}
```
{% /codegroup %}

{% callout type="warning" %}
This hook is only available in React implementations. SvelteKit uses `getContext('rune')` and Astro resolves context at build time.
{% /callout %}

{% /symbol %}
````

---

## Composition with Other Runes

| Child Rune | Behavior |
|---|---|
| `{% codegroup %}` | Multi-language usage examples within the symbol block |
| `{% callout %}` | Warnings, tips, deprecation notices, version-specific notes |
| `{% tabs %}` | Version-specific documentation ("v1 API" / "v2 API") |
| `{% diff %}` | Show API changes between versions (old signature vs new) |
| `{% compare %}` | Side-by-side comparison of similar constructs |

| Parent Rune | Behavior |
|---|---|
| `{% tabs %}` | Each tab is a different module or namespace's reference docs |
| `{% accordion %}` | Collapsible method/property groups for large APIs |
| `{% section %}` | Symbol as one section of a larger documentation page (use `headingLevel`) |

---

## Differentiation from `{% api %}`

| Aspect | `{% api %}` | `{% symbol %}` |
|---|---|---|
| **Documents** | HTTP endpoints | Code constructs |
| **Key elements** | Method, path, request/response bodies | Signatures, types, parameters |
| **Organization** | By endpoint route | By module/class/function |
| **Examples** | HTTP requests (curl, fetch) | Code usage in target language |
| **Schema** | REST/GraphQL conventions | Language-specific type systems |

A complete SDK documentation site would use both: `{% api %}` for the REST API reference and `{% symbol %}` for the client library that wraps it.

---

## Lumina Rendering Guidance

These are rendering recommendations for the Lumina theme. The rune emits a structured renderable tree; the theme decides presentation.

### Function/Method View

1. **Name** as heading with anchor link
2. **Since badge** and **deprecation badge** inline with name
3. **Description** as prose
4. **Signature** in a styled code block with syntax highlighting
5. **Parameters** as a structured definition list with types, defaults, and descriptions
6. **Nested parameters** (object properties) indented under their parent
7. **Return value** in a distinct "Returns" block
8. **Exceptions** in a distinct "Throws" block
9. **Examples** in tabbed code blocks
10. **Notes/callouts** as contextual messages

### Class/Interface View

1. **Name** with type badges (since, deprecated)
2. **Description** as prose
3. **Declaration** code block
4. **Constructor** section (if class)
5. **Properties** as definition list or table
6. **Methods** each rendered as a mini function view
7. **Events** as a separate section with payload descriptions

### Enum View

1. **Name** as heading
2. **Description** as prose
3. **Declaration** code block
4. **Members** as a styled list with name, value, and description per entry

---

## SEO / Structured Data

| Context | Schema |
|---|---|
| Individual construct | `TechArticle` with `proficiencyLevel`, `dependencies` |
| Code examples within symbol | `SoftwareSourceCode` with `programmingLanguage` |

Well-structured symbol documentation with proper headings, parameter lists, and type annotations can surface in Google's developer search results.

---

## Accessibility

- Signatures use `<code>` with `role="text"` to prevent screen readers from spelling out symbols
- Parameter lists use proper semantic markup for name, type, and description
- Keyboard navigation between members via skip links
- Collapsible sections (for large classes) use `aria-expanded` state
- Color is never the only indicator — types use both color and formatting (italic for optional, bold for required)

---

## AI Authoring Integration

The `{% symbol %}` rune should be fully supported by all AI authoring modes:

- **`refrakt write --source ./src/auth`** — When generating SDK documentation from source files, the AI should emit `{% symbol %}` blocks with correct `kind`, signature formatting, and parameter lists following the Markdown reinterpretation rules. The `--source` flag provides TypeScript/JavaScript source for the AI to analyze.
- **`refrakt enhance`** — Should detect code documentation patterns in plain Markdown (function signatures as code blocks, parameter lists, "Returns:" descriptions) and suggest wrapping them in `{% symbol %}`.
- **`refrakt review`** — Should validate `{% symbol %}` blocks: check that signature matches parameter list, flag missing return documentation, suggest `since`/`deprecated` attributes where appropriate.
- **Base system prompt** (`packages/ai/src/prompt.ts`) — Needs `{% symbol %}` added to the rune vocabulary with kind-specific authoring examples so all modes understand the conventions.

---

## Deferred to Future Versions

| Feature | Rationale |
|---------|-----------|
| Cross-linking / symbol index | Build-time infrastructure, not a rune concern. Needs site-wide analysis step in `packages/content/` or `packages/sveltekit/`. Separate plan. |
| Language-specific attributes (`abstract`, `extends`, `implements`, `generic`, `access`) | TypeScript/Java-centric. Add when multi-language usage patterns emerge and the need is concrete. |
| Live playground | Ambitious — executable code examples in sandboxed environment. Separate feature. |
| Versioned docs | Symbol index would need version awareness. Depends on cross-linking being built first. |
| Search integration | Symbol index as search database ("find all functions returning RenderTree"). Depends on cross-linking. |
| Change detection / staleness | Validation step comparing `{% symbol %}` content against real type definitions. Build-time tool, not rune responsibility. |
| Auto-generation from source | `refrakt typedoc`-style tool that generates `{% symbol %}` content from JSDoc/TSDoc/docstrings. See Phase 7 in internal-spec.md. |
