# Local Runes — Declarative Rune Extension (v1)

## Context

Projects need custom interactive components in content — a playground, a pricing calculator, a product demo. Rather than a `{% component %}` escape hatch that breaks out of the rune system, local runes extend it. To the content author, a local rune looks identical to a built-in rune. The only difference is where it's defined.

This spec covers v1 runtime support: config declaration, schema generation, content parsing, and component rendering. VS Code language server support is a fast-follow.

## v1 Config Surface

Local runes are declared in `refrakt.config.json`:

```json
{
  "contentDir": "./content",
  "theme": "@refrakt-md/lumina",
  "target": "svelte",
  "runes": {
    "playground": {
      "component": "./src/components/Playground.svelte",
      "description": "Interactive code playground with live preview",
      "attributes": {
        "height": { "type": "number", "default": 600 },
        "example": { "type": "string", "default": "default" },
        "editable": { "type": "boolean", "default": true }
      },
      "children": "render"
    },
    "pricing-calculator": {
      "component": "./src/components/PricingCalculator.svelte",
      "description": "Interactive pricing calculator",
      "attributes": {
        "currency": { "type": "string", "default": "USD" },
        "plans": { "type": "string" }
      }
    }
  }
}
```

### Config Fields

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| `component` | `string` | Yes | — | Path to Svelte component (relative to project root) |
| `description` | `string` | No | `""` | Human-readable description (used by language server in fast-follow) |
| `attributes` | `Record<string, AttrDef>` | No | `{}` | Attribute schema for validation |
| `children` | `"none" \| "render"` | No | `"none"` | How children are handled |

### Attribute Definition

```typescript
interface AttrDef {
  type: "string" | "number" | "boolean";
  default?: string | number | boolean;
  required?: boolean;
}
```

### Children Modes

**`"none"`** (default) — Self-closing tag. No closing tag needed. Component receives only declared attributes.

```markdoc
{% pricing-calculator plans="starter,pro" %}
```

**`"render"`** — Children go through the full rune pipeline (Markdoc transform, serialization, identity transform for built-in runes inside, syntax highlighting). Component receives rendered output as a Svelte slot/snippet.

```markdoc
{% playground example="comparison" %}
## Try this comparison

{% comparison highlighted="Svelte" %}
| Feature | React | Svelte |
| --- | --- | --- |
| Bundle size | 42kb | 2kb |
{% /comparison %}
{% /playground %}
```

Built-in runes inside a local rune get full treatment — identity transform, BEM classes, SEO extraction.

## Architecture — Three Injection Points

### 1. Markdoc Tag Map (parsing & transform)

**Schema factory** — `packages/runes/src/local.ts` (CREATE)

New utility in the runes package that generates Markdoc-compatible schemas from JSON config:

```typescript
export interface LocalRuneConfig {
  component: string;
  description?: string;
  attributes?: Record<string, AttrDef>;
  children?: "none" | "render";
}

export function createLocalRuneTags(
  configs: Record<string, LocalRuneConfig>
): Record<string, Schema>
```

For each local rune, generates a Markdoc Schema that:
- Validates declared attributes (type coercion, defaults, required check)
- Sets `selfClosing: true` when `children: "none"`
- Calls `createComponentRenderable()` with a generated type to produce a Tag with `typeof` marker
- For `children: "render"`, passes transformed children through normally

**Content package extension** — `packages/content/src/site.ts` (EDIT)

Extend `loadContent()` to accept additional tag schemas:

```typescript
export async function loadContent(
  dirPath: string,
  basePath?: string,
  additionalTags?: Record<string, Schema>
): Promise<Site>
```

Internally, `transformContent()` merges: `{ ...tags, ...additionalTags }` before passing to `Markdoc.transform()`.

**Plugin orchestration** — `packages/sveltekit/src/plugin.ts` (EDIT)

In the `buildStart` hook (and dev equivalent), the plugin:
1. Reads `runes` from `refrakt.config.json`
2. Calls `createLocalRuneTags(config.runes)` from `@refrakt-md/runes`
3. Passes result to `loadContent(contentDir, '/', localTags)`

### 2. Component Registry (rendering)

Reuse the existing override mechanism in `packages/sveltekit/src/virtual-modules.ts`.

