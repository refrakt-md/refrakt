{% spec id="SPEC-069" status="draft" tags="content, routing, plugins, config, registry" %}

# Plugin-contributed routes & declarative entity routing

A two-surface mechanism for publishing pages from data that doesn't live in the site's content tree. The common case — "registered entities (specs, work items, characters, products, …) become pages" — is expressed as **declarative route rules** in `refrakt.config.json`, mirroring how `xrefPatterns` and `fileRoots` already work. The escape-hatch case — "plugin pulls from a database, CMS, or other external source and synthesizes pages at build time" — is a **plugin hook** (`contributePages`) that returns page records directly.

Both surfaces compile down to the same underlying primitive: a list of *virtual pages* the content loader treats indistinguishably from file-backed pages. Config rules are sugar over the hook; the hook is the real mechanism.

## Problem

Today, every page on a refrakt site corresponds to a file in the site's content tree. The pipeline registers entities from rendered pages, runs aggregation, post-processes — all keyed off "what's in `content/`". This is fine for hand-authored sites, but it leaves several real use cases unaddressed:

**1. Registered entities that should also be pages, without file duplication.**

The plan plugin's unconditional scan (SPEC-064) registers entities from `plan/` files outside the content tree, with `sourceFile` + `extract` set so the {% ref "SPEC-066" /%} expand rune can inline them. But those entities have no URL of their own — they don't appear as `/specs/SPEC-001/` or any other route. Users wanting "per-spec pages" today must either mirror `plan/` into `content/` (gives URLs but loses peer-of-content semantics) or hand-author route files (loses single-source-of-truth).

**2. Static plan-site replacement.**

The plan CLI's `plan serve` / `plan build` give users a zero-config browseable site of their plan content. That's a parallel rendering path to the regular site one, with its own maintenance burden. If declarative route rules existed, a `create-refrakt --template=plan-site` scaffold could express the same site in ~40 lines of config, sharing one rendering path with every other refrakt site. Removing `plan serve`'s separate implementation requires *exactly* this primitive.

**3. External data sources.**

The JAMstack pattern of "build a static site from a CMS / DB / API at build time" is the headline workflow of competitors (Astro content collections, Eleventy data files, Next.js getStaticProps, Hugo data templates). Refrakt has no first-class story for it. With a `contributePages` plugin hook, the door opens to `@refrakt-md/sanity`, `@refrakt-md/notion`, `@refrakt-md/airtable`, `@refrakt-md/sql`, `@refrakt-md/github` — third-party-data adapters that drop in and produce pages.

Today's options for any of these:

- **Mirror data into the content tree as a build step.** Ugly: requires a pre-build script, leaves stale files when source changes, awkward git story.
- **Fork the content loader.** Tied to internals; brittle across upgrades.
- **Build a SvelteKit adapter for the data source.** Loses everything refrakt's pipeline does (xref resolution, rune transforms, themes, search indexing).

What's missing is a clean extension point: *plugins / config can declare "here are some additional pages" and the content loader treats them like any other*.

-----

## Design Principles

**One mechanism, two surfaces.** The underlying primitive is "plugin contributes pages". Config rules are a built-in plugin (or a built-in adapter) that interprets `entityRoutes` as page contributions. Users never need to know which surface they're using; the config surface covers the common case, the hook is there when the data shape outgrows it. Don't ship two parallel systems.

**Symmetric with existing config patterns.** Route rules look and feel like `xrefPatterns` and `fileRoots`. Same `{name}` substitution syntax, same per-site scoping, same file (`refrakt.config.json`). Authors who learned xref patterns recognize the shape; no new mental model.

**User owns the route shape.** One site can put plan at `/plan/specs/X/`, another at `/SPEC-X/`. The plugin doesn't bake in a URL convention. Same `@refrakt-md/plan` works for both — same as how the user, not the plugin, picks where their `plan/` lives via `plan.dir`.

**Plugin-contributed pages go through the normal pipeline.** A virtual page contributed by a plugin is parsed, transformed, registered, aggregated, and post-processed exactly like a file-backed page. Embedded runes execute; xrefs inside the contributed content resolve via the host's xref pass; the page can be linked to by other refs; it appears in the sitemap, search index, and nav-auto graph. *No exceptions* — anything special about being virtual lives at the contribution boundary, not in the rest of the pipeline.

**Build-time only.** Page contribution runs once per build, returns a fixed list. Pages aren't created lazily on request; the static-prerender enumeration sees the full set at build start. Rules out runtime data fetching by construction — keeps the deterministic-build property refrakt depends on.

**Asynchronous by default.** The hook returns `Page[] | Promise<Page[]>`. External-data plugins need to fetch over the network; the build will await them. Sync return is allowed for the config-rules adapter (no IO) and other in-memory cases.

