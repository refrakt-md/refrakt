# Vite Plugin — Specification

> **Status:** Design proposal
> **Scope:** Framework-agnostic Vite plugin for rendering refrakt.md runes in existing projects
> **Related:** Cross-Page Pipeline Specification, Community Runes Specification

-----

## Problem

Developers with existing Vite-based projects (SvelteKit, Nuxt, Astro, Remix, etc.) want to use refrakt.md runes in their markdown content without adopting the full refrakt.md site editor or routing system. They have their own layouts, routing, components, and build pipeline — they just want runes inside `.md` files.

Today, there’s no way to use runes outside the refrakt.md ecosystem. The Vite plugin is the lightest possible integration point: it slots into their existing build pipeline, transforms Markdoc files into rendered HTML, and leaves everything else untouched.

-----

## Design Principles

**Zero intrusion.** The plugin transforms markdown files. It does not touch routing, layouts, data loading, server-side logic, or any other aspect of the user’s project. Their framework owns the architecture. The plugin owns the content transform.

**Progressive depth.** Three integration levels, each building on the last. Users start with Level 1 (static transforms, zero config beyond package selection) and opt into deeper integration only when they need it.

**Framework-agnostic core.** The transform pipeline — Markdoc parse, rune transforms, identity transform, HTML emission — has no framework dependency. Framework-specific adapters are optional layers on top.

-----

## Architecture

```
User's Vite project
├── vite.config.js          ← registers @refrakt-md/vite plugin
├── src/routes/             ← their routing (SvelteKit example)
│   ├── +page.svelte        ← their pages, untouched
│   ├── +layout.svelte      ← their layouts, untouched
│   └── blog/
│       ├── +layout.svelte  ← their blog layout wraps rendered markdown
│       ├── my-post.md      ← runes work here
│       └── recipes/
│           └── sourdough.md ← and here
└── node_modules/
    ├── @refrakt-md/vite    ← the plugin
    ├── @refrakt-md/transform ← rune transform pipeline
    ├── @refrakt-md/base    ← structural CSS + design tokens
    └── @refrakt/learning   ← installed official package
```

The plugin intercepts `.md` files during Vite’s transform phase, runs them through the refrakt.md pipeline, and emits framework-consumable output (HTML string, or framework component at higher integration levels).

-----

## Configuration

```javascript
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { refrakt } from '@refrakt-md/vite';

export default {
  plugins: [
    refrakt({
      // Which file extensions to process (default: ['.md'])
      extensions: ['.md'],
      
      // Installed packages — official and community
      packages: [
        '@refrakt/learning',
        '@refrakt/docs',
        '@refrakt-community/dnd-5e',
      ],
      
      // Theme CSS — path to custom theme or name of published theme
      theme: './src/theme/my-theme.css',
      
      // Integration level (default: 'static')
      // 'static' — Level 1: per-file transforms, no cross-page awareness
      // 'pipeline' — Level 2: full cross-page pipeline with entity registry
      level: 'static',
      
      // Include base CSS automatically (default: true)
      // When true, base structural CSS is injected into the output
      // When false, user imports it manually for more control
      injectBaseCSS: true,
      
      // Directory containing .md files to process (default: auto-detected)
      // Only needed for Level 2 to know which files participate in the pipeline
      contentDir: './src/routes',
    }),
    sveltekit(),
  ]
};
```

Minimal configuration for common cases:

```javascript
// Just runes in markdown, no packages
refrakt()

// With a few packages
refrakt({ packages: ['@refrakt/learning'] })

// With cross-page features
refrakt({ packages: ['@refrakt/learning'], level: 'pipeline' })
```

-----

## Integration Levels

### Level 1: Static Transform

**What it does:** Each `.md` file is independently parsed, transformed, and rendered. No awareness of other files. No entity registry. No cross-page linking.

**What works:**

All runes that are self-contained render correctly — `hint`, `tabs`, `figure`, `budget`, `recipe`, `howto`, `character`, `sandbox`, `datatable`, `chart`, `diagram`, `math`, `gallery`, `stat`, and everything else that operates within a single page.

Vanilla JS behaviours (accordion toggle, tab switching, datatable sorting) are included via the base behaviour script.

Design runes render visually (palette swatches, typography specimens) but do not propagate context to sandbox runes on other pages. Within the same file, a design context declared above a sandbox does propagate — the plugin handles intra-page context as part of the single-file transform.

**What doesn’t work:**

