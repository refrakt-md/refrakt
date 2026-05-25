{% spec id="SPEC-069" status="draft" tags="content, routing, plugins, config, registry" %}

# Plugin-contributed routes & declarative entity routing

A mechanism for getting content into a refrakt site from sources that don't live in the content tree — local plan files, external CMSes, databases, issue trackers. It operates on **two orthogonal axes**:

- **Entity contribution** *(the fundamental axis)* — register entities from any source so they're referenceable (`{% ref %}`), embeddable (`{% expand %}`), and listable (`{% backlog %}` / `{% blog %}`) on pages the author already wrote. No routes required. An entity can carry its own embeddable content via an `embed()` function, so it works whether or not a file backs it.
- **Page contribution** *(a layer on top)* — turn entities (or raw external data) into their own routes. Expressed declaratively as `entityRoutes` rules in `refrakt.config.json` (mirroring `xrefPatterns` / `fileRoots`), or programmatically via a `contributePages` plugin hook for data that isn't entity-shaped.

The axes compose: display an external issue tracker's tickets inline with *entity contribution alone* (no routes); build a full plan site or CMS-backed blog with *entity + page contribution* (a route per item). Page contribution usually builds on entity contribution but doesn't have to — a raw `contributePages` returning marketing-page HTML never registers an entity.

Both page surfaces compile down to the same primitive: a list of *virtual pages* the content loader treats indistinguishably from file-backed pages. Config rules are sugar over the hook; the hook is the real page-axis mechanism. The entity axis sits beneath both.

## Problem

Today, every page on a refrakt site corresponds to a file in the site's content tree, and every registry entity is scanned out of a rendered page. The pipeline is keyed off "what's in `content/`". This is fine for hand-authored sites, but it leaves several real use cases unaddressed:

**1. Registered entities that should also be pages, without file duplication.**

The plan plugin's unconditional scan (SPEC-064) registers entities from `plan/` files outside the content tree, with `sourceFile` + `extract` set so the {% ref "SPEC-066" /%} expand rune can inline them. But those entities have no URL of their own — they don't appear as `/specs/SPEC-001/` or any other route. Users wanting "per-spec pages" today must either mirror `plan/` into `content/` (gives URLs but loses peer-of-content semantics) or hand-author route files (loses single-source-of-truth).

**2. Static plan-site replacement.**

The plan CLI's `plan serve` / `plan build` give users a zero-config browseable site of their plan content. That's a parallel rendering path to the regular site one, with its own maintenance burden. If declarative route rules existed, a `create-refrakt --template=plan-site` scaffold could express the same site in ~40 lines of config, sharing one rendering path with every other refrakt site. Removing `plan serve`'s separate implementation requires *exactly* this primitive.

**3. External data — inline, with or without routes.**

Two distinct shapes here, and conflating them was the original framing mistake this spec corrects:

- **Inline, no route** — pull tickets from an issue tracker (Jira, Linear, GitHub Issues, Trace), convert each to a refrakt entity, and display it inline via `{% expand %}` / `{% backlog %}` on an existing page. The ticket's canonical home stays in the tracker; the site shows a build-time snapshot. *No new route is created.* This is pure entity contribution and needs no page machinery at all.
- **Route per item** — the JAMstack pattern: build a static site where each CMS document / DB row gets its own page (Astro content collections, Eleventy data files, Next.js getStaticProps, Hugo data templates). This is entity contribution *plus* a page layer.

**4. The current registry contract assumes a backing file.**

SPEC-066's embeddability contract is `sourceFile` + `extract` — read the file, run the extractor. An entity sourced from an external API has no file; its content is an in-memory payload converted to a Markdoc subtree. Today `{% expand %}` on such an entity fails with "does not support embedding". The contract needs to generalize from "file + extractor" to "anything that can produce a subtree on demand".

Today's options for any of these:

- **Mirror data into the content tree as a build step.** Ugly: requires a pre-build script, leaves stale files when source changes, awkward git story.
- **Fork the content loader.** Tied to internals; brittle across upgrades.
- **Build an adapter-specific data layer.** Loses everything refrakt's pipeline does (xref resolution, rune transforms, themes, search indexing) and ties you to one adapter.

What's missing is two clean extension points: *plugins can register entities from any source* (entity axis), and *plugins / config can declare additional routes* (page axis).

-----

## Design Principles

**Entity contribution is the fundamental axis; pages are a layer on top.** The unit of contribution is the entity, not the page. "Make it a page" is one optional thing you can do with an entity — most external-data use cases (inline issue display, dashboards) never need routes. Designing entity-first keeps the no-route case first-class instead of something that falls out by accident.