**No secrets system.** Plugins that need API keys read from `process.env` like any Node code. Refrakt doesn't invent a secrets layer or a credentials store. This is a deliberate non-feature; we expect users to use standard `.env` workflows (dotenv, host env vars, etc.).

**Caching is plugin-owned, not core.** A `contributePages` hook that hits an HTTP API on every build is the plugin's problem to optimize. Plugins decide whether to cache responses, use ETags, key off content hashes, etc. Refrakt provides the hook timing; it doesn't try to be a build cache. This keeps the contract narrow.

-----

## Authoring Surface

### Declarative — `entityRoutes` in config

```json
{
  "sites": {
    "main": {
      "contentDir": "./content",
      "entityRoutes": [
        {
          "match": { "type": "spec" },
          "url": "/specs/{id}/",
          "title": "{title}",
          "render": "{% expand $entity.id canonical=true /%}"
        },
        {
          "match": { "type": "work" },
          "url": "/work/{id}/",
          "title": "{id} — {title}",
          "render": "{% expand $entity.id /%}"
        },
        {
          "match": { "type": "decision" },
          "url": "/decisions/{id}/",
          "render": "{% expand $entity.id canonical=true /%}",
          "frontmatter": { "category": "decision-log" }
        }
      ]
    }
  }
}
```

For each registered entity matching a rule's `match` clause, the content loader synthesizes a virtual page at the templated URL, with frontmatter from the rule's `frontmatter` field (merged with reasonable defaults derived from the entity), title from the templated `title`, and content from the templated `render` string. Substitution placeholders (`{id}`, `{title}`, etc.) draw from the entity's `data` payload plus the resolved `id` and `type`.

### Programmatic — `Plugin.contributePages`

```ts
import type { Plugin, PluginContributePagesContext, ContributedPage } from '@refrakt-md/types';

export const sanityPlugin: Plugin = {
  name: '@refrakt-md/sanity',
  async contributePages(ctx: PluginContributePagesContext): Promise<ContributedPage[]> {
    const client = createSanityClient({
      projectId: process.env.SANITY_PROJECT_ID!,
      dataset: process.env.SANITY_DATASET ?? 'production',
    });
    const docs = await client.fetch('*[_type == "post"]');
    return docs.map(doc => ({
      url: `/blog/${doc.slug.current}/`,
      title: doc.title,
      frontmatter: {
        author: doc.author?.name,
        date: doc.publishedAt,
        category: 'blog',
      },
      content: portableTextToMarkdoc(doc.body),
    }));
  },
};
```

`ContributedPage` is essentially the file-backed page record minus the file path: `{ url, title, frontmatter, content }`. The content loader takes the list and runs each through `loadContentFromTree`'s normal pipeline.

### Mixing the two surfaces

A plugin can both:
- Register entities (so other pages can `{% ref %}` / `{% expand %}` them)
- Contribute pages directly (so they appear as routes)

These are independent. The plan plugin would register entities via its existing `register` hook (or unconditional scan), and the *user* would choose whether to publish them as pages by adding `entityRoutes` to their config. The plugin doesn't presume URLs.

A plugin that has no entity shape (a generic HTTP-API adapter) can skip registration entirely and just contribute pages directly. Other pages can still `{% ref %}` those pages by their URL (`page` entity type registered by core).

-----

## Output Contract

A contributed page produces exactly the same `SitePage` / `TransformedPage` shape as a file-backed page. The only difference is a marker:

```json
{
  "url": "/specs/SPEC-066/",
  "title": "Expand rune",
  "frontmatter": { ... },
  "renderable": [...],
  "source": {
    "type": "contributed",
    "plugin": "@refrakt-md/entity-routes",
    "ruleIndex": 0
  }
}
```

`source.type === "contributed"` distinguishes contributed pages from file-backed ones (`source.type === "file"`); the rest of the fields identify which plugin / rule produced the page (for debugging, error attribution, dev-server HMR keying).

Downstream consumers (sitemap, search index, route enumeration, layout cascade) treat contributed and file pages identically.

-----

## Rule Substitution

### Placeholder syntax

`{name}` interpolates from the entity's combined field set: top-level (`id`, `type`, `sourceFile`, `sourceUrl`) plus everything in `data`. Same shape as xref pattern templates (SPEC-065).

```json
{
  "match": { "type": "character" },
  "url": "/cast/{id}/",
  "title": "{name}",
  "render": "{% expand $entity.id canonical=true /%}",
  "frontmatter": {
    "category": "character",
    "realm": "{realm}"
  }
}
```

