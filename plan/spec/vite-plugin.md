{% spec id="SPEC-031" status="draft" tags="vite, architecture, frameworks" %}

# Vite Plugin — Framework-Agnostic Rune Integration

A standalone `@refrakt-md/vite` plugin that lets developers use refrakt runes in existing Vite-based projects without adopting the full refrakt site editor or routing system. Complements SPEC-030 (Framework Adapter System) by providing a lighter-weight, framework-agnostic entry point.

## Problem

Developers with existing Vite-based projects (SvelteKit, Nuxt, Astro, etc.) want to use refrakt runes in their markdown content without adopting the full refrakt site editor or routing system. They have their own layouts, routing, components, and build pipeline — they just want runes inside `.md` files.

Today, the only integration point is `@refrakt-md/sveltekit`, which is tightly coupled to SvelteKit's conventions (`refrakt.config.json` with `contentDir`, `theme`, `target`; virtual modules for theme/tokens/config; full content pipeline). There's no way to use runes in a project that just wants per-file markdown transforms.

## Relationship to SPEC-030

SPEC-030 defines **full framework adapters** — packages like `@refrakt-md/astro`, `@refrakt-md/nuxt`, `@refrakt-md/next`, `@refrakt-md/eleventy` that each own the content pipeline end-to-end: content loading, layout transform, SEO, behavior init, routing integration. They replace the project's content system.

This spec defines a **lightweight Vite plugin** that sits below those adapters. It transforms `.md` files in-place during the Vite build and emits consumable modules. It does not own routing, layouts, SEO, or content loading — the user's framework handles all of that.

The two specs are complementary, not competing:

| Concern | `@refrakt-md/vite` (this spec) | SPEC-030 adapters |
|---------|--------------------------------|---------------------|
| **Scope** | Per-file rune transforms | Full content pipeline |
| **Routing** | User's framework | Adapter-managed |
| **Layouts** | User's framework | `layoutTransform()` |
| **SEO** | Extracted and exported; user injects into `<head>` | Adapter injects into `<head>` automatically |
| **Content loading** | User imports `.md` as module | `loadContent()` pipeline |
| **Cross-page features** | Opt-in (Level 2) | Always available |
| **Target user** | "I want runes in my existing site" | "I want a refrakt-powered site" |

SPEC-030's Vite-based adapters (Astro, Nuxt) could use `@refrakt-md/vite` internally for shared Vite plugin logic (virtual modules, HMR, CSS injection), but that's an implementation detail for those adapters to decide.

---

## Design Principles

**Zero intrusion.** The plugin transforms markdown files. It does not touch routing, layouts, data loading, server-side logic, or any other aspect of the user's project.

**Progressive depth.** Two integration levels, each building on the last. Users start with Level 1 (static transforms, zero config beyond package selection) and opt into Level 2 only when they need cross-page features.

**Framework-agnostic core.** The transform pipeline — Markdoc parse, rune schema transforms, identity transform (`createTransform` from `@refrakt-md/transform`), HTML emission (`renderToHtml`) — has no framework dependency.

---

## Architecture

```
User's Vite project
├── vite.config.js          ← registers @refrakt-md/vite plugin
├── src/routes/             ← their routing (untouched)
│   └── blog/
│       ├── +layout.svelte  ← their layout wraps rendered markdown
│       └── sourdough.md    ← runes work here
└── node_modules/
    ├── @refrakt-md/vite      ← this plugin
    ├── @refrakt-md/transform  ← identity transform engine + renderToHtml
    ├── @refrakt-md/runes      ← core rune schemas + config
    ├── @refrakt-md/lumina     ← theme CSS + design tokens
    └── @refrakt-md/learning   ← installed community package
```

The plugin intercepts `.md` files during Vite's `transform` hook, runs them through the refrakt pipeline, and emits a JS module exporting rendered HTML and frontmatter.

---

## Configuration