The `virtual:refrakt/theme` module generator already handles component overrides — it generates import statements and merges them into `theme.components`. Local rune component mappings feed into the same mechanism:

```typescript
// Generated virtual module (conceptual):
import { theme as _base } from '@refrakt-md/lumina/svelte';
import _o0 from './src/components/Playground.svelte';     // override
import _r0 from './src/components/PricingCalculator.svelte'; // local rune

export const theme = {
  ..._base,
  components: {
    ..._base.components,
    'Hero': _o0,                    // existing override
    'Playground': _r0,              // local rune
    'PricingCalculator': _r1,       // local rune
  }
};
```

The typeof value used as the registry key is the PascalCase form of the rune name (e.g., `pricing-calculator` → `PricingCalculator`).

### 3. Identity Transform — Skipped

Local runes do NOT participate in the identity transform. The engine's existing fallback handles this — unknown `typeof` values recurse children without BEM class application (engine.ts line 45).

The component owns all its styling via Svelte scoped styles. For external targeting, the `typeof` attribute on the wrapper element can be used as a CSS selector: `[typeof="Playground"]`.

## Name Collision Handling

If a local rune name matches a built-in rune name:
- **Built-in wins** — the local rune is skipped
- **Build-time warning** — `console.warn('[refrakt] Local rune "accordion" conflicts with built-in rune, skipping')`
- Check happens in the plugin during config loading, before schema generation

## Config Validation

Add validation to `packages/sveltekit/src/config.ts`:
- `runes` field is optional
- Each rune entry must have a `component` string
- `attributes` values must have valid `type` fields
- `children` must be `"none"` or `"render"` if present
- Rune names must be valid Markdoc tag names (lowercase, hyphens allowed)

## Type Changes

**`packages/types/src/theme.ts`** — Extend `RefraktConfig`:

```typescript
export interface RefraktConfig {
  contentDir: string;
  theme: string;
  target: string;
  overrides?: Record<string, string>;
  runes?: Record<string, LocalRuneConfig>;  // NEW
}
```

## Files Modified

| File | Action |
|------|--------|
| `packages/types/src/theme.ts` | Add `runes` field to `RefraktConfig` |
| `packages/runes/src/local.ts` | **Create** — `createLocalRuneTags()` schema factory |
| `packages/runes/src/index.ts` | Export local rune utilities |
| `packages/content/src/site.ts` | Extend `loadContent()` with `additionalTags` parameter |
| `packages/sveltekit/src/config.ts` | Add `runes` field validation |
| `packages/sveltekit/src/plugin.ts` | Generate local rune schemas, pass to content loading |
| `packages/sveltekit/src/virtual-modules.ts` | Merge local rune components into theme virtual module |
| `packages/runes/test/local.test.ts` | **Create** — tests for schema generation |
| `packages/sveltekit/test/plugin.test.ts` | Add tests for local rune integration |

## Deferred to Future Versions

| Feature | Rationale |
|---------|-----------|
| `passthrough` children mode | Niche use case; the need signals graduation to full rune |
| `category`, `icon` fields | Nothing consumes them yet |
| `seoType` / SEO extraction | Needs a generic extractor that doesn't exist |
| Multi-framework component paths | Only one adapter exists |
| Theme-provided runes (manifest.json) | Adds complexity; can be layered on later |
| VS Code language server support | Fast-follow after runtime v1 |
| Identity transform integration | Component owns styling; BEM integration = graduation signal |

## The Rune Lifecycle

Local runes create a natural upgrade path:

```
Local rune (config only, project-specific)
  → "This works well for our site"
  ↓
Published rune (defineRune(), npm package)
  → "Other people want this too"
  ↓
Built-in rune (merged into @refrakt-md/runes)
     "Community-proven, ships with the platform"
```

The local rune config is the incubator. It lowers the barrier to experimentation so radically that developers try things they wouldn't bother with if they had to learn the full rune API first.

## Verification

1. Create a test project with local runes in `refrakt.config.json`
2. `npm test` — all existing + new tests pass
3. `cd site && npm run build` — site builds with local runes
4. Verify local rune renders correctly in built output
5. Verify built-in runes inside a `children: "render"` local rune get full treatment
6. Verify name collision warning appears for conflicting names
7. `cd site && npm run dev` — dev mode works with local runes