URL substitution is per-segment-encoded (same as xref). Title and content substitutions are not URL-encoded (they're text).

Missing fields render as empty strings, matching xref pattern behavior. A rule that depends on a field the entity doesn't have will produce an empty value at that placeholder; the build emits a warning but doesn't fail.

### Match clauses

The `match` object filters which entities the rule applies to. Minimum supported keys:

| Key | Meaning |
|-----|---------|
| `type` | Exact entity-type match (`"spec"`, `"work"`, `"character"`). Required for the v1 surface — every rule must match by type. |
| `tag` | Entity must have this tag (entity data carries `tags?: string[]` by convention). |
| `status` | Entity's `data.status` equals this value. |
| `where` | (future, deferred) — arbitrary predicate function. Out of scope for v1. |

Multiple keys combine with AND. Multiple rules can match the same entity — each produces a separate page (different URLs presumably; the loader errors on URL collisions).

### Variable surface inside `render`

The `render` string is markdoc content. The substituted entity is exposed as `$entity` (a content variable, same surface as `$page.path` etc.). So `{% expand $entity.id /%}` is the canonical pattern.

Render strings can also reference the entity's data fields directly: `# {% $entity.data.title %}`. The full Markdoc variable model applies.

-----

## Resolution & Pipeline Integration

The contribution step runs once per build, between content tree loading and the `register` pipeline phase:

```
   parse content tree
        │
        ▼
   loadContent(tree) → SitePage[]
        │
        ▼
   PLUGIN CONTRIBUTE PHASE   ← new
   for each plugin (in registration order):
     - run config-rules adapter (built-in)
     - run plugin.contributePages()
   merge results into SitePage[]
        │
        ▼
   per-page parse + transform   (existing)
        │
        ▼
   register / aggregate / postProcess   (existing)
```

Concretely:

1. **Build-in config-rules adapter** runs first. It walks `entityRoutes` × registered entities, producing virtual page records.

   But registered entities don't exist yet at this point — registration happens AFTER content loads. So the config-rules adapter actually needs to run AFTER a partial register pass. The right ordering is:

   ```
   parse content tree → file-backed pages
   per-page parse + transform
   register phase (entities populated)
   ────────────────────────────────────
   contribute phase (file pages + plugin pages assembled)
   per-page parse + transform on contributed pages
   register phase again (covers newly-contributed pages)
   aggregate / postProcess
   ```

   This two-pass shape is the cost of having contributions depend on the registry, but it's bounded — contributed pages can't themselves contribute pages (no recursion).

2. **Plugin contributions** run after the config-rules adapter. They can read the populated registry via the contribution context (`ctx.registry`), but they're not required to — external-data plugins read from elsewhere.

3. **Merged page list** flows into the existing transform + register + aggregate + postProcess pipeline.

### URL collision handling

If two rules / contributions produce the same URL, the build fails with a clear error naming the conflicting sources. Last-write-wins is rejected because contributed pages are hard to attribute when they silently override each other.

File-backed pages always win against contributed pages of the same URL (file-backed = explicit authoring intent, contributed = derived) — but with a build warning so the override is visible.

### Static prerender enumeration

Every refrakt adapter enumerates routes from the merged `SitePage[]` after the loader produces it — that's the existing shape adapters consume. Contributed pages are in that list by the time enumeration runs, so adapters work without changes:

- **`@refrakt-md/sveltekit`** — Vite plugin's virtual-modules.ts walks the page list; `usedCssBlocks` analysis walks it; nothing adapter-specific needed.
- **`@refrakt-md/html`** — static HTML adapter writes one file per page; the loop reads the same list.
- **`@refrakt-md/astro`** — exposes pages through Astro's content collections API; consumes the same list.
- **`@refrakt-md/next`** / **`@refrakt-md/nuxt`** / **`@refrakt-md/eleventy`** — each adapter has its own enumeration surface, all driven by the SitePage list.
- **`@refrakt-md/react`** / **`@refrakt-md/vue`** — runtime adapters; route discovery happens at build time the same way.

Adapter authors don't have to participate in the contribution mechanism — they consume the post-contribution page list. The one cross-cutting concern: any adapter that does its own per-page CSS / asset analysis (the `usedCssBlocks` tree-shaker is the precedent) sees contributed pages automatically because they flow through the same enumeration.

If a specific adapter has an intermediate caching layer that fingerprints input files (Astro's content collections, Next's `getStaticPaths`, etc.), contributed pages need a stable identifier so the adapter can dedupe across builds. `SitePage.source = { type: 'contributed', plugin, ruleIndex }` plus the page's URL serves as that identifier — the same shape every adapter can hash.

-----

## Plugin Authoring Surface

### `contributePages` hook signature

```ts
export interface ContributedPage {
  /** The page's URL — must be unique site-wide. */
  url: string;
  /** Page title (used for nav, search, $page.title). */
  title: string;
  /** Frontmatter values (merged with system defaults). */
  frontmatter?: Record<string, unknown>;
  /** Markdoc source. Runs through the standard parse + transform pipeline. */
  content: string;
}

export interface PluginContributePagesContext {
  /** Read-only view of entities registered during the pre-contribution
   *  register pass. Plugins backed by external data sources can ignore
   *  this; plugins that adapt registry entities (the built-in config-
   *  rules adapter, mostly) consult it. */
  registry: Readonly<EntityRegistry>;
  /** Project root for relative-path resolution. */
  projectRoot: string;
  /** Site config (the same shape the user wrote in refrakt.config.json#/sites/{name}). */
  site: SiteConfig;
  /** Standard pipeline context for warnings / errors. */
  ctx: PipelineContext;
}

export interface Plugin {
  // ... existing fields
  contributePages?: (
    ctx: PluginContributePagesContext,
  ) => ContributedPage[] | Promise<ContributedPage[]>;
}
```

### Built-in config-rules adapter

Ships as part of `@refrakt-md/content`. Reads `site.entityRoutes`, walks the registry, applies match clauses, runs substitution, returns the contributed pages. Same shape as third-party plugins from the loader's perspective — it just happens to live in the framework.

### Plugin guidance

- **Prefer entity registration + config rules** when your data fits the registry shape. Lets users tune URLs without plugin changes.
- **Use `contributePages` directly** when your data source isn't entity-shaped (whole-document CMS payloads, opaque API responses, file-tree mirrors that don't fit the rune model).
- **Cache external fetches** in the plugin. The hook runs once per build; if your build runs ten times a day, that's ten API calls per page. Use ETag headers, content-hash caches, or whatever your data source supports.
- **Fail gracefully** when the upstream is down. A network blip shouldn't halt the entire build — log a warning, contribute fewer pages, and let the build continue. (For external data, "no pages contributed this build" is usually better than "build failed".)
- **Document required environment variables** in your plugin's README. Refrakt doesn't validate secrets — the convention is `process.env.YOUR_PLUGIN_NAME_*`.