```javascript
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { refrakt } from '@refrakt-md/vite';

export default {
  plugins: [
    refrakt({
      // Installed rune packages — official and community
      packages: [
        '@refrakt-md/learning',
        '@refrakt-md/docs',
      ],

      // Integration level (default: 'static')
      // 'static'   — Level 1: per-file transforms, no cross-page awareness
      // 'pipeline'  — Level 2: full cross-page pipeline with entity registry
      level: 'static',

      // Theme for CSS (default: '@refrakt-md/lumina')
      // Can be a published theme package or path to custom CSS
      theme: '@refrakt-md/lumina',

      // Include structural CSS automatically (default: true)
      // When true, CSS is injected via virtual module
      // When false, user imports it manually
      injectCSS: true,

      // File extensions to process (default: ['.md'])
      extensions: ['.md'],

      // Content directory — only needed for Level 2
      contentDir: './src/content',
    }),
    sveltekit(),
  ]
};
```

Minimal configurations:

```javascript
// Just runes in markdown, no packages
refrakt()

// With community packages
refrakt({ packages: ['@refrakt-md/learning'] })

// With cross-page features
refrakt({ level: 'pipeline', contentDir: './src/content' })
```

---

## Integration Levels

### Level 1: Static Transform (default)

Each `.md` file is independently parsed, transformed, and rendered. No awareness of other files. No entity registry.

**Pipeline per file:**

```
.md file
  → Markdoc.parse()
  → extract frontmatter from AST
  → Markdoc.transform(ast, { tags, variables: { frontmatter, ... } })
      ↳ Rune schema transforms (tags from @refrakt-md/runes + packages)
      ↳ $frontmatter.* references resolved to concrete values
  → serialize() (Tag → plain objects)
  → createTransform() (identity transform — BEM classes, structure, meta)
  → renderToHtml() (serialized tree → HTML string)
  → emit JS module
```

**Frontmatter as Markdoc variables:** The plugin extracts YAML frontmatter from the parsed AST and passes it to `Markdoc.transform()` as `variables.frontmatter`, matching the existing content pipeline in `packages/content/src/site.ts`. This means authors can reference frontmatter fields in rune attributes using Markdoc's native variable syntax — e.g., `{% recipe servings=$frontmatter.servings %}`. By the time the rune schema's `transform()` runs, variable references are already resolved to concrete values.

This reuses the existing pipeline stages from `@refrakt-md/transform`. The identity transform engine (`packages/transform/src/engine.ts`) applies BEM classes (`.rf-{block}`, `.rf-{block}--{modifier}`, `.rf-{block}__{element}`), injects structural elements, reads meta tags, and strips consumed metadata — exactly as it does in the full site.

**What works:** All self-contained runes render correctly — `hint`, `tabs`, `figure`, `recipe`, `howto`, `character`, `sandbox`, `datatable`, `chart`, `diagram`, `math`, `gallery`, `stat`, and everything else that operates within a single page. Vanilla JS behaviors from `@refrakt-md/behaviors` (accordion toggle, tab switching, datatable sorting) attach automatically.

**What doesn't work** (requires Level 2):

- `breadcrumb` — needs page hierarchy
- `nav` — needs page tree
- `glossary` auto-linking — needs cross-page term registry
- `prerequisite` graph — needs cross-page lesson registry
- Storytelling cross-links — character names don't become links

These runes render as static content without their cross-page features and emit a build warning.

**Output module format:**

```javascript
// What the plugin emits for sourdough.md
export const html = '<article class="rf-page">...</article>';
export const tree = { $$mdtype: 'Tag', name: 'article', attributes: { class: 'rf-page' }, children: [...] };
export const frontmatter = { title: 'Perfect Sourdough', date: '2026-01-15' };
export const seo = {
  jsonLd: [
    { '@context': 'https://schema.org', '@type': 'Recipe', name: 'Classic Sourdough', ... }
  ],
  og: { title: 'Perfect Sourdough', description: '...', image: null, type: 'website' },
};
export const meta = { runes: ['recipe', 'hint'], packages: ['learning'] };
```

The `html` export is the common path — most users render it directly. The `tree` export is the serialized tag tree after identity transform (the intermediate form before `renderToHtml()` flattens it). Users who need component-level control over specific runes use `tree` instead — see "Component Override Pattern" below.

The `seo` export contains structured SEO data extracted from the rendered tree via `extractSeo()` from `@refrakt-md/runes`. Runes emit RDFa attributes (`typeof`, `property`) during schema transform, and the identity transform preserves them. The extraction walks the tree and produces JSON-LD objects (schema.org structured data) and Open Graph metadata (title, description, image — derived from frontmatter, hero runes, or first heading/paragraph as fallback). The user injects this into their framework's `<head>`:

```svelte
<!-- SvelteKit: +page.svelte -->
<script>
  import { html, seo } from './sourdough.md';
</script>

<svelte:head>
  {#if seo.og.title}<title>{seo.og.title}</title>{/if}
  {#if seo.og.description}<meta name="description" content={seo.og.description} />{/if}
  {#each seo.jsonLd as schema}
    {@html `<script type="application/ld+json">${JSON.stringify(schema)}</script>`}
  {/each}
</svelte:head>

{@html html}
```

```astro
---
// Astro: [...slug].astro
import { html, seo } from './sourdough.md';
---

<html>
  <head>
    {seo.og.title && <title>{seo.og.title}</title>}
    {seo.og.description && <meta name="description" content={seo.og.description} />}
    {seo.jsonLd.map(schema => (
      <script type="application/ld+json" set:html={JSON.stringify(schema)} />
    ))}
  </head>
  <body>
    <Fragment set:html={html} />
  </body>
</html>
```

The SEO extraction is automatic — any rune that declares a `schemaOrgType` (Recipe, FAQPage, BreadcrumbList, ImageObject, VideoObject, etc.) produces JSON-LD. The user just needs to inject the output into `<head>`.

### Level 2: Cross-Page Pipeline

The full pipeline from `@refrakt-md/content` runs at build time. The plugin scans all `.md` files in `contentDir`, builds the `EntityRegistry`, runs aggregation and post-processing via `runPipeline()`, then emits enriched HTML.

This uses the existing four-phase cross-page pipeline (`packages/content/src/pipeline.ts`):

1. **Parse** all `.md` files, run rune schema transforms
2. **Register** — each package's `register()` hook indexes entities into `EntityRegistryImpl`
3. **Aggregate** — `aggregate()` hooks build cross-page indexes (pageTree, breadcrumbPaths, headingIndex)
4. **Post-process** — `postProcess()` hooks resolve deferred sentinels using aggregated data

**What additionally works:** `breadcrumb`, `nav`, `glossary` auto-linking, `prerequisite` graphs, storytelling cross-links.

**Build integration:** The plugin uses Vite's `buildStart` hook to run the full pipeline (same pattern as the existing `packages/sveltekit/src/plugin.ts`). Results are cached in memory. Individual file `transform` calls read from the cache.

**Dev server:** In dev mode, file changes trigger re-parse of the changed file. If the change affects registered entities, dependent files are re-processed. The `crossPageDeps` metadata enables targeted invalidation.

**Output module format:**

```javascript
export const html = '<article class="rf-page">...</article>';
export const tree = { $$mdtype: 'Tag', name: 'article', ... };
export const frontmatter = { title: 'Perfect Sourdough', date: '2026-01-15' };
export const seo = {
  jsonLd: [{ '@context': 'https://schema.org', '@type': 'Recipe', ... }],
  og: { title: 'Perfect Sourdough', description: '...', type: 'website' },
};
export const meta = {
  runes: ['recipe', 'hint', 'glossary'],
  packages: ['learning'],
  entities: [
    { type: 'term', name: 'levain', page: '/recipes/sourdough/' }
  ],
  crossPageDeps: ['/glossary/'],
};
```

**Page hierarchy derivation:** Since the plugin doesn't control routing, it derives page hierarchy from the file system relative to `contentDir`. Frontmatter can override title and slug.

---

## CSS Strategy

The plugin provides CSS through a virtual module, following the same pattern as the existing `virtual:refrakt/tokens` module in `@refrakt-md/sveltekit`.

### CSS load order

```
1. Theme base tokens       ← design token custom properties (--rf-color-*, --rf-radius-*, etc.)
2. Per-rune structural CSS ← BEM selectors (.rf-hint, .rf-hint__body, etc.)
3. Package rune CSS        ← community package styles
4. User theme overrides    ← user's custom CSS (highest precedence)
```

When `injectCSS: true` (default), the plugin provides a `virtual:refrakt/styles` module that imports the appropriate CSS files. This mirrors the existing `virtual:refrakt/tokens` module but is framework-agnostic.

