{% decision id="ADR-006" status="proposed" date="2026-04-03" tags="transform, pipeline, architecture, runes" %}

# Post-identity-transform hook for rune packages

## Context

The identity transform produces the final serialized tree with BEM classes, data attributes, and structural elements. After this step, certain runes need a **tree-wide post-processing pass** — walking the entire tree to find specific markers and replacing or enriching nodes.

Two concrete cases exist today:

1. **Syntax highlighting** (`@refrakt-md/highlight`): walks the post-identity-transform tree, finds nodes with `data-language`, extracts text content, runs it through Shiki, and replaces the children with highlighted HTML. Also contributes CSS (theme tokens).

2. **Math rendering** (proposed): would walk the same tree, find nodes with `data-math`, extract LaTeX content, run it through KaTeX, and replace children with rendered math HTML. Also contributes CSS.

Currently the highlighter is manually composed in the page load function:

```ts
const renderable = hl(transform(serialized));
```

Adding math rendering would nest further: `math(hl(transform(serialized)))`. Each additional post-processor adds another layer of manual wiring. Community packages that need this pattern have no hook point at all — users would need to manually integrate each transform function into their rendering pipeline.

### Why existing hooks don't work

| Hook | Problem |
|------|---------|
| `RuneConfig.postTransform` | Runs **inside** the identity transform, per-rune. Sees a single rune node, not the full tree. Cannot do tree-wide walks like "find all `data-language` anywhere." |
| `PackagePipelineHooks.postProcess` | Runs on `TransformedPage` **before** serialization and identity transform. The BEM-enhanced tree with data attributes doesn't exist yet. |

Neither hook operates at the right point in the pipeline.

## Options Considered

### 1. Keep ad-hoc function composition (status quo)

Each post-processor exports a standalone tree transform function. Users manually compose them in their page load function:

```ts
const renderable = math(hl(transform(serialized)));
```

**Pros:**
- No framework changes needed
- Explicit composition — easy to understand call order

**Cons:**
- Does not scale: each new post-processor adds manual wiring
- Community packages cannot participate without user intervention
- No standard way to aggregate contributed CSS
- Every SvelteKit adapter, Astro adapter, etc. must independently wire the same composition

### 2. Post-identity-transform hook on `RunePackage`

Add a new hook type to `RunePackage` that declares tree transforms to run after the identity transform:

```ts
interface RunePackage {
  // ... existing fields ...
  postIdentityTransform?: PostIdentityTransformHook[];
}

interface PostIdentityTransformHook {
  /** Human-readable name for debugging/logging */
  name: string;
  /** Factory that returns the tree transform (may be async for lazy loading) */
  init: () => Promise<TreeTransformFn> | TreeTransformFn;
  /** Optional CSS contributed by this transform */
  css?: string | (() => string | Promise<string>);
}

type TreeTransformFn = (tree: RendererNode) => RendererNode;
```

The `createTransform()` factory (or a new orchestrator) collects all hooks from loaded packages and chains them after the identity transform, in package order (core first, then community in config order).

**Pros:**
- Packages are self-contained: schema + config + post-transform hook ship together
- Automatically composed — no manual wiring in page load functions
- CSS aggregation is built in
- Framework adapters (SvelteKit, Astro) get post-processing for free
- `init()` factory supports lazy initialization (Shiki's async highlighter creation)
- Scales to any number of community packages

**Cons:**
- New concept to learn for package authors
- Ordering between community package hooks may matter in edge cases
- Slightly more indirection than explicit function composition

### 3. Post-identity-transform hook on `ThemeConfig`

Same as Option 2, but place the hook on `ThemeConfig` instead of `RunePackage`.

**Pros:**
- Theme controls all presentation, including post-processing

**Cons:**
- Conflates presentation config (declarative) with programmatic transforms
- A math package is not a "theme" — it's a rune package that happens to need post-processing
- Breaks the principle that `RunePackage` is the unit of distribution

### 4. Generic plugin system with lifecycle hooks

Introduce a full plugin architecture with named lifecycle phases:

```ts
interface RefraktPlugin {
  name: string;
  hooks: {
    beforeTransform?: (tree) => tree;
    afterTransform?: (tree) => tree;
    beforeRender?: (tree) => tree;
    // ... etc
  };
}
```

**Pros:**
- Maximum flexibility for future extension points

**Cons:**
- Over-engineered for the current need (only one hook point is missing)
- Introduces a parallel extension mechanism alongside `RunePackage`
- More API surface to maintain and document

## Decision

**Option 2: Post-identity-transform hook on `RunePackage`.**

## Rationale

`RunePackage` is already the unit of distribution for community runes. A math package ships its Markdoc schema, engine config, and now its post-identity-transform hook as one cohesive unit. This follows the existing pattern where `PackagePipelineHooks` lives on `RunePackage` — post-identity hooks are simply another kind of package-scoped behavior.

The `init()` factory pattern is essential because real-world post-processors like Shiki require async initialization (loading language grammars, creating highlighter instances). The factory is called once during setup, and the returned `TreeTransformFn` is called per-page — matching the existing `createTransform()` pattern.

Option 1 (status quo) breaks down as soon as a second post-processor appears — which is happening now with math. Option 3 misplaces the hook on the wrong abstraction. Option 4 is premature generalization.

Ordering is resolved by convention: core packages run first, then community packages in the order they appear in `refrakt.config.json`. This matches how `PackagePipelineHooks` already orders execution. If explicit ordering becomes necessary in the future, a `priority` field can be added without breaking changes.

## Consequences

1. **`@refrakt-md/highlight` becomes a `RunePackage`** (or augments one). Instead of exporting a standalone function, it exports a package with a `postIdentityTransform` hook. The existing standalone API can be preserved as a convenience wrapper.

2. **`createTransform()` gains hook awareness.** It accepts collected post-identity hooks and chains them after the identity transform pass. The return type stays `(tree: RendererNode) => RendererNode` but the function does more internally.

3. **CSS aggregation moves into the transform.** The transform function (or a companion) exposes collected CSS from all hooks, replacing the current `hl.css` pattern.

4. **SvelteKit plugin collects hooks automatically.** `packages/sveltekit/` already loads `RunePackage` objects from config — it would additionally collect their `postIdentityTransform` hooks and pass them to `createTransform()`.

5. **Page load functions simplify.** Instead of `hl(transform(serialized))`, it becomes just `transform(serialized)`. The composition is internal.

6. **Math rune package** can be implemented as a community package under `runes/` with a `postIdentityTransform` hook that applies KaTeX — no special wiring needed.

{% /decision %}