**One page-mechanism, two surfaces.** On the page axis, the underlying primitive is "plugin contributes pages". Config rules (`entityRoutes`) are a built-in adapter that interprets the config as page contributions; the `contributePages` hook is the same mechanism for data that isn't entity-shaped. Don't ship two parallel page systems.

**Symmetric with existing config patterns.** Route rules look and feel like `xrefPatterns` and `fileRoots`. Same `{name}` substitution syntax, same per-site scoping, same file (`refrakt.config.json`). Authors who learned xref patterns recognize the shape; no new mental model.

**User owns the route shape; plugin owns the entity.** One site can put plan at `/plan/specs/X/`, another at `/SPEC-X/`. The plugin registers the entity and (optionally) its external canonical URL; the user's config decides the on-site route. When a route rule creates a page for an entity, it back-fills the entity's on-site URL so refs resolve there (see *URL ownership* below).

**Plugin-contributed pages go through the normal pipeline.** A virtual page contributed by a plugin is parsed, transformed, registered, aggregated, and post-processed exactly like a file-backed page. Embedded runes execute; xrefs inside the contributed content resolve via the host's xref pass; the page can be linked to by other refs; it appears in the sitemap, search index, and nav-auto graph. *No exceptions* — anything special about being virtual lives at the contribution boundary, not in the rest of the pipeline.

**Build-time only.** Contribution runs once per build, returns a fixed list. Pages aren't created lazily on request; the static-prerender enumeration sees the full set at build start. Rules out runtime data fetching by construction — keeps the deterministic-build property refrakt depends on.

**Asynchronous by default.** External-data plugins need to fetch over the network; both the entity-fetch (via the existing async `configure` hook) and the page hook (`contributePages`) support promises. Sync return is allowed for the config-rules adapter (no IO) and other in-memory cases.

**No secrets system.** Plugins that need API keys read from `process.env` like any Node code. Refrakt doesn't invent a secrets layer or a credentials store. This is a deliberate non-feature; we expect users to use standard `.env` workflows (dotenv, host env vars, etc.).

**Caching is plugin-owned, not core.** A hook that hits an HTTP API on every build is the plugin's problem to optimize. Plugins decide whether to cache responses, use ETags, key off content hashes, etc. Refrakt provides the hook timing; it doesn't try to be a build cache. This keeps the contract narrow.

-----

## Authoring Surface

### Entity axis — registering entities from any source

The fundamental surface. A plugin fetches data (in the async `configure` hook, which already exists and runs once per build) and registers entities in its `register` hook. Entities sourced externally provide their embeddable content via an `embed()` function rather than a `sourceFile`:

```ts
// @refrakt-md/jira — display tracker tickets inline, no routes
export const jiraPlugin: Plugin = {
  name: '@refrakt-md/jira',
  async configure(opts) {
    // Fetch once per build; stash for the register hook.
    this._issues = await fetchJiraIssues(process.env.JIRA_TOKEN!);
  },
  pipeline: {
    register(_pages, registry) {
      for (const issue of this._issues) {
        registry.register({
          type: 'spec',                       // masquerades as a plan type so {% backlog %} lists it
          id: issue.key,                      // "PROJ-123"
          canonicalUrl: issue.browseUrl,      // links {% ref %} out to Jira
          data: { title: issue.summary, status: issue.status },
          embed: () => jiraToMarkdoc(issue),  // file-less embeddable content
        });
      }
    },
  },
};
```

On an existing page the author writes `{% expand "PROJ-123" /%}` (inline snapshot), `{% ref "PROJ-123" /%}` (links to the live Jira ticket via `canonicalUrl`), or `{% backlog show="spec" /%}` (lists it in a dashboard). **No route is created** — the ticket appears only where referenced.

`embed()` is the generalization of SPEC-066's `sourceFile` + `extract`. The embeddability contract becomes: an entity is embeddable if it has *either* `embed()` *or* (`sourceFile` + `extract`). The plan plugin keeps using the file path; external plugins use `embed()`.

### Page axis, declarative — `entityRoutes` in config

```json
{
  "sites": {
    "main": {
      "contentDir": "./content",
      "entityRoutes": [
        {
          "type": "spec",
          "url": "/specs/{id}/",
          "title": "{title}",
          "render": "{% expand $item.id canonical=true /%}"
        },
        {
          "type": "work",
          "filter": "status:ready status:in-progress",
          "url": "/work/{id}/",
          "title": "{id} — {title}",
          "render": "{% expand $item.id /%}"
        },
        {
          "type": "decision",
          "url": "/decisions/{id}/",
          "render-template": "templates:decision-page.md",
          "frontmatter": { "category": "decision-log" }
        }
      ]
    }
  }
}
```