### CSS tree-shaking

At build time, the plugin can analyze which runes are actually used across all content (via `analyzeRuneUsage` from `@refrakt-md/content`) and include only the CSS for those runes. This is the same optimization the existing SvelteKit plugin performs in `buildStart`.

When tree-shaking is active, the virtual module imports only:

- Theme base CSS (always)
- Per-rune CSS files for runes found in content (e.g., `@refrakt-md/lumina/styles/runes/hint.css`)
- `tint.css` (always — tint is a universal attribute)

---

## Behaviors

The plugin includes `@refrakt-md/behaviors` for interactive features — accordion toggling, tab switching, datatable sorting, details animation.

In SPA frameworks (SvelteKit, Nuxt), behaviors need re-initialization after client-side navigation. The plugin exports a helper:

```javascript
import { initBehaviors } from '@refrakt-md/vite/behaviors';

// SvelteKit
afterNavigate(() => initBehaviors(document.querySelector('.rf-page')));

// Vue/Nuxt
onMounted(() => initBehaviors(document.querySelector('.rf-page')));
watch(() => route.path, () => nextTick(() => initBehaviors(...)));

// Astro (MPA) — automatic, no re-init needed
```

This is a thin wrapper around `initRuneBehaviors()` from `@refrakt-md/behaviors`.

---

## Component Override Pattern

Most users render the `html` export directly and style runes with CSS. But some users need to replace a specific rune with a framework-native component — for example, rendering Recipe as a custom Astro component with a different layout, interactive islands, or additional data fetching.

The `tree` export makes this possible. The tree is the serialized tag tree after identity transform — the same intermediate form that `renderToHtml()` consumes. Each rune subtree has a `typeof` attribute identifying its type (`Recipe`, `Hint`, `Tabs`, etc.), BEM classes, data attributes, and structured children with `data-name` labels.

### How it works

The user writes a thin renderer component for their framework that walks the top-level children of the tree. For each child:

- If its `typeof` matches a component in their override map → render their custom component, passing the subtree as a prop
- Otherwise → render the subtree to HTML via `renderToHtml()` (the default Lumina output)

This is **not** a recursive walk of every node. The renderer only inspects top-level rune boundaries. Everything inside a non-overridden rune is bulk-rendered to HTML, avoiding recursion depth issues.

### Astro example

```astro
---
// src/components/RefrактRenderer.astro
import type { SerializedTag, RendererNode } from '@refrakt-md/types';
import { renderToHtml } from '@refrakt-md/transform';

interface Props {
  tree: SerializedTag;
  components?: Record<string, any>;
}

const { tree, components = {} } = Astro.props;

// Walk top-level children, check typeof for component overrides
function categorize(children: RendererNode[]) {
  return children.map(child => {
    if (typeof child === 'string' || !child?.attributes?.typeof) {
      return { kind: 'html' as const, html: renderToHtml(child) };
    }
    const Component = components[child.attributes.typeof];
    if (Component) {
      return { kind: 'component' as const, Component, node: child };
    }
    return { kind: 'html' as const, html: renderToHtml(child) };
  });
}

const sections = categorize(tree.children ?? []);
---

{sections.map(section =>
  section.kind === 'component' ? (
    <section.Component node={section.node} />
  ) : (
    <Fragment set:html={section.html} />
  )
)}
```

The user's page:

```astro
---
// src/pages/recipes/[...slug].astro
import { getCollection } from 'astro:content';
import Renderer from '../../components/RefraktRenderer.astro';
import Recipe from '../../components/Recipe.astro';

export async function getStaticPaths() {
  const recipes = await getCollection('recipes');
  return recipes.map(entry => ({
    params: { slug: entry.slug },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { tree, frontmatter } = await entry.render();
---

<html>
  <body>
    <h1>{frontmatter.title}</h1>
    <!-- Everything renders as Lumina HTML except Recipe -->
    <Renderer {tree} components={{ Recipe }} />
  </body>
</html>
```

The custom Recipe component receives the full rune subtree and can render it however it wants — restructuring children, adding Astro islands for interactivity, or mixing `renderToHtml()` for subsections it doesn't need to customize:

```astro
---
// src/components/Recipe.astro
import { renderToHtml } from '@refrakt-md/transform';
import Timer from './Timer.astro'; // an interactive island

const { node } = Astro.props;
const title = node.children.find(c => c.attributes?.['data-name'] === 'title');
const ingredients = node.children.find(c => c.attributes?.['data-name'] === 'ingredients');
const steps = node.children.find(c => c.attributes?.['data-name'] === 'steps');
---

<div class="my-recipe-card">
  <div class="my-recipe-card__sidebar">
    <Fragment set:html={renderToHtml(ingredients)} />
  </div>
  <div class="my-recipe-card__main">
    <Fragment set:html={renderToHtml(title)} />
    <Timer client:visible duration={node.attributes?.['data-time']} />
    <Fragment set:html={renderToHtml(steps)} />
  </div>
</div>
```

### SvelteKit example

The same pattern works in SvelteKit. The user ignores `html`, imports `tree`, and writes a small renderer that checks component overrides:

```svelte
<!-- src/lib/RefraktRenderer.svelte -->
<script>
  import { renderToHtml } from '@refrakt-md/transform';

  export let tree;
  export let components = {};
</script>

{#each tree.children ?? [] as child}
  {@const typeName = child?.attributes?.typeof}
  {@const Component = typeName ? components[typeName] : null}
  {#if Component}
    <Component node={child} />
  {:else}
    {@html renderToHtml(child)}
  {/if}
{/each}
```

### When to use each approach

| Need | Approach |
|------|----------|
| Different visual styling for a rune | CSS override on `.rf-{block}` classes |
| Client-side interactivity (framework-agnostic) | Web component via `@refrakt-md/behaviors` |
| Custom HTML structure or framework-native interactivity | `tree` export + component override |

The `tree` export is always available but most users won't need it. The `html` export covers the common case.

The renderer components shown above are shipped by the plugin as optional framework-specific exports (e.g., `@refrakt-md/vite/astro`), re-exported from the corresponding SPEC-030 adapter packages. Users don't need to write the renderer boilerplate themselves — they import it, pass `tree` and their component overrides, and the renderer handles dispatch and `renderToHtml()` fallback.

---

## Package Discovery

The plugin discovers rune packages through the same mechanism as the existing SvelteKit plugin. Packages listed in the `packages` config are dynamically imported, their `RunePackage` exports are loaded via `loadRunePackage()` from `@refrakt-md/runes`, and merged with core runes via `mergePackages()`.

Community packages work identically to official packages — the plugin doesn't distinguish between `@refrakt-md/learning` and `@refrakt-community/dnd-5e`.

---

## Dev Server

**Hot reload:** When a `.md` file changes, the plugin re-transforms it and triggers Vite's HMR via `server.moduleGraph.invalidateModule()` + full reload. This matches the existing HMR implementation in `packages/sveltekit/src/content-hmr.ts`.

**Level warnings:** Runes requiring Level 2 that are running at Level 1 emit terminal warnings:

```
[refrakt] breadcrumb in /blog/my-post.md requires level: 'pipeline'
          Set level: 'pipeline' in plugin config for cross-page features.
```

---

## NPM Package Structure

```
@refrakt-md/vite
├── src/
│   ├── index.ts           ← plugin entry, config parsing
│   ├── transform.ts       ← per-file transform (Markdoc parse → renderToHtml)
│   ├── pipeline.ts        ← Level 2 cross-page pipeline integration
│   ├── virtual-css.ts     ← CSS virtual module generation
│   ├── hmr.ts             ← dev server hot reload
│   └── behaviors.ts       ← framework-agnostic behavior init helper
├── package.json
└── tsconfig.json
```

Dependencies:

- `@refrakt-md/transform` — identity transform engine, `renderToHtml()`, `createTransform()`
- `@refrakt-md/runes` — core rune schemas, `coreConfig`, `loadRunePackage()`, `mergePackages()`
- `@refrakt-md/types` — `RunePackage`, `SerializedTag`, pipeline types
- `@markdoc/markdoc` — Markdoc parser

Peer dependency:

- `vite` — `^5.0.0 || ^6.0.0`

Optional peer dependencies (for Level 2):