-----

## Emergent Plugin Use Cases

A non-exhaustive sketch of plugins this mechanism unlocks — grouped by category so the breadth is visible. Many of these don't need to be built by refrakt-core; the value of the mechanism is that *third parties can build them without forking the loader*. A few are likely worth shipping in `@refrakt-md/*` as reference implementations; most are community-shaped.

### Headless CMS adapters

The headline JAMstack story. Each is a thin layer over an existing client SDK:

- **`@refrakt-md/sanity`** — pulls documents from Sanity, maps Portable Text → Markdoc, contributes a page per document. The big one — Sanity has the largest Markdoc-adjacent authoring community.
- **`@refrakt-md/notion`** — Notion databases as routes. Maps Notion blocks → Markdoc. Massive popular use case for marketing sites, internal wikis, knowledge bases.
- **`@refrakt-md/contentful`** — Contentful entries → pages. Enterprise headless CMS competitor to Sanity.
- **`@refrakt-md/strapi`** — open-source headless CMS adapter. Self-hosted alternative for users avoiding SaaS.
- **`@refrakt-md/payload`** — Payload CMS (TypeScript-first, growing rapidly in the Astro/Next.js community).
- **`@refrakt-md/airtable`** — spreadsheet-shaped data; common for client-supplied content libraries, product catalogs, event listings.

Pattern: plugin reads `process.env.{CMS}_*` for credentials, fetches at build time, contributes one page per document. Caching via plugin-local content-hash dedup.

### Code / repo / project tooling

Generated content from technical sources. Probably the easiest wins because the data is already structured and lives in the same repo as the build:

- **`@refrakt-md/typedoc`** — reads TypeScript declaration files, contributes one page per symbol. Already-known story (TypeDoc itself, Docusaurus, Astro Starlight all do this); refrakt would let the output use *real refrakt runes* (`api`, `symbol` from `@refrakt-md/docs`) instead of bespoke component layouts.
- **`@refrakt-md/openapi`** — reads `openapi.yaml`, contributes one page per endpoint using the `api` rune. Replaces tools like Redoc / Swagger UI with refrakt-themable output.
- **`@refrakt-md/jsdoc`** — JSDoc-annotated JS / TS without `.d.ts` files.
- **`@refrakt-md/changelog`** — reads CHANGELOG.md, contributes one page per release. Trivial but useful.
- **`@refrakt-md/storybook`** — one page per story; embeds the story renders. Bridge for teams using Storybook for component docs.
- **`@refrakt-md/coverage`** — coverage report pages from Istanbul / Vitest output. Niche but a real ask from teams who publish coverage history.

These plugins all read filesystem-local data, so no network policy concerns; caching is keyed off file mtime.

### Git / forge integration

The repo itself as a data source:

- **`@refrakt-md/github`** — uses GitHub's GraphQL API to contribute pages from issues, PRs, releases, contributor profiles, milestones. Pairs well with the plan-site template (a "what's recently merged" feed). The Trace-without-Trace tier for solo users.
- **`@refrakt-md/gitlab`** — same shape for GitLab.
- **`@refrakt-md/git-log`** — purely-local: walks `git log`, contributes a page per commit. Combined with `{% plan-activity %}`, gives a richer history view.