For each registered entity matching a rule's `type` + optional `filter` (see *Selecting entities*), the content loader synthesizes a virtual page at the templated URL, with frontmatter from the rule's `frontmatter` field (merged with reasonable defaults derived from the entity), title from the optional templated `title` (which feeds the page's frontmatter `title` — see *Output Contract*), and content from either an inline `render` string or a `render-template` partial. Substitution placeholders (`{id}`, `{title}`, etc.) draw from the entity's `data` payload plus the resolved `id` and `type`.

**Inline `render` vs `render-template` partial.** `render` is a markdoc string — fine for a one-liner like `{% expand $item.id /%}`. But anything richer (a hero + embed + related-items section) becomes multi-line markdoc crammed into a JSON string with escapes — miserable to author and review. For those, point `render-template` at a markdoc partial (resolved via the existing partial + file-roots machinery), authored as a real `.md` file with syntax highlighting and formatting, reusable across rules and sites. `render` and `render-template` are mutually exclusive (both set → build error). This is the same inline-vs-partial split SPEC-070's collection uses for its per-item template; the two specs share the "a template, transformed per entity with the same bound variable" mechanism — `$item` in both, so a partial authored for a route can be reused in a collection and vice versa.

### Page axis, programmatic — `Plugin.contributePages`

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

### URL ownership — `sourceUrl` vs `canonicalUrl`

When an entity exists in the registry *and* a route rule creates a page for it, two URLs are in play and they're different concerns:

- **`sourceUrl`** — where the entity lives *on this site*. Drives `{% ref %}`. Set in one of two ways:
  - File-backed plan entities in the content tree: `sourceUrl = page.url` (current behavior).
  - Entities published via `entityRoutes`: the route rule **back-fills** `sourceUrl` with the URL it generates. The plugin doesn't know the user's chosen prefix (`/blog/` vs `/posts/`), so it can't set this — the route rule owns it and writes it back onto the entity during the contribution phase, before the xref pass runs.
  - Inline-only entities (no route): `sourceUrl` is undefined.
- **`canonicalUrl`** — the *external* source-of-truth URL, if any. Set by the plugin at registration. Drives `{% expand canonical=true %}`'s "view canonical" link.

The two are independent because real cases need both distinguished:

| Case | `sourceUrl` | `canonicalUrl` | `{% ref %}` → | `expand canonical` → |
|------|-------------|----------------|---------------|----------------------|
| Plan spec, on-site route | `/specs/SPEC-1/` (back-filled) | — | on-site page | on-site page |
| Sanity blog post, on-site route | `/blog/x/` (back-filled) | — | on-site page | on-site page |
| Jira ticket, inline, no route | undefined | Jira issue URL | Jira (canonical) | Jira |
| Jira ticket, *mirrored* with route | `/tickets/x/` (back-filled) | Jira issue URL | on-site mirror | Jira (the source of truth) |

The last row is the case that forces the split: the reader can click the inline ref to read the on-site mirror, or follow "view canonical" to the live ticket. One field can't be both.

Resolution precedence is unchanged from the xref chain (SPEC-065): `sourceUrl` (now possibly back-filled) → `data.url` → patterns → unresolved. The back-fill simply means an entity that had no `sourceUrl` gains one when a route is created for it, so refs prefer the on-site page over a pattern-derived external URL.

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

**`title` reuses the file-page title chain.** The rule's `title` is optional. When present, it populates the synthesized page's **frontmatter `title`** — it does *not* introduce a second, parallel title-resolution path. The existing precedence (frontmatter `title` → hero headline → first `H1`, see `extractSeo`) then runs unchanged. The practical consequence: when a rule omits `title`, the page title falls back to the rendered content's heading just like a file page — and since `render` is usually `{% expand $item.id /%}`, the expanded entity's own `H1` becomes the title for free. A rule that sets both a top-level `title` and a `title` inside its `frontmatter` object is redundant; the top-level field wins (it is the sugar that writes `frontmatter.title`).

-----

## Rule Substitution

### Placeholder syntax

`{name}` interpolates from the entity's combined field set: top-level (`id`, `type`, `sourceFile`, `sourceUrl`) plus everything in `data`. Same shape as xref pattern templates (SPEC-065).

```json
{
  "type": "character",
  "url": "/cast/{id}/",
  "title": "{name}",
  "render": "{% expand $item.id canonical=true /%}",
  "frontmatter": {
    "category": "character",
    "realm": "{realm}"
  }
}
```

URL substitution is per-segment-encoded (same as xref). Title and content substitutions are not URL-encoded (they're text).

The templated `url` is a **site-root-relative** route: the loader applies the site's `basePath` to it, exactly as it does for a file's path-derived URL (`Router.filePathToUrl`) and a *relative* frontmatter `slug`. It deliberately does **not** behave like an *absolute* `slug` (the one case that bypasses `basePath`) — a rule author writing `"/specs/{id}/"` means "the specs section of my site", and the route must follow the site if it's deployed under a sub-path. So `url` is the path-axis analog of the file path, not of an absolute slug override.

Missing fields render as empty strings, matching xref pattern behavior. A rule that depends on a field the entity doesn't have will produce an empty value at that placeholder; the build emits a warning but doesn't fail.

### Selecting entities — `type` + `filter`

Which entities a rule applies to is expressed exactly as collection (SPEC-070) expresses it — *the same grammar and the same parser*, so there's one way to "select registry entities" across the whole system:

- **`type`** (required) — the entity type(s) the rule matches. Comma-separated for multiple: `"type": "spec,decision"`.
- **`filter`** (optional) — additional field conditions as a `field:value` string. Exact (`status:ready`), glob (`url:/blog/*`), regex (`id:/^SPEC-\d+$/`). Same-field clauses OR; different fields AND. Matches any field including `url`. Example: `"filter": "status:ready priority:high priority:critical"`.

The full grammar — syntax, operator-by-value-shape, field resolution, quoting, case-sensitivity, reserved operators — is defined canonically in **SPEC-070's *Field-match grammar*** section; this spec uses it verbatim rather than restating it.

This replaces the earlier structured `match: { type, tag, status }` object. The string `filter` form is what makes the grammar shareable between a JSON config field (here) and a markdoc attribute (collection's `filter=`) — a structured object can't be a markdoc attribute, but a string works in both. It also matches the xref-patterns precedent (string matching in JSON config) and is implemented by **one shared parser** across `entityRoutes`, `collection`, and `backlog`.

Multiple rules can match the same entity — each produces a separate page (the loader errors on URL collisions).

### Variable surface inside `render`

The `render` string (or `render-template` partial) is markdoc content. The substituted entity is exposed as `$item` — a read-only bound variable with **the same canonical field shape collection (SPEC-070) binds per row** (`$item.id`, `$item.type`, `$item.url` guaranteed; payload strictly under `$item.data.*`, no hoisting; `url` resolved via the xref chain, empty-string not undefined). The full definition lives in **SPEC-070's *The `$item` variable and card runes*** section; this spec binds it identically, so a `render-template` partial and a collection `item-template` are interchangeable. So `{% expand $item.id /%}` is the canonical pattern.

Templates can also reference the entity's data fields directly: `# {% $item.data.title %}`. The full Markdoc variable model applies. The inline `render` and the `render-template` partial bind `$item` identically; the only difference is where the markdoc source lives.

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

Ships as part of `@refrakt-md/content`. Reads `site.entityRoutes`, walks the registry, applies each rule's `type` + `filter` selector (via the shared field-match parser), runs substitution, and renders the inline `render` or `render-template` partial per entity with `$item` bound. Returns the contributed pages — same shape as third-party plugins from the loader's perspective; it just happens to live in the framework.

### Plugin guidance

- **Prefer entity registration + config rules** when your data fits the registry shape. Lets users tune URLs without plugin changes.
- **Use `contributePages` directly** when your data source isn't entity-shaped (whole-document CMS payloads, opaque API responses, file-tree mirrors that don't fit the rune model).
- **Cache external fetches** in the plugin. The hook runs once per build; if your build runs ten times a day, that's ten API calls per page. Use ETag headers, content-hash caches, or whatever your data source supports.
- **Fail gracefully** when the upstream is down. A network blip shouldn't halt the entire build — log a warning, contribute fewer pages, and let the build continue. (For external data, "no pages contributed this build" is usually better than "build failed".)
- **Document required environment variables** in your plugin's README. Refrakt doesn't validate secrets — the convention is `process.env.YOUR_PLUGIN_NAME_*`.
- **To target a domain rune, emit its authored syntax — don't dump generic markdown.** Refrakt has two kinds of rune, fed two different ways:
  - *Registry listers* (`{% backlog %}`, `{% collection %}`) query the registry directly — feed them by registering entities; the rune finds them.
  - *Content-model runes* (`{% changelog %}`, `{% recipe %}`, `{% api %}`, `{% character %}`, etc.) consume authored Markdoc — feed them by emitting their syntax in your `content` / `embed()` string. E.g. a GitHub-releases plugin produces `{% changelog %}{% changelog-release version="…" date="…" %}…{% /changelog-release %}{% /changelog %}` rather than a bare list of headings, and the rune transforms it normally. No rune modification is needed; the serializer just targets the rune's content model. (Prefer a rune's explicit child-tag form over its heading-derived form when your body content may contain its own headings — it avoids heading-level collisions.)

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

- **`@refrakt-md/types`** —
  - `EntityRegistration` gains optional `embed?: () => Node | string` (file-less embeddable content) and `canonicalUrl?: string` (external source-of-truth URL). `sourceUrl`'s documented meaning sharpens to "on-site URL" (back-fillable by route rules).
  - New `ContributedPage` interface, `PluginContributePagesContext` interface, optional `contributePages` field on `Plugin`.
  - `SiteConfig.entityRoutes` field — each rule `{ type, filter?, url, title?, render? | render-template?, frontmatter? }`.
- **`@refrakt-md/runes`** — amend the expand resolver (SPEC-066): embeddability is `embed()` *or* (`sourceFile` + `extract`); resolution calls `embed()` when present, else reads the file. `canonical=true` link prefers `canonicalUrl`, falls back to `sourceUrl`. This is the cross-spec dependency surfaced by the scenario walkthrough — SPEC-066's contract is widened here.
- **Shared field-match parser** — the `type` + `filter` selector grammar (defined canonically in SPEC-070's *Field-match grammar*: exact / glob / regex; AND across fields, OR within; case-sensitive; quoted values; `url`-alias field resolution) is **one implementation** used by `entityRoutes` (this spec), `collection` (SPEC-070), and `backlog`. Lives wherever the registry-consuming runes share helpers (`@refrakt-md/runes`); `plugins/plan/src/filter.ts` folds into it (gaining glob/regex, `url` resolution, case-consistency). The string grammar is what lets the same selector work in a JSON config field (here) and a markdoc attribute (collection).
- **`@refrakt-md/content`** —
  - Built-in config-rules adapter that turns `entityRoutes` into `ContributedPage[]`: applies each rule's `type` + `filter`, renders the inline `render` string or the `render-template` partial per entity with `$item` bound, and **back-fills each matched entity's `sourceUrl`** with the generated route URL before the postProcess xref pass.
  - `render-template` resolution via the existing partial + file-roots machinery; `render` / `render-template` mutual-exclusion check.
  - Two-pass loader: file pages first, register pass, contribution phase, transform contributed pages, register pass again, aggregate, postProcess.
  - URL-collision detection and warning surfacing.
  - `SitePage.source` discriminated union (`{ type: 'file', path: string } | { type: 'contributed', plugin: string, ruleIndex?: number }`).
- **Adapters (`@refrakt-md/sveltekit`, `html`, `astro`, `next`, `nuxt`, `eleventy`, `react`, `vue`)** — no per-adapter changes required for the contribution mechanism itself. Each adapter enumerates routes from the merged `SitePage[]`, which by the time enumeration runs already includes contributed pages. Any adapter-specific caching layer (e.g. content-collection fingerprinting) keys off `SitePage.source` + `url` like it would for any other page.
- **`@refrakt-md/plan`** — no changes required for the plugin itself; existing entity registration is sufficient. The plan-site template (see *Replacing `plan serve`*) ships a ready-to-go `entityRoutes` config.

### Listing contributed content

No new lister rune is required for the headline cases:

- **Contributed pages** (Sanity blog with routes, etc.) are real pages in the corpus, so `{% blog folder="/blog" %}` — which lists pages by folder + frontmatter — enumerates them. The `entityRoutes.frontmatter` field supplies the `date` / `draft` / etc. values blog sorts and filters on.
- **Plan-typed entities** (including external data registered as `spec` / `work` / `bug`) are listed by `{% backlog show=… %}`.

The residual gap — listing entities of a type that is *neither* a page *nor* a plan type, *without* giving them routes (e.g. a `product` entity shown only in a dashboard) — is deferred. The workaround is "give them routes and use `{% blog %}`", or "register them as a plan type". A generic `{% collection %}` rune (backlog generalized to any registry type) would close it cleanly; tracked as future work, not a blocker for this spec.

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
        { "type": "spec", "url": "/specs/{id}/",
          "title": "{title}", "render": "{% expand $item.id /%}" },
        { "type": "work", "url": "/work/{id}/",
          "title": "{id} — {title}", "render": "{% expand $item.id /%}" },
        { "type": "bug", "url": "/bugs/{id}/",
          "title": "{id} — {title}", "render": "{% expand $item.id /%}" },
        { "type": "decision", "url": "/decisions/{id}/",
          "title": "{title}", "render": "{% expand $item.id /%}" },
        { "type": "milestone", "url": "/milestones/{name}/",
          "title": "{name}", "render": "{% expand $item.name /%}" }
      ]
    }
  }
}
```

Plus `content/index.md` with dashboards (multiple `{% backlog %}` blocks), `content/_layout.md` with sidebar nav, and a handful of section pages (`work.md`, `specs.md`, etc.). Maybe 200 lines of markdown + 40 lines of config. `npm run dev` gives the user the same live UI `plan serve` did, with the bonus that it's a regular refrakt site they can theme, extend, and deploy anywhere.

`plan serve` and `plan build` get marked deprecated in the same release; removed 2-3 minors later.

-----

## Acceptance Criteria

### Entity axis

- [ ] `EntityRegistration` gains optional `embed?: () => Node | string`; an entity with `embed` is treated as embeddable by `{% expand %}` without a `sourceFile`
- [ ] expand resolution (SPEC-066) calls `embed()` when present, else falls back to `sourceFile` + `extract`; an entity with neither produces the existing "does not support embedding" error
- [ ] `embed()` returning a markdoc string is parsed; returning a `Node` is used directly; both run through the host transform
- [ ] `EntityRegistration` gains optional `canonicalUrl?: string`; `{% expand canonical=true %}` prefers `canonicalUrl`, falls back to `sourceUrl`
- [ ] `{% ref %}` to an entity with `canonicalUrl` but no `sourceUrl` (inline-only, no route) links to `canonicalUrl`
- [ ] An external-data plugin can fetch in the async `configure` hook and register entities (with `embed()` + `canonicalUrl`) in `register`, with no route created — entity is referenceable / embeddable / listable inline
- [ ] `{% backlog %}` lists externally-registered entities of plan types (`spec`/`work`/`bug`/…) with no plugin-side listing code

### Page axis

- [ ] `Plugin.contributePages` interface defined; optional; sync or async return; takes a context with registry, projectRoot, site config, pipeline context
- [ ] Content loader runs a contribution phase after file-page registration but before aggregation, collecting `ContributedPage[]` from every plugin's hook
- [ ] Contributed pages flow through the normal parse + transform + register + aggregate + postProcess pipeline; downstream consumers cannot tell file from contributed
- [ ] `SiteConfig.entityRoutes` schema accepts `{ type, filter?, url, title?, render | render-template, frontmatter? }` records (`render` and `render-template` are mutually exclusive)
- [ ] Built-in config-rules adapter ships as part of `@refrakt-md/content`, runs as a plugin in the contribution phase, turns `entityRoutes` into pages
- [ ] Placeholder substitution: `{name}` interpolates from entity top-level fields + `data` fields; per-segment URL encoding for the `url` field; plain text for `title` / `render` / `frontmatter` values
- [ ] The `url` is site-root-relative: the site's `basePath` is applied (like a path-derived URL / relative `slug`), not bypassed as an absolute `slug` would be
- [ ] An optional `title` feeds the page's frontmatter `title` (one resolution path); when omitted, the title falls back to the rendered content's heading via the existing precedence (frontmatter → hero → `H1`)
- [ ] `type` (required, comma-separated for multiple) + optional `filter` string select entities via the shared field-match parser per SPEC-070's *Field-match grammar* (exact / glob / regex; AND across fields, OR within; case-sensitive)
- [ ] Multiple rules matching the same entity each produce a separate page (loader errors on URL collision)
- [ ] File-backed pages win against contributed pages at the same URL, with a build warning
- [ ] URL collisions between two contributed pages fail the build with attribution naming both sources
- [ ] Contributed pages appear in the sitemap, search index, route enumeration, and nav-auto graph
- [ ] `{% ref %}` to a URL produced by a contributed page resolves correctly (page entity is registered by core's existing register hook)
- [ ] `$item` variable available inside `render` strings and `render-template` partials, with the canonical shape from SPEC-070's *The `$item` variable and card runes* (`$item.id` / `$item.type` / `$item.url` guaranteed; payload under `$item.data.*`); identical binding to collection's `$item`
- [ ] Plugin error in `contributePages` is caught, surfaces as a build warning, build continues with that plugin's contributions skipped
- [ ] Empty `contributePages` return (no contributions) is a no-op
- [ ] Plugin authoring docs cover: when to use config rules vs the hook directly, caching guidance for external data, env-var convention, graceful failure for upstream issues
- [ ] `create-refrakt --template=plan-site` ships with a working `entityRoutes` config and content scaffold
- [ ] `plan serve` and `plan build` marked deprecated in the same release the contribution mechanism ships
- [ ] Two-pass register handling: contributed pages register their own entities (via core's register hook reading their rendered content), so a contributed page can be `{% ref %}`'d by other pages
- [ ] When an `entityRoutes` rule creates a page for an entity, the entity's `sourceUrl` is back-filled with the generated route URL before the postProcess xref pass, so `{% ref %}` to that entity resolves to the on-site route (not a pattern fallback)
- [ ] A back-filled `sourceUrl` does not overwrite an existing `canonicalUrl`; `{% expand canonical=true %}` still links to the external source of truth for mirrored entities

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
- **Per-rule custom predicate functions** (a `where` callback). Defer until the declarative `type` + `filter` selector proves insufficient.
- **Plugin-supplied layouts for contributed pages.** Contributed pages use the host site's layout cascade (`_layout.md`). A plugin wanting an opinionated layout writes it as content and ships it as a contributed page itself.
- **Recursive contribution.** Contributed pages cannot themselves trigger another contribution phase. The graph is one level deep by design — keeps the build deterministic.
- **Watch-mode HMR for external-data contributions.** Dev-server HMR for file pages keeps working; contributed pages refresh on full build. Watching external sources is a plugin's call to make (file-system watcher, polling, webhook listener — out of scope for core).
- **Multi-site fan-out of one contribution.** Each site reads `entityRoutes` independently and runs its own plugin contribution phase. Cross-site dedup would be its own design.
- **Generic `{% collection %}` entity-listing rune.** Listing arbitrary registry entity types (non-page, non-plan) without giving them routes is deferred to its own spec. The headline cases are covered: `{% blog %}` lists contributed pages by folder; `{% backlog %}` lists plan-typed entities. Punted, not forgotten.
- **A declarative `groupBy`-a-field rule kind** (one page per distinct value of a field — tag/category/author archives). This is a *second cardinality primitive* on top of "one page per entity", and it's unnecessary: promote the group key to a registered entity (a plugin registers each distinct tag as a `tag` entity) and the existing 1:1 rule + a `collection` in the body covers it. See the resolved open question on multi-entity pages for the full reasoning.

-----

## Open Questions

**Where exactly does the contribution phase fit in the multi-site loader?** A monorepo with several sites in `refrakt.config.json` runs the pipeline per site today. Contributions are per-site (each site picks its own `entityRoutes`). But plugins that fetch from external sources would be called once per site if naively integrated — wasted work. Recommend: per-site is the safe default; plugins that want to dedupe across sites cache internally. Revisit if real performance issues surface.

**Should a rule match multiple entity types?** Resolved: yes, via comma-separated `type` (`"type": "spec,decision"`) — it costs nothing in the shared parser (split on comma) and reads naturally. Anything finer-grained (per-type field filters in one rule) is handled by writing separate rules.

**Can a generated page be derived from *multiple* entities, not just one?** Note: this is distinct from the question above (which still emits one page *per* matched entity). Here the question is whether one page's content can aggregate several entities. Resolved: keep declarative `entityRoutes` at **one primary entity per page**. The model holds up because routing and content are separate axes — the route is 1:1, but the page *body* can already pull in any number of related entities via `collection` / `expand` / `ref`. The candidate cases decompose:

| Use case | Covered by | Multi-entity *route* needed? |
|----------|-----------|------------------------------|
| Index / listing (all specs) | `collection` rune (SPEC-070) on an authored/contributed page | No |
| Grouping / archive (one page per milestone, listing its work) | 1:1 route on the group entity + `{% collection filter="milestone:{id}" %}` in the body (inline `render` is `{id}`-substituted *before* markdoc parse, so the id reaches the embedded filter as a literal) | No |
| Archive keyed on a non-entity field (one page per tag string) | Promote the group key to a registered entity (`tag`), then it's the grouping case | No |
| Relationship / comparison (`/compare/{a}-vs-{b}/`, a two-character bond) | `contributePages` programmatic hook — combinatorial and almost always hand-authored | Declarative: no; programmatic: yes |

The escape hatch is the clincher: `contributePages` places **no cardinality constraint** — a plugin can join any number of entities and emit a page with hand-built content. So declarative `entityRoutes` staying 1:1 doesn't *prevent* multi-entity pages; it keeps the declarative sugar simple while the rare combinatorial/merge cases drop to the programmatic surface. A declarative `groupBy`-a-field rule kind was considered and rejected (see Out of Scope) — "promote the key to an entity" covers it without a second cardinality primitive.

**How does the contribution-phase ordering interact with `Plugin.configure`?** `configure` runs first (one-time setup, file-root registration, etc.). Contributions read the configured state. So contributions implicitly happen after configure; document explicitly.

**Two-pass register: any infinite-loop risk?** Contributed pages may register their own entities (via the standard register hook on their rendered content). If a later contribution rule could match those newly-registered entities, we'd recurse. The proposed fix is "contributed pages do not trigger another contribution phase" — but should newly-registered entities from contributed pages still be reachable by `{% ref %}` and `{% expand %}` in the rest of the build? Yes (they're in the registry). They just can't *cause new pages to be contributed*. Document the boundary.

**Should the contribution context expose the project's full config, or just the per-site slice?** Per-site is cleaner; full config is more powerful for plugins that want global state. Recommend per-site, but include `projectRoot` so plugins can re-load the full config themselves if they need to.

**Caching contract: should refrakt offer a per-plugin `ctx.cache` keyed by plugin name?** Tempting for the common "I parsed a CMS payload last build, here it is again" case. Defer — most plugins will roll their own (or use existing libs like `quick-lru`), and we don't have enough data on what the cache contract should look like to design it well.

**Should plugin contributions have a registration order, the same as the existing pipeline hooks?** Yes — same registration order; deterministic; matches how `register` / `aggregate` / `postProcess` already order. Document explicitly.

**`source.type === "contributed"` for SitePage — exposed to user code or internal-only?** Probably internal-only (the SitePage shape isn't part of the public author surface), but worth surfacing in dev-tools / diagnostics. Recommend: internal type with a public projection for the inspector.

**How does the plan-site template handle entities that don't have embeddable content?** An entity is embeddable via `embed()` *or* `sourceFile` + `extract`; one of the two must be present for `{% expand %}` to work. The plan plugin's scan sets `sourceFile` + `extract` (WORK-251); external plugins set `embed()`. An `entityRoutes` rule whose `render` uses `{% expand $item.id /%}` must therefore target entity types that have one or the other — the build errors clearly if not. Worth documenting in the template's config comments.

**Should a generic `{% collection %}` rune ship with this spec or later?** The headline cases are covered by existing runes (`{% blog %}` lists contributed pages by folder; `{% backlog %}` lists plan-typed entities). The residual gap — listing arbitrary entity types that have no routes — is real but niche. Recommend deferring `{% collection %}` to its own spec; revisit when a concrete non-plan, no-route listing need appears. Listed in Out of Scope so it's explicitly punted, not forgotten.

**Where does the `sourceUrl` back-fill happen, exactly?** During the contribution phase, when the config-rules adapter produces a page for an entity, it must mutate the registered entity's `sourceUrl`. The registry is mutable at that point (still pre-aggregate). Need to confirm the back-fill is visible to the xref resolver's registry view in postProcess — it should be, since they share the registry instance, but worth an explicit test.

**Should `embed()` be allowed to be async?** The contract is currently `embed?: () => Node | string` — synchronous. That holds for file-backed entities (the file is already read) and for external plugins that fetch *eagerly* in `configure` and have `embed()` return cached content. But it breaks for *lazy* fetching: the Notion walkthrough surfaced that a Notion page body is an expensive recursive+paginated network fetch, and a plugin might reasonably want to defer it to embed-time (only fetch bodies for entities actually expanded/routed) rather than pull every block tree up front. Lazy fetch means `embed()` returns a promise — which ripples into the expand resolver, today a synchronous postProcess pass.

Three options:
- **Keep `embed()` sync; plugins fetch eagerly in `configure`.** Simplest for core. Cost: a large workspace fetches all bodies even for entities that only appear as `{% backlog %}` cards. Acceptable when you're publishing the whole workspace anyway (the common static-site case); wasteful for "huge source, embed a few".
- **Make `embed()` async-capable** (`() => … | Promise<…>`) and make the expand resolution (and the postProcess phase it lives in) async. Bigger change — postProcess is sync today and several hooks assume it. But it's the honest answer for lazy external content, and async postProcess may be worth it independently.
- **Two-phase: a separate async "hydrate embeddable content" step** before postProcess, where plugins fetch bodies for the set of entities that will actually be embedded. Chicken-and-egg: "which entities will be embedded" isn't fully known until the pages are walked. Could approximate (hydrate everything referenced by an `entityRoutes` rule + scan pages for `{% expand %}` ids first), but the complexity may not pay for itself.

Recommend **sync `embed()` for v1** (eager-fetch-in-`configure` covers the common publish-the-workspace case), with the async question explicitly deferred. If lazy external content becomes a real pain point — large workspaces where only a fraction is embedded — revisit making the embed path async, possibly alongside a broader "async postProcess" change. Flag in plugin authoring docs that `embed()` must return synchronously, so external plugins know to fetch in `configure`.

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