- `@refrakt-md/content` — `runPipeline()`, `EntityRegistryImpl`, `analyzeRuneUsage()`

---

## What This Plugin Is Not

This plugin is **not** a replacement for the full framework adapters defined in SPEC-030. Key differences:

| Feature | `@refrakt-md/vite` | SPEC-030 adapters |
|---------|---------------------|---------------------|
| Layout system | No — user's framework | Yes — `layoutTransform()` |
| SEO extraction | Yes — exported as `seo` | Yes — same extraction |
| SEO `<head>` injection | No — user injects | Yes — adapter injects automatically |
| Component rendering | Yes — optional renderer via `@refrakt-md/vite/{framework}` | Yes — `renderToHtml()` + framework wrapper |
| Content routing | No — user's framework | Yes — `loadContent()` + framework routing |
| Web components | No — user initializes | Yes — adapter handles `RfContext` |
| Behavior lifecycle | Helper exported | Adapter manages fully |

Users wanting the full refrakt experience in a non-SvelteKit framework should use the SPEC-030 adapters. Users wanting just runes in their existing content should use this plugin.

---

## Reuse from Existing Codebase

The implementation draws heavily from existing code:

| Component | Source | Reuse strategy |
|-----------|--------|----------------|
| Markdoc parse + schema transforms | `@refrakt-md/runes` | Direct import |
| Identity transform | `@refrakt-md/transform/engine.ts` | `createTransform()` |
| HTML rendering | `@refrakt-md/transform/html.ts` | `renderToHtml()` |
| Serialization | `@refrakt-md/transform` (or `@refrakt-md/svelte` pending SPEC-030 Phase 0 extraction) | Direct import |
| Package loading | `@refrakt-md/runes/packages.ts` | `loadRunePackage()`, `mergePackages()` |
| CSS tree-shaking | `@refrakt-md/content/analyze.ts` | `analyzeRuneUsage()` |
| Cross-page pipeline | `@refrakt-md/content/pipeline.ts` | `runPipeline()` |
| Virtual module pattern | `@refrakt-md/sveltekit/virtual-modules.ts` | Adapted (simplified) |
| HMR pattern | `@refrakt-md/sveltekit/content-hmr.ts` | Adapted (simplified) |
| SSR noExternal list | `@refrakt-md/sveltekit/plugin.ts` | Same `CORE_NO_EXTERNAL` pattern |
| Component interface extraction | `@refrakt-md/transform/helpers.ts` | `extractComponentInterface()` |
| Per-framework renderers | `@refrakt-md/{astro,svelte,react,vue}` | Re-export as `@refrakt-md/vite/{framework}` |

Estimated new code: ~300 lines (plugin glue, per-file transform wrapper, CSS virtual module). Framework-specific renderer exports are re-exports, not new code.

---

## Example: SvelteKit Blog with Recipes

```javascript
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { refrakt } from '@refrakt-md/vite';

export default {
  plugins: [
    refrakt({ packages: ['@refrakt-md/learning'] }),
    sveltekit(),
  ]
};
```

```markdoc
---
title: Perfect Sourdough
date: 2026-01-15
servings: 2 loaves
time: 24h
---

{% hint type="note" %}
Start your levain 12 hours before you plan to mix the dough.
{% /hint %}

{% recipe name=$frontmatter.title servings=$frontmatter.servings time=$frontmatter.time %}

## Ingredients
- 500g bread flour
- 350g water
- 100g active levain
- 10g salt

## Steps
1. Mix flour and water, rest 30 minutes (autolyse)
2. Add levain and salt, fold to incorporate
3. Bulk ferment 4-5 hours with stretch-and-folds every 30 minutes
4. Shape and place in bannetons
5. Cold retard overnight (12-16 hours)
6. Preheat Dutch oven to 260C
7. Score and bake: 20 min covered, 20 min uncovered at 230C

{% /recipe %}
```

Frontmatter fields are available as `$frontmatter.*` variables inside rune attributes. This avoids duplicating values between frontmatter and tag attributes — the Zod schema (in Astro) or framework validates the shape, and the rune consumes the values via variable references.

The plugin transforms this into HTML with BEM classes (`.rf-recipe`, `.rf-recipe__body`, `.rf-hint--note`), structural elements, and data attributes — identical output to the full refrakt site. The user's `+layout.svelte` wraps it in their own navigation and footer.