### Refrakt-internal "missing pieces"

Plugins that turn existing CLI output into pages:

- **`@refrakt-md/contracts-explorer`** — reads `contracts/structures.json`, contributes one page per rune showing the structural contract (BEM selectors, data attrs, child order). Today `refrakt inspect <rune>` is a CLI-only affordance; this turns it into a browsable on-site reference.
- **`@refrakt-md/plugins-list`** — reads `refrakt.config.json#/plugins`, contributes one page per installed plugin with its README, runes, theme overrides. Self-documenting site.
- **`@refrakt-md/reference`** — the rune-reference output `refrakt reference` produces (markdoc / json) becomes per-rune pages.

### Commerce / catalog

Product catalog as routes:

- **`@refrakt-md/shopify`** — pulls products via Storefront API, contributes one page per product. Storefront refrakt becomes a real option.
- **`@refrakt-md/stripe-products`** — Stripe Catalog as pages. Common for SaaS pricing pages, license-tier landing pages.

### Media / community

Social / media platforms as content sources:

- **`@refrakt-md/youtube`** — playlist as routes; one page per video. Uses the `{% playlist %}` / `{% track %}` runes from `@refrakt-md/media`.
- **`@refrakt-md/podcast`** — RSS-feed episodes as pages. Bridges podcast-host metadata into a refrakt-themed site.
- **`@refrakt-md/rss`** — generic RSS / Atom feed adapter.
- **`@refrakt-md/mastodon`** — pinned threads / featured tags as pages. Niche but small surface.
- **`@refrakt-md/discourse`** — forum threads as pages for community-knowledge-base sites.

### Existing refrakt plugins gaining `contributePages`

Some of refrakt's own plugins could opt in to publish their entities as pages, in addition to letting users configure `entityRoutes` themselves:

- **`@refrakt-md/storytelling`** — character profile pages, realm pages, faction pages. Already registers entities; just needs to publish them.
- **`@refrakt-md/places`** — event pages, map-marker pages, itinerary pages.
- **`@refrakt-md/business`** — team member bios from `{% cast %}`, organization pages from `{% organization %}`.
- **`@refrakt-md/design`** — design-token pages, palette explorers, typography specimens. (Currently the `swatch` / `palette` runes are used inside pages; this would let each token *be* a page.)
- **`@refrakt-md/plan`** — covered above; the unconditional-scan path's entities become routes via `entityRoutes`.

For these, the plugin doesn't *force* page generation; it ships an opt-in helper or sane-default `entityRoutes` snippet users can drop into their config.

### Pattern summary

| Category | Data source | Refresh trigger | Auth surface |
|----------|-------------|-----------------|--------------|
| Headless CMS | Network API | Webhook → rebuild | API key in env |
| Code / project | Local files | File mtime → dev HMR | None |
| Git / forge | Local + API | Push → rebuild | Token in env |
| Refrakt-internal | Build artifacts | Build itself | None |
| Commerce | Network API | Inventory webhook → rebuild | Storefront token |
| Media / community | Network API/RSS | Cron rebuild | Usually none |

Worth shipping in `@refrakt-md/*` directly: probably the `typedoc`, `openapi`, `changelog`, and `github` ones — they're high-value, the data shape is stable, and they exercise the mechanism across enough edge cases that they'd surface design issues early. Everything else is community-shaped — refrakt provides the hook and the templates; the ecosystem fills in.

-----

## Engine Changes

- **`@refrakt-md/types`** — new `ContributedPage` interface, `PluginContributePagesContext` interface, optional `contributePages` field on `Plugin`. `SiteConfig.entityRoutes` field with the rule shape above.
- **`@refrakt-md/content`** —
  - Built-in config-rules adapter that turns `entityRoutes` into `ContributedPage[]`.
  - Two-pass loader: file pages first, register pass, contribution phase, transform contributed pages, register pass again, aggregate, postProcess.
  - URL-collision detection and warning surfacing.
  - `SitePage.source` discriminated union (`{ type: 'file', path: string } | { type: 'contributed', plugin: string, ruleIndex?: number }`).
- **Adapters (`@refrakt-md/sveltekit`, `html`, `astro`, `next`, `nuxt`, `eleventy`, `react`, `vue`)** — no per-adapter changes required for the contribution mechanism itself. Each adapter enumerates routes from the merged `SitePage[]`, which by the time enumeration runs already includes contributed pages. Any adapter-specific caching layer (e.g. content-collection fingerprinting) keys off `SitePage.source` + `url` like it would for any other page.
- **`@refrakt-md/plan`** — no changes required for the plugin itself; existing entity registration is sufficient. The plan-site template (see *Replacing `plan serve`*) ships a ready-to-go `entityRoutes` config.