- `breadcrumb` — needs page hierarchy (renders empty or with a warning)
- `nav` — needs page tree (renders empty or with a warning)
- `glossary` auto-linking — needs cross-page term registry
- `prerequisite` graph — needs cross-page lesson registry
- Storytelling cross-links — bold character names don’t become links
- Cross-page design context propagation — sandbox only receives tokens from its own page

These runes either render as static content without their cross-page features, or emit a build warning explaining that Level 2 is needed.

**Pipeline:**

```
.md file
  → Markdoc parse
  → Rune transforms (per-file)
  → Intra-page context resolution (design tokens → sandbox on same page)
  → Identity transform
  → HTML string + frontmatter export
```

**Output:** The plugin emits a module that exports the rendered HTML and parsed frontmatter:

```javascript
// What the plugin emits for my-post.md
export const html = `<article class="rune-page">...</article>`;
export const frontmatter = { title: 'My Post', date: '2026-01-15' };
export const meta = { runes: ['recipe', 'hint'], packages: ['learning'] };
```

The user’s framework page imports and renders it:

```svelte
<!-- +page.svelte (SvelteKit example) -->
<script>
  import { html, frontmatter } from './my-post.md';
</script>

<h1>{frontmatter.title}</h1>
{@html html}
```

### Level 2: Cross-Page Pipeline

**What it does:** The full five-phase pipeline from the Cross-Page Pipeline Specification runs at build time. The plugin scans all `.md` files in `contentDir`, builds the entity registry, runs aggregation and post-processing, then emits enriched HTML for each file.

**What additionally works:**

- `breadcrumb` — resolves from page hierarchy derived from file tree
- `nav` — resolves page slugs to titles
- `glossary` auto-linking — terms linked across all pages
- `prerequisite` graph — dependency graph built from all lesson files
- Storytelling cross-links — character names become links
- Cross-page design context propagation — sandbox receives tokens from any page

**Pipeline:**

```
Phase 1: Parse all .md files, run rune transforms
Phase 2: Register entities from all pages
Phase 3: Aggregate — build indexes, graphs, token contexts
Phase 4: Post-process — resolve references, inject links, propagate context
Phase 5: Identity transform and HTML emission for each file
```

**Build integration:** The plugin uses Vite’s `buildStart` hook to scan and process all files before individual transforms run. The entity registry and aggregated data are cached in memory during the build. In dev mode (`vite dev`), the registry rebuilds incrementally when a file changes — only the changed file is re-parsed, but post-processing re-runs for files whose cross-page dependencies are affected.

**Page hierarchy derivation:** Since the plugin doesn’t control routing, it derives page hierarchy from the file system:

```
src/routes/
  blog/
    my-post.md          → /blog/my-post/
    recipes/
      sourdough.md      → /blog/recipes/sourdough/
```

The slug is derived from the file path relative to `contentDir`. Frontmatter can override the title and slug:

```yaml
---
title: Perfect Sourdough
slug: sourdough-bread
---
```

Users can also provide explicit hierarchy in config if their routing doesn’t match the file tree:

```javascript
refrakt({
  level: 'pipeline',
  routes: {
    // Override auto-derived slugs
    'blog/recipes/sourdough.md': '/recipes/sourdough-bread/',
  }
})
```

**Output:** Same module format as Level 1, but with enriched HTML:

```javascript
export const html = `<article class="rune-page">...</article>`;
export const frontmatter = { title: 'My Post', date: '2026-01-15' };
export const meta = { 
  runes: ['recipe', 'hint', 'glossary'], 
  packages: ['learning'],
  entities: [
    { type: 'term', name: 'levain', page: '/recipes/sourdough-bread/' }
  ],
  crossPageDeps: ['/glossary/'], // pages this file depends on
};
```

The `crossPageDeps` field enables the dev server’s incremental rebuild — when `/glossary/` changes, this file’s post-processing re-runs.

### Level 3: Framework Components

**What it does:** Instead of emitting an HTML string, the plugin emits framework-native components. A `{% tabs %}` rune becomes a `<Tabs>` Svelte component (or Vue component, or React component). Interactive behaviours use the framework’s reactivity system rather than vanilla JS.

**Why this exists:** Level 1 and 2 emit HTML + vanilla JS behaviours. This works, but it means rune interactivity is disconnected from the framework’s component model. A SvelteKit developer can’t bind to a datatable’s selected row, or react to a tab change with Svelte stores. Level 3 makes runes first-class framework citizens.

**Architecture:**

