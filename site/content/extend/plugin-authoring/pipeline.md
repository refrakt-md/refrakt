---
title: Cross-Page Pipeline
description: How to use build-time pipeline hooks to build site-wide indexes and cross-page references
---

# Cross-Page Pipeline

The cross-page pipeline is a build-time mechanism that lets packages scan all pages, build site-wide indexes, contribute virtual pages, and enrich page content using cross-page data. It runs in a sequence of phases after all pages have been individually parsed and transformed.

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
Phase 2.5 — Contribute Packages synthesize virtual pages from the registry / external data
Phase 3 — Aggregate    All packages build cross-page indexes from the full registry
Phase 4 — Post-process Per page: packages enrich pages using aggregated data
```

Phases 2–4 only run at build time. In development, most pipeline results are computed on startup.

## PluginPipelineHooks

Provide a `pipeline` field on your `Plugin` to opt in:

```typescript
import type { Plugin, PluginPipelineHooks } from '@refrakt-md/types';

const pipeline: PluginPipelineHooks = {
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

export const myPackage: Plugin = {
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

### Phase 2.5 — contributePages

```typescript
contributePages(
  ctx: ContributePagesContext,
): ContributedPage[] | Promise<ContributedPage[]>
```

Synthesize *virtual pages* — pages that don't exist as files. Runs after register (so the registry is populated) and before aggregate, and the contributed pages flow through register / aggregate / postProcess **exactly like file-backed pages** (they appear in the sitemap, search index, nav, and resolve via `{% ref %}`). The hook is sync or async (fetch external data at build time here).

```typescript
async contributePages(ctx) {
  const docs = await fetchFromCms(process.env.CMS_TOKEN);
  return docs.map((doc) => ({
    url: `/blog/${doc.slug}/`,
    title: doc.title,
    frontmatter: { date: doc.date, category: 'blog' },
    content: toMarkdoc(doc.body),
  }));
},
```

A `ContributedPage` is `{ url, title?, frontmatter?, content, variables?, source? }` — `content` is markdoc source, `variables` binds extra template variables (e.g. `$item`). The context exposes the populated `registry`, `projectRoot`, and the per-site config. Rules:

- **File pages win URL collisions** (with a warning); two contributed pages at the same URL is a build error naming both.
- Contributed pages register their *own* entities (a second register pass) but **cannot trigger another contribution round** — the graph is one level deep, keeping the build deterministic.
- A throwing hook is caught: its contributions are skipped with a build warning; the build continues.

### Generating routes from entities — `entityRoutes`

You usually don't need to write `contributePages` by hand. For the common case — "one page per registered entity" — use the **declarative `entityRoutes` adapter** in your site config. It's a built-in `contributePages` provider:

```json
{
  "sites": {
    "main": {
      "contentDir": "./content",
      "entityRoutes": [
        { "type": "spec", "url": "/specs/{id}/", "title": "{title}", "render": "{% expand $item.id /%}" },
        { "type": "work", "filter": "status:ready", "url": "/work/{id}/", "render": "{% expand $item.id /%}" },
        { "type": "decision", "url": "/decisions/{id}/", "render-template": "templates:decision-page.md" }
      ]
    }
  }
}
```

Per rule, for each registered entity matching `type` + optional `filter` (the [field-match grammar](/runes/collection#the-field-match-grammar)):

- **`url` / `title` / `frontmatter`** interpolate `{name}` placeholders from the entity's fields (`{id}`, `{title}`, …). `url` is per-segment URL-encoded and site-root-relative (the site's `basePath` is applied).
- **`render`** is an inline markdoc body, or **`render-template`** points at a markdoc partial (mutually exclusive). Both are transformed per entity with **`$item` bound** — same contract as a [collection per-item template](/runes/collection#the-item-variable) — so `{% expand $item.id /%}` inlines the entity, and formatter functions like `{% date($item.data.published) %}` work here too.
- The adapter **back-fills each matched entity's `sourceUrl`** with the generated route, so `{% ref %}` to that entity prefers the on-site page.

### Embeddable entities — `embed()` / `sourceFile`

For `{% expand $item.id /%}` (above) to render an entity's content, the entity must be **embeddable**. An entity is embeddable if it has either:

- **`embed(): Node`** — returns the entity's content AST directly (for in-memory / external sources, no file on disk); or
- **`sourceFile` + `extract(parsedSource): Node`** — a project-root-relative `.md` path plus a function that pulls the entity's subtree from the freshly-parsed source (the plan plugin's path).

```typescript
registry.register({
  type: 'ticket', id: 'JIRA-1', sourceUrl: '',
  data: { title: 'Live ticket' },
  embed: () => markdocAstForTicket(),  // no source file needed
});
```

`{% expand %}` prefers `embed()`, falling back to reading + extracting `sourceFile`; an entity with neither produces a clear build error.

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
  // Relationship graph (optional — see below)
  relate?(edge: EntityEdge): void;
  getRelated?(id: string, opts?: { kind?: string | string[]; type?: string | string[] }): ResolvedEdge[];
}

interface EntityRegistration {
  type: string;       // entity category ('page', 'character', 'term', ...)
  id: string;         // unique within this type
  sourceUrl: string;  // page URL this entity was registered from
  data: Record<string, unknown>;
  // Optional — make the entity embeddable by {% expand %} / entityRoutes:
  sourceFile?: string;                       // project-root-relative .md path
  extract?: (parsed: Node) => Node | null;   // pull the entity subtree from it
  embed?: () => Node | null;                 // …or return the content AST directly
}
```

### Contributing relationships — `relate()` / `getRelated()`

The registry carries a directed, typed **relationship graph**. A plugin contributes edges from its `aggregate` hook; the generic [`relationships`](/runes/relationships) rune renders them via `getRelated`. The edge `kind` is an arbitrary string — your domain's vocabulary (`implements`, `blocked-by`, `ally`, …):

```typescript
interface EntityEdge { fromId: string; toId: string; kind: string; fromType?: string; toType?: string; }

aggregate(registry, ctx) {
  // Relationships are directed; emit both directions to make an edge mutual.
  registry.relate?.({ fromId: 'WORK-1', toId: 'SPEC-1', kind: 'implements', toType: 'spec' });
  registry.relate?.({ fromId: 'SPEC-1', toId: 'WORK-1', kind: 'implemented-by', toType: 'work' });
  return { /* … */ };
}
```

`getRelated(id, { kind?, type? })` returns the outgoing edges of `id`, each with its target entity resolved (edges to unknown ids are dropped). Exact `(fromId, toId, kind)` duplicates are deduped by core; any richer precedence is the contributor's job. Both methods are optional on the interface — a minimal registry may omit the graph — so call them with `?.` and have the rune fall back to empty.

### Domain-aware ordering — `theme.orderings`

`collection`/`relationships` sort and group enum fields (`status`, `priority`, …) in a meaningful order rather than lexically. The default order comes from each rune attribute's `matches` array automatically. When a *presentation* order differs from the declaration order (e.g. an actionable-first status dashboard), declare an override on your plugin's `theme`, keyed `type → field → ordered values`:

```typescript
theme: {
  runes: { /* … */ },
  orderings: {
    work: { status: ['blocked', 'in-progress', 'review', 'ready', 'draft', 'done'] },
  },
}
```

Only declare the fields that diverge from `matches`; everything else is automatic.

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