-----

## Replacing `plan serve` — concrete migration

`create-refrakt --template=plan-site` scaffolds a site whose config sets:

```json
{
  "plan": { "dir": "../plan" },
  "sites": {
    "main": {
      "contentDir": "./content",
      "plugins": ["@refrakt-md/plan"],
      "entityRoutes": [
        { "match": { "type": "spec" }, "url": "/specs/{id}/",
          "title": "{title}", "render": "{% expand $entity.id /%}" },
        { "match": { "type": "work" }, "url": "/work/{id}/",
          "title": "{id} — {title}", "render": "{% expand $entity.id /%}" },
        { "match": { "type": "bug" }, "url": "/bugs/{id}/",
          "title": "{id} — {title}", "render": "{% expand $entity.id /%}" },
        { "match": { "type": "decision" }, "url": "/decisions/{id}/",
          "title": "{title}", "render": "{% expand $entity.id /%}" },
        { "match": { "type": "milestone" }, "url": "/milestones/{name}/",
          "title": "{name}", "render": "{% expand $entity.name /%}" }
      ]
    }
  }
}
```

Plus `content/index.md` with dashboards (multiple `{% backlog %}` blocks), `content/_layout.md` with sidebar nav, and a handful of section pages (`work.md`, `specs.md`, etc.). Maybe 200 lines of markdown + 40 lines of config. `npm run dev` gives the user the same live UI `plan serve` did, with the bonus that it's a regular refrakt site they can theme, extend, and deploy anywhere.

`plan serve` and `plan build` get marked deprecated in the same release; removed 2-3 minors later.

-----

## Acceptance Criteria

