{% spec id="SPEC-031" status="draft" tags="vite, architecture, frameworks" %}

# Vite Plugin — Framework-Agnostic Rune Integration

> A standalone `@refrakt-md/vite` plugin that lets developers use refrakt runes in existing Vite-based projects without adopting the full refrakt site editor or routing system. Complements SPEC-030 (Framework Adapter System) by providing a lighter-weight, framework-agnostic entry point.

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
| **SEO** | User extracts from frontmatter | Adapter generates meta tags |
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
  → Rune schema transforms (tags from @refrakt-md/runes + packages)
  → serialize() (Tag → plain objects)
  → createTransform() (identity transform — BEM classes, structure, meta)
  → renderToHtml() (serialized tree → HTML string)
  → emit JS module
```

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
export const frontmatter = { title: 'Perfect Sourdough', date: '2026-01-15' };
export const meta = { runes: ['recipe', 'hint'], packages: ['learning'] };
```

The user's page imports and renders it:

```svelte
<!-- +page.svelte (SvelteKit example) -->
<script>
  import { html, frontmatter } from './sourdough.md';
</script>

<h1>{frontmatter.title}</h1>
{@html html}
```

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
export const frontmatter = { title: 'Perfect Sourdough', date: '2026-01-15' };
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
| SEO generation | No — user handles | Yes — per-framework SEO |
| Component rendering | No — HTML string only | Yes — `renderToHtml()` + framework wrapper |
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

Estimated new code: ~300 lines (plugin glue, per-file transform wrapper, CSS virtual module).

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
---

{% hint type="note" %}
Start your levain 12 hours before you plan to mix the dough.
{% /hint %}

{% recipe name="Classic Sourdough" servings="2 loaves" time="24h" %}

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

The plugin transforms this into HTML with BEM classes (`.rf-recipe`, `.rf-recipe__body`, `.rf-hint--note`), structural elements, and data attributes — identical output to the full refrakt site. The user's `+layout.svelte` wraps it in their own navigation and footer.

---

## Astro Content Collections Integration

Astro is a particularly strong fit for this plugin because Astro already has native Markdoc support via `@astrojs/markdoc` and typed content collections. The vite plugin slots into this existing ecosystem without replacing it.

**How it works:** The user keeps their Astro content collections (`src/content/`) and `@astrojs/markdoc` integration. The `@refrakt-md/vite` plugin runs alongside them in the Vite pipeline, intercepting `.mdoc` files during the transform phase and applying rune schemas before Astro's own rendering.

**Content collections remain the content system.** Astro's Zod schemas validate frontmatter, `getCollection()` and `getEntry()` work as normal, and typed references between collections are unaffected. The plugin adds a second validation layer — Markdoc's schema validation catches invalid rune syntax at build time, while Zod catches invalid frontmatter. Two layers, complementary.

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

3. **Component rendering (Level 3)**: The original draft proposed a Level 3 that emits framework-native components instead of HTML strings. This overlaps significantly with SPEC-030's per-framework adapters. Recommendation: drop Level 3 from this spec — users wanting component-level integration should use the SPEC-030 adapters.

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