```
@refrakt-md/vite              ← core plugin (Levels 1–2)
@refrakt-md/svelte            ← Svelte component adapter
@refrakt-md/vue               ← Vue component adapter
@refrakt-md/react             ← React component adapter (JSX output)
```

The core plugin handles the transform pipeline. The adapter maps rune types to framework components and emits framework-specific module output.

```javascript
// vite.config.js with Svelte adapter
import { refrakt } from '@refrakt-md/vite';
import { svelteAdapter } from '@refrakt-md/svelte';

export default {
  plugins: [
    refrakt({
      packages: ['@refrakt/learning'],
      adapter: svelteAdapter(),
    }),
    sveltekit(),
  ]
};
```

**Output:** The plugin emits a Svelte component instead of an HTML string:

```svelte
<!-- Auto-generated from my-post.md -->
<script>
  import Tabs from '@refrakt-md/svelte/Tabs.svelte';
  import Hint from '@refrakt-md/svelte/Hint.svelte';
  import Recipe from '@refrakt-md/svelte/Recipe.svelte';
</script>

<article class="rune-page">
  <h1>My Sourdough Guide</h1>
  <Hint type="note">Start the levain 12 hours before you plan to mix.</Hint>
  <Recipe name="Classic Sourdough" servings="2 loaves" time="24h">
    <!-- ... rendered recipe content ... -->
  </Recipe>
</article>
```

**Scope:** Level 3 is a stretch goal. It requires maintaining component libraries for each supported framework, keeping them in sync with rune transform changes, and testing across framework versions. The vanilla JS behaviours from Levels 1–2 cover most interactive needs. Level 3 is worth building only if there’s strong demand for framework-native rune components.

-----

## CSS Strategy

### Base CSS

The `@refrakt-md/base` package provides structural CSS that makes runes render correctly regardless of theme. This includes BEM class definitions, layout rules, and design token custom properties with sensible defaults.

```css
/* @refrakt-md/base — structural CSS */
.rune-hint { /* layout */ }
.rune-hint--note { /* note variant layout */ }
.rune-hint__icon { /* icon positioning */ }
.rune-hint__body { /* content area */ }
/* ... */
```

When `injectBaseCSS: true` (default), the plugin injects this CSS automatically. When `false`, the user imports it manually — useful when they want to control CSS load order or bundle it differently:

```javascript
// Manual import in their layout
import '@refrakt-md/base/style.css';
import '@refrakt/learning/style.css';  // package CSS
import './my-theme.css';               // their theme overrides
```

### Package CSS

Each installed package provides its own structural CSS for its runes. The plugin collects CSS from all registered packages and includes it in the output.

### Theme CSS

The user’s theme CSS overrides the base and package structural styles. The plugin includes it last in the cascade, ensuring theme rules take precedence.

### CSS load order

```
1. @refrakt-md/base/style.css        ← structural layout, token defaults
2. @refrakt/learning/style.css        ← package structural CSS
3. @refrakt/docs/style.css            ← package structural CSS
4. @refrakt-community/dnd-5e/style.css ← community package CSS
5. ./src/theme/my-theme.css           ← user's theme (highest precedence)
```

-----

## Behaviours

### Levels 1–2: Vanilla JS

The plugin includes the `@refrakt-md/behaviors` script that provides interactive features — accordion toggling, tab switching, datatable sorting, details animation. The script initialises automatically on page load, scanning for rune elements and attaching event handlers.

In a SvelteKit context, the behaviour script needs to re-initialise after client-side navigation (SvelteKit doesn’t reload the page). The plugin provides a lifecycle helper:

```svelte
<!-- In the user's +layout.svelte -->
<script>
  import { afterNavigate } from '$app/navigation';
  import { initBehaviours } from '@refrakt-md/behaviors';
  
  afterNavigate(() => {
    initBehaviours(document.querySelector('.rune-page'));
  });
</script>
```

Equivalent helpers exist for other frameworks (Vue’s `onMounted`, React’s `useEffect`).

### Level 3: Framework-Native

At Level 3, behaviours are implemented as framework component logic. No vanilla JS script needed — interactivity is handled by Svelte stores, Vue reactivity, or React state. The behaviour library is not loaded.

-----

## Package Discovery

The plugin discovers installed packages through the same mechanism as the full refrakt.md pipeline. Packages listed in the `packages` config are imported, their rune transforms and schemas are registered, and their CSS is collected.

```typescript
// Plugin initialisation
async function loadPackages(packageNames: string[]) {
  const packages: RunePackage[] = [];
  
  for (const name of packageNames) {
    const pkg = await import(name);
    packages.push(pkg.default || pkg);
  }
  
  return packages;
}
```

