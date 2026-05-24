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

The SvelteKit adapter's prerender step enumerates routes from the SitePage list. Contributed pages are in that list by the time prerender runs, so no adapter changes are needed *if* contributions happen before route enumeration. The Vite plugin's `usedCssBlocks` analysis (the CSS tree-shaker from SPEC-... — the one we built earlier) similarly sees all pages.

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

## Engine Changes

- **`@refrakt-md/types`** — new `ContributedPage` interface, `PluginContributePagesContext` interface, optional `contributePages` field on `Plugin`. `SiteConfig.entityRoutes` field with the rule shape above.
- **`@refrakt-md/content`** —
  - Built-in config-rules adapter that turns `entityRoutes` into `ContributedPage[]`.
  - Two-pass loader: file pages first, register pass, contribution phase, transform contributed pages, register pass again, aggregate, postProcess.
  - URL-collision detection and warning surfacing.
  - `SitePage.source` discriminated union (`{ type: 'file', path: string } | { type: 'contributed', plugin: string, ruleIndex?: number }`).
- **`@refrakt-md/sveltekit`** — virtual-modules.ts already enumerates pages from the loaded content; should pick up contributed pages automatically. The `usedCssBlocks` analysis runs against all pages, including contributed, so CSS tree-shaking continues to work.
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
