---
title: Cross-Page Pipeline
description: How to use build-time pipeline hooks to build site-wide indexes and cross-page references
---

# Cross-Page Pipeline

The cross-page pipeline is a build-time mechanism that lets packages scan all pages, build site-wide indexes, and enrich page content using cross-page data. It runs in three phases after all pages have been individually parsed and transformed.

## When to Use It

Most runes don't need the pipeline. Pure presentation runes (hero, hint, datatable) are fully self-contained — they have no need to know about other pages.

Use the pipeline when your rune needs to:
- **Resolve references to other pages** — e.g., a `{% character %}` rune automatically linking to all pages that reference the character
- **Build a site-wide index** — e.g., a glossary rune that aggregates all `{% term %}` definitions into a master list
- **Inject cross-page navigation** — e.g., a `{% prerequisites %}` rune that resolves prerequisite chains from a dependency graph
- **Auto-populate content from context** — e.g., a breadcrumb that resolves its own path from the site's page tree

The core pipeline hooks always run and provide these aggregations free of charge to all packages: `pageTree`, `breadcrumbPaths`, `pagesByUrl`, and `headingIndex`.

## The Four Phases

```
Phase 1 — Parse        Per page: Markdoc parse + rune transforms (existing pipeline)
Phase 2 — Register     All packages scan all pages, register entities in EntityRegistry
Phase 3 — Aggregate    All packages build cross-page indexes from the full registry
Phase 4 — Post-process Per page: packages enrich pages using aggregated data
```

Phases 2–4 only run at build time. In development, most pipeline results are computed on startup.

## PackagePipelineHooks

Provide a `pipeline` field on your `RunePackage` to opt in:

```typescript
import type { RunePackage, PackagePipelineHooks } from '@refrakt-md/types';

const pipeline: PackagePipelineHooks = {
  register(pages, registry, ctx) {
    // Phase 2: index your data
  },
  aggregate(registry, ctx) {
    // Phase 3: build cross-page structures
    return myIndex;
  },
  postProcess(page, aggregated, ctx) {
    // Phase 4: enrich a page
    return page;
  },
};

export const myPackage: RunePackage = {
  name: 'my-package',
  version: '1.0.0',
  runes: { /* ... */ },
  pipeline,
};
```

All three hooks are optional. A package can implement any combination.

### Phase 2 — register

```typescript
register(
  pages: readonly TransformedPage[],
  registry: EntityRegistry,
  ctx: PipelineContext,
): void
```

Called once with all pages after Phase 1 is complete. Walk the pages and register named entities. Entities are typed and identifiable by a unique `id` within that type.

```typescript
register(pages, registry, ctx) {
  for (const page of pages) {
    // Walk the renderable tree to find your rune's content
    const characters = findCharacters(page.renderable);
    for (const char of characters) {
      registry.register({
        type: 'character',
        id: char.name.toLowerCase(),
        sourceUrl: page.url,
        data: {
          name: char.name,
          faction: char.faction,
          title: char.title,
        },
      });
    }
  }
},
```

Core always registers `page` entities (with `url`, `title`, `parentUrl`, `draft`, `description`, `date`, `order`) and `heading` entities (with `level`, `text`, `id`, `url`). File-derived timestamps (`$file.created` and `$file.modified`) are available as Markdoc variables on every page before registration runs — rune schemas can consume them as attribute defaults.

### Phase 3 — aggregate

```typescript
aggregate(
  registry: Readonly<EntityRegistry>,
  ctx: PipelineContext,
): unknown
```

Called once after all register hooks have run. Build any cross-page structures you need. The return value is stored as `aggregated[packageName]` and passed to your `postProcess` hook.

```typescript
aggregate(registry, ctx) {
  const characters = registry.getAll('character');
  const byFaction: Record<string, string[]> = {};
  for (const entry of characters) {
    const { faction, name } = entry.data as { faction: string; name: string };
    (byFaction[faction] ??= []).push(name);
  }
  return { byFaction, total: characters.length };
},
```

Core's aggregate produces:
- `pageTree` — hierarchical page tree (array of `PageTreeNode`)
- `breadcrumbPaths` — URL → ancestor path array
- `pagesByUrl` — URL → page entity lookup
- `headingIndex` — URL → headings array

### Phase 4 — postProcess

```typescript
postProcess(
  page: TransformedPage,
  aggregated: AggregatedData,
  ctx: PipelineContext,
): TransformedPage
```

Called once per page, for every package that implements it, in package registration order. Access your aggregated data via `aggregated['my-package']`. Return the modified page (or the original page if this page needs no changes).

```typescript
postProcess(page, aggregated, ctx) {
  const { byFaction } = aggregated['my-package'] as MyAggregated;
  // Walk page.renderable and inject faction member lists
  const updated = injectFactionMembers(page.renderable, byFaction);
  if (!updated) return page;
  return { ...page, renderable: updated };
},
```

## EntityRegistry API

```typescript
interface EntityRegistry {
  register(entry: EntityRegistration): void;
  getAll(type: string): EntityRegistration[];
  getByUrl(type: string, url: string): EntityRegistration[];
  getById(type: string, id: string): EntityRegistration | undefined;
  getTypes(): string[];
}

interface EntityRegistration {
  type: string;       // entity category ('page', 'character', 'term', ...)
  id: string;         // unique within this type
  sourceUrl: string;  // page URL this entity was registered from
  data: Record<string, unknown>;
}
```

## PipelineContext

Each hook receives a `ctx` argument for emitting structured diagnostics. Errors are caught per hook and per page — they become `PipelineWarning` entries, but the pipeline continues running.

```typescript
interface PipelineContext {
  info(message: string, url?: string): void;
  warn(message: string, url?: string): void;
  error(message: string, url?: string): void;
}
```

Warnings are surfaced in the build output and available as `Site.pipelineWarnings` for logging or CI checks.

## AggregatedData and Namespacing

Aggregated data is keyed by package name to prevent collisions between packages:

```typescript
// In postProcess:
const myData = aggregated['my-package'];        // your package's aggregate result
const coreData = aggregated['__core__'];        // page tree, breadcrumbs, etc.
```

Core's aggregated structure (typed for reference):

```typescript
interface CoreAggregated {
  pageTree: PageTreeNode[];
  breadcrumbPaths: Record<string, string[]>;  // url → ancestor URLs
  pagesByUrl: Record<string, EntityRegistration>;
  headingIndex: Record<string, PipelineHeadingInfo[]>;
}
```

## The Sentinel Pattern

For content that must be deferred until Phase 4, use a sentinel: a special marker string that your `postProcess` hook finds and replaces with resolved content.

The built-in `breadcrumb` rune uses this pattern for its `auto` mode. In Phase 1, the schema emits a `BREADCRUMB_AUTO_SENTINEL` string into the renderable tree instead of actual breadcrumb items. In Phase 4, the core `postProcess` hook walks the renderable tree, finds the sentinel, and replaces it with the page's resolved ancestor path from `aggregated['__core__'].breadcrumbPaths`.

This pattern keeps rune schemas simple (no pipeline awareness needed in Phase 1) while enabling powerful cross-page resolution in Phase 4.

## Error Handling

Errors thrown inside any hook are caught automatically:
- The error is captured as a `PipelineWarning` with `severity: 'error'`
- The pipeline continues with the next hook
- The affected page or phase produces no output from that hook

This means a bug in one package's pipeline hook cannot crash the build. Check `Site.pipelineWarnings` in your Vite plugin output or CI logs to detect problems.