Community packages work identically to official packages — the plugin doesn’t distinguish between `@refrakt/learning` and `@refrakt-community/dnd-5e`. Both register transforms, schemas, CSS, and (at Level 2) pipeline hooks.

-----

## Dev Server

In development (`vite dev`), the plugin provides:

**Hot reload:** When a `.md` file changes, the plugin re-transforms it and triggers Vite’s HMR. The page updates without a full reload. At Level 2, if the change affects registered entities (a character was renamed, a term was added), dependent files are also re-processed.

**Build warnings in terminal:** Runes that need Level 2 but are running at Level 1 emit clear warnings:

```
⚠ refrakt: breadcrumb on /blog/my-post.md requires level: 'pipeline'
           Rendering without page hierarchy. Set level: 'pipeline' in plugin config.
⚠ refrakt: glossary auto-linking disabled at level: 'static'
           Term "levain" on /recipes/sourdough.md will not be linked.
```

**Inspector integration:** The `refrakt inspect` CLI works against the user’s project. It discovers fixtures from installed packages and audits theme coverage against the user’s theme CSS.

-----

## NPM Package Structure

```
@refrakt-md/vite               ← core Vite plugin
  ├── index.ts                 ← plugin entry, config parsing
  ├── transform.ts             ← Level 1 per-file transform
  ├── pipeline.ts              ← Level 2 cross-page pipeline
  ├── css.ts                   ← CSS collection and injection
  └── hmr.ts                   ← dev server hot reload

@refrakt-md/transform          ← framework-agnostic transform pipeline
  ├── parse.ts                 ← Markdoc parsing
  ├── rune-transform.ts        ← rune transform application
  ├── identity-transform.ts    ← BEM class injection
  └── render.ts                ← HTML emission

@refrakt-md/base               ← structural CSS + design tokens
  └── style.css

@refrakt-md/behaviors          ← vanilla JS interactive behaviours
  └── index.ts

@refrakt-md/svelte             ← Level 3 Svelte adapter (future)
@refrakt-md/vue                ← Level 3 Vue adapter (future)
@refrakt-md/react              ← Level 3 React adapter (future)
```

The `@refrakt-md/transform` package is the core engine shared by the Vite plugin, the refrakt.md site editor, and the chat product. The Vite plugin is a thin wrapper that invokes it within Vite’s build lifecycle.

-----

## Relationship to refrakt.md Products

The Vite plugin is not a replacement for the refrakt.md site editor. It’s a different entry point into the same rune ecosystem.

|Capability        |Vite plugin      |Site editor             |
|------------------|-----------------|------------------------|
|Rune transforms   |Same pipeline    |Same pipeline           |
|Identity transform|Same output      |Same output             |
|Themes            |Same CSS contract|Same CSS contract       |
|Packages          |Same registry    |Same registry           |
|Routing           |User’s framework |refrakt.md routing      |
|Layouts           |User’s framework |refrakt.md layout system|
|AI chat           |Not included     |Integrated              |
|Visual editing    |Not included     |Integrated              |
|Export/publish    |User’s build     |refrakt.md publish      |

The rune transforms, identity transform, theme CSS, and package system are identical. The difference is who controls the surrounding architecture. The Vite plugin says “your framework, our runes.” The site editor says “our framework, our runes.”

Users can move between them. Content authored with runes in a SvelteKit project works in the site editor with no changes — the Markdoc is the same. A storytelling world built in the chat product can be exported and rendered in a Nuxt site via the Vite plugin. The rune is the portable unit.

-----

## Example: SvelteKit Blog with Recipes

```javascript
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { refrakt } from '@refrakt-md/vite';

export default {
  plugins: [
    refrakt({ packages: ['@refrakt/learning'] }),
    sveltekit(),
  ]
};
```

```
src/routes/
  +layout.svelte
  recipes/
    +layout.svelte        ← wraps recipe pages with nav, styling
    sourdough.md          ← uses {% recipe %}, {% hint %}, {% howto %}
    pasta.md              ← uses {% recipe %}
    +page.svelte          ← recipe index (their own component)
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
3. Bulk ferment 4–5 hours with stretch-and-folds every 30 minutes
4. Shape and place in bannetons
5. Cold retard overnight (12–16 hours)
6. Preheat Dutch oven to 260°C
7. Score and bake: 20 min covered, 20 min uncovered at 230°C

> Start with wet hands for the stretch-and-folds. The dough is sticky at first but firms up with each fold.

{% /recipe %}
```