- [ ] `Plugin.contributePages` interface defined; optional; sync or async return; takes a context with registry, projectRoot, site config, pipeline context
- [ ] Content loader runs a contribution phase after file-page registration but before aggregation, collecting `ContributedPage[]` from every plugin's hook
- [ ] Contributed pages flow through the normal parse + transform + register + aggregate + postProcess pipeline; downstream consumers cannot tell file from contributed
- [ ] `SiteConfig.entityRoutes` schema accepts `{ match, url, title?, render, frontmatter? }` records
- [ ] Built-in config-rules adapter ships as part of `@refrakt-md/content`, runs as a plugin in the contribution phase, turns `entityRoutes` into pages
- [ ] Placeholder substitution: `{name}` interpolates from entity top-level fields + `data` fields; per-segment URL encoding for the `url` field; plain text for `title` / `render` / `frontmatter` values
- [ ] `match` clause supports at least `type` (required), `tag`, `status`
- [ ] Multiple rules matching the same entity each produce a separate page (loader errors on URL collision)
- [ ] File-backed pages win against contributed pages at the same URL, with a build warning
- [ ] URL collisions between two contributed pages fail the build with attribution naming both sources
- [ ] Contributed pages appear in the sitemap, search index, route enumeration, and nav-auto graph
- [ ] `{% ref %}` to a URL produced by a contributed page resolves correctly (page entity is registered by core's existing register hook)
- [ ] `$entity` variable available inside `render` strings; full entity data accessible (`$entity.id`, `$entity.data.title`, etc.)
- [ ] Plugin error in `contributePages` is caught, surfaces as a build warning, build continues with that plugin's contributions skipped
- [ ] Empty `contributePages` return (no contributions) is a no-op
- [ ] Plugin authoring docs cover: when to use config rules vs the hook directly, caching guidance for external data, env-var convention, graceful failure for upstream issues
- [ ] `create-refrakt --template=plan-site` ships with a working `entityRoutes` config and content scaffold
- [ ] `plan serve` and `plan build` marked deprecated in the same release the contribution mechanism ships
- [ ] Two-pass register handling: contributed pages register their own entities (via core's register hook reading their rendered content), so a contributed page can be `{% ref %}`'d by other pages

-----

## Staleness & Refresh Strategy

Build-time contribution means the site is exactly as fresh as the last build. For data sources that change slowly (changelog, release notes, plan content, design tokens), that's fine — content matches reality "as of last deploy" and nobody notices. For data sources that change minute-to-minute (live inventory, social-feed activity, ticket queues), build-time-only is the wrong fit. This isn't a refrakt limitation specifically; it's the shape of every static-first framework (Astro, Eleventy, Hugo all share it). Worth being explicit about how the mechanism interacts with the freshness problem so plugin authors and integrators know what they're committing to.

### Three viable strategies, by data-source velocity

**1. Slow-changing data — webhook-triggered rebuild.**

The data source notifies the build platform when its content changes; the platform rebuilds. Standard JAMstack pattern, supported by every modern host (Netlify build hooks, Vercel deploy hooks, Cloudflare Pages, GitHub Actions `repository_dispatch`). Headless CMS plugins (`sanity`, `notion`, `contentful`) ship with webhook setup instructions; user wires the hook to their build trigger; content updates land in production within the rebuild window (typically <60s).

Best fit:
- Headless CMS adapters (CMS updates trigger rebuild)
- GitHub plugin reading repo data (push triggers rebuild)
- Plan content (file changes trigger rebuild via git push)
- Code / project tooling (file changes trigger dev HMR; CI rebuilds on push)

**2. Medium-velocity — scheduled rebuilds.**

A cron job rebuilds the site every N minutes regardless of content changes. Suits data that updates frequently but doesn't need to be second-to-second fresh — release feeds, blog feeds, recently-merged PRs. Hosts offer first-class scheduled-build support; otherwise a small GitHub Action runs the rebuild.

Best fit:
- GitHub / GitLab "recent activity" pages
- RSS / podcast / YouTube feed aggregators
- Refrakt-internal contracts-explorer (rebuild on schema change is too rare; nightly rebuild keeps it in sync)

The "freshness budget" surfaces as a user choice — 5-minute cron is more responsive than 1-hour cron but burns more CI minutes. Plugin docs should suggest a default.

**3. High-velocity — don't use build-time, use a client-side widget.**

Some data legitimately can't live in a static page. Live inventory, real-time chat, ticket-queue counts, "online now" indicators — these need a client request, not a build artifact. For these cases, the right pattern isn't "use refrakt's contribution mechanism"; it's "render the static page shell via refrakt, hydrate the dynamic part client-side from a public API". The contribution mechanism doesn't solve this, and shouldn't try to. Plugin authors writing adapters for high-velocity data should document this explicitly: "this plugin gives you build-time snapshots; for live data, use a client component that calls the API directly."

Worst fit:
- Live commerce inventory (price + stock count) — the *catalog* is fine to build statically; the *availability* is not
- Real-time social feed (Twitter timeline, Mastodon "latest") — pin specific items at build time, fetch live ones client-side
- Authenticated user data — out of scope by construction; refrakt has no per-user runtime

### Implications for plugin authors

The freshness contract is **plugin-owned**, not core-owned. Plugins document:

- **Refresh trigger:** what causes the data to update on the live site (webhook, schedule, manual rebuild)
- **Build-time snapshot age:** how stale the data can be before becoming wrong (minutes, hours, days)
- **Hybrid guidance:** if part of the rendered page should be client-side-fresh, plugins should say so and ideally ship a companion runtime component

A plugin built without thinking about this — one that pulls from a fast-moving API and never tells users when to rebuild — is a footgun. Refrakt's contribution to good-citizen plugin authoring is the docs template: any plugin landing under `@refrakt-md/*` should have a "Freshness" section in its README. Community plugins follow the convention or don't; can't enforce.

### What this means for the headline use cases

Mapping the categories from the previous section to the strategies above:

| Category | Strategy | Notes |
|----------|----------|-------|
| Headless CMS (sanity, notion, contentful, …) | (1) webhook | Industry-standard; CMS UIs already speak deploy-hook |
| Code / project tooling (typedoc, openapi, …) | (1) on push | Build is already part of CI; no extra wiring |
| Git / forge (github, gitlab) | (1) + (2) | Webhook for push events; cron for issues/PRs |
| Refrakt-internal (contracts-explorer, …) | (1) on rebuild | Implicit — built from build artifacts |
| Commerce — catalog | (1) webhook | Stock keeps in sync via rebuild |
| Commerce — live inventory | (3) client-side | Page is static; stock count fetched live |
| Media / community feeds | (2) cron | 1-hour cadence is usually fine |
| Refrakt own plugins (storytelling, places, etc.) | (1) on push | File-backed; same as plan content |

The pattern-summary table earlier in this spec already has a "Refresh trigger" column; this section explains the substance behind it.

### Why not solve staleness in refrakt core?

Three reasons:

- **Static is the contract.** The build-time / runtime split is a foundational refrakt invariant — adapters render statically, no per-request server, no edge runtime. Adding "but sometimes data is live" muddies the model and breaks adapters that don't support hybrid rendering (`@refrakt-md/html` literally writes files to disk; there's no runtime there).
- **Plugins know their data better than we do.** Webhook setup, cache invalidation, hybrid-component patterns — all specific to the data source. Core would be wrong about the defaults more often than right.
- **The infrastructure already exists.** Webhook rebuilds, scheduled CI, Edge Functions for hybrid hydration — these are mature, well-documented host features. Wrapping them in a refrakt-specific abstraction would invent surface for a solved problem.

That said: the spec leaves room for refrakt to later add a **convenience tier** if real demand surfaces — a `refrakt.config.json` field for declaring "rebuild this site every N minutes" or "the following plugins emit content that should hybrid-hydrate", and a built-in client-side fetcher rune. None of that's in scope for this spec; called out so it's not foreclosed.

-----

## Out of Scope

- **Runtime data fetching.** All contribution happens at build time. Pages produced are static. Refrakt is not becoming a server-rendered framework.
- **Lazy / on-demand page generation.** The full set of pages must be enumerable at build start.
- **A secrets / credentials system.** Plugins read `process.env`. The convention is documented; refrakt doesn't manage it.
- **A core caching layer for contribution responses.** Plugins own their own caching. Refrakt may eventually offer a shared cache primitive, but that's its own design.
- **Per-rule custom predicate functions** (`match.where`). Defer until the declarative `match` shape proves insufficient.
- **Plugin-supplied layouts for contributed pages.** Contributed pages use the host site's layout cascade (`_layout.md`). A plugin wanting an opinionated layout writes it as content and ships it as a contributed page itself.
- **Recursive contribution.** Contributed pages cannot themselves trigger another contribution phase. The graph is one level deep by design — keeps the build deterministic.
- **Watch-mode HMR for external-data contributions.** Dev-server HMR for file pages keeps working; contributed pages refresh on full build. Watching external sources is a plugin's call to make (file-system watcher, polling, webhook listener — out of scope for core).
- **Multi-site fan-out of one contribution.** Each site reads `entityRoutes` independently and runs its own plugin contribution phase. Cross-site dedup would be its own design.

-----

## Open Questions

**Where exactly does the contribution phase fit in the multi-site loader?** A monorepo with several sites in `refrakt.config.json` runs the pipeline per site today. Contributions are per-site (each site picks its own `entityRoutes`). But plugins that fetch from external sources would be called once per site if naively integrated — wasted work. Recommend: per-site is the safe default; plugins that want to dedupe across sites cache internally. Revisit if real performance issues surface.

**Should `match` support multiple types in one rule?** E.g. `match: { type: ["spec", "decision"] }`. Tempting (saves duplication) but adds matching complexity. Recommend: defer — duplicate rules until the duplication is painful.

**How does the contribution-phase ordering interact with `Plugin.configure`?** `configure` runs first (one-time setup, file-root registration, etc.). Contributions read the configured state. So contributions implicitly happen after configure; document explicitly.

**Two-pass register: any infinite-loop risk?** Contributed pages may register their own entities (via the standard register hook on their rendered content). If a later contribution rule could match those newly-registered entities, we'd recurse. The proposed fix is "contributed pages do not trigger another contribution phase" — but should newly-registered entities from contributed pages still be reachable by `{% ref %}` and `{% expand %}` in the rest of the build? Yes (they're in the registry). They just can't *cause new pages to be contributed*. Document the boundary.