---

## Astro Content Collections Integration

Astro is a particularly strong fit for this plugin because Astro already has native Markdoc support via `@astrojs/markdoc` and typed content collections. The vite plugin slots into this existing ecosystem without replacing it.

**How it works:** The user keeps their Astro content collections (`src/content/`) and `@astrojs/markdoc` integration. The `@refrakt-md/vite` plugin runs alongside them in the Vite pipeline, intercepting `.mdoc` files during the transform phase and applying rune schemas before Astro's own rendering.

**Content collections remain the content system.** Astro's Zod schemas validate frontmatter, `getCollection()` and `getEntry()` work as normal, and typed references between collections are unaffected. The plugin adds a second validation layer — Markdoc's schema validation catches invalid rune syntax at build time, while Zod catches invalid frontmatter. Two layers, complementary.

**Frontmatter as Markdoc variables:** The plugin passes parsed frontmatter into `Markdoc.transform()` as `variables.frontmatter`, so authors can reference Zod-validated fields directly in rune attributes — e.g., `{% recipe servings=$frontmatter.servings %}`. This bridges Astro's type-safe content layer with Markdoc's variable system: Zod validates that `servings` exists and is a string, Markdoc resolves `$frontmatter.servings` to its value, and the rune schema receives a concrete string. One source of truth in frontmatter, no duplication in tag attributes. Note that Zod validates the frontmatter **shape** but not which fields are actually **referenced** — a typo like `$frontmatter.sevrings` silently resolves to `undefined`. Markdoc's own schema validation can catch this if the rune attribute is marked as required.

**Example project structure:**

```
src/content/
  config.ts              ← Astro collection schemas (Zod)
  recipes/
    sourdough.mdoc       ← runes work here via @astrojs/markdoc
    pasta.mdoc
  docs/
    getting-started.mdoc
src/pages/
  recipes/
    [...slug].astro      ← renders content via entry.render()
```

```typescript
// src/content/config.ts — standard Astro content config
import { defineCollection, z } from 'astro:content';

const recipes = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    servings: z.string(),
    prepTime: z.string(),
  }),
});

export const collections = { recipes };
```

```markdoc
---
# src/content/recipes/sourdough.mdoc
# Frontmatter validated by Zod schema above
title: Perfect Sourdough
servings: 2 loaves
prepTime: 30 minutes
---

# {% $frontmatter.title %}

{% recipe name=$frontmatter.title servings=$frontmatter.servings time=$frontmatter.prepTime %}

## Ingredients
- 500g bread flour
- 350g water
- 100g active levain
- 10g salt

## Steps
1. Mix flour and water, rest 30 minutes (autolyse)
2. Add levain and salt, fold to incorporate
3. Bulk ferment 4-5 hours, stretch-and-fold every 30 minutes
4. Shape and cold retard overnight
5. Bake in Dutch oven at 260C

{% /recipe %}
```

The `$frontmatter.*` references are resolved during `Markdoc.transform()` — the recipe rune receives `"2 loaves"` for `servings`, not the variable reference. If a frontmatter field is missing, the Zod schema catches it at build time before Markdoc ever runs.

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import markdoc from '@astrojs/markdoc';
import { refrakt } from '@refrakt-md/vite';