The plugin transforms this into HTML with proper `Recipe` schema.org markup, BEM classes for styling, and the base CSS for layout. The user’s `+layout.svelte` wraps it in their site’s navigation and footer. Their `+page.svelte` index page lists all recipes however they want — the plugin doesn’t interfere with their routing or data loading.

-----

## Future Considerations

### Astro Integration

Astro’s content-first architecture aligns closely with refrakt.md. Where the Vite plugin is a general-purpose transform hook, the Astro integration is a purpose-built content pipeline integration that takes advantage of Astro-specific capabilities.

**Why a dedicated integration:** Astro already has official Markdoc support (`@astrojs/markdoc`), typed content collections with schema validation, and an islands architecture that ships zero JS by default. A dedicated `@refrakt-md/astro` integration hooks into all three rather than working around them through Vite’s generic transform layer.

**Configuration:**

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import markdoc from '@astrojs/markdoc';
import { refrakt } from '@refrakt-md/astro';

export default defineConfig({
  integrations: [
    markdoc(),
    refrakt({
      packages: ['@refrakt/learning', '@refrakt/docs'],
      theme: './src/theme/my-theme.css',
    }),
  ],
});
```

**How it works:** The integration auto-registers rune transforms as Markdoc tag definitions within Astro’s existing `@astrojs/markdoc` pipeline. Runes become available in `.mdoc` files (Astro’s convention for Markdoc) without manual tag registration. The user’s `markdoc.config.mjs` can still define additional custom tags alongside runes.

**Astro components for runes:** Each rune maps to an `.astro` component that renders the identity-transformed HTML. Since Astro components are server-rendered by default, this is effectively Level 3 integration with no extra cost — rune components are HTML templates with BEM classes, rendered at build time.

Interactive runes (tabs, accordion, datatable) use Astro’s islands architecture. A `<script>` tag on the component loads the behaviour library only when the component is on the page, shipping zero JS for pages that only use static runes.

**Content collections:** Content files live in standard Astro collections with standard Astro schemas. The integration doesn’t change how collections are defined — it changes how `.mdoc` files within them are rendered:

```
src/content/
  recipes/
    sourdough.mdoc       ← runes work here via @astrojs/markdoc
    pasta.mdoc
  docs/
    getting-started.mdoc
```

Pages render content with Astro’s standard `entry.render()` API. The integration intercepts the render call, applies rune transforms, runs post-processing if the cross-page pipeline is enabled, and returns enriched HTML.

**Cross-page pipeline:** Astro’s content collections provide a typed manifest of all content files at build time. The integration queries all collections during the `astro:build:start` hook, builds the entity registry, and runs aggregation before any page renders. Individual page renders receive the full registry for post-processing — breadcrumbs, glossary auto-linking, storytelling cross-links all resolve correctly.

Content collections also provide frontmatter-level schema validation (via Zod), while rune schemas provide content-level validation (via Markdoc). Together they catch invalid content at both layers during the build.

**Relationship to Astro’s existing references:** Astro content collections already support typed references between collections (a recipe referencing an author from an authors collection). The refrakt.md entity registry handles a different layer — content-level references (bold character names becoming links, design tokens propagating to sandboxes, term auto-linking). The two systems are complementary: Astro handles structural data relationships, the pipeline handles content-level enrichment.

**Package structure:**

```
@refrakt-md/astro
  ├── index.ts                 ← Astro integration entry
  ├── markdoc-tags.ts          ← auto-registers rune transforms as Markdoc tags
  ├── pipeline.ts              ← cross-page pipeline via build hooks
  ├── components/              ← Astro components for each rune
  │   ├── Hint.astro
  │   ├── Tabs.astro
  │   ├── Recipe.astro
  │   └── ...
  └── behaviors.ts             ← islands-compatible behaviour loader
```

### MDX Interop

Some projects use MDX (markdown with JSX). The Vite plugin processes Markdoc, not MDX. A project can use both — MDX for pages that need framework components inline, Markdoc for pages that use runes. The plugin only processes files with the configured extensions.

### Standalone CLI

For projects not using Vite (Hugo, Jekyll, Eleventy, custom build systems), a standalone CLI could provide the same transform:

```bash
refrakt transform ./content/ --out ./dist/ --packages @refrakt/learning
```

This emits HTML files that any static site generator can include. Lower priority than the Vite plugin since Vite covers the majority of modern frameworks.