**Should the contribution context expose the project's full config, or just the per-site slice?** Per-site is cleaner; full config is more powerful for plugins that want global state. Recommend per-site, but include `projectRoot` so plugins can re-load the full config themselves if they need to.

**Caching contract: should refrakt offer a per-plugin `ctx.cache` keyed by plugin name?** Tempting for the common "I parsed a CMS payload last build, here it is again" case. Defer — most plugins will roll their own (or use existing libs like `quick-lru`), and we don't have enough data on what the cache contract should look like to design it well.

**Should plugin contributions have a registration order, the same as the existing pipeline hooks?** Yes — same registration order; deterministic; matches how `register` / `aggregate` / `postProcess` already order. Document explicitly.

**`source.type === "contributed"` for SitePage — exposed to user code or internal-only?** Probably internal-only (the SitePage shape isn't part of the public author surface), but worth surfacing in dev-tools / diagnostics. Recommend: internal type with a public projection for the inspector.

**How does the plan-site template handle entities that don't have `sourceFile` + `extract`?** The unconditional scan path sets those fields; the in-content registration path doesn't (and doesn't need to — there's a real file backing it). A `{% expand $entity.id /%}` on an entity without `extract` would error. For the template, this is fine — plan entities always have `extract` thanks to WORK-251. But the spec should call out that `expand` requires both fields, and entityRoutes rules using `$expand` should be paired with entity types that have them.

-----

## References

- {% ref "SPEC-064" /%} — plan plugin unconditional registration (entities exist but have no URL today)
- {% ref "SPEC-065" /%} — configurable xref resolution (same `{name}` substitution syntax)
- {% ref "SPEC-066" /%} — expand rune (the canonical body of contributed pages)
- {% ref "SPEC-063" /%} — configurable file roots (same config-shape precedent)
- `packages/content/src/site.ts` — `loadContent` / `loadContentFromTree` (where the contribution phase plugs in)
- `packages/types/src/package.ts` — `Plugin` interface (where `contributePages` lives)
- `packages/sveltekit/src/virtual-modules.ts` — route enumeration (consumes the merged page list)

{% /spec %}