export default defineConfig({
  integrations: [markdoc()],
  vite: {
    plugins: [
      refrakt({ packages: ['@refrakt-md/learning'] }),
    ],
  },
});
```

```astro
---
// src/pages/recipes/[...slug].astro — standard Astro content page
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const recipes = await getCollection('recipes');
  return recipes.map(entry => ({
    params: { slug: entry.slug },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await entry.render();
---

<html>
  <body>
    <h1>{entry.data.title}</h1>
    <Content />
  </body>
</html>
```

The plugin transforms runes during `entry.render()` — the output HTML contains BEM classes, structural elements, and data attributes identical to any other refrakt integration. The user's Astro layout wraps it.

**Relationship to SPEC-030's Astro adapter:** This is the lightweight alternative. SPEC-030's `@refrakt-md/astro` adapter replaces Astro's content system with `loadContent()` and provides layouts, SEO, and full cross-page pipeline out of the box. This plugin leaves Astro's content collections intact and adds rune rendering only. Users who want cross-page rune features (glossary auto-linking, breadcrumbs) can use Level 2, which builds the entity registry from `.mdoc` files discovered in `contentDir`.

---

## Open Questions

1. **Relationship to `@refrakt-md/sveltekit`**: Should the existing SvelteKit plugin be refactored to use `@refrakt-md/vite` internally? This would reduce duplication but adds a dependency layer. The SvelteKit plugin's virtual modules (`virtual:refrakt/theme`, `virtual:refrakt/tokens`, `virtual:refrakt/config`) are more complex than what this plugin needs.

2. **SPEC-030 Phase 0 dependency**: `serialize.ts` currently lives in `@refrakt-md/svelte`. SPEC-030 Phase 0 moves it to `@refrakt-md/transform`. This plugin needs serialization — should it wait for Phase 0, or import from `@refrakt-md/svelte` initially?

3. **Component rendering (Level 3)**: ~~The original draft proposed a Level 3 that emits framework-native components instead of HTML strings. This overlaps significantly with SPEC-030's per-framework adapters. Recommendation: drop Level 3 from this spec — users wanting component-level integration should use the SPEC-030 adapters.~~

   **Resolved: ship thin renderer components as optional framework-specific exports, not a separate "Level 3."**

   The original concern was that a component-rendering level would duplicate SPEC-030's adapters. But the two serve different purposes: SPEC-030 adapters replace the user's content system entirely, while this plugin sits alongside it. A developer using Astro content collections who wants to override Recipe with a custom `.astro` component shouldn't have to switch to the full `@refrakt-md/astro` adapter just for that.

   The infrastructure already exists and can be reused directly:

   - **Framework-agnostic core**: `extractComponentInterface()` from `@refrakt-md/transform` (`packages/transform/src/helpers.ts`) partitions a rune's children into `properties`, `refs`, and `children` — the same structured interface regardless of framework. `renderToHtml()` handles fallback rendering for non-overridden runes.
   - **Per-framework renderers**: `packages/astro/src/RfRenderer.astro` and `packages/svelte/src/Renderer.svelte` already implement the dispatch pattern — check `data-rune` attribute, look up in component registry, render custom component or fall back to `renderToHtml()`. The same pattern is established via `registry.ts` in `packages/react/` and `packages/vue/`.
   - **Component registry**: `Record<string, ComponentType>` — identical interface across all frameworks. The user populates it with `typeof` → component mappings.

   The vite plugin exposes this via optional framework-specific entry points:

   ```javascript
   // User imports the renderer for their framework
   import { RefraktRenderer } from '@refrakt-md/vite/astro';
   import { RefraktRenderer } from '@refrakt-md/vite/react';
   import { RefraktRenderer } from '@refrakt-md/vite/vue';
   import { RefraktRenderer } from '@refrakt-md/vite/svelte';
   ```

   These are re-exports of the existing renderer components from `@refrakt-md/astro`, `@refrakt-md/svelte`, etc. — not new code. The plugin's `tree` export feeds directly into the renderer's `tree` prop.

   This means the plugin config stays unchanged (no `components` option at the plugin level — component overrides are a rendering concern, not a transform concern). The user imports `tree` instead of `html`, passes it to the framework-specific renderer with their override map, and gets selective component rendering with `renderToHtml()` fallback for everything else. The "Component Override Pattern" section above already documents this flow; the only change is that the renderer component is shipped rather than DIY.

   **What this is NOT**: The plugin does not generate framework-native component code, does not emit `.astro`/`.jsx`/`.vue` files, and does not know which framework the user is running. The framework-specific entry points are optional peer-dependency-gated re-exports. Users who only need `html` never touch this.

---

## References

- SPEC-030 — Framework Adapter System
- SPEC-013 — Multi-Framework Support: Layout Transform Architecture
- ADR-001 — Astro Readiness Investigation
- ADR-002 — Framework Readiness Investigation
- `packages/sveltekit/src/plugin.ts` — existing Vite plugin implementation
- `packages/transform/src/engine.ts` — identity transform engine
- `packages/transform/src/html.ts` — `renderToHtml()`

{% /spec %}
