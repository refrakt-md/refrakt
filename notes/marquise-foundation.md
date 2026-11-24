# Marquise foundation: brainstorm notes

**Status: brainstorm.** Nothing here is decided unless marked *decided*, and nothing here is a
promise to build. When an idea is decided it moves into a spec, and this document links to it.

**Started:** 2026-11-12. **Last updated:** 2026-11-19.

**Related, already written as specs:**

- SPEC-199: Marquise, the content model as its own project (audience, boundary, 1.0 scope,
  vocabulary, plain presentation, worked hero example)
- SPEC-200: a field declares whether it delivers its element, its inline content or its text
- ADR-049: a framework component replaces a rune's template
- SPEC-197, SPEC-198: definition bodies and examples; `source()` and `output()`

Terms used below follow SPEC-199 decision 1: authors write **tags**, developers define **shapes**.

---

## 1. Starting points

- **Refrakt is the lab; Marquise is the stable product** (SPEC-199). Refrakt grew in too many
  directions to reach 1.0. Marquise is cut from what is built and settled, and ideas graduate
  into it one way.
- **Marquise ships mechanisms, not vocabularies.** No dimensions, presets, bindings or design
  language of its own. Anyone can build a shape library, a design language or a kit on top.
- **Design the next layer from refrakt's lessons, not to fit refrakt.** Refrakt should end up
  as one user of the foundation among others.
- **The recurring lesson:** refrakt mixes *vocabulary* (what exists and what it is called) with
  *implementation* (how it looks and behaves) in the same TypeScript. Most of the redesign is
  pulling those apart: vocabulary declared as content, implementation as code.
- **Plan is out of focus** (2026-11-13). It is not fundamental, even to refrakt.

## 2. The stack, by distance from Marquise

```
 4  Products          refrakt (the opinionated framework): site + design + libraries + tools
 3  Site layer        routing, layouts and regions, navigation, cross-page SEO, adapters, i18n
 2  Corpus layer      many documents: index, entities, cross-document refs, graphs, history
    Design languages  dimensions, presets, tokens contract, interaction contracts
    Implementations   themes, component libraries, bound third-party libraries (kits)
    Shape libraries   marketing, docs, learning… as shapes; presentations per implementation
 1  Marquise          shapes, content models, validation, shape node, renderers, tooling
 0  Markdoc
```

- **Shape libraries split** into the shape (portable, Marquise-level) and its presentation
  (per implementation). Refrakt's `hero` or `faq` shapes then become useful to anyone bringing
  their own components.
- **Refrakt becomes a distribution:** site layer + its design language and theme + its shape
  libraries + `create-refrakt` and the editor.
- **Measured coupling** (2026-11-12): Lumina depends on `runes`; `content` depends on
  `highlight` (site on presentation); the editor depends on nearly everything.
- **A cheap first step in the lab:** a layer map plus a test that fails when a package depends
  on a higher layer, or across layers that should stay independent. Each violation becomes a
  concrete work item.

## 3. Corpus layer

*Parked on 2026-11-13; given a clearer job on 2026-11-15 (below, and section 18); designed against
Marquise's decisions and named **Rivière** on 2026-11-17 (end of this section).*

Two engines index documents today: the site's entity registry and plan's scanner. Ideas, kept
for when this comes back into focus:

- shapes declare what they register (refrakt's `registers` key), with no plugin hooks;
- references are typed fields ("a list of references to `spec` or `decision`"), checked for
  dangling ends, cycles and duplicate ids;
- the corpus offers lookup, queries (the shared filter grammar), relations and graph checks;
  turning an entity into a URL is the site's job;
- history (git) is a pluggable, opt-in source;
- incremental updates, so the language server and builds share one engine;
- a generic MCP surface over any corpus.

**Refrakt's cross-page pipeline is two layers interleaved** (*2026-11-15*): a data layer and a site
layer. The corpus layer is the data layer separated from the site, the "database layer" a
data-store Marquise would sit under (section 18).

| Refrakt today | What it does | Belongs to |
|---|---|---|
| Phase 2, register | plugins index entities into the entity registry | corpus, declaratively: shapes say what they register |
| Phase 3, aggregate: `pageTree`, `breadcrumbPaths`, `pagesByUrl` | the site's structure | site |
| Phase 3, aggregate: `headingIndex` | where every heading is | corpus (link anchors, Z4) |
| Phase 3, plugin aggregates (plan relationships, counts) | cross-entity indexes | corpus, as queries |
| Phase 4, post-process: `collection`, `aggregate` | lists and counts from the registry | corpus queries filling deferred definitions (SPEC-194 D12) |
| Post-process: `xref` | resolving a reference to an entity | corpus finds it; site gives its URL |
| Post-process: `breadcrumb auto` | the path to this page | site |

SPEC-194 D12 already separates them: `$page` and `$site` come from the site, and only registry reads
make a rune wait. The stack: (1) Marquise, one document: read, write, validate; (2) the corpus, many
documents: entities, references, indexes, queries, and **writes across documents** (refrakt's
`plan migrate ids`, renumbering an entity and every reference to it, the problem behind BUG-026 and
BUG-040, is a corpus-level write built on per-document edits); (3) the site: routes, URLs, page tree,
breadcrumbs, navigation, layouts, using the corpus without being part of it. The corpus serves more
than sites: a CLI, an MCP server and agents query and update the same content with no site involved,
as refrakt's plan tools do today.

### Rivière: the corpus layer, designed against Marquise (2026-11-17)

**Working name: Rivière** (`riviere` in code): a strand of stones, often graded, each set in its place
in an ordered whole; French for "river", fitting an engine that content flows through. It pairs with
Marquise, a single cut stone. Alternatives considered: Parure (a matched set of jewellery made to be
worn together, the most exact meaning), Geode (the earlier placeholder), Druse (the crust of crystals
lining a geode), Lattice, Pavé, Facet, Vug.

**What Marquise's decisions settle for it:**

1. **Records are the rows.** Refrakt has two indexing engines (the site registry filled by plugins'
   `register()` hooks, and plan's scanner); Rivière indexes `doc.records()`, every shape instance
   already a typed record with a shape name, an id or key and an address. Refrakt's `registers` key
   reduces to a declaration on the shape.
2. **Identity is the address, not a URL.** Refrakt's `EntityRegistration` is keyed by `sourceUrl`, with
   `scope: 'page' | 'site'` and "the last one wins" on collisions (`packages/types/src/pipeline.ts:40`);
   plan content outside any site already strains it (`sourceUrl` may be `undefined`). In Rivière,
   `file#id` is the key (A1), a duplicate is a finding, and URLs are the site's.
   *Revised 2026-11-19 (X6):* identity is `(collection, id)`; the address is the location, where the
   entity currently is. The argument above was against URLs, not for file paths.
3. **References are a value type,** splitting M3 (*leaning*): **Marquise core declares** identity and
   reference types and checks them within one document
   (`source: { type: ref, to: [spec, decision] }`); **Rivière resolves** them (dangling ends, cycles
   with `acyclic: true`, cardinality). Typed references have exact addresses, so Rivière knows every
   place an id is referenced, which `plan migrate ids` had to approximate.
4. **Writes across documents are batches of per-document edits** (rename an id and every reference,
   move a document and its links), with no atomicity across documents; plan's rule generalises:
   refuse when it cannot be proved what a reference meant.
5. **Incremental by construction:** immutable documents and content hashes (section 19) make the index
   a map from file to `{ hash, records, refs }`; a changed file replaces one document's rows, and
   directives' declared dependencies (section 20) say what an included file invalidates. The language
   server and builds share one engine.
6. **Rendering with corpus data uses an existing seam:** a `collection`-style shape is a deferred
   definition; Marquise returns a placeholder, Rivière answers the query, `expand(placeholder, values)`
   finishes it. Refrakt's phases 2 to 4 without the site: load every document, index, expand deferred
   shapes, hand to the site.
7. **`resolveLink` is already a host callback:** Rivière answers whether `other.md#install` exists; the
   site maps it to a URL.
8. **Typed and data-only:** the type registry extends (`riviere.find('work', 'status:ready')` gives
   `WorkRecord[]`; a reference is `Ref<'spec' | 'decision'>` with `.resolve()`); records are the input,
   so a store as a source (M9) or git history can be a member too.

**What it contains:**

| Part | What it does |
|---|---|
| Sources | files by glob; pluggable sources (a store, git history for plan's `history`) |
| Index | records by shape and id; the reference graph and backlinks; headings and anchors for link checks |
| Cross-document validation | duplicate ids, dangling references, cycles, cardinality; findings at the reference's address |
| Queries | the shared filter grammar (`matches()`, M8), sorting, graph traversal (transitive `Blocked by`); no query language |
| Cross-document writes | rename an id, move a document, update references; refuse when ambiguous |
| Engine | incremental updates, watch mode, a cache keyed by content hash |
| Deferred expansion | supplies query results to Marquise's deferred definitions |
| Surfaces | a generic CLI and MCP (`find`, `get`, `edit`, `validate`) over any corpus |

**Not in it:** URLs, routes, the page tree, navigation, breadcrumbs, layouts (the site); storage other
than files; transactions; authentication.

**The proof is plan rebuilt on it** (*decided 2026-11-18*): its entities are shapes; `source` and `Blocked by` are
typed references; `status`, `next` and the rollups are queries plus a graph traversal; `migrate ids` is
a cross-document write; its MCP tools become the generic ones. If plan becomes mostly declarations,
the layer is right. Refrakt's site layer then sits on top (collections, `xref`, breadcrumbs).

**What it asks of Marquise before 1.0,** so Rivière never needs a private seam: `ref` and identity as
value types; addresses with a file part (decided); deferred definitions; declared dependencies;
`resolveLink`; records and findings carrying addresses. All but `ref` are already in the design.

### Rivière's API and CLI (2026-11-17)

**The centre is an immutable corpus snapshot,** Marquise's document handle one level up: queries on a
snapshot are synchronous and consistent; a live engine produces new snapshots as files change.

```ts
import { createMarquise } from 'marquise';
import { createRiviere } from '@riviere-md/core';

const rv = createRiviere({
  marquise: createMarquise({ shapes: 'shapes/' }),
  collections: {
    work: { shape: 'work', include: 'plan/work/*.md', path: 'plan/work/{id}-{slug}.md', id: 'WORK-{n}' },
    spec: { shape: 'spec', include: 'plan/specs/*.md', path: 'plan/specs/{id}-{slug}.md', id: 'SPEC-{n}' },
  },
});
const c = await rv.load();   // a snapshot: the only async step
```

**Collections** are what Rivière adds to a shape: which files hold it, where new ones go, how ids are
made; a document's file name and location are corpus policy, not Marquise's (answers M6).

**Reading:**

```ts
c.get('work', 'WORK-123');                      // Entity<WorkRecord> | undefined
c.find('work', 'status:ready priority:high', { sort: '-priority', limit: 10 });
c.find('work', (w) => w.status === 'ready');    // a predicate, for code
c.count('work', { by: 'status' });
c.refs(entity);                                 // outgoing: [{ to, field, at }]
c.backrefs(entity);                             // incoming, each with the referring address
c.walk(entity, 'blockedBy', { transitive: true });
c.order('work', 'blockedBy');                   // topological; cycles reported as findings
c.findings;                                     // per-document and cross-document
c.resolveLink('../specs/SPEC-199.md#package-names');
```

An **entity** is `{ collection, id, address, record, document }`: Marquise's typed record and document
handle one step away, the address (`plan/work/WORK-123-….md#WORK-123`) its identity. Typed through the
same registry (`Entity<WorkRecord>`, `Ref<'spec' | 'decision'>`).

**Writing returns changesets,** applied separately; nothing touches disk:

```ts
const cs = c.update('work', 'WORK-123', (w) => { w.status = 'done'; });  // Marquise's draft
c.create('work', { title: 'Typed refs', priority: 'high' });            // id and path from the collection
c.rename('work', 'WORK-123', 'WORK-130');     // the id and every typed reference
c.move('plan/work/a.md', 'plan/work/b.md');   // the file and every link to it
c.delete('work', 'WORK-123');                 // refused while backrefs exist, unless { force: true }
cs.ok ? cs.changes : cs.findings;             // [{ path, expectedHash, source, edits }]
await rv.apply(cs, { git: true });            // the Node layer writes, optionally staging with git
```

Refusals generalise `plan migrate ids` (findings naming each blocking reference); `expectedHash` per
file refuses a file changed since the snapshot; changesets are plain JSON, so an agent or a review UI
can show one before it is applied.

**Live:** `rv.watch((next, diff) => …)` gives a new snapshot and the entities added, changed and
removed; `rv.overlay(path, source)` holds unsaved editor buffers for the language server. `c.expand(doc)`
fills deferred, collection-style shapes from queries for a site layer; Rivière never produces pages.

**The CLI** (`@riviere-md/cli`, binary `riviere`), generic over collections:

```bash
riviere find work 'status:ready' --sort -priority --limit 5
riviere get WORK-123 --format json
riviere refs WORK-123 --back --transitive
riviere validate --against origin/main
riviere create work --set title="Typed refs" --set priority=high
riviere set WORK-123 status=done
riviere set 'WORK-123.criteria[text="Docs updated"].done' true
riviere rename WORK-123 WORK-130 --git
riviere move plan/work/a.md plan/work/b.md
riviere next-id work
riviere count work --by status
riviere graph work --edge blockedBy --format mermaid
riviere history WORK-123        # with the git source
```

Plan's `--check "criterion text"` becomes an address with a key match. Every command has
`--format json` (the API's return value); writes accept `--dry-run` (the changeset as a diff); exit
codes 0 success, 1 error findings, 2 not found, 3 refused write; `@riviere-md/mcp` exposes the same
table of operations (A4). **Saved views** cover what plan's own commands add
(`views: { next: { collection: 'work', filter: 'status:ready', unblocked: 'blockedBy', sort: '-priority', limit: 1 } }`
makes `riviere next` stored arguments, not a command); anything a view cannot express is a script
against the API, not a plugin. Plan becomes shapes, collections and a few views.

### Rivière's queries (2026-11-17)

Refrakt has done half this analysis: **SPEC-138** (draft, pluggable query engines for the
`field:value` grammar) measured the grammar's limits (no numeric or date comparison, no OR across
different fields, no nested fields, no AND over array members, no existence, no cross-field comparison,
negation only through a regular-expression trick); the cost shows in `plan-history`'s own
`since="7d"` attribute, there only because the grammar cannot compare dates. Its spike ruled liqe out
(substring matching: `tags:data` returned 31 rows where 12 were right) and gave the criterion for any
engine: **a selector must be exact and deterministic, unlike a search box**. Its design: a string goes
to the built-in grammar, an object to a registered engine; core owns the result contract; **capability
gaps are fixed in core, language gaps belong to plugins** (`aggregate` only counts, so sum and average
go in core).

**What Marquise changes:**

1. **In code there is nothing to plug in.** Records are plain JSON and Rivière takes predicates
   (`c.find('work', (w) => w.points > 3 && …)`); any JSON library works on them as they are
   (`mingo.find(c.records('work'), { points: { $gt: 3 } })`). Every SPEC-138 limit disappears in
   TypeScript, typed.
2. **The question is only about declarative positions:** queries in content (a collection shape's
   `filter`), config (views), the CLI and MCP, which cannot hold code (content is untrusted).
3. **Typed records turn most gaps into cheap core capabilities,** since most came from "everything is a
   string" (*leaning*):

```
status:ready priority:high       # AND across fields (today)
status:ready,in-progress         # OR within a field (today)
-status:done                     # negation
date:>=2026-01-01 points:<5      # comparison, now that values are typed
has:pr   -has:pr                 # existence
criteria.done:false              # nested fields, by the address syntax (A1)
source.status:accepted           # through a typed reference: a join without a join language
```

4. **Left out:** arbitrary expressions, comparing fields with each other, reshaping, aggregation
   pipelines (SPEC-138's language gaps). OR across different fields (`(a:x OR b:y)`) is the boundary,
   needing a real parser: out until the catalogue asks for it.

**A plug-in engine, scoped as SPEC-138 designed it** (*leaning*): engines registered by name, used from
declarative positions (`{ engine: 'mingo', query: … }`, or by the query's shape); Rivière owns the
result contract (`find` gets entities, ordered, identity kept; grouped results are measure rows);
engines pure and deterministic, operators curated (`$where`, `$function`, `$eval` never; `$sample`
banned, results would vary between runs); never run on untrusted content unless the host allows it;
**Rivière ships none** (a mingo adapter belongs in the lab or with a third party). That answers the
MongoDB-clone worry: Rivière owns a small exact selector language plus capabilities (comparison,
references, counting with grouping, sum, average); more vocabulary is an engine someone brings. No
indexes or query planner: a few thousand records scan in milliseconds.

**"Powerful enough" is judged by a query catalogue,** not intuition, as SPEC-138's spike did with six
queries: every query refrakt runs (collections, aggregates, plan's commands and rollups, site
filters) and queries for section 18's use cases (recipes, events, job posts, changelogs, glossaries),
each written in the extended grammar. What does not fit is a missing capability (core) or vocabulary
(a reason for an engine). The catalogue becomes Rivière's test suite.

### Above Rivière: the site (2026-11-17)

What a site layer does, from refrakt's `packages/content` and the split above: routes and URLs;
structure (page tree, navigation, breadcrumbs, sitemap, feeds); layouts (refrakt's `_layout.md`
regions); page context (`$page`, `$site`, SEO metadata); build and serve (dev server, hot reload,
adapters). **Most of it is solved elsewhere:** Astro (with Starlight), Nuxt Content, VitePress and
Docusaurus are site layers already, and refrakt's six adapters and their drift (SPEC-058) show the cost
of rebuilding them.

**What is left that needs Rivière,** as functions and integrations, not a framework:

| Need | Small form |
|---|---|
| URLs for entities and references | a URL pattern per collection (`url: '/work/{id}/'`), so a reference or `resolveLink` becomes a link |
| A page per entity | SPEC-069's entity routes: one page per record, from a collection |
| Structure from the corpus | navigation, breadcrumbs, backlinks, collection pages as functions over a snapshot |
| Link checking across the site | Rivière's dangling-reference findings plus the URL pattern |

**An integration per site framework, Astro first:** Astro's Content Layer takes custom loaders, and
Rivière's entities and typed references map onto its entries and `reference()` (below).

**What remains is refrakt itself:** layouts written as content, the page tree from folders, themes, the
design language and the runes, the opinionated whole. *Leaning:* no general site layer is built; the
thin integration layer is.

```
Marquise   one document: shapes, validation, records, writing
Rivière    many documents: entities, references, queries, writes across documents
(thin)     URL policy and framework integrations: Astro first
refrakt    the opinionated whole: runes, themes, layouts as content, the site
```

### An Astro content loader for Rivière (2026-11-17)

**The principle it shows** (*recorded in SPEC-199 as a design rule, 2026-11-17*): Marquise and Rivière are
layers that frameworks stack on, where refrakt takes control of the whole chain (its own loader, router, layouts, adapters). Here Astro keeps routing,
pages, images, islands and its build; Rivière supplies typed entries; Marquise supplies rendering.

*Grounded in `astro@7.4.12`'s published type definitions* (`dist/content/loaders/types.d.ts`,
`data-store.d.ts`, `loaders/glob.js`); docs.astro.build was not reachable from the session.

**What Astro offers:** a build-time `Loader` is `{ name, load(context) }` plus `schema` (Zod 4) or
`createSchema()` returning `{ schema, types }` (a Zod schema and a TypeScript type string). The context
holds `collection`, `store`, `meta` (a key-value store for sync tokens), `logger`, `config`,
`parseData`, `renderMarkdown`, `generateDigest`, `watcher` (dev only) and `refreshContextData`. An entry
has `id` (unique per collection), `data`, `filePath`, `body`, `digest`, `rendered: { html, metadata }`
(metadata with `headings`, `imagePaths`, `frontmatter` and any other keys), `deferredRender`,
`assetImports` and `imageImports` (paths in `data` to image fields, resolved to image metadata). Live
collections are built in (`defineLiveCollection`, a `LiveLoader` with `loadEntry` and `loadCollection`
taking a typed `filter`); `reference(collection)` resolves to `{ collection, id }`.

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { riviere } from '@riviere-md/astro';

const rv = riviere({ config: './riviere.config.ts' });   // one snapshot shared by every collection

export const collections = {
  work: defineCollection({ loader: rv.loader('work') }),
  spec: defineCollection({ loader: rv.loader('spec') }),
};
```

| Astro | From Rivière and Marquise |
|---|---|
| `id` | the entity's id; Astro's ids are unique per collection, which settles V5 for the general case |
| `data` | the record, each `Ref` converted to `{ collection, id }` so `getEntry(work.data.source)` works |
| `createSchema()` | a Zod schema and the type string Marquise's generator produces from the shape |
| `filePath`, `body` | the document's path and source |
| `digest` | Marquise's content hash: unchanged entries skipped |
| `rendered.metadata.headings` | Marquise's headings, for Astro's tables of contents |
| `imageImports` | paths of image fields, so Astro's image optimisation applies (section 13's `resolveAsset`) |
| `logger` | findings as `file:line` warnings and errors; error findings can fail the build |
| `watcher`, `meta` | in dev, a changed file reloads one document and rewrites only changed entities; the snapshot hash in `meta` |

One snapshot serves every collection, so cross-collection references are checked once, before Astro
sees them.

**Rendering, the one real question.** `render(entry)` draws `rendered.html` (a string), or, with
`deferredRender`, a module for the entry's file through the content entry type registered for its
extension (how `@astrojs/markdoc` gets components into `.mdoc`). Options: (a) `rendered.html` from
Marquise's HTML renderer, static, no components or islands; (b) `deferredRender` with a content entry
type registered by `@marquise-md/astro`, so `render(entry)` draws real components and islands, but in
`glob.js` deferred rendering depends on a registered entry type for the file's extension, so whether a
custom loader can rely on it, and how it coexists with Astro's own `.md`, needs a spike; (c) both: the
resolved tree stored in `rendered.metadata.marquise` beside the HTML, `<Content />` giving static HTML and
`<Marquise entry={entry} />` drawing components and islands, at the cost of storing each entry twice.
*Leaning:* (c) first, on what the types guarantee; spike (b) as the end state.

**Pages and URLs:** Astro owns routing (`[id].astro`, `getStaticPaths()` over `getCollection('work')`);
links inside content need URLs, so the integration takes the URL policy
(`riviere({ urls: { work: '/work/{id}/' } })`), answering V10. **A live loader** (`rv.liveLoader('work')`,
`filter` as Rivière's filter string) serves server-rendered sites per request: content that changes
without a rebuild, a store as a source (M9), a corpus edited through MCP. **Writes do not go through
Astro:** the CLI, MCP and editors write, the dev watcher picks changes up.

**What it tests:** per-collection ids, generated types reused by `createSchema`, typed references as
`reference()`, content hashes as digests, snapshots plus a watcher as incremental updates, images through
`imageImports`; no private seam needed. The unknown is deferred rendering.

### Rivière's shapes (2026-11-17)

Refrakt has five core runes that read the corpus: `collection`, `aggregate`, `relationships`, `xref`
and `expand` (an entity's content substituted inline, with `xref`'s lookup). **They belong with
Rivière, split: Rivière ships what they mean, not how they look** (*decided 2026-11-18*, V14–V17).

**They are Rivière's read API in authoring form, and nothing more:**

| Refrakt rune | What it asks | Rivière API |
|---|---|---|
| `collection` | the entities matching a filter | `c.find()` |
| `aggregate` | counts, grouped | `c.count({ by })` |
| `relationships` | what this entity points at, and what points at it | `c.refs()`, `c.backrefs()` |
| `xref` (as `ref`) | one entity, as a link | `c.get()` plus the URL policy |
| `expand` | one entity's content, inline | `c.get()` and its document |

Developers call the API; authors use the shapes. Domain views stay out: plan's `backlog`,
`plan-progress` and `decision-log` are presentations of queries (saved views plus components, in plan
or a kit). They pass the never-own-the-chain rule: in Astro a developer lists entities with
`getCollection` in a page; the shapes give **authors** that power inside content, which no host
framework offers.

**How they work:** each is a deferred definition, a placeholder Marquise leaves and Rivière expands
(`c.expand(doc)`, which the Astro loader calls). The resolved node carries data, not markup:
`collection` typed records as `items` (`collection="work"` gives `items: WorkRecord[]`), `aggregate`
measure rows, `ref` the target entity and its URL. The look is the host's: plain presentations (a list
of links, a small table, a link), components bound by kits or sites; per-item templates written in
content (refrakt's `$item` bodies) wait for the `compose` satellite.

**What it asks for:**

1. **Expansion records what it read,** the queries as well as the entities, so a new matching entity
   invalidates a page with a `collection`; the same idea as directives' declared files, and what the dev
   watcher needs to refresh pages.
2. **Prose references are mentions, not edges** (refrakt's plan rule, generalised): typed fields form
   Rivière's graph; a `ref` in prose is indexed as a mention, feeding backlinks and link checking, never
   `Blocked by`. So Rivière must index `ref`, not only expand it: `ref` belongs with Rivière's core.
3. **`relationships` needs the page's entity:** a document shape with an id (Z4), or `of=` given
   explicitly.
4. **Limits in untrusted content:** the filter grammar is safe, engines are not run on untrusted content
   (V7), `limit` has a ceiling.

| Package | Contents |
|---|---|
| `@riviere-md/core` | the API, and the `ref` shape (mentions are part of the index) |
| `@riviere-md/shapes`, or folded into core | `collection`, `aggregate`, `relationships`, `expand`: definitions, expansion, plain presentations |

`expand` overlaps the `include` satellite (content transcluded inline) by entity rather than file; it
goes through the same preprocess hook, so provenance and write redirection behave the same.

### Use cases beyond plan and rendering (2026-11-18)

The features that make Rivière more than a renderer (typed records, references, findings with
addresses, reviewable changesets, MCP, git history) are the ones AI workflows need.

**Agents reading: context, not chunks.**

- **Context bundles** (*of most interest*): gather context by structure rather than by chunking text:
  `riviere context WORK-123 --follow source,blockedBy --depth 2 --budget 8000` gives the work item, its
  spec, the decisions the spec cites and its blockers, within a token budget, nearest first. Retrieval
  through references, no embeddings, every piece exact, typed and addressable; what every agent in this
  repository does by hand when CLAUDE.md tells it to read a work item's referenced specs.
- **Filtered retrieval:** `status:accepted tags:auth` narrows what an agent sees before any similarity
  search. Semantic search stays outside (not deterministic, needs indexes); a third party can embed
  records' text fields keyed by their addresses.
- **Code and docs drift:** refrakt's `stale` answers "which pages document this file?"; in Rivière a
  reference to a source path is a typed reference, and the question a backlinks query an agent runs
  before editing code.

**Agents writing: structured authoring with a fix loop.**

- **Structured output in, idiomatic Markdown out:** Marquise publishes JSON Schema per shape (the
  Standard JSON Schema companion), which model APIs accept for structured output and tool inputs; the
  model emits a record as JSON, `c.create()` writes natural Markdown, findings come back. The model never
  writes Markdown that must parse; people still review prose.
- **The fix loop with addresses** (section 19): read a finding, edit at its address, revalidate.
- **Extraction from unstructured sources:** transcripts to decision records and work items, emails to
  bug reports, papers to claims with citations; Rivière validates the references, a person reviews the
  changeset.

**Agents coordinating: a shared, reviewable work surface.**

- **A task queue for several agents:** work items with optimistic concurrency (claiming carries an
  `expectedHash`, so a second agent's claim is refused); parallel sessions pull from `riviere next`
  without collisions, git as the audit log.
- **Changesets as the review boundary:** agents propose, people approve (a pull request or a review UI),
  seeing every per-file edit before anything is written.
- **Typed MCP tools generated per collection** (*of most interest*): every corpus becomes an MCP server
  whose tools are typed from its shapes (`find_recipes(filter)`, `create_event(input: EventInput)`,
  `update_work(id, patch)`), tool input schemas from the same JSON Schema, no hand-written definitions.
  Plan's MCP tools (`plan.update`, `plan.next`) are the hand-made version.
- **Agent knowledge as records:** conventions, decisions, lessons, skill files, prompt libraries, typed
  and validated so they do not rot quietly (a lesson citing a deleted decision is a dangling reference).
- **Evals as a corpus:** prompts, cases (input, expected output, rubric) and results with references;
  "which cases fail on the current prompt version?" is a query; datasets reviewed as prose, versioned by
  git.
- **Gardening agents:** a scheduled `riviere validate`, then fixes or reports: dangling references,
  items stuck in progress for 30 days (git history), specs whose work items are all done still marked
  `accepted`.

**Beyond AI:** requirements traceability in regulated industries (requirements, tests, results as
references; "every requirement has a test" as a graph check; git as the audit trail); service catalogues
and runbooks (Backstage's catalogue in Markdown); course design (a prerequisite graph with cycles
checked, learning paths as queries); worldbuilding and game design (refrakt's storytelling plugin,
generalised); research notes (an unsupported claim is a finding); small-business content edited by
non-developers through Astro; typed personal notes (Dataview's use case, in prose).

**What it suggests for the design:** (1) `riviere context`, gathering through references within a token
budget; (2) MCP tools generated per collection, typed from shapes; (3) changeset metadata (who proposed
it, a person or which agent, and why) carried into commit trailers; (4) JSON Schema for structured
output as a documented use; (5) optimistic concurrency documented as the coordination mechanism, not
leases or locks.

### Context bundles (2026-11-18)

**Retrieval picks the starting points; Rivière expands from them through structure, within a budget,
never cutting silently.**

**Seeds:** entities (`WORK-123`), an address (`WORK-123.criteria`), a query (`work 'status:ready'`), a
document path, or a source file (`--touching packages/runes/src/config.ts` seeds with every document
referencing it: refrakt's `stale` question as context for an edit). Seeds can come from outside: a
third-party semantic search picks the five most relevant entities, Rivière adds what is structurally
related; the two complement each other and Rivière stays deterministic.

**What is followed:** the shape declares defaults, since it knows which relations matter; config
overrides per project, flags per call (*leaning*):

```yaml
# shapes/work.md
attributes:
  source:    { type: ref, to: [spec, decision], riviere: { context: full } }
  blockedBy: { type: ref, to: [work, bug], repeat: true, riviere: { context: summary } }
riviere:
  context: { back: [mentions] }   # incoming references worth seeing: off unless declared
```

(Under Rivière's namespace, section 11, "Extensions in shape files".)

Typed references on the seed are followed; incoming ones only where declared; prose mentions not
followed (noisy), at most a list of titles. Depth 2 by default: a work item, its spec, the spec's
decisions.

**Four levels, degrading before dropping:** `full` (the whole Markdown source), `fields` (selected
fields, long block fields shortened to their first paragraph plus their address), `summary` (the shape's
**summary projection**: id, title, status and similar), `ref` (id and title). The summary projection,
declared once on the shape (`summary: [title, status, priority]`), serves well beyond bundles: CLI
tables, MCP list results, backlinks panels, `collection` items.

**The budget:** seeds `full`; depth 1 `full` if declared, else `fields`; depth 2 `summary`. Over budget,
the farthest entities are demoted a level at a time, and only then dropped. **Nothing is cut silently:**
every dropped entity is listed under "Omitted" with its address and how to fetch it. Tokens are counted
approximately (characters divided by four) with a `tokenize` callback for the host. **Deterministic:**
the same snapshot and arguments give the same bundle (ties by distance, declared field order, id), so
bundles cache and test.

**The format:** Markdown by default, since models read it natively and the source is Markdown:

```markdown
<!-- riviere:context seeds=WORK-123 budget=8000 used=6120 snapshot=3f2a… -->

## WORK-123 · work · seed · full
address: plan/work/WORK-123-typed-refs.md#WORK-123

…the work item's Markdown source…

## SPEC-199 · spec · via source · fields
address: plan/specs/SPEC-199-….md#SPEC-199
status: accepted · title: Marquise, the content model as its own project

…its summary paragraph… (full text: `riviere get SPEC-199`)

## Omitted (over budget)
- ADR-049 (via SPEC-199 → source): `riviere get ADR-049`
```

JSON on request (`{ snapshot, budget, used, entries: [{ address, collection, id, via, level, content }],
omitted }`); the MCP tool returns both, Markdown as text and JSON as structured content. **Source, not
rendered output:** agents edit source, and its addresses are what edits target; included content is
labelled with its origin; deferred shapes (a `{% collection %}`) optionally expanded into summaries.

**Safe to edit from:** a bundle carries its snapshot hash; edits proposed from it carry each file's
expected hash, so a file changed since the agent read it refuses the edit. **Provenance against prompt
injection:** Rivière cannot solve it, but each entity is delimited and labelled with address and origin,
so an agent framework can treat everything inside as content, never instructions.

**Where it appears:** `c.context(seeds, options)` (synchronous on a snapshot), `riviere context`, an MCP
`context` tool. CLAUDE.md's "read the work item's referenced specs, related decisions and dependency work
items" becomes one call.

**Package names** (checked on npm, 2026-11-17): the unscoped `riviere` is taken (an HTTP traffic
logger, last changed 2022), and **so are the scopes `@riviere` and `@marquise`**: both exist with no
public packages (the registry answers `{}` where an unknown scope gives "Scope not found"). The
unscoped `marquise` is free, as are the scopes `@marquise-md`, `@riviere-md`, `@marquisemd`,
`@rivieremd`, `@marquise-dev` and `@riviere-dev`. Domains and trademarks not checked.

## 4. The theme contract

A theme is not "CSS for refrakt's markup". It is anything that **implements a design language**.

**The design language (the contract):**

- dimensions and their values, with descriptions (section 6);
- which shapes or parts each applies to;
- presets, as named values with typed payloads (section 7);
- a tokens contract;
- interaction contracts: keyboard and ARIA expectations (section 8);
- the capability vocabulary shapes declare with `provides` (open question D4).

**Implementations come in three kinds:**

| Kind | How it implements the language | Example |
|---|---|---|
| CSS theme | stylesheets over plain or template output, keyed on `data-*`; plain-DOM behaviours | Lumina today |
| Component theme | its own framework components, one per shape or primitive | a team's React design system |
| Bound library | a binding table onto a third-party library's props and slots; behaviour and accessibility from the library | Nuxt UI, shadcn/ui, Vuetify, MUI |

**Coverage is part of the contract.** An implementation declares which dimensions and values it
honours. Authors get `dimension-unsupported` instead of a value silently doing nothing. Refrakt's
CSS coverage tests are the seed of this, generalised.

**Name values by meaning, not by look.** `tone: danger` maps onto any library's colour prop;
`colour: red` maps onto nothing reliably. Refrakt's `sentiment` already follows this.

## 5. Kits: third-party packages on the foundation

*Direction agreed 2026-11-13:* Marquise does not ship dimensions or bindings. A third party can
publish, say, `marquise-nuxt-ui` with its own dimensions and mappings. Marquise provides what
makes that possible.

**A kit might contain:**

```
marquise-nuxt-ui/
  marquise.kit.json      ← manifest: name, version, what it provides, peer deps
  dimensions/*.md        ← vocabulary, as content
  tints/*.md             ← presets
  shapes/*.md            ← optional: shapes matching the library's components
  bindings/vue.ts        ← shapes and dimension values onto the library's props and slots
```

A kit may provide a design language only, an implementation of someone else's, or both.

**What the foundation provides:**

1. declaration formats as content: dimensions, presets, optionally interaction contracts;
2. a binding mechanism in each renderer (`defineBindings`): props from fields, value maps, item
   arrays, prop or slot by SPEC-200's `as`, an optional wrapper where a binding asks for one;
3. a kit manifest and how kits combine: listed in config, explicit collisions, site overrides
   per shape;
4. coverage and validation: `dimension-unsupported`, `shape-unbound`, and `marquise check` for
   kit authors;
5. tooling that reads the active kits: completions with descriptions, generated types, the
   reference and AI grammar describing the project's actual vocabulary;
6. versioning rules for vocabularies: removing a value is breaking; deprecation is declared;
7. a test kit for kit authors: render all examples through the bindings, check coverage, run
   interaction contracts;
8. a guide: "Build a Marquise kit for your UI library".

**Two things to watch:**

- **Chicken and egg.** With no built-in vocabulary, a fresh project does nothing visual until a
  kit exists. Have a first kit (Nuxt UI or shadcn/ui) written **outside** Marquise, clearly
  labelled as one kit among others.
- **Refrakt is a kit author too:** its design language and Lumina built only on the published
  foundation. If refrakt needs something a third party could not do, the foundation is missing a
  piece.

**Pending changes to SPEC-199 when this is decided:** "shared attributes" becomes declared
attribute sets; bindings join the renderer section; kit manifest, combination, coverage,
vocabulary versioning and kit tests join Marquise's scope; the "what Marquise ships" list says no
dimensions, presets or bindings. ADR-049 decision 8 changes: the shape node carries `dimensions`
in its own field (section 6).

## 6. Dimension file format (sketch)

**A closed dimension:**

```md
---
dimension: tone
description: The meaning a block conveys, for colour and iconography
values:
  neutral: { description: "No particular meaning; the default surface" }
  info:    { description: "Background information worth knowing" }
  success: { description: "Something went well or is confirmed" }
  warning: { description: "Something needs attention" }
  danger:  { description: "Something is wrong or destructive" }
default: neutral
appliesTo: { shapes: [callout, badge, banner] }
---

{% example #all-tones %}
{% callout tone="warning" %}
Renaming a workspace changes its URL.
{% /callout %}
{% /example %}
```

**Aliases, deprecations and a target**, modelled on refrakt's real `elevation` history:

```md
---
dimension: elevation
description: How far a surface sits above or below the page
values:
  sunken: { description: "Recessed into the page" }
  flush:  { description: "Level with the page, no surface" }
  flat:   { description: "A surface without shadow" }
  raised: { description: "Lifted slightly" }
  floating: { description: "Clearly above the page" }
  overlay:  { description: "Above everything, like a dialog" }
aliases:
  none: { use: flat,     deprecated: true }
  sm:   { use: raised,   deprecated: true }
  md:   { use: raised,   deprecated: true }
  lg:   { use: floating, deprecated: true }
default: flat
appliesTo: { provides: surface }
on: root
---
```

**An open dimension, inherited by nested shapes:**

```md
---
dimension: tint
description: A colour scheme applied to a block and everything inside it
open: true
presets: { dir: tints/, fields: { surface: { type: color }, text: { type: color }, accent: { type: color } } }
inherit: true
appliesTo: all
---
```

**The shape side:** shapes do not list the dimensions they accept; `appliesTo` decides. A shape
declares capabilities, sets defaults and may opt out:

```yaml
provides: [surface, media, body]
defaults: { elevation: flush, tone: neutral }
dimensions: { exclude: [tint] }
plain: { tag: section }
```

**A shape does not own its element** (*leaning, 2026-11-13*). The element is presentation: a
component, binding or template chooses it. Marquise core has no wrapper; refrakt's `tag:` stays a
refrakt-specific key because its engine builds the root from it (ADR-049 decision 2). The plain
presentation still needs an element, so the only element setting is scoped to it:
`plain: { tag: section }`, used only when nothing else draws the shape, `div` without it.
Semantics that SPEC-194 D11 tied to elements have better homes here: structured data is JSON-LD
from the shape node, and landmarks are interaction-contract territory (section 8), testable
against whatever a component renders.

**In the shape node**, dimensions travel separately and already resolved (aliases mapped,
defaults applied, inherited values filled in):

```json
{ "$$mdtype": "Shape", "name": "callout", "attributes": {},
  "dimensions": { "tone": "warning", "elevation": "flat", "tint": "ocean" }, "slots": { … } }
```

The plain presentation writes them as `data-*` on the root or on the part `on` names; a binding
maps them onto props.

| Key | Required | Meaning |
|---|---|---|
| `dimension` | yes | the attribute authors write; matches the file name |
| `description` | yes | shown in the editor, the reference and the AI grammar |
| `values` | unless `open` | the closed set, each with `description` |
| `aliases` | no | other spellings mapped onto a value; `deprecated: true` reports them |
| `open`, `presets` | no | values come from preset files (section 7) |
| `default` | no | when neither author nor shape sets one |
| `appliesTo` | yes | `all`, `{ shapes: [...] }` or `{ provides: [...] }` |
| `on` | no | `root` (default), or `{ provides: … }` / `{ slot: … }` for a part |
| `inherit` | no | nested shapes without a value receive their ancestor's |

**Suggested error ids:** `dimension-value-invalid`, `deprecated-attribute-value`,
`dimension-name-collision`, `dimension-default-invalid`, `dimension-unsupported`.

## 7. Presets

A preset is **a named value of an open dimension, carrying a payload**. Refrakt has four kinds
today, and only some are token sets:

| Preset | Holds | Where |
|---|---|---|
| Tint | colour token overrides | tint facet |
| Theme presets (`tideline`…) | a whole token set | `preset-loader.ts` |
| Background | raw CSS, a token-driven gradient, render params, even a live sandbox scene | `BgPresetDefinition`, `packages/transform/src/types.ts:730` |
| Frame | no tokens: a bundle of other settings (`aspect`, `displace`, `offset`, `shadow`…) | `FramePresetDefinition`, `types.ts:758` |

**Payload kinds:** token bundles; bundles of other dimension values; structured parameters for
the implementation; content or assets.

**The dimension declares its preset schema**, with typed fields, as a shape declares attributes.
Field types, a small closed set: `color`, `token`, `ratio`, `number`, `asset`, `content` (a file
or `file#id`), `dimension: <name>`, `enum`.

```yaml
# dimensions/frame.md
presets:
  dir: frames/
  expands: true
  fields:
    aspect:   { type: ratio }
    shadow:   { dimension: shadow }
    displace: { dimension: displace }
```

**Two resolution modes:**

- **Expanding** (`expands: true`): Marquise resolves the preset into other dimensions' values in
  the shape node; an author's inline value wins. Kits never need to know the preset exists. The
  most portable kind.
- **Passed through:** the payload is the implementation's (colours, gradients, scenes). The node
  carries the name; renderers get the payload from a preset registry.

**Raw CSS stays out of presets.** It ties a preset to one implementation. An implementation keeps
its raw styling in its own files, keyed by preset name.

**Who provides presets:** kits ship defaults; sites add their own and may override a kit's by
name; `extends` stays one level deep.

## 8. Behaviours

Two different things, owned by different layers:

- **Interaction contracts**: what tabs, an accordion, a disclosure or a carousel must do (keys,
  ARIA, focus). Accessibility and meaning, not taste, so they belong to the **design language**,
  stated and testable, not reimplemented by every theme.
- **Feel**: motion, reveal, transitions. Belongs to the **theme**.

**Logic once, bindings per framework.** Interaction logic stays framework-neutral ("headless"
state machines), and each implementation binds it in its framework. Zag.js works this way and is
worth a look. Today's `@refrakt-md/behaviors` is roughly the plain-DOM binding without the
separated logic. In a framework world, a component theme is a component library for a design
language using the headless logic; a bound library brings its own (Nuxt UI builds on a headless
primitives library), and the contract becomes a test against the output.

## 9. Bindings (sketch)

```ts
// bindings/vue.ts in a Nuxt UI kit
import { UAlert, UPageHero } from '#components';

export default defineBindings({
  callout: {
    component: UAlert,
    props: {
      title: 'headline',
      description: 'body',
      color: { from: 'tone', map: { danger: 'error' } },
      variant: 'emphasis',
    },
  },
  hero: {
    component: UPageHero,
    props: {
      headline: 'eyebrow',
      title: 'headline',
      description: 'blurb',
      links: { from: 'actions', each: { label: 'label', to: 'href' } },
    },
  },
});
```

- The Nuxt UI component and prop names are **from memory**; verify against its docs before any
  of this is written into a spec.
- SPEC-200's `as` decides prop or slot; SPEC-200's item records map onto array props.
- Marquise core adds no wrapper element: the library component is the output.
- Two ways to relate a kit to a library: **map your language onto the library** (portable), or
  **adopt the library's vocabulary as the language** (zero friction, less portable). Both are
  possible; kits choose.

## 10. Tags that are not shapes

*Added 2026-11-13.* Refrakt's non-shape tags fall into a few kinds, and most fit the same
pattern: vocabulary declared as content, implementation as code registered under a name.

| Kind | Examples in refrakt | What it does | Who writes it |
|---|---|---|---|
| Directives | `include`, `data`, `snippet` | resolve to content before the transform | content authors |
| Template structure | `slot`, `fragment`, `template`; Markdoc's `if` / `else` | describe how a template is built; no output of their own | template authors |
| Primitives | `group` (`layout="bar"`, `"ladder"`), `metablock`, `section` | arrangement and design vocabulary placed by templates | template authors |
| Lookups | `t` (SPEC-145 D29), `field`, `icon` | a value from somewhere other than the content: a dictionary, the shape's values, an icon set | template authors, sometimes content authors |
| Site tags | `layout`, `region` | page structure | site authors |
| Cross-document | `ref`, `xref` | point at another document's entity | content authors |

Markdoc's own built-ins (`if`, `else`, `partial`, variables, functions) stay Markdoc's.

**Primitives are shapes too** (SPEC-194 D13 already says "a primitive is a definition too"):

- `group` is a shape whose content is whatever is placed inside it, with a flag that only
  templates may place it (something like `placeableBy: templates`), so content authors never see
  it in completions;
- its `layout` is a dimension: an arrangement vocabulary (`bar`, `ladder`, `stack`, `grid`…)
  declared as content;
- it is provided by the design language, not by Marquise or `@marquise-md/compose`, which provides
  only the template language itself (`slot`, `fragment`, `template`);
- kits implement it like any shape: a CSS theme styles `[data-layout="bar"]`, a Nuxt UI kit binds
  it to a stack component, and the template is unchanged;
- the same holds for `metablock` and `section`.
- **The test:** if it renders something, it is a shape, possibly one only templates may place. If
  it only describes how a template is built, it belongs to the template language.

**Lookups are hooks the host fills, not engines Marquise ships** (*leaning, 2026-11-13*). `t` is
not content and not a shape: it asks for the string for a key in the current locale, with a
fallback. Refrakt has a full engine for it (SPEC-145 D29: one dictionary per site, English
fallback, plural maps, `i18n-extract`). Marquise should not:

- i18n is large, solved and opinionated (vue-i18n, Nuxt i18n, i18next, next-intl, FormatJS),
  with different message syntaxes, plural rules and locale negotiation; an engine would compete
  with what every framework user already has;
- a dictionary format with precedence rules is the kind of vocabulary Marquise does not ship;
- content is translated as whole documents, so content authors do not need `t` (answers T1);
- components already use their framework's i18n.

What Marquise provides instead (detailed in section 11): a `translate(key, fallback, params)`
callback the host supplies, a lookup node so templates and components resolve strings the same
way, a `$locale` host value for `Intl` formatting, and a kit manifest field listing message files
it does not interpret. Recommending one format (ICU message syntax in JSON is the closest to a
standard) would help kits interoperate. The host bridge is the only mechanism (answers T2).
Refrakt keeps its own `t`, dictionaries and `i18n-extract`, built on the same callback.

`icon` follows the same reasoning (leaning on T4): icon systems are also solved (Iconify, Nuxt
Icon, lucide), so Marquise defines an `icon(name)` callback and a manifest field for kits that ship
sets, not an icon registry. `field` is a lookup into the shape's own values and belongs to the
template language.

**Directives get a declaration file too**, mirroring shapes with `prepare` (SPEC-194 D1): `data.md`
declares its attributes (`src`, `where`, `sort`…) for validation, completions and docs, and names
its registered code with `preprocess: data`. Tooling then treats every tag the same way.

| Tag kind | Contract defined by | Declared as | Implemented by | Provided by |
|---|---|---|---|---|
| Shapes, including primitives | Marquise | shape file | components, templates, plain presentation | shape libraries, design languages, kits |
| Dimensions (including `layout`) | Marquise | dimension file | themes and kits | design languages, kits |
| Directives | Marquise (preprocess hook) | file with attributes and `preprocess: <key>` | registered code | the `include` satellite, refrakt (`data`, `snippet`), anyone (section 20) |
| Template structure | `@marquise-md/compose` | built in | `@marquise-md/compose` | `@marquise-md/compose` |
| Lookups (`t`, `icon`) | Marquise (signature and lookup node only) | message files and icon sets listed in kit manifests | the host's callbacks | hosts, kits |
| Site and cross-document tags | site layer, corpus layer | their own | their own | refrakt, other site layers |

## 11. Extension points

*Added 2026-11-13.* What SPEC-199 calls "hooks" are three different things; only the third is
functions the host passes in.

| Kind | What it is | Examples |
|---|---|---|
| Declarations | files Marquise reads; no code | shapes, dimensions, presets, kit manifests |
| Registries | code registered under a name, which declarations refer to | directives (`preprocess: data`), `prepare` stages, components and bindings, presentations |
| Callbacks | functions the host supplies for what only the host knows | values, files, translate, icons, findings |

**Transform time, passed to `marquise`:**

```ts
// marquise.config.ts
export default defineConfig({
  kits: [nuxtUi()],
  shapes: 'shapes/',
  values: ({ document }) => ({ locale: document.frontmatter.lang ?? 'en' }),
  files: nodeFiles({ root: '.', roots: { partials: '_partials/' } }),
  onFinding: (finding) => console.warn(finding),
  presentFinding: (finding) => null,
});
```

| Callback | Signature | Used by | Default |
|---|---|---|---|
| `values` | `(ctx) => Record<string, unknown>` | `$locale`, `$page`, `$site` and other host values in expressions and conditions | `{}` |
| `files` | `{ read(path), resolve(root, path) }`, bounded to declared roots | `include`, `data`, anything reading files (refrakt's `ProjectFiles`, SPEC-113) | Node's filesystem, bounded to the project root |
| `onFinding` | `(finding) => void` | every validation finding | collected into the `findings` result |
| `presentFinding` | `(finding) => node \| null` | failures that should stay visible on the page | `null`; refrakt returns its `hint` callout |

Deferred definitions are an API, not a callback: `transform()` returns placeholders, and the host
calls `expand(placeholder, values)` once it has the values.

**Lookups resolve at render time.** A `t` in a template becomes a node, not a string:

```json
{ "$$mdtype": "Lookup", "kind": "translate", "key": "recipe.servings", "fallback": "Serves", "params": {} }
```

The shape node stays independent of locale (cacheable, served in every language); it matches how
framework i18n resolves reactively; templates and components share one path.

**Render time, given to each renderer package:**

```ts
// @marquise-md/vue, installed by the host or a kit's Nuxt module
app.use(marquise, {
  components: { callout: UAlert /* … */ },
  bindings,
  translate: (key, fallback, params) => i18n.t(key, params) ?? fallback,
  icon: (name) => h(UIcon, { name }),
  middleware: [],
});
```

| Provided | What it does | Default |
|---|---|---|
| `components`, `bindings` | shape name to component, or to a binding onto a library component | the plain presentation |
| `translate(key, fallback, params)` | resolves translate lookups; what components call | the fallback, params filled in |
| `icon(name)` | resolves icon lookups to the framework's renderable | nothing, reporting `icon-unresolved` |
| `middleware` | process each shape node before rendering, and intercept its rendering (section 12) | none |
| element overrides | replace an HTML element everywhere (`table`, `pre`) | none |
| context API | `useMarquise()` (Vue, React), `getMarquise()` (Svelte): `translate`, `icon`, `locale`, the current shape | always provided |

`translate` and `icon` have **fixed signatures** so kits interoperate; anyone can register more
lookup kinds under their own names.

**Order:** kits may supply defaults (a Nuxt UI kit's module plugging `translate` into Nuxt i18n and
`icon` into Nuxt Icon); the site's config wins over any kit; two kits registering the same name
is an error unless config chooses.

**Not provided:** a translation engine, message format or locale negotiation; an icon set; any
filesystem policy beyond bounding reads to declared roots.

**SPEC-199's hooks, regrouped:**

| SPEC-199 hook | Becomes |
|---|---|
| shared attributes, extra definition keys | declarations |
| preprocess tags, `prepare` stages, presentations, template tags | registries |
| file roots, host values, error presentation | callbacks (`files`, `values`, `presentFinding`) |
| wrapper around a rune or slot | middleware (section 12) |
| deferred definitions | an API (`transform` returns placeholders; the host calls `expand`) |

Two callbacks are new: `translate` and `icon`.

### Extensions in shape files (2026-11-18)

SPEC-199 lists the hook ("extra definition keys a host declares and validates"), and refrakt uses it
(`hero.md`'s top-level `defaults:`), but there were no rules for several extensions sharing a shape
file. The problems: collisions (Rivière's `context` and another tool's); typos versus extensions
(Marquise must catch `optinal: true`); extensions not installed (a library published with Rivière hints,
used without Rivière); placement (shape, attribute, field, item model); tooling (completion and checks in
the language server); graduation (a key that later belongs in core).

**Decided: one namespace per extension.** Each extension owns exactly one key, its name, at every level
it is allowed, with everything it needs inside:

```yaml
# shapes/work.md
description: A unit of work
attributes:
  source:
    type: ref
    to: [spec, decision]
    riviere: { context: full }        # Rivière's key, on an attribute
summary: [title, status, priority]    # core
riviere:
  context: { back: [mentions] }       # Rivière's key, on the shape
schema:                               # the @marquise-md/schema satellite's namespace
  type: CreativeWork
```

- **No collisions:** each extension registers its name once; two packages claiming one is a loading
  error.
- **Typos caught:** an unknown key in core, or inside a known namespace, is an error finding.
- **Extensions not installed are tolerated:** a key that is neither core nor a registered namespace is an
  info finding ("`riviere` is not installed; its keys are ignored") and passed through untouched. A
  namespace can be told apart from a typo, which flat keys cannot do; that distinction is why flat keys
  with a registry were rejected, though slightly nicer to write.
- **Placement declared:** an extension registers a schema for its namespace and the levels where it may
  appear (`shape`, `attribute`, `field`, `itemModel`); Marquise validates it, with the same findings as
  core keys.
- **Tooling for free:** the JSON Schema for shape files is composed from core plus each registered
  extension's schema, so the language server completes and checks `riviere.context` without knowing
  Rivière.
- **Passed through, never interpreted:** extensions read their data from the loaded shape
  (`shape.extensions.riviere`); published schema documents carry it as vendor keywords (`x-riviere`),
  which other consumers ignore.

**Refrakt's keys** (`role`, `placedBy`, `metaFields`, `registers`, `blocks`, `defaults`) move under
`refrakt:`, a mechanical codemod and a first use of the migration format (SPEC-189), making visible which
parts of a shape file only refrakt understands.

**Graduation:** a key graduates into core when more than one consumer needs it, by migration
(`riviere.summary` becomes `summary`, run over shape libraries). **The summary projection is core from
the start** (it describes a record: Marquise's extraction, an editor's outline and any list of records
want it); **context hints stay in Rivière's namespace** (only something with references between
documents uses them).

**On the content side** plain names stay right: authors write refrakt's universal attributes (`width`,
`tint`) through the shared-attributes hook, never namespaces; two extensions' shared attributes
colliding is a configuration error the host resolves, never a guess.

## 12. Middleware

*Added 2026-11-13*, replacing the earlier `wrapShape` and `wrapSlot` sketch.

**What the wrappers were for, and what is left.** They came from four problems; two are now
solved another way.

| Problem | Where it came from | Still needs it? |
|---|---|---|
| Dimensions reach the output even if a component ignores them | ADR-049 decision 2: the engine draws the root | no: dimensions are in the shape node, bindings map them, coverage reports gaps (`dimension-unsupported`) |
| Refrakt's engine root and background layers | `bg` builds its own layers inside the root | yes, but only refrakt |
| Dimensions aimed at a part (`frame` on media) | the engine applies them to the slot | no: the node says where a part dimension goes (below) |
| A library cannot express a dimension (`width`) | K3 | sometimes, as a binding's own option (below) |

What remains is cross-cutting work on every shape, whatever draws it: editor hints, source line
numbers, error boundaries, hydration boundaries, instrumentation, refrakt's engine root. Most of it
adds no element, so "wrapper" was the wrong word: it is **middleware**.

**One concept, two hook points**, as a Vite plugin implements whichever hooks it needs:

| Hook | Receives | Changes children? | Framework-specific? | Examples |
|---|---|---|---|---|
| `node` | the shape node (data), before rendering | yes, freely | no | edit hints, source lines, lazy-loading images, dropping draft content in production |
| `render` | the node and `next()`, during rendering | only by passing a changed node to `next()` | yes | error boundaries, hydration islands, instrumentation, refrakt's engine root |

```ts
const sourceLines = defineMiddleware({
  name: 'source-lines',
  node: (node, ctx) => annotate(node, { 'source-line': node.source.line }),
});

const errorBoundary = defineMiddleware({
  name: 'error-boundary',
  render: (node, next, ctx) => <ErrorBoundary fallback={<Plain node={node} />}>{next(node)}</ErrorBoundary>,
});
```

Changing children belongs in `node`: plain data, testable, the same in every renderer including
the HTML one. Changing rendered output after the fact (React elements, Vue VNodes) is fragile and
per framework, so `render` is kept for what only a framework can do. The name `middleware` fits
because it processes what passes through, as Express middleware may change a request and call
`next`; "around" suggested wrapping only.

**Context decides which middleware runs.** Marquise puts a `mode` in the context, with
conventional values `production`, `development`, `editor`, `preview` (hosts may add their own):

```ts
middleware: [
  sourceLines({ when: ['development', 'editor'] }),
  editHints({ when: 'editor' }),
  errorBoundary(),
],
```

`node` middleware runs at render time, not transform time, so one transformed tree serves every
mode, and the cached shape node never holds editor or dev annotations.

**How `node` middleware walks the tree:**

- called once per shape node, parents before children, so a parent can pass information down;
- inside a shape it may change anything that is not a nested shape: attributes, slot content,
  plain elements; nested shapes get their own call;
- it may visit plain elements across the tree with a selector, as a rehype plugin does:
  `visit: { img: (el) => ({ ...el, attributes: { ...el.attributes, loading: 'lazy' } }) }`,
  generalising today's render-time element overrides;
- it may not change a shape's contract: no undeclared slots or attributes, so a component never
  receives props its types do not mention.

**Annotations** are what middleware adds that is not a shape attribute (edit hints, line numbers):
a separate field on the node, written out as `data-*`. Reaching a component's DOM differs per
framework:

- **Vue** passes undeclared attributes through to a single-root component's root element, so
  annotations just work;
- **React and Svelte** have no fallthrough: the component spreads `rootProps` from `useMarquise()`
  on its root, or the renderer adds a `display: contents` wrapper, acceptable in editor and dev
  modes since it never runs in production;
- the plain presentation writes them on its root.

**Part dimensions travel in the node** instead of through a slot wrapper:

```json
"dimensions": { "tone": "warning", "frame": { "value": "polaroid", "on": "media" } }
```

A binding maps `frame` onto whatever draws the media, a component applies it itself, and the plain
presentation writes `data-frame` on the `media` slot wrapper.

**A library that cannot express a dimension** gets a wrapper from its binding, for that shape
only, declared and visible in coverage:

```ts
hero: { component: UPageHero, props: { /* … */ }, wrapper: { dimensions: ['width', 'spacing'] } }
```

**Rules:** `render` middleware calls `next()` exactly once; adding an element is an explicit choice,
never a default (extra elements break grid and flex children, child selectors and `ul > li`); the
site's middleware runs outermost, then kits in config order; output is the same on server and
client, or hydration fails.

**What this replaces:** `wrapShape` becomes `render` middleware; `wrapSlot` disappears (slot changes
are `node` middleware); element overrides stay, but plain element changes can move to `node`
middleware; refrakt's engine root is `render` middleware refrakt registers.

## 13. Islands and images

*Added 2026-11-13.* Both are solved and opinionated, so the principle holds: Marquise provides the
plug points, the host's framework does the work. Each splits into facts that belong to the content
and facts that belong to the presentation.

**What refrakt does today:** an `asset:` scheme that indirects image sources through project config
(SPEC-115) and custom image schemes (`placeholder`, `icon`; `lib/image-schemes.ts`), but no
resizing, `srcset` or format conversion; and an Astro adapter that includes the behaviours script
only on pages with interactive runes (`packages/astro/src/behaviors.ts`), island thinking at page
level.

**Hydration islands.** Astro renders every component to HTML and hydrates only components marked
with a `client:` directive (`load`, `idle`, `visible`, `media`, `only`). Next has React Server
Components with `'use client'` boundaries; recent Vue and Nuxt have lazy hydration strategies;
Svelte has no built-in partial hydration as far as known.

- **Whether something hydrates is a fact about the component, not the shape.** One theme's hero
  is a carousel, another's is static. So it belongs to the component or binding:

  ```ts
  calculator: { component: PriceCalculator, hydrate: 'visible' },
  hero:       { component: Hero },
  ```

- Marquise provides a `hydrate` option (`load`, `idle`, `visible`, `none`; absent means the
  framework's default); each renderer translates it into its framework's mechanism, and says so
  where there is none.
- The shape node is already right for islands: props must serialise from server to client, and the
  node is plain data for that reason (ADR-049 decision 8).
- Shapes with no component render as plain HTML, so a page of content alone ships no JavaScript.
- Refrakt's behaviours are the plain-DOM version: load a behaviour's script only when its shape is
  present.

**Images.** Astro's `astro:assets` (`<Image>`, `getImage()`), `next/image` and Nuxt Image
(`<NuxtImg>`) resize to several widths with `srcset` and `sizes`, convert to WebP or AVIF, set
`width` and `height` against layout shift, and lazy-load with priority for the main image.
Marquise builds none of it, but sorts the facts by who knows them:

| Fact | Who knows it | Where it lives |
|---|---|---|
| The image, alt text, caption, credit | the author | the content: `![alt](src)` |
| Focal point (what stays visible when cropped) | the author: it is about what the photo shows | an attribute on the image; refrakt has `anchor` on frame presets |
| Width, height, available formats | the asset pipeline | resolved at transform time, carried in the node |
| `sizes` (displayed width per breakpoint) | the presentation: a hero's media is full width, an avatar 64px | the component or binding |
| Priority (eager loading for the main image) | the presentation and the page position | the binding, or middleware that knows the first shape |
| Output formats, quality | the host | the host's image tool configuration |

Marquise's plug points:

1. **An asset callback at transform time**, `resolveAsset(src, ctx) => { src, width, height, … }`,
   filled by the host (an Astro integration calls `getImage()`; a Vite setup imports the file).
   It sits beside `files`; refrakt's `asset:` scheme is a candidate to graduate into it.
2. **An image element override per renderer**, delegating to the host's component (`<Image>`,
   `<NuxtImg>`, `next/image`).
3. **Presentation hints in bindings and components**, for example
   `slots: { media: { images: { sizes: '(min-width: 1024px) 50vw, 100vw', priority: true } } }`,
   reaching the image override through render context: the component placing a slot knows its
   size; the images inside it do not.
4. **Default policies as middleware**: lazy loading everywhere except images in the first shape on
   a page, `node` middleware with tree position (section 12).

And one finding for core: **`image-alt-missing`**. Alt text is the author's job and part of the
content's meaning.

**Astro is a natural home** (*agreed 2026-11-13*). It is content-first, renders React, Vue, Svelte
and Solid components side by side, has islands, an image pipeline, content collections (a corpus
layer in this document's terms), and **official Markdoc support** (`@astrojs/markdoc`), so its users
already know the format and stand to gain most from typed shapes. Marquise stays framework-neutral,
but Astro gets extra consideration:

- *Decided:* **the Marquise docs site is built with Astro** (SPEC-199's order said "built with
  refrakt"; updated there);
- Astro is a strong candidate for the proof project in SPEC-199's order, alongside the Nuxt UI kit
  idea;
- how Marquise relates to `@astrojs/markdoc` is open (I5): see section 14.

## 14. Integration packages

*Added 2026-11-13.*

### The Astro integration and `@astrojs/markdoc` (I5)

Read from the docs source on GitHub (`withastro/docs`,
`src/content/docs/en/guides/integrations-guide/markdoc.mdx`), since the live docs site was not
reachable from the session; `@astrojs/markdoc` 2.1.4.

**What it offers:** a `markdoc.config.mjs` with `defineMarkdocConfig({ tags, nodes, functions,
variables, extends })`, accepting "all Markdoc configuration options"; presets through `extends`
(as `shiki()` and `prism()` ship); tags rendering `.astro` components via
`render: component('./src/components/Aside.astro')`, attributes as props and **children in the
default slot only**; framework components only through a hand-written `.astro` wrapper with a
`client:` directive ("Tags and nodes are restricted to `.astro` files"); an overridable `image`
node receiving Astro's `ImageMetadata` for local images; Markdoc's own `{% partial %}`; variables
on `<Content />` or in config; `ignoreIndentation` (refrakt's SPEC-170 equivalent); `.mdoc` files
in content collections only. **Not documented:** a hook over the AST before the transform, or tag
schemas with their own `transform`.

| Marquise needs | On `@astrojs/markdoc` |
|---|---|
| Shapes resolving their content model | probably: a tag's `transform` receives the AST children, as refrakt's `createContentModelSchema` does; undocumented, so a spike confirms it |
| Named slots | not directly (default slot only), but see the host component below |
| Hydrated framework components | needs `.astro` wrappers, which can be generated |
| Images | already solved: `resolveAsset` is Astro's |
| Indentation-tolerant parsing | already there (`ignoreIndentation`) |
| `include` and `data` before the transform | missing: no pre-transform hook, and `partial` resolves too late for content models |
| Findings in the build | unclear; Marquise's CLI and language server work regardless |

**Two tricks:**

- **One host component for every shape.** Each shape's transform returns the shape node as one
  prop to a generic component, `component('@marquise-md/astro/components', 'Shape')`, which runs
  Marquise's Astro renderer: bindings, named slots (`<Fragment slot="headline">`), middleware,
  nested shapes. The default-slot limit stops mattering; the node being plain data makes it work.
- **Generated wrappers for hydration.** Astro needs static `client:` directives; Marquise knows each
  component's `hydrate` option from the bindings, so the integration generates the wrappers at
  build time into a cache directory. `hydrate: 'visible'` just works, an improvement over plain
  `@astrojs/markdoc`.

**Options:** (A) a preset for `@astrojs/markdoc` (`extends: [marquise()]`): users keep `.mdoc`,
content collections, `render()` and `<Content />`, and adopt one shape at a time, but `include` and
`data` inside shapes fall short; (B) a separate integration replacing `@astrojs/markdoc`: full
control, but a migration and two Markdoc configurations; (C) **A first, then propose a small
pre-transform AST hook upstream**, with B as the fallback if it is not accepted. *Leaning C*
(2026-11-13). The Astro-built docs site is the first real user.

**Spike before committing:**

1. a tag schema with its own `transform` runs in `@astrojs/markdoc` and receives the AST children;
2. a shape node passed as a prop reaches the host component intact, and named slots render from it;
3. generated wrappers in a cache directory are picked up by the build, with working hydration;
4. how Markdoc validation errors from tags surface in `astro build` and `astro dev`.

### Renderers and integrations

Refrakt already splits renderer packages (`react`, `vue`, `svelte`) from adapters (`sveltekit`,
`next`, `nuxt`, `astro`, `eleventy`, `html`). For Marquise the second kind is much thinner: no
routing, no layouts.

| Kind | Does | Depends on | Example |
|---|---|---|---|
| Renderer | turns a shape node into one UI framework's output: bindings, components, context, `render` middleware, element overrides | the UI framework | `@marquise-md/vue`, for any Vue app: Vite, VitePress, Nuxt |
| Integration | wires Marquise into a meta-framework: config and kits, build transform, reload on shape changes, types in dev, and the framework's images, hydration and i18n plugged into Marquise's callbacks | the meta-framework, plus a renderer | `@marquise-md/nuxt`: components registered, `resolveAsset` to Nuxt Image, `translate` to Nuxt i18n, `hydrate` to Vue's lazy hydration |

So Vue and Nuxt get a package each: `@marquise-md/vue` for any Vue project, `@marquise-md/nuxt` a small
module on top.

**A shared base, `@marquise-md/vite`:** most meta-frameworks are Vite-based (Astro, Nuxt, SvelteKit,
React Router, SolidStart, plain Vite); Next is the main exception. The plugin loads shapes,
dimensions and kits as a virtual module, reloads on change and regenerates types; integrations add
only what is framework-specific. Refrakt has done similar work (`site-tokens-vite.ts`,
`content-hmr.ts`).

**Content sources differ:** Astro has content collections and `@astrojs/markdoc`; Nuxt has Nuxt
Content with its own MDC syntax (not Markdoc, as far as known), so Nuxt users are not yet Markdoc
users; Next and SvelteKit have no content layer, so the integration offers a minimal loader or
works beside libraries such as Velite.

**Astro is different:** one page can mix frameworks. `@marquise-md/astro` hosts the UI renderers
rather than replacing them (the generated wrappers import `@marquise-md/react`, `vue` or `svelte` per
binding); static shapes render through the `.astro` host without hydration; bindings may point at
components from different frameworks in one project, and the binding format should allow it.

| Tier | Packages | When |
|---|---|---|
| Core | `marquise`, `@marquise-md/cli`, `@marquise-md/language-server` and VS Code extension, `@marquise-md/test` | 1.0 |
| Renderers | `@marquise-md/html`, `@marquise-md/react`, `@marquise-md/vue`, `@marquise-md/svelte` | 1.0 (refrakt has the last three) |
| Build base | `@marquise-md/vite` | 1.0 |
| Integrations | `@marquise-md/astro` | 1.0 (docs site, proof project) |
| | `@marquise-md/nuxt`, `@marquise-md/next`, `@marquise-md/sveltekit` | after 1.0, thin, one at a time |
| Satellites (own repositories, section 20) | `@marquise-md/schema`, `@marquise-md/include`, later perhaps `compose` | as SPEC-199 plans; `data` and `snippet` stay in refrakt |
| Not first-party | kits, Solid, Preact, Qwik, Eleventy, the editor | community, or later |

**Guards:** integrations stay thin (anything not framework-specific belongs in `@marquise-md/vite` or
core, or they drift apart as refrakt's adapters did, SPEC-058); every first-party package needs a
real user, so Nuxt, Next and SvelteKit come one at a time, driven by demand.

### Framework integrations beyond Astro (2026-11-17)

Rendering adapters are one of about eight things an integration needs; Astro's Content Layer hid most
of the rest. Nuxt checked against `@nuxt/content@3.17.0`'s published types.

**Two kinds of framework:** with a content system of their own (Astro's Content Layer, Nuxt Content,
VitePress's data loaders, Eleventy's collections), integrate into it (SPEC-199's never-own-the-chain
rule); without one (Next.js, SvelteKit, React Router, TanStack Start), Rivière's API is the content
layer, called from server code through a shared snapshot.

**Nuxt, from its types** (answers N2): a custom source is `{ getKeys(), getItem(path) }` returning raw
strings that Nuxt Content parses with its own pipeline (`@nuxtjs/mdc`, Comark's predecessor), so
Rivière cannot hand it typed entries as in Astro. The hook `content:file:afterParse` receives the
parsed content and may change it: Marquise resolves shapes there, in MDC's tree, close to Comark's (the
spike's adapter mostly applies), and adds record fields. Schemas are Standard Schema
(`ContentStandardSchemaV1`), not Zod. Each integration is genuinely different work; only the checklist
is shared.

**The integration contract:** the questions every integration answers, ours or third-party:

| # | Need | Astro | Nuxt (Content) | Next, SvelteKit, others | Covered so far |
|---|---|---|---|---|---|
| 1 | Where content enters | content loader | `afterParse` hook, Standard Schema | Rivière's API in server code | partly |
| 2 | Rendering | Marquise's Astro renderer | Vue renderer, or Comark's | React or Svelte renderer | yes |
| 3 | A validation schema the framework understands | Zod | Standard Schema | none needed | no |
| 4 | Dev invalidation and errors | watcher, logger | Nuxt hooks, its overlay | Vite's module graph and overlay; Next has no Vite (N4) | partly |
| 5 | Generated types in the framework's type step | `createSchema` types | `nuxt prepare` | `.svelte-kit/types`, Next's TypeScript plugin | no |
| 6 | Links and images | URL policy, `imageImports` | `NuxtLink`, Nuxt Image | `next/link`, `next/image`, enhanced images | partly (section 13) |
| 7 | Server and client boundary | islands | lazy hydration | React Server Components; SvelteKit hydrates fully | partly (section 13) |
| 8 | Runtimes without a filesystem | Astro's data store | Nuxt Content's database | ours to solve | no |

**Four gaps that are core requirements, not integration work** (*leaning*):

1. **A Standard Schema validator generated from shapes.** Standard Schema is the interop point (Nuxt
   Content, TanStack, tRPC and others); one validator covers them all, Zod covering Astro. It is the one
   exporter integrations themselves need, so arguably Marquise's rather than a third party's (unlike
   section 18's exporters).
2. **A serialisable snapshot:** edge and serverless runtimes often have no filesystem; Astro and Nuxt
   have their own stores, Next and SvelteKit do not. Rivière writes its snapshot during the build
   (`snapshot.toJSON()`) and loads it at runtime (`loadSnapshot(json)`), so queries and the live loader
   work anywhere. Cheap under the plain-JSON rule, but designed in.
3. **React Server Components:** section 11's context API (`useMarquise()`) relies on React context,
   which does not exist in server components, so today's design would fail quietly in Next's App Router.
   The React renderer works as a server component: `translate`, `icon` and the current shape passed as
   props or held per request (React's `cache()`); only bound interactive components are client
   components, each behind `'use client'`.
4. **Dev invalidation as a contract:** Rivière knows its dependencies (documents, included files, the
   queries expansions ran); each integration maps them onto its framework's invalidation;
   `@marquise-md/vite` covers Vite-based frameworks; Next needs a `withRiviere()` wrapper or its own
   watching; findings go to each framework's error overlay, not only the terminal.

**Standard Schema, in detail** (2026-11-18; read from `@standard-schema/spec@1.1.0` and
`zod@4.6.7`). **It is an interface, not a schema language:** it describes no fields or types, only one
property schema objects of any library (Zod, Valibot, ArkType and others) carry, so a framework can
accept any of them without depending on one:

```ts
interface StandardSchemaV1<Input, Output> {
  readonly '~standard': {
    version: 1;
    vendor: string;                                   // 'zod', 'valibot', 'marquise' …
    validate(value: unknown): Result<Output> | Promise<Result<Output>>;
    types?: { input: Input; output: Output };         // TypeScript inference only
  };
}
// Result: { value } on success, or { issues: [{ message, path? }] } on failure
```

Version 1.1 adds **`StandardJSONSchemaV1`**: `jsonSchema.input(options)` and `jsonSchema.output(options)`
return a JSON Schema for a target (`draft-2020-12`, `draft-07`, `openapi-3.0`), so a schema can also say
what it looks like.

**Zod and Standard Schema:** a Zod 4 schema *is* a Standard Schema (it implements `~standard`, with the
JSON Schema companion), so nothing is generated in that direction. The reverse is impossible in general:
a plain Standard Schema is opaque, a function with no structure to read; only through JSON Schema, when
the companion is implemented (`z.fromJSONSchema()`, and `z.toJSONSchema()` the other way). JSON Schema
is the shared structural format; Standard Schema the shared validation interface.

**For Marquise, one object per shape implementing both, with no dependencies** (*decided 2026-11-18*,
answering N5): `validate` runs Marquise's own validation on a record, each finding an issue whose `path`
is the finding's address (`ingredients[2].amount` as `['ingredients', 2, 'amount']`, A1's decisions
mapping onto Standard Schema's path segments); `jsonSchema` returns the published schema document
(SPEC-199); `types` points at the generated record types. That covers every framework accepting
Standard Schema. **Astro requires Zod** (`z.$ZodType`), handled in the Astro integration, not core:
`z.fromJSONSchema(schema.jsonSchema.output(…))` for structure, or the Standard validator wrapped in
`z.custom()` for Marquise's exact validation; the type string from Marquise's generator either way.
Zod is a dependency of one integration, never of Marquise.

**Limits:** validation is pass or fail with no severity, so only error findings become issues (warnings
reach the framework through its logger); it validates data, not Markdown: in a loader it rechecks
records cheaply, and its real value is JSON that never was Markdown (a store as a source, M9, data sent
to an API).

**Proposal:** the eight questions written down as the integration contract; Astro the reference
integration; the others when someone needs them (Marquise builds no integrations beyond the reference);
the four gaps required before 1.0.

## 15. The HTML renderer

*Added 2026-11-13.* Without refrakt's engine, a bare HTML renderer would output only the plain
presentation: styleable with CSS, but with a fixed structure. It need not stay that limited, and
no plugin API per templating engine is needed; it is enough to decide what a "component" is with
no UI framework.

**Components are functions that return HTML:**

```ts
import { html, defineHtmlRenderer } from '@marquise-md/html';

const Hero = ({ headline, blurb, actions, eyebrow }) => html`
  <section class="hero">
    ${eyebrow && html`<p class="hero__eyebrow">${eyebrow}</p>`}
    <h1>${headline}</h1>
    ${blurb && html`<p>${blurb}</p>`}
    <div class="hero__actions">
      ${actions?.map((a, i) => html`<a class=${i === 0 ? 'button primary' : 'button'} href=${a.href}>${a.label}</a>`)}
    </div>
  </section>`;

export default defineHtmlRenderer({ components: { hero: Hero } });
```

- **The `html` tagged template escapes by default.** A `text` field (`eyebrow`) is a string and is
  escaped; slot content arrives as already-rendered, trusted HTML and is inserted as is. This
  contract is what keeps content from becoming an XSS hole.
- **Any templating library fits inside the function** (Handlebars, Nunjucks, Liquid, Eta, EJS):
  compile, then call with the props. "A function that returns HTML" is the common denominator, so
  no per-library plugin. It suits Eleventy users, who already write Nunjucks or Liquid; an Eleventy
  integration could register those templates as shape components.

  ```ts
  const tpl = nunjucks.compile(readFileSync('hero.njk', 'utf8'));
  const Hero = (props) => html.raw(tpl.render(props));   // the template must escape its own output
  ```

- **JSX without a framework** fits the same contract, through libraries that render JSX to
  strings.

**Custom elements as a binding target.** Shape slots map almost one to one onto native web
component slots:

```ts
callout: {
  element: 'wa-callout',
  attributes: { variant: { from: 'tone', map: { danger: 'danger' } } },
  slots: { icon: 'icon', default: 'body' },   // <span slot="icon">…</span>
}
```

The renderer writes `<wa-callout variant="warning"><span slot="icon">…</span>…</wa-callout>`, and
the browser does the rest. That opens framework-free component libraries (Shoelace or Web Awesome,
a team's own Lit components) as kits, as Nuxt UI is for Vue, interactive without a hydration step
because custom elements upgrade themselves. Refrakt is halfway there: its chart, map, diagram and
sandbox runes render as custom elements (`rf-chart`, `rf-map`…). (`wa-callout` and its attributes
are illustrative, from memory.)

**What this settles:**

- the plain presentation is what `@marquise-md/html` renders for a shape with no component bound
  (answers N3);
- refrakt's engine becomes a presentation plugged into `@marquise-md/html`, and into other renderers
  through `render` middleware: one more way to render shapes, not something Marquise imitates;
- `@marquise-md/compose` templates are the Markdoc-native option, later.

So the HTML renderer offers four ways to draw a shape, simplest to richest: the plain presentation,
functions (any templating library inside), custom elements, and later Markdoc templates. Behaviour
for the first three comes from custom elements or the plain-DOM binding of the headless interaction
logic (section 8).

## 16. Seams not yet discussed

*Added 2026-11-13*, to walk through one at a time. The first three matter before 1.0; the last
three are smaller but easy to get wrong.

**Z1. Markdoc itself.** Marquise is built on Markdoc's parser, AST and transform. Refrakt already
wraps parsing (`parse`, SPEC-170), but Markdoc's types (`Node`, `Tag`, schemas, `Config`) leak
everywhere, so Marquise's public API would inherit Markdoc's release pace and decisions. Keep
Markdoc an implementation detail: Marquise exposes its own types (the shape node, a document type,
findings), never Markdoc's, so a fork or patched parser stays possible. Markdoc's recent release
activity is worth checking.

*Explored 2026-11-13: other formats, and Comark.*

**The family.** Several formats express "a named block, with attributes, containing Markdown":

| Format | Block | Inline | Named parts | Attribute types | Logic | Ecosystem |
|---|---|---|---|---|---|---|
| Markdoc | `{% callout type="warning" %}…{% /callout %}` | `{% badge %}New{% /badge %}` | none; Marquise infers them | typed literals | `if`, variables, functions | markdown-it; Astro's official integration |
| MDC / Comark | `::callout{type="warning"}…::` | `:badge[New]{color="green"}` | explicit: `#title` | strings, plus `:prop` for JSON values | none known | Nuxt Content, Nuxt UI prose components; Comark is framework-neutral |
| Generic directives (`remark-directive`, a CommonMark proposal) | `:::callout{type=warning}…:::` | `:abbr[HTML]{title="…"}` | none | strings | none | remark / unified; Docusaurus's `:::tip` |
| Pandoc fenced divs, Djot | `::: {.callout type=warning}` | `[text]{.class}` | none | strings | none | Pandoc, Djot |
| MyST | a fenced `{note}` directive with options | `{role}` text | options and body | typed options | none | Jupyter Book, Sphinx |
| MDX | `<Callout type="warning">…</Callout>` | JSX | props, children | JavaScript | full JavaScript | React, Astro, Next |

Shortcodes (Hugo, Jekyll's Liquid) and fixed-vocabulary alerts (GitHub's `> [!NOTE]`, Obsidian's
callouts) are relatives, less relevant. (MDC, directive and MyST details are from memory except
where the Comark notes below cite a source.)

**MDC is being replaced by Comark.** The `nuxt-content/mdc` README now opens: "`@nuxtjs/mdc` is
being deprecated in favor of Comark. Comark is the successor to MDC — it is faster, AI-friendly,
and no longer bound to Vue or Nuxt"; existing MDC files stay compatible. From Comark's README (npm
registry; comark.dev was not reachable): "an open-source Markdown parser and renderer with
components, attributes and plugins. It streams AI output to React, Vue, Svelte, Angular, HTML and
the terminal"; version 0.9.2 published 2026-11-12, MIT; parses into "a compact, serializable
document" (`['tag', props, ...children]`), "parse once on the server, send the serializable
document to the client, render without re-parsing"; packages `comark`, `@comark/vue` (with a Nuxt
module), `@comark/react` (Next.js, Server Components), `@comark/svelte`, `@comark/angular`,
`@comark/html`, `@comark/ansi`; built on markdown-exit (a TypeScript rewrite of markdown-it);
closes unfinished syntax while AI output streams; plugins (Shiki, KaTeX, Mermaid). The README shows
no content models, typed shapes, validation of a component's content or generated types.

**What this means for the seam.** Marquise's core (content models, shapes, validation, dimensions,
kits, the shape node) works on "a named block with attributes and Markdown children" and does not
depend on syntax. So: **a syntax front end produces Marquise's own document tree, and everything
after it is syntax-neutral.** Markdoc is the first front end. Differences to reconcile if there are
more:

- explicit named parts (`#title`) versus inferred ones: map them onto fields as an explicit
  alternative to matching, possibly useful for Marquise in any syntax (Z1b);
- attribute types: shapes' declared types convert values from strings, so validation is unchanged;
- logic: only Markdoc has `if`, variables and functions; features relying on them work only through
  the Markdoc front end, or through Marquise's own expressions;
- dialect details: CommonMark and GFM differences, indentation rules (the MDC README warns that
  indentation inside a component can break slot detection).

**How Comark relates.** It overlaps on rendering (a serializable tree, renderers for React, Vue,
Svelte, Angular and HTML, plus things not planned for Marquise: a terminal renderer, streaming AI
output). It does not appear to have what is distinctive about Marquise (content models, typed
shapes, validation, kits, schema.org), so Marquise could be the typed layer working with Comark's
syntax and renderers rather than building its own. Nuxt UI's prose components use MDC syntax, so a
Nuxt UI kit for a Markdoc-only Marquise would ask Nuxt users to change syntax; Astro's world uses
Markdoc, Nuxt's is moving to Comark, and two front ends would cover both.

**Suggested:** not several syntaxes in 1.0 (the scope growth that slowed refrakt), but Z1 designed
for it: Marquise's own tree and shape node, Markdoc as the first front end, nothing after parsing
that knows about Markdoc. Look at Comark seriously before building renderers (deep dive below);
perhaps contact its maintainers, as the projects look complementary. Caveat: Comark is at 0.9,
released the day before this was written, and only its README had been read at this point.

#### Deep dive: Comark (2026-11-13)

**Sources:** Comark's repository (`comarkdown/comark`, cloned at its 2026-11-13 head), its docs
source (`docs/content/`), the npm registry, and a spike running `comark@0.9.2` on sample content
(scripts kept outside the repository).

**Maturity and backing.**

| | Markdoc | Comark |
|---|---|---|
| Version | 0.5.12 (2026-11-10) | 0.9.2 (2026-11-12) |
| Release activity | steady through 2026: 0.5.5 (March) … 0.5.12 (November) | first published 2026-02-13; 21 versions; 0.7 → 0.9 between September and November |
| Backing | Stripe | NuxtLabs people among recent committers (Farnabaz, Sébastien Chopin, Daniel Roe); MDC's successor |
| Licence | MIT | MIT |

Both are pre-1.0, so neither promises a stable API yet. Markdoc is not abandoned.

**Comark's own comparison** (`docs/content/11.compare/4.comark-vs-markdoc.md`) is candid:

- shared philosophy: "Markdown is data, components are declared in plain text"; both reject MDX's
  "compiling content into code";
- **"Schema validation of tags: No, components validate their own props"**; "Comark has no schema
  layer"; "A schema layer like Markdoc's is not currently provided"; "For large documentation teams
  that need to enforce content structure editorially, Markdoc's validation layer is a genuine
  advantage";
- variables: bindings via `:prop` and `{{ path }}`; partials "handled in application code";
- syntax lineage: the CommonMark generic directives proposal, and five years of MDC.

**What Comark is, from its docs:**

- **Document:** `{ frontmatter, meta, nodes }`, nodes as tuples `[tag, attributes, ...children]`,
  strings for text; HTML-like tag names (`h1`, `p`, `ul`, `img`), components by name; an optional
  `$` field with parser metadata. Serialisable: parse on the server, render anywhere.
- **Syntax:** block `::name{…}…::`, nesting with more colons, inline `:name[content]{…}`, attributes
  `{prop="v" bool #id .class}`, JSON values via `:prop='…'`, YAML props blocks inside a component
  (`---` or a `yaml [props]` fence) with real types, named slots `#name` (parsed into
  `['template', { name }, …]`).
- **Plugins:** `pre(state)` on the raw string and **`post(state)` on the built tree**, typed
  contributions to `meta`; markdown-it plugins accepted; a `visit()` AST utility.
- **Data binding:** `:prop` values are JSON, or dot paths into `frontmatter`, `meta`, `data`,
  `props` (paths, not arbitrary JavaScript); `{{ path }}` interpolation; conditionals as an
  `::if{:value="…" gte="18"}` component with an `#else` slot.
- **Security plugin:** blocks event handlers, dangerous attributes and protocols, tag allow and
  block lists, image and link prefixes.
- **Renderers:** Vue (with a Nuxt module), React (Next, Server Components), Svelte, Angular, HTML,
  ANSI; a `components` map; React gets named slots as `slot{Name}` props, Vue as named slots; a
  `transformNode` hook to change an element's tag or props at render time; examples for Astro (with
  the React renderer and content collections), Next, Nuxt, SvelteKit, VitePress.
- **Round trip:** `renderMarkdown(document)` serialises a tree back to Comark Markdown.
- **Streaming:** `autoCloseMarkdown` completes unfinished syntax for AI output.
- **Source positions:** limited; the `$` field carries a line for some nodes, not ranges.

**Spike results** (running `comark@0.9.2`):

1. **Refrakt's hero content parses with everything a content model needs.**
   `::hero{align="start"}` with image, `---`, eyebrow, heading, blurb and list became
   `["hero",{"align":"start"},["p",{},["img",…]],["hr",{}],["p",{},"New in 2.0"],["h1",…],["p",…],["ul",…]]`.
   Matchers map directly: heading → `h1`–`h6`, paragraph → `p`, list → `ul`/`ol`, image → `img`
   inside `p` (as refrakt's `imageInParagraph`), `hr` → the delimiter, a component → its name.
2. **Indented nested components parse** (`:::card` indented inside `::grid`).
3. **Markdoc syntax is not understood, and its tag lines vanish silently**: `{% hint type="note" %}
   Hello {% /hint %}` parsed to `["p",{},"\nHello\n"]`. Moving Markdoc content needs a conversion.
4. **Named slots** parse to `template` nodes, and `renderMarkdown` writes them back.
5. **A Marquise content model fits as a `post` plugin.** A toy `hero` plugin (about 20 lines)
   turned the inferred fields into Comark's explicit form: props `eyebrow="New in 2.0"` and
   `:actions='[{"label":"Get started","href":"/docs"},…]'`, slots `#media`, `#headline`, `#blurb`.
   `renderMarkdown` printed it as valid explicit Comark. Any Comark renderer then hands a component
   typed props and named slots, so **on Comark, Marquise would need no renderers of its own**: its
   output is Comark's explicit form.

**Questions this settles or sharpens:**

| Question | Markdoc | Comark |
|---|---|---|
| Does Marquise's niche exist? | partly: Markdoc validates attributes and children, but has no content models | **clearly**: Comark says it has no schema layer; content models, shapes, validation and types are exactly what is missing |
| Renderers | Marquise builds and maintains its own (react, vue, svelte, html) | **already exist**, more of them (Angular, ANSI), with streaming |
| Logic in content | `if`, variables, functions, partials | dot-path bindings and an `if` component; no arbitrary code, which suits the trust boundary (Z3) |
| Source positions | line ranges on nodes | limited; matters for `source()` (SPEC-198), the editor and the write path |
| Write path (Z5) | a formatter exists in Markdoc (from memory; to confirm) | `renderMarkdown` round-trips trees |
| Ecosystems | Astro's official integration | Nuxt (MDC's successor), with examples for Astro, Next, SvelteKit, VitePress |
| Refrakt's content | native | needs conversion; Markdoc logic does not convert |

**Options:**

- **A. Markdoc first** (the current plan), Comark later as a second front end.
- **B. Comark first:** Marquise is the typed content-model layer as a Comark plugin, plus tooling
  (validation, types, language server, kits); no Marquise renderers. Refrakt stays on Markdoc as
  the lab, or migrates later.
- **C. Both from day one**, with Marquise's renderers for Markdoc and Comark's for Comark: two front
  ends and two rendering paths, the scope growth to avoid.

**Leaning:** none recorded yet. B is attractive for Marquise's stated goals (stable, small, the
framework renderers already exist, the AI-streaming audience, a natural fit for a Nuxt UI kit),
with its costs: Astro's official Markdoc integration matters less (Comark runs in Astro through its
React renderer), Markdoc's logic and positions are given up, refrakt's content is Markdoc, and
Comark is younger and moving fast.

**To settle before choosing:**

- talk to Comark's maintainers: interest in a schema layer built on Comark, plugin API stability,
  plans for source positions;
- ~~a deeper B spike~~ *done 2026-11-13* (below);
- check Markdoc's formatter and position support, so A is weighed on the same terms.

#### The deeper B spike (2026-11-13)

`spike/marquise-comark/` (`FINDINGS.md` there has the details and how to run it). About 550 lines.

**Works:**

- **Refrakt's resolver runs unchanged** on Comark's tree through an adapter of about 100 lines
  (Comark tuples to Markdoc-shaped nodes and back); the spike imports the real
  `packages/runes/src/lib/resolver.ts`.
- **Shapes declared as files drive one generic Comark `post` plugin**; nothing is written per
  shape.
- **Its output is Comark's explicit form:** props (`align`, `mediaPosition`, `eyebrow`, `:actions`
  as JSON) and named slots (`#media`, `#headline`, `#blurb`, `#actions`); `renderMarkdown` prints
  valid Comark.
- **SPEC-200 works on this path:** `as: text` became a string prop, `as: inline` a slot of inline
  content, `from` filled each `href`.
- **Explicit slots mix with inference** (Z1b): an author's `#headline` filled the field directly.
- **Findings with lines:** `attribute-type-invalid`, `attribute-unknown`, `content-missing`,
  `content-unmatched`, `field-text-formatting-dropped` at `content/broken.md:3`.
- **Generated React prop types** follow Comark's conventions (`slotHeadline: ReactNode`, unions
  from `matches`, item arrays).
- **`@comark/react` renders** the bound component with typed props, and the plain presentation for
  an unbound shape.
- **Streaming:** with `autoClose`, slots and props fill in as content arrives.

**Gaps:**

1. an unregistered component loses its content in Comark (a bare `<hero>` element, slots gone,
   `[object Object]` attributes), so the plain presentation and `shape-unbound` are necessary;
2. positions exist only for components and only in the markdown-it tokens (`mdc_block_open` line
   maps); finer positions need a token-to-node mapping or positions in Comark's tree;
3. Comark props are JSON and renderables travel only as slots, so SPEC-200 D10's per-item
   `content` became one slot holding the whole list beside the data prop;
4. validation needs a streaming mode: a body not yet arrived was reported as `content-missing`;
5. printing the resolved tree rewrites the author's file into the explicit form, so a write path
   must edit the source form;
6. prop types are per renderer (React's `slot{Name}` props, Vue's named slots).

**Not tested:** Vue, Svelte and Angular renderers, the Nuxt module, nested shapes, performance, a
language server on Comark syntax, Markdoc logic on this path.

**What it settles:** option B is technically sound, and it keeps refrakt's resolver rather than
replacing it. What remains open is not feasibility but direction: Comark's maturity and pace,
positions (gap 2), and the conversation with its maintainers.

#### Markdoc through Comark's renderers (2026-11-13)

Also in `spike/marquise-comark/` (`npm run markdoc`). **Markdoc content can use Comark's renderers:**
Comark's docs call its document "the shared boundary between parsing and rendering", and its
renderers draw a document without running its parser. Shapes become Markdoc tag schemas whose
`transform` runs the same resolver on Markdoc's AST and returns Comark's explicit form; Markdoc's
renderable tree (`Tag { name, attributes, children }`) converts to Comark's tuples in about 15
lines. The same `Hero` component and plain `callout` rendered `content/home.mdoc` exactly as they
rendered the Comark version, with `{% $user.name %}` resolved.

That makes **two front ends, one tree, one set of renderers** plausible: Comark's document as
Marquise's tree (Z1's "own tree"), Comark's renderers, and Markdoc or Comark syntax in front. The
costly part (renderers) is shared and maintained by Comark; refrakt (Markdoc) and Marquise stay on
one tree, so graduation and the ladder survive. Caveats: Comark's document format becomes a
contract Marquise depends on, and Comark is pre-1.0; Comark features that run while parsing
(markdown-it plugins: highlighting, table of contents) do not reach Markdoc content; writing back
(`renderMarkdown`) produces Comark syntax; typed props use Comark's `:`-prefixed JSON.

**If Comark were chosen, the plan otherwise mostly stands.** Unchanged: shapes, content models,
SPEC-200, validation, types, tooling, dimensions, presets, kits, schema, data, the trust boundary,
the stability rules. Changed: the syntax of examples (`::example{#id}`); the shape node becomes a
Comark component node in explicit form (dimensions need a convention, such as one `:dimensions`
prop); renderers become Comark's plus Marquise's plain presentation, bindings and per-renderer types;
`node` middleware maps onto Comark's `transformNode`, `render` middleware onto wrapper components;
lookups become inline components; `include` and `data` become plugins running before Marquise's;
positions get harder (gaps 2, 5); `@astrojs/markdoc` matters less; a Nuxt UI kit gets more natural;
streaming, the security plugin and more renderers come free.

#### Functions and variables (2026-11-13)

**What refrakt's content uses** (counted in `site/content`): variables are almost all loop variables
bound by row templates (`$row` 93, `$item` 29; `$page` 4, `$frontmatter` 2, build info 3); `if`
appears 42 times, many inside code examples, the real ones mostly `{% if $row.required %}` in
data-row templates; functions are formatting and comparison (`humanize` 4, `date` 3, `equals` 2,
`currency` 2, `number`, `join`; registered in `packages/runes/src/functions.ts`). So in refrakt
they serve **data-driven templating, not prose**.

**What Comark has:** `{{ path }}` interpolation and `:prop="path"`, dot paths into `frontmatter`,
`meta`, `data` (the renderer's runtime values) and `props` (the enclosing component's), never
arbitrary JavaScript; conditionals as `::if{:value="…" neq="guest"}` with comparison props and an
`#else` slot; **no functions**. Markdoc resolves variables while transforming, so values are baked
into the output; Comark resolves them **while rendering**, so the tree stays generic.

**Do we need functions?**

| Where | Needed? | How |
|---|---|---|
| Content written by authors | no general functions; authors should not compute, and the trust boundary (Z3) is simpler | formatting moves to components (`:date{:value="row.published"}`, or a typed prop formatted with the locale the component knows); comparisons are `if`'s props |
| Shape definitions (`computes`, SPEC-195) | yes, Marquise's own expression vocabulary in shape files | independent of Markdoc or Comark: it never appears in content syntax |
| Row templates (`@marquise-md/data`) and later templates (`@marquise-md/compose`) | loop variables and formatting, yes | Comark's binding covers loop variables (`row` passed as data); formatting through components; `if` with comparison props covers `$row.required` |

**Variables, by effect:**

- values that only display (`{{ user.name }}`, a version, a row's title) resolve **at render time**,
  as Comark does: the tree stays cacheable and personalisation works per request (the same choice as
  for lookups, H1–H3);
- values that change structure (an `if` around content inside a shape) must resolve **before the
  content model**. The spike showed the gap on Markdoc: without evaluating `if` first, `if`-wrapped
  actions disappeared silently. It is worse on Comark, whose `if` is evaluated at render time.

**Conditionals inside shapes, leaning:** conditionals outside shapes are free and resolve at render
time; inside a shape they are evaluated at transform time with host values (the `values` callback),
and an error is reported if a value is not available then (`conditional-in-shape`). Refrakt needs
the same check: its rune content appears to drop `if`-wrapped content silently today (only templates
handle `if`, SPEC-145 D30).

**For the Markdoc-or-Comark choice,** neither syntax's logic is decisive: definitions use Marquise's
own expressions, content barely needs logic, and row templates can be covered by either. What is
left is positions, maturity and which ecosystem matters more.

#### Explicit slots (2026-11-13)

Comark's named slots (`#title`) overlap with what Marquise's content models infer. **Keep them, as
the explicit form of what inference does.** Marquise's output already is explicit slots (the spike
turned inferred fields into `#media`, `#headline`, `#blurb`), so inference is the friendly surface
and explicit slots are what it compiles to, and the way to say it directly.

**Where explicit slots earn their place:**

1. **disambiguation:** an author wants a blurb but no eyebrow and writes it before the heading;
   inference would make it the eyebrow, `#blurb` says it outright;
2. **an unexpected order:** inference follows the model's sequence; a slot places a field anywhere;
3. **parts that cannot be inferred reliably** (a free-form footer region); such fields could be
   explicit-only;
4. **existing content and components:** MDC content and Nuxt UI's prose components already use
   slots; that content validates against shapes as written, so migration is gradual;
5. **machines writing content:** an editor, an AI or a codemod writing explicit form is unambiguous
   and survives round trips; streamed output is sturdier when each part announces itself.

**Rules:**

- a slot name must be a declared field, otherwise `slot-unknown` (catches `#headlin`);
- `#default` means "infer the rest": explicit slots fill their fields, default content goes through
  the content model for the remaining ones (as the spike did with `content/explicit.md`);
- explicit content is validated by what the field delivers (SPEC-200): for `inline` and `text`
  fields any single paragraph or heading is fine, since the element is declared meaningless; for
  `block` fields it must match the field's `match`, otherwise `slot-content-mismatch`;
- a field filled both explicitly and by inference is `slot-filled-twice`;
- neither form is canonical in source: `marquise format` never rewrites one into the other; the
  language server offers both directions as quick fixes.

**In the docs,** lead with inference ("your Markdown already has structure"), and present slots as
being explicit when you need to.

**On the Markdoc side,** the front end needs explicit slots too. Markdoc has, from memory, an
experimental slot syntax (its AST nodes carry a `slots` property); to confirm, with a
Marquise-provided tag as the fallback.

*Tested 2026-11-15* (`spike/marquise-comark/`, `npm run slots`; Comark 0.9.2, Markdoc 0.5.10):

- **Slot markers and delimited zones.** Comark parsed `#media` and `#content` as named `template`
  nodes; the meaning is Marquise's. Two levels: a **field marker** (`#headline`) fills a field, and
  since field names are unique across zones it implies its zone, so `---` is not needed when every part
  is explicit; a **zone marker** (`#content`) marks a whole zone whose content is inferred by that
  zone's own model. Zone and field names share one namespace, except a zone whose only field has its
  name (hero's `media`), where both mean the same. Content outside any marker, or under `#default`, is
  matched against the zones not already filled, in order, so `---` is optional whenever the result is
  unambiguous.
- **Edge case:** Comark reads `---` at the very start of a component as a YAML props block's opening.
  Followed by a blank line it parsed as a delimiter, but `key: value` lines straight after it could be
  read as props; validation could warn when a delimited shape's first zone is empty and suggest a zone
  marker.
- **Markdoc has native slots:** `{% slot "headline" %}…{% /slot %}` inside a tag, with
  `Markdoc.parse(source, { slots: true })`, lands in the node's `slots`, the rest staying in its
  children (answers Z1h). Each front end maps its native form (Comark `#name`, Markdoc `{% slot %}`)
  onto the same tree. A `#name` shim over Markdoc is possible but unwise: `#headline` and the line after
  it became one paragraph, so it would mean splitting paragraphs, colliding with hashtags, and showing
  as text in Markdoc's tooling.
- **The overlap with templates.** Turning Markdoc's slots on does not break refrakt's templates: only
  `slot` tags with a primary argument are captured, and refrakt's 21 template uses are all the named
  form (`{% slot name="eyebrow" /%}`), which stayed in place with slots on. But the same tag would mean
  opposite things: in a template, `{% slot name="x" /%}` **places** a field; in content,
  `{% slot "x" %}` **fills** one, told apart only by the argument's form. In the Markdown world both
  syntaxes say a slot is filling (Markdoc's `slot`; Comark's docs call `#name` "slots"); only framework
  components (`<slot>` in Vue or Svelte) use it for placement. *Leaning:* rename the template's
  placement tag (for example `{% place "headline" /%}`), a codemod over refrakt's 21 uses and the specs
  showing it; until then, validation rejects the primary form in templates and the named form in
  content.

#### Compositions (2026-11-13)

**Three kinds of composition:**

| Kind | Who | Where | Example |
|---|---|---|---|
| Nesting in content | content authors | the page | a `::grid` of `::card`s; a `::hero` containing `::actions` |
| Template composition (`@marquise-md/compose`) | whoever defines shapes, often not a developer (a site owner, a content designer, a kit author) | a shape's definition file | a `pricing-plan` whose template places `section`, `price` and `feature-list` |
| Component composition | developers | framework code | a React `PricingPlan` rendering `<Section>`, `<Price>`, `<FeatureList>` |

Nesting works on Comark natively, and Marquise resolves nested shapes like any field. Template
composition is a new shape built from existing ones, in Markdown instead of code.

**Why template composition, when components can compose themselves:**

1. no code: someone who cannot write React can still define a shape from existing ones;
2. **it works with every framework and kit at once:** a composed `pricing-plan` renders through
   whatever the active kit provides for its parts; a component-composed one exists in one framework,
   and every kit needs its own copy. The strongest argument, and it grows with kits: a kit supplies
   the parts, compositions build richer shapes without another component;
3. themes rearrange it by overriding the template, without touching content or the definition
   (ADR-045, ADR-048);
4. tooling sees inside it: contracts, structured data, the editor and validation see the parts; a
   component's internals are opaque;
5. content stays portable.

Many teams will just write a component, which is fine; that is why `@marquise-md/compose` comes after
1.0, and compositions matter most once kits exist.

**On Comark** it works the same way, arguably more simply: expansion happens in Marquise's plugin on
Comark's tree (plain data); on Markdoc, on the AST before the transform. The output is the same
explicit Comark nodes. Order: expand the template, then resolve the content models of the shapes it
placed, then render each through its own component. A template is in effect a pre-written explicit
composition filled with the outer shape's fields, so inference, explicit slots and templates all end
in the same form. On Comark a template would naturally use Comark syntax and binding:

```mdc
::section{:align="attrs.align"}
:slot{name="eyebrow"}
:slot{name="headline"}

::actions
:slot{name="actions"}
::
::
```

**Template syntax, and the cost of two syntaxes** (*added 2026-11-13*). A first thought was that a
project picks one syntax up front, shapes conform to it, and sharing shapes across projects needs a
migration CLI. But both front ends produce the same tree, and expansion works on trees, so a
template written in Markdoc can be loaded into a Comark project as is, parsed by its own syntax
(known from its extension or frontmatter). **If Marquise ships both parsers, sharing is free; if it
ships one, sharing across syntaxes needs a migration CLI.** The extension can also decide the syntax
per file (`.md` for Comark, `.mdoc` for Markdoc, as Astro does), so a project can migrate gradually.

What a second syntax costs:

| Piece | Cost per syntax | Notes |
|---|---|---|
| Parser front end | small: about 100–300 lines | the spike: Comark ~300 (adapter, plugin), Markdoc ~100 (tag schemas, converter) |
| Resolver, validation, shapes, types, plain presentation, renderers | none | shared: everything after parsing sees one tree |
| Explicit slots | small | native in Comark; Markdoc's experimental syntax or a Marquise tag |
| Conditionals and variables | medium | different semantics and timing need equivalent behaviour and tests |
| Source positions | medium | native in Markdoc; token mapping in Comark (gap 2) |
| Formatter | medium | refrakt's is Markdoc's; Comark's `renderMarkdown` normalises |
| Language server | large | completions, hovers and diagnostics depend on recognising each syntax; refrakt's is Markdoc-only |
| Docs and examples | large, ongoing | every example twice, or tabbed |
| Tests | medium, ongoing | every feature against both |
| Migration CLI | medium | needed anyway if one syntax is dropped; tags convert mechanically, Markdoc's logic only partly |

**The runtime is cheap; tooling and docs are expensive.** Options:

1. one syntax plus a one-way migration CLI: cheapest; loses one ecosystem's users;
2. **a primary syntax with full tooling, the other accepted as input** (parsed, validated, rendered;
   no language server, formatter or docs of its own beyond one page), a migration CLI into the
   primary, shapes and templates shared freely: moderate cost, the runtime already proven;
3. both equal: only if both ecosystems prove to matter equally after 1.0.

*Leaning: option 2*, choosing the primary now and raising the secondary only on real demand. It keeps
the ladder between refrakt (Markdoc) and Marquise whichever is primary, and is reversible. Which is
primary depends on the conversation with Comark's maintainers and on whether Astro's Markdoc users
or the Nuxt and Comark ecosystem matter more.


**Z2. Content outlives shapes.** Content lives for years; shapes change (a field renamed, a content
model reorganised, a value retired). Vocabulary versioning covers dimensions, not shapes changing
under existing content. Shapes carry a version, and a breaking change ships with a content
migration that rewrites Markdown mechanically, run with something like `marquise migrate`. Refrakt
has thought about this (SPEC-189: a migration as a composition; codemods); for third-party shape
libraries, migrations must be a published part of a release.

*Explored 2026-11-13.*

**What refrakt learned** (SPEC-189, draft, "Why"): every codemod was hand-written and alike
(`refrakt migrate` has three: `elevation` value renames, `hero` `align="left/right"` to `start/end`,
`cta` renaming `call-to-action`); the runtime side repeats the same facts (a rename written as a
codemod, again as a runtime alias through `DeprecationRule`, and a third time as a warning, or
never); and "removed in a future minor" never happens (aliases from v0.20 and v0.23 still there at
v0.48). SPEC-189's answer: **one migration file, four uses.** Its frontmatter describes the old form,
its body is a template in the new form, and one expansion gives runtime acceptance (old content keeps
building), a codemod (the new form written back), a warning per instance, and an expiry (a test fails
once the migration outlives `removeAfter`). Renames and value maps are frontmatter only.

**Adapted for Marquise** (*leaning*):

1. **Two levels**, to fit the 1.0 scope: frontmatter-only migrations (renaming an attribute or field,
   mapping values) need no template language and can ship with 1.0; structural migrations need a
   template body and wait for `@marquise-md/compose`, with a small API for hand-written ones meanwhile.
2. **Shape libraries and kits ship their own migrations.** A breaking change is a major version of the
   library, with its migrations in the package. A site upgrades, keeps building with warnings, runs
   `marquise migrate`. `removeAfter` counts the library's own versions.
3. **No version stamps in content.** A migration applies when content matches the old form and not
   the new one (SPEC-189 D6), so content stays clean and content of unknown age still migrates.
4. **Dimension aliases are migrations.** `aliases` with `deprecated: true` (section 6) are
   attribute-value migrations under another name: one mechanism, one warning, codemod and expiry.
5. **Examples double as migration tests:** old example in, new example out (SPEC-197).

**Breaking, for content and for components separately:**

| Change | Breaks content? | Breaks components? |
|---|---|---|
| New optional field or attribute | no | no |
| Field or attribute renamed or removed | yes (migration) | yes (prop renamed) |
| Allowed values narrowed | yes | the type narrows, usually fine |
| Optional field made required | yes | the type changes |
| Content model reordered | maybe | no |
| A field's `as` changed (`block` to `text`) | no | yes: a slot becomes a string prop |
| New allowed value | no | maybe: an exhaustive `switch` misses it |

Migrations fix content; component breaks show up as TypeScript errors from the generated types.
**`marquise diff`** would compare two versions of a shape library and classify every change as
additive, content-breaking or prop-breaking, so an author knows whether a release is major and which
migrations it needs.

**The tie to Z1:** the codemod must write only what changed (SPEC-189 D7), which needs positions.
Markdoc has them; Comark has component lines (enough for attribute changes) but no ranges inside a
component, and `renderMarkdown` rewrites formatting (spike gap 5). Structural codemods are harder on
Comark today: one more reason positions belong in the conversation with its maintainers.

**Z3. The trust boundary.** "Content cannot run code" is a core argument against MDX, especially
with non-developer or AI authors, and only holds if every extension point respects it:

- content is untrusted: it may call registered functions and directives, never define code; raw
  HTML in content is off by default;
- directives reading files are bounded to declared roots; remote data needs an explicit allowlist;
- kits and shape libraries are code, trusted like any npm dependency, said plainly;
- escaping (`html.raw`, templating-library output, R2) is where the guarantee can quietly break.

State the boundary as a guarantee, and test it: hostile content (script tags, `javascript:` links,
attribute injection) through every renderer, none of it executing.

*Explored 2026-11-13.*

**Measured** (`spike/marquise-comark/`, `npm run hostile`; Comark 0.9.2, default settings):

| Input | Without Comark's security plugin | With it, default options |
|---|---|---|
| `<script>alert(…)</script>` | passes through both renderers; React's server output contains the tag verbatim, so it runs on load | still passes through |
| `<img onerror="alert(…)">` | the HTML renderer keeps `onerror`; React drops it with a warning | removed |
| `[click me](javascript:alert(…))` | not made a link (markdown-it refuses `javascript:` links) | same |
| a `javascript:` link in a hero's actions | same: no link, so the extracted `href` is empty | same |

Comark parses raw HTML by default, and its security plugin is a toolkit, not a policy: its documented
defaults are `blockedTags: []` and `allowedProtocols: ['*']`. Markdoc does not parse raw HTML, so it is
safer by default. Refrakt adds raw HTML only for specific runes (`sandbox`), under its security policy:
`trusted` by default, `strict` for hosted products (`packages/types/src/security.ts`).

**Proposal** (*leaning*):

1. **The boundary.** Trusted, treated as code and reviewed: shapes, kits, components, bindings,
   config, and the host values the host chooses to expose. Untrusted: content (authors, AI output, CMS
   entries, streamed text) and data files read by directives. Bindings such as `data.user` reach
   whatever the host passes, so the host passes only what content may see.
2. **Default to untrusted**, the reverse of refrakt's default, because of Marquise's audience
   (non-developers, AI, runtime content); `trusted` is an explicit opt-in for single-author sites.
3. **In untrusted mode Marquise configures the parser strictly:** raw HTML off, or a short allowlist;
   Comark's security plugin blocking `script`, `iframe`, `object`, `embed`, `style`, `link`, `base` and
   `meta`, allowing only `http`, `https`, `mailto`, `tel` and relative URLs, stripping event handlers.
   On the Markdoc path HTML is not parsed, and Marquise applies the same URL rules itself.
4. **Guarantees Marquise adds because it knows the shapes:**
   - only declared attributes reach a component: Comark passes any attribute through, so content could
     otherwise try `style` or `onClick`; `attribute-unknown` closes that for every shape;
   - typed attributes and fields: `type: url` is checked against the protocol allowlist, and so are
     values extracted from content (`extract: href`); React blocks `javascript:` links itself, but not
     every renderer does, and the HTML renderer does not;
   - bindings take dot paths only, refusing `__proto__`, `constructor` and `prototype`;
   - directives read only under declared roots, and fetch nothing remote unless allowlisted;
   - capabilities: a shape or directive that needs trust (raw HTML, a sandbox, remote data) declares
     `requires: trusted` and is disabled with a finding in untrusted mode, generalising refrakt's
     sandbox policy;
   - limits for runtime content (size, nesting depth, item count): content-model patterns are trusted
     but run on untrusted text, and a badly written one could be made very slow;
   - `@marquise-md/schema` escapes `<` in JSON-LD, so a title containing `</script>` cannot break out.
5. **Tested:** a hostile-content fixture through every renderer, in both modes; `marquise check` runs
   it through a kit's bindings too.

**Z4. Links, and the document itself.**

- `[Pricing](./pricing.md)` must become a site URL, and only the host knows its routes: a
  `resolveLink(href, ctx)` callback beside `resolveAsset`. Checking for broken links needs the
  corpus; rewriting them does not.
- Frontmatter is typed by content collections today (Astro uses schemas). A document's body could
  have a shape too ("an article starts with a heading, then a summary paragraph"); refrakt's plan
  entities are a shape wrapping a whole file. A **document shape** is a natural extension; decide
  whether Marquise or the content layer owns frontmatter.

*Explored 2026-11-13.* Refrakt's precedents: its loader maps files to routes (`<path>.md` and
`<path>/index.md` both resolve, `packages/content/src/edges/index.ts:122`); entity references go
through `ref` and `xref`; one fixed set of frontmatter fields serves every page (title, description,
slug, draft…, `site/content/_data/frontmatter-fields.json`); plan entities wrap a whole file in a
tag (`{% work … %}`).

**Links.** Four kinds appear in content:

| Kind | Example | Who resolves it |
|---|---|---|
| Absolute URL | `https://…` | nobody; checked against the protocol allowlist (Z3) |
| Site route | `/docs/install` | the host (whether it exists) |
| Relative file link | `[Pricing](./pricing.md)`, `../guide.mdoc#setup` | the host, which maps files to URLs |
| Entity reference | `{% ref "SPEC-1" %}` | the corpus layer (section 3) |

*Leaning:* a `resolveLink(href, ctx)` callback beside `resolveAsset`, at transform time.

- the host maps files to URLs (Astro its collection entries, Nuxt Content its paths) and returns the
  URL or reports the target missing: `link-unresolved`, broken-link checking without a corpus;
- anchors within the same document Marquise checks itself, knowing the document's heading ids:
  `link-anchor-missing`; anchors in other documents need the host;
- links inside shapes go through it too: an extracted `href` and any `type: url` attribute, so
  `- [Pricing](./pricing.md)` reaches a component as `/pricing` (item extraction must use the
  resolved link);
- included content resolves relative to its own file, not the including page (SPEC-197 D5);
- with no host, links stay unchanged, so Marquise works standalone.

**The document itself.** Frontmatter: where the host has schemas (Astro's content collections),
Marquise defers to them; where it does not (Next, plain projects), a document shape can declare
frontmatter; if both exist, one is generated from the other rather than both written by hand.

A **document shape** is a shape for a whole document:

```md
---
description: A blog article
frontmatter:
  title:  { type: string }
  date:   { type: date, required: true }
content:
  type: sequence
  fields:
    headline: { match: heading:1, as: inline, fills: { title: $text } }
    summary:  { match: paragraph, as: inline }
    body:     { match: any, greedy: true }
---
```

- validation of the whole page ("an article starts with a heading, then a summary paragraph");
- typed page components: a blog layout bound to `article` receives `title`, `slotSummary`, `slotBody`
  with generated types, where a layout today gets untyped content;
- refrakt's "title falls back to the first heading" becomes declarative through `fills` (SPEC-182 D2);
- plan entities lose their wrapper tag: attributes in frontmatter, the body the document shape;
- structured data per page (an `Article` row) from the same place as every shape's.

On Comark a document is `{ frontmatter, nodes }`; a document shape treats the nodes as the children of
an invisible root shape, resolved by the Marquise plugin and rendered through a component in the
components map. On Markdoc, the same on the document's root node. A document gets its shape from
frontmatter (`shape: article`) or a host mapping by folder or collection, probably both with
frontmatter winning.

**Documents and dimensions** (*explored 2026-11-14*). Refrakt already does this for one dimension:
its frontmatter `tint` is "named tint preset for this page, or for the whole subtree when set in a
`_layout.md`", with `tint-mode` and `tint-lock` beside it, and `type` registers a page as an entity,
a document shape in all but name.

- **Frontmatter is a document's attributes.** Whatever works on a tag's attributes works on
  frontmatter: validation, defaults, generated types for the page component, and dimensions.

  ```md
  ---
  shape: article
  title: Shipping docs your team will read
  date: 2026-11-14
  tint: ocean
  density: comfortable
  ---
  ```

- **Documents are a dimension target.** `appliesTo` gains documents: `appliesTo: all` covers shapes
  and documents; `appliesTo: { documents: true }` is document-only. Two kinds: dimensions for both
  (`tint`, `density`), setting a page-wide value on a document; and document-only ones (a page layout
  variant, a reading register for the whole page, refrakt's `tint-mode` and `tint-lock`).

  ```yaml
  # dimensions/page-layout.md
  dimension: page-layout
  appliesTo: { documents: true }
  values:
    article: { description: "A single readable column" }
    docs:    { description: "Content beside navigation" }
    landing: { description: "Full-width sections" }
  ```

- **Inheritance flows from the page into its shapes.** With `inherit: true`, a document's
  `tint: ocean` is the default for every shape on the page unless a shape sets its own; refrakt's
  tint cascade, generalised. Marquise resolves it into each shape node, so a component library gets
  `tint: 'ocean'` as a prop with no CSS cascade; a CSS theme can still cascade from the root.

  ```
  host default for the folder or collection    (blog/ is "warm")
    └ document frontmatter                      (this article is "ocean")
        └ a shape on the page                    (inherits "ocean")
            └ a shape with its own value         (tint="neutral" wins for itself and its children)
  ```

- **The folder or collection level is the host's.** Marquise works on one document at a time, so
  the host supplies document defaults (an Astro collection, a Nuxt Content path); refrakt's
  `_layout.md` becomes its implementation of that hook.

- **Precedence** (*leaning*): (1) a value on the shape itself; (2) on an enclosing shape; (3) the
  document's frontmatter; (4) the host's default for the folder or collection; (5) the shape's own
  `defaults`; (6) the dimension's `default`. In words: anything an author wrote, anywhere above,
  beats a designer's default; a page with `tint: ocean` makes its hero ocean despite the hero's
  defaults. A shape that should never inherit a dimension opts out (`dimensions: { exclude: [tint] }`),
  as a code block keeping its own colours would.

- **The page component** (often the layout in simple projects) receives frontmatter as typed props,
  resolved dimensions, and fields as slots:

  ```ts
  export interface ArticleProps {
    title: string;
    date: string;
    tint?: string;
    density: 'compact' | 'comfortable' | 'airy';
    pageLayout: 'article' | 'docs' | 'landing';
    slotSummary?: ReactNode;
    slotBody: ReactNode;
  }
  ```

  The plain presentation writes them on the document's root:
  `<article data-shape="article" data-tint="ocean" data-density="comfortable">`.

- **Documents as entities.** If a document shape can declare what it registers, as tag shapes can,
  `shape: work` both shapes the page and makes it a `work` entity, one concept for refrakt's `type`
  and the shape.

- **The site layer stays separate.** A document shape types the page's content; the site's chrome
  (navigation, header, footer, regions) stays the site layer's.

**Z5. A published schema, and a write path.** CMS editors (Decap, Tina, Keystatic), AI tools and
form builders need to know what a shape accepts. Export shapes and dimensions as a documented,
machine-readable schema (perhaps close to JSON Schema) as public API, so tools build on it, not on
internals. Tools that change content (an editor, an AI applying a fix, a codemod) need to edit a
document by address ("set the hero's `headline`") and write Markdown back without disturbing
anything else; source positions (W1) make it possible. Everything designed so far only reads.

*Explored 2026-11-13.* Refrakt's precedents: four internal readers of rune metadata (`refrakt
reference`, the editor's rune data in `packages/editor/src/server.ts`, the language server's registry,
the AI prompt), each reading internals its own way; a published JSON Schema for config
(`refrakt.config.schema.json`, the configuration reference generated from it, SPEC-126); and a write
path for one domain, `plan update`, editing with line-by-line regular expressions
(`plugins/plan/src/commands/update.ts`; a checkbox is ticked by finding a line that includes the
criterion's text), the brittle string surgery a general write path should replace.

**Two schemas** (*leaning*):

| View | Describes | For |
|---|---|---|
| Input grammar | what an author may write: attributes with types and values, the content model (fields, `match`, order, optional, repeated, `as`), explicit slot names, applicable dimensions, examples | editors and CMS forms, the language server, AI prompts, `reference` docs |
| Output props | what a component receives once resolved: props, slots, items | type generation, form builders, frontmatter schemas (Z4b), validation elsewhere |

JSON Schema fits the output (props are JSON) and fits the input poorly ("a heading, then an optional
paragraph, then a list of links" is a grammar over Markdown nodes). So Marquise publishes its own
versioned schema document for the input, and JSON Schema for the output, from which others derive
validators (Zod) or form definitions.

- **Contents:** shapes, document shapes with frontmatter, dimensions and presets with where they
  apply, directives' attributes, and the catalogue of finding ids, so an AI or CI knows every
  possible error and its meaning.
- **Delivery:** `marquise schema`, a programmatic API, MCP resources (as refrakt's `refrakt://…`);
  the project's schema merged from its kits and the site's shapes.
- **Marquise's own tools read only the published schema** (language server, type generator, AI
  prompt builder, `reference`), which keeps it complete and replaces refrakt's four readers with one.
- CMS-specific adapters (Decap, Tina, Keystatic configurations) are community or kit projects.

**A write path, by address** (*leaning*). Needed by language-server quick fixes, an AI applying a
fix through an MCP tool, migration codemods (Z2), editors and CMS forms, and refactors (renaming a
shape across content).

- **an address** names a document, a shape instance (by position or `#id`) and a part (an attribute,
  a field, an item);
- **operations:** set an attribute, set a field's content, insert or remove a shape, rename a shape,
  switch between explicit and inferred form, apply a migration;
- **the result is a list of text edits** against a known document version, in the language server
  protocol's form; untouched text stays byte for byte identical (unlike printing the tree back,
  spike gap 5); only the changed part is serialised, with each syntax's own printer;
- **every edit is validated**, and returns its findings, so a fix that creates a new problem is
  caught at once;
- **a missing field is inserted where inference will find it** (the content model knows the order:
  an eyebrow goes before the heading); where the position is ambiguous it **falls back to an
  explicit slot** (`#eyebrow`), so explicit slots are the write path's safety net too;
- **tests:** for every operation, parse, edit, parse again; the tree as expected and every byte
  outside the edit unchanged.

**The tie to Z1:** precise edits need precise positions. Markdoc nodes carry their location; Comark
gives line ranges for components through its tokens, nothing at column level, so changing one
attribute inside `{…}` or one field's span needs more. With validation findings and codemods, the
third item pointing at positions as the main thing to raise with Comark.

**Z6. An inventory of public contracts.** Several things became public API along the way: the
shape node format, finding ids (relied on by AI fix loops and CI), the plain presentation markup
(SPEC-199 decision 3), the binding format and kit manifest, cache keys (what invalidates a cached
shape node). Keep one list in SPEC-199, each with its versioning rule; semver protects only what is
listed.

*Explored 2026-11-13; the list now lives in SPEC-199, "Public contracts".* Grouped by who depends on
it: **content authors** (the syntax and Marquise's conventions, a library's shapes, a design
language's dimensions); **shape and kit authors** (the shape, dimension, preset, kit-manifest,
migration and binding formats; the template language later); **developers** (the shape node, generated
types, host callbacks, middleware, the context API, the lookup node, the registries, each renderer's
component contract); **machines** (finding ids, the published schema documents, edit operations, CLI
commands and JSON output, MCP tools and resources); **browsers, stylesheets and search engines** (the
plain presentation markup, JSON-LD structure); and two behavioural promises (determinism, which also
defines cache keys; the trust boundary). Not contracts: internal module paths, message wording,
dev and editor annotations, finding order, anything refrakt-specific.

**Rules:** semver across Marquise's packages, breaking a listed contract means a major with a codemod
or upgrade guide; formats read by outside tools carry a format version; finding ids are never reused;
markup and output change additively; tightening untrusted mode counts as breaking for content; no
experimental flags. **Enforcement** follows refrakt's committed-and-checked pattern
(`contracts/structures.json`, the structured-data baseline): a public API report diffed per pull
request, snapshots of the finding catalogue, schema formats and plain markup, a JSON-LD baseline, the
hostile-content suite (Z3) and round-trip edit tests (Z5). **Under option B** Marquise also depends on
contracts it does not control (Comark's document format, plugin API and renderer conventions): pin
ranges, run a contract test against Comark on every upgrade, track it as a risk.

**With Z6, the six seams have each been explored once.**

Z1 and Z3 should become explicit points in SPEC-199 when Marquise moves forward: both are cheaper
to get right from the start than to retrofit.

## 17. The content model, with fresh eyes

*Added 2026-11-14.* The content model grew by accretion as needs arrived. Read from
`packages/types/src/content-model.ts` (357 lines) and counted across refrakt's 103 rune and
definition files:

| Feature | Files | Notes |
|---|---|---|
| `sequence` | ~59 | the workhorse |
| `sections` (split by headings) | ~13 | `sectionHeading: 'heading'` auto-detects the level (9 of 14); 5 use a fixed `heading:2` |
| `delimited` (split by a delimiter node, `hr` in practice) | ~8 | named `zones`, or `dynamicZones` with a repeated `zoneModel` |
| `custom` (code) | 12 | budget, conversation, form, nav, tabs, preview, symbol, bento, comparison, feature, map, storyboard; sorted by SPEC-194 D6, with D7's four extensions to replace them |
| conditional models (`when`) | 3 | SPEC-169 D2 later ruled a content model never depends on attribute values |
| `optional`, `greedy` | ~40 | |
| `itemModel`, with `extract`, `pattern`, `prefix` | 7–21 | regular expressions for text |
| `headingExtract` | 2 | text and regular expressions only |
| `emitTag`, `emitAttributes` | 9–10 | turn items or sections into child tags |
| `group`, `position: last`, nested `model` | 4–9 | SPEC-186 |
| `fills` | 1 | SPEC-182 |

The `match` vocabulary is mostly `any` (34), `paragraph` (27), `text` (14), `heading` (11), plus
pipes such as `heading|paragraph|image`.

**Keep the core idea:** match block nodes in order, bind named fields, optional and repeated
fields, split content into groups, read structured values out of items. It has proven itself across
100 runes.

**What to change** (*leaning*):

1. **One matching vocabulary instead of three.** Block fields use `match` strings (`heading:2`,
   `list:ordered`, `tag:card`, pipes); item fields use inline types with `pattern` and `extract`;
   `headingExtract` takes only text and regular expressions (D7.3 already wants the item vocabulary
   there). One vocabulary for block, inline and heading level, and one way to pull values out
   (`extract`, `as`, `from`).
2. **A small set of combinators instead of named patterns.** `delimited` and `sections` are one idea,
   splitting by a marker node, differing in the marker and whether it stays in its group (D7.1
   proposes splitting on any node):

   | Combinator | Today | Means |
   |---|---|---|
   | `sequence` | `sequence` | fields in order |
   | `split` | `delimited`, `sections`, D7.1 | divide by a marker node; named zones or repeated groups; the marker kept or dropped |
   | `choice` | pipes in `match`; `when` | one of several alternatives |
   | `repeat` | `greedy`; D7.4 | many, in order, tagged |
   | `group` | SPEC-186 `group` | several fields matched as one |
   | positions | `position: last`; D7.2 `position: any` | where a field may sit |

   Existing models translate mechanically.
3. **Content models describe input only.** `emitTag` and `emitAttributes` arrange output inside the
   input description; with shape nodes, item records, slots and templates they have no job left in
   Marquise. Refrakt keeps them until its runes convert.
4. **No content models that depend on attribute values** (as SPEC-169 D2 concluded). Variation by
   attribute belongs to templates; where content itself takes different forms, a structural `choice`
   between models replaces `when`, and the generated type is a union.
5. **Plain matching preferred over regular expressions.** `pattern` and `prefix` are opaque to
   editors and to an AI reading the schema, and a slowdown risk on untrusted text (Z3). Most uses are a
   leading dash, a separator or a suffix: literal options for those, regular expressions as the escape
   hatch.
6. **Everything serialisable,** for the published schema (Z5): `custom`'s functions go (as SPEC-194
   plans), patterns become strings.

**What is missing:**

1. **Typed values from content.** "$29", "45 min", "4/5" and "2026-11-14" need `computes` or code
   today. Extending SPEC-200's `as` with value types (`number`, `date`, `duration`, `url`, perhaps
   `money`) gives validation ("price must be a number") and real types (`price: number`): squarely
   the "typed props" pitch.
2. **How many:** `min` and `max` ("at most two actions", "at least two tabs"), for validation and
   types.
3. **Child shapes as data:** `as: data` on a shape match delivers child shapes as resolved props
   (`CardProps[]`), for tabs or an accordion that build their own markup.
4. **Explicit-only fields:** `infer: false` (Z1f).
5. **A policy for leftover content:** an error, a warning, or a catch-all field, declared by the model.
6. **Inline shapes with content models,** in the same vocabulary as item models (a `badge`, a
   citation).
7. **Diagnostics from the grammar:** "expected a heading after the paragraph at line 4, for
   `headline`", and what is allowed next, for completions.

**A sketch:**

```yaml
content:
  split: { by: hr, keep: false }
  zones:
    - name: media
      sequence:
        media: { match: image, optional: true }
    - name: content
      primary: true
      sequence:
        eyebrow:  { match: paragraph, optional: true, as: text }
        headline: { match: heading, as: inline }
        price:    { match: paragraph, optional: true, as: money }
        actions:
          match: list
          optional: true
          max: 2
          items:
            label: { match: link }
            href:  { from: label, extract: href, as: url }
  leftover: warn
```

**Timing:** the shape file format is Marquise's core public contract (Z6), so its surface is much
cheaper to fix before 1.0 than after. The new surface can compile down to the structures refrakt's
resolver understands, with new features added on top; the spike showed that resolver running
unchanged on both syntaxes, and it should stay that way.

### Compact forms instead of `emitTag` (2026-11-14)

**Why `emitTag` exists.** Playlist accepts both forms (`match: 'list|tag:track'`,
`plugins/media/src/tags/playlist.ts:154`): a list item read by an `itemModel` (bold name, link for the
source, italic artist, duration and date from text patterns, nested cue points), then **track nodes
built in code** (`'data-rune': 'track'`, line 254), so a compact item and an explicit `{% track %}`
reach the theme as one thing. Nine more runes do the same through `emitTag`: `accordion`
(accordion-item), `timeline` (timeline-entry), `cast` (cast-member), `itinerary` (itinerary-day,
itinerary-stop), `reveal` (reveal-step), `plot` (beat), and `character`, `faction`, `realm` (their
sections).

**The problem is still valid:** one child entity, two ways to write it (its own tag, or compactly as a
list item or a section), and everything downstream (templates, components, structured data,
registration) should see one thing. What was wrong is where the mechanism lives: in the parent's
content model, emitting tags (output); with the compact syntax defined per parent (a track in a
playlist and in an album would each need their own `emitAttributes` table); producing AST tags, so the
child's own validation and types never apply to compact items.

**The child shape owns its compact forms** (*leaning*). It mirrors inferred versus explicit slots, one
level up:

| | Explicit | Compact |
|---|---|---|
| A part of a shape | `#headline` slot | inferred from plain Markdown |
| A child shape | `::track{…}` or `{% track %}` | a list item or a section, read as a track |

```yaml
# shapes/track.md
attributes:
  name:     { type: string, required: true }
  src:      { type: url }
  artist:   { type: string }
  duration: { type: duration }
content:
  sequence:
    description: { match: paragraph, repeat: true, optional: true }
compact:
  item:                                        # one list item, read as a track
    name:        { match: strong }
    src:         { match: link, extract: href }
    artist:      { match: em, optional: true }
    duration:    { match: text, pattern: "(\\d+:\\d+)", optional: true }
    description: { match: paragraph, repeat: true, optional: true }
```

```yaml
# shapes/playlist.md
content:
  sequence:
    title:  { match: heading, as: inline }
    tracks: { match: track, repeat: true }    # a track tag, or a list whose items read as tracks
```

Meeting `match: track`, the resolver accepts an explicit track tag, or a list whose items it reads
with track's compact form; either way it produces **a track shape node**, resolved, validated against
track's own attributes, rendered by track's component (or delivered as data, `as: data`).

- a compact form's fields must be the shape's own attributes or fields, checked when the shape loads:
  no mapping table, names match by construction;
- compact forms come in a few kinds: `item` (a list item), `section` (a heading and what follows, for
  accordion, timeline or a character's sections), perhaps `paragraph` (a byline);
- a parent may limit which forms it accepts (`forms: [explicit, item]`), never redefine them.

**What it gives:** compact forms defined once and reused (playlist, album, podcast); the child's
validation and types applying to compact items (an unparseable duration gets the same finding either
way); uniform structured data and registration; editor conversions in both directions, like the slot
quick fixes; and content models that describe input only, with `emitTag` and `emitAttributes` gone.

**Two small needs it exposes:** defaults from the parent (playlist falls back to the playlist's artist,
`track.artist ?? artistValue`, so a child attribute defaulting to the enclosing shape's, such as
`defaults: { artist: $parent.artist }`, the attribute counterpart of dimension inheritance); and
position (track and step numbers), through the `$index` templates already use.

## 18. Marquise as a data store

*Added 2026-11-15.* "A schema layer for Markdown" need not mean only a mapping for rendering. A
resolved shape node is plain data before any renderer sees it (the spike's output was a JSON tree;
JSON-LD is already extraction to data), so rendering is one consumer of three:

| Consumer | What it does with typed content | Built on |
|---|---|---|
| Render | draws it with components | the shape node, renderers |
| Extract | turns documents into typed records: JSON, an API, a search index, a feed | the same shape node, serialised |
| Write | creates and changes records by address, keeping the Markdown intact | the write path (Z5) |

Extract plus write is **Markdown as a data store**: readable files, reviewable diffs, git history, no
service to run, and a schema guaranteeing the data's shape.

**Refrakt already proved it with plan:** specs, work items and decisions stored as Markdown, read and
written by a CLI and an MCP server, with status, criteria and dependencies as data. It also shows the
pain without a general mechanism: a bespoke scanner, and writes as line-by-line regular expressions
(Z5). With shapes, a corpus and the write path, something like plan becomes mostly declarations.

**Use cases:** structured records people want to read and write as prose (recipes, product listings,
events, job posts, glossaries, FAQs, changelogs and release notes, runbooks, test cases, decision
records); content as an API, typed JSON per document from a git repository; search indexes and feeds
with real fields (a recipe's `totalTime`, an event's `date`); AI agents reading and writing project
knowledge safely (a schema says what a record must contain, findings say what is wrong, the write path
keeps edits surgical); data-quality gates in CI.

**Where it stands out:** other tools type the frontmatter (content collections, Velite and similar);
Obsidian's Dataview plugin, as remembered, invented inline `key:: value` fields in the body to get
structured data out of notes, suggesting real demand. Marquise types the body itself, with authors
writing natural prose.

**What it changes in the design:**

1. typed values (C1) become essential: a data consumer wants `date: 2026-11-15` and `price: 29`;
2. rich-text fields need a data representation: for a `block` field, its Markdown source (lossless,
   re-renderable; SPEC-198's `source()`), plain text, HTML or the tree, probably Markdown source by
   default;
3. the output schema (Z5) becomes the primary contract for data consumers, not only a source of prop
   types;
4. document shapes (Z4) become central: a document is a record, frontmatter and body fields its
   columns;
5. stable identity matters (record ids, typed references between documents), which revives the
   parked corpus layer: querying across documents is the "database" part;
6. migrations (Z2) matter more: data outlives code longer than presentation does;
7. round-trip writes become critical: one more reason positions matter in the Markdoc-or-Comark
   choice.

**Where to draw the line** (*leaning*): in Marquise core, extraction per document (`marquise extract`,
typed JSON records) and the write path; in the corpus layer, indexing, references and queries across
documents; never indexes, transactions or a query language. Git is the storage, the files are the
truth.

**Positioning:** "Markdown in, typed props out" undersells this; **"Markdown in, typed data out"**
covers rendering and storage in one line, props being one shape typed data takes (SPEC-199 updated
with it as a candidate).

### Write operations (2026-11-15)

Marquise does basic read (extract), write and validation; the database is the next layer (section 3).

| Level | Operations |
|---|---|
| Attribute or dimension | set, unset |
| Field | set, clear; the value's form follows the field's `as` (a string for `text`, inline Markdown for `inline`, Markdown blocks for `block`) |
| Item in a list field | add, remove, move, set one of its values (a track's `duration`) |
| Shape | insert, remove, move, rename, wrap content in a new shape, unwrap |
| Form | inferred to explicit slot and back; compact to explicit child and back |
| Document | create from a shape (scaffold), set frontmatter, apply a migration |

Operations batch atomically per document (all or none); no transactions across documents, which git
covers and which is where "not a database" draws the line.

**Extraction must be reversible.** Typed values need a formatter as well as a parser (a `date` back as
`2026-11-15`, a `duration` as `3:45`, `money` as `$29`), so each value type (C1) is defined in both
directions. Regular-expression extraction generally cannot be reversed (writing a new date into
`— November 2026` needs the surrounding text rebuilt, which a pattern does not say): a much stronger
argument for structured matchers (a literal prefix, separator or suffix) than readability. A field
extracted only by a regular expression is **read-only** to the write path, and the schema says so.
`from` and `extract` are reversible: setting an item's `href` rewrites its link.

**The round-trip rule:** after the edit, resolving the document again gives the new value in the
intended field and every other field unchanged. Inference makes this subtle (setting an eyebrow
inserts a paragraph before the heading, which another optional paragraph field might then claim). An
edit that cannot satisfy the rule in inferred form falls back to an explicit slot (`#eyebrow`), which
always can; if even that fails, it is refused with a finding. The rule is also the test: every
operation on every example in a shape library keeps it.

**Also:** edits target a known version (a content hash), so a stale edit is refused rather than
misapplied; the output is text edits, untouched bytes identical; operations across documents (renaming
a shape everywhere, moving a document and updating links to it) are batches of per-document edits
orchestrated from above, with no cross-document atomicity.

### Writing forms (2026-11-17)

A child shape can be written compactly or explicitly (section 17), a part of a shape inferred or as
an explicit slot. **The address is the same either way** (`playlist.tracks[2].duration`): callers say
what to change; which form gets written is the write path's decision.

1. **An existing item keeps its form** when the new value can be written in it. Explicit is never
   turned into compact automatically, even without loss; the author chose it. Changing form is the
   `convert` operation.
2. **The round-trip rule decides what "can be written" means:** render the item in its form, resolve
   it again, compare. Otherwise fall back, step by step: compact, then explicit with content
   inferred, then explicit with explicit slots, then refused with a finding. A promotion is reported
   in the edit result (`form-promoted`), never silent.
3. **A new item follows its neighbours:** their form, compact if every value fits. With no neighbours,
   compact when everything fits, unless the shape says `prefer: explicit`.
4. **One explicit item in a compact list splits the list** (list, tag, list): fewest bytes touched,
   order confirmed by the round-trip rule (depends on C7). A parent that does not accept mixed forms
   (`forms: [item]`) refuses the edit; converting the whole list is an explicit `convert`.
5. **Callers can choose:** `form: 'auto' | 'compact' | 'explicit'` on each operation, `auto` by
   default.

**Values with no place in a compact form:** a field read only by a regular expression is read-only
(above), so writing it promotes the item; ids, universal attributes and dimensions usually have no
place either, so giving an item an id promotes it (one more reason for declared item keys, section
19). The same rule (keep the form found, new content follows its neighbours, fall back to more
explicit) covers inferred and explicit slots, Markdoc's `#id` shorthand and `id="…"`, and Comark's
YAML props block and inline attributes.

**Compact forms need a write template.** Matchers are enough to read, not to write (a new track's
link has no label to take from anywhere, nor do matchers say how parts are separated). Of three
options (build lines from matcher kinds; a declared template; write by example, copying a neighbour),
a **declared template, checked when the shape loads**: rendered with sample values and resolved, so
a template that does not read back fails at load, not on someone's first edit.

**It belongs in the body,** like examples (SPEC-197): it is Markdown, so it is written as Markdown,
highlighted and formatted, and parsed into a tree rather than matched as a string. A fourth kind of
top-level block beside `template`, `fragment` and `example`:

```
{% form "item" %}
- **{% $name %}**{% if $artist %} *{% $artist %}*{% /if %} [listen]($src)
{% /form %}

{% form "section" %}
## {% $name %}

{% $description %}
{% /form %}
```

**Built-in Markdoc only, no template syntax of its own:** variables for values, `if` for optional
parts, and a `$field` sentinel where Markdown keeps a plain string (link and image destinations, alt
text, link titles), since tags do not parse there (`spike/marquise-comark/`, `npm run forms`). An
output template places rendered nodes (`place`, the renamed placement tag, section 16, Z1); a write
template interpolates source text, which is what variables are, so the two notations differ because
the two things do. A custom syntax was rejected: its brackets and braces compete with Markdown's own
(a `[ … ]` optional part next to a link is ambiguous), and it needs escaping rules, a second parser,
documentation and tooling, twice if there are two front ends. `if` repeats a field's name; an
`optional` shorthand only if real forms prove noisy.

**One template, four uses:** the write path (values through their type's formatter, escaped per
position); snippets and completion (variables become tab stops, `matches` become choices); editor
insertion (placeholder text); the load-time check. Placeholder text and sample values come from the
same examples. **Snippets become generated:** an explicit form's from the schema; a parent's composed
from its own and its children's forms (playlist's with two tracks from track's form), replacing
refrakt's hand-written ones (`plugins/media/src/index.ts:26` already holds a compact track with
placeholders, per parent), now read by VS Code, the language server and the editor's palette.

**The template defines the form** (*leaning*): a variable in `strong` is `match: strong`, an `if`
makes a part optional, `$src` as a link destination is `extract: href`. Frontmatter matchers only
where reading must be more tolerant than writing (several ways to write a duration, another order,
alternative markers). Derived reading is strict, in template order; whether that is tolerant enough
needs trying on refrakt's ten compact-form runes first.

**A shape's own content is the other way round** (2026-11-17). Refrakt's hero
(`plugins/marketing/runes/hero.md`) reads `media` with `match: any`, `body` as `heading|paragraph`,
`actions` as `list|fence`, greedy runs, any heading level, and a `---` that may be left out: the model
is mostly tolerance. Deriving it from a write template would make a shape accept only what it writes,
defeating inference.

| | Compact form, item model | A shape's content |
|---|---|---|
| Size | two to five parts, a line or a section | a whole block with zones |
| Reading | close to one-to-one, a fixed pattern | deliberately loose, many inputs to one record |
| Which is declared | the template; the reader is derived | the content model; the writer is generated |

**The writer is generated from the content model** (*leaning*): walk it in declared order (sequence
order, zone order), write each present field in its matched form, `---` between zones only when both
sides have content, absent optional fields left out. For hero: media, `---` if there was media,
eyebrow, headline, blurb, body, actions with each item written by its item model. Where the model
leaves a choice, a **write hint** on the field rather than a template:

| Choice | Default | Hint |
|---|---|---|
| heading level of an `as: inline` heading | the level found when editing; for a new one, the level in the shape's first example | `write: { level: 1 }` |
| an alternative (`list\|fence`) | the form found; for a new value, the first alternative | the alternatives' order |
| list and emphasis markers | the document's, else `-` and `*` | the formatter's settings |

**Snippets come from the same walk:** required fields as tab stops, placeholder text from examples.
Refrakt's `hero.md` has no snippet; bento's hand-written one (`plugins/marketing/src/index.ts:21`) is
what a sections-model walk would produce.

**Item models are anonymous compact forms:** small, close to one-to-one, declared per field instead
of owned by a child shape. They could take the same template (`{% form "actions" %}- [{% $label %}]($href){% /form %}`),
leaving one mechanism at the bottom: small templates where structure is fixed, generated writing
where it is inferred. A `{% form %}` for a whole shape (a house style) could be an override; left out
until something needs it.

### Integrations (2026-11-17)

**Decided: Marquise builds no integrations.** They are still designed for: each scenario below is a
test that the foundation lets others build things we did not anticipate. Refrakt planned connectors
itself (SPEC-069: `@refrakt-md/sanity` mapping Portable Text to Markdoc pages, Notion, Contentful,
Strapi, Payload, Airtable), one direction, at build time.

One shape has three representations: the **source** (the author's Markdown), the **record** (typed
JSON, `doc.records()`) and the **schema** (the published schema documents). An integration converts
records and schema to and from another system's model; Marquise never talks to that system.

**Schema export,** a shape as another system's type (MongoDB's `$jsonSchema`, Sanity schema types,
Contentful content types, Payload collections, GraphQL, Zod): mechanical and one way, a small exporter
per target on the one published schema. Targets have dialects (Mongo's `$jsonSchema` has no `$ref`),
and value types (C1) map per target (a `date` as a BSON `Date`, as Sanity's `date`).

**Data conversion:** out (Markdown to a store) is `insertMany(doc.records())`, MongoDB storing the
JSON as it is. In (a store to Markdown) needs a writer, which is everything in "Writing forms":
generated writers, templates for compact forms, the round-trip rule and its explicit fallback.

**The hard part is rich text, not structure.** A `block` field is Markdown source by default (M1);
Mongo takes a string, Sanity wants Portable Text, Contentful its rich-text JSON, Notion blocks: a
connector is mostly a rich-text converter. Sanity fits unusually well: Portable Text holds custom
block types inside rich text (`{ _type: 'callout', tone: 'warning' }`), which is a shape nested in a
block field, so writers in git and editors in Sanity Studio could share one vocabulary and one set of
components.

**Sync edits, never regenerates:** a stored record against the current one gives a diff, a batch of
edit operations at addresses, and surgical text edits, keeping the author's formatting, comments and
forms. That needs stable identity, `file#id` plus the address as the foreign key in the store, so
record identity (M3) is a prerequisite for two-way integration; without it, only whole documents can
be replaced. The version hash on edits gives optimistic concurrency per document; merging concurrent
edits is the connector's problem.

**A store as a source, without Markdown:** renderers consume shape nodes, so a Sanity document with
`_type: 'hero'`, validated against the hero shape's output schema, could render through the same
component and bindings. Cheap to allow; the content model stays the product.

**What is lossy:** fields written with conditions or variables (the record is one evaluation; writes
refused with a finding); included content (writes go to the included file, or are refused); content
no field claimed (a finding, or dropped, by the connector's choice); formatting choices, kept only
because sync edits.

**What this asks of the foundation** (the checklist the scenarios give):

- the published schema complete enough to export without reading shape files: value types, keys,
  which fields are read-only (regular expression, conditions, includes), rich-text fields marked;
- records with stable identity and addresses;
- the write path usable from data alone: records in, edit operations out;
- the rich-text representation behind a hook, so a converter swaps Markdown source for its format in
  both directions;
- JSON input validated against the output schema;
- no connector-shaped special cases in core: if one is needed, the foundation is missing something.

| Who | What |
|---|---|
| Marquise | published schema, records, write path, addresses, the rich-text hook, validation of JSON input |
| Third parties | every connector: schema exporters, rich-text converters, sync |
| The corpus layer | collections: identity across documents, references, `extractAll`, syncing a directory |

A reference connector, if any, belongs in the lab (refrakt), as SPEC-069 imagined.

## 19. The programmatic API

*Added 2026-11-15.* Refrakt grew outward from its tools rather than from an API, and Marquise should
not repeat that:

- plan's logic lives in `plugins/plan/src/commands/*.ts` (`runUpdate(options)`), factored afterwards so
  MCP could call it; `mcp-bindings.ts` calls itself "an additive surface", and the runners still
  return CLI-shaped results (`EXIT_NOT_FOUND = 2`);
- the exported surface is accidental: 111 exports from `@refrakt-md/runes`, 49 from `transform`, 19
  from `content`, mostly whatever a sibling package needed;
- getting typed data for one file means going through a site-shaped entry point (`loadContent`,
  `runPipeline`);
- outputs were not plain data: Markdoc's `Tag` instances needed `serialize()` before SvelteKit could
  pass them from server to client.

**The principle:** the library is the product. The CLI, MCP server, language server, Vite and Astro
integrations and renderers are thin clients of it, with no private API. Every CLI command is one API
function; its `--json` output is that function's return value serialised; MCP tools are generated
from the same table of operations.

**Decided (2026-11-15): the document handle is the centre.** One loaded document holds the parse and
answers every question about it; free functions can wrap it for one-off use.

```ts
import { createMarquise } from '@marquise-md/core';

const mq = createMarquise({ shapes, kits, values, files }); // a config file is one way to build this

const doc = await mq.load(source, { path: 'recipes/pancakes.md' }); // the only async step
doc.findings;   // validation
doc.tree;       // shape nodes, ready to render
doc.records();  // typed extraction: [{ shape: 'recipe', id, fields }]
doc.schema;     // what the output looks like

const next = doc.edit([
  { op: 'set', at: 'recipe.servings', value: 4 },
  { op: 'add', at: 'recipe.ingredients', value: { name: 'Salt', amount: '1 pinch' } },
]);
next.ok ? next.source : next.findings; // new source plus text edits, or a refusal with findings
```

`@marquise-md/node` adds what the core must not contain: loading shapes and config from disk, finding
documents, writing files, `extractAll` over a directory.

**Design points** (*leaning*):

1. **A pure core:** no `node:` imports, so the same core runs in a browser (editor, playground), on
   the edge and in Node; the filesystem only through the `files` host callback (section 11).
2. **Async only at the edges:** `load` is async (syntax, includes, data); validation, resolution,
   extraction and edits on a loaded document are synchronous, which a language server needs on every
   keystroke.
3. **Documents are immutable values:** `edit` returns a new document plus text edits, never mutating;
   this fits the version check on edits (section 18) and makes caching by content hash trivial.
4. **One address for everything:** findings, extracted fields and edit targets point at the same
   place (`hero.actions[1].href`, or `#pricing.tiers[0]` when a shape has an id; ids preferred,
   since indexes shift; see Addresses). An AI fix loop is then "read a finding, edit at its address", with no translation.
   Findings carry the address as well as a line.
5. **Content problems never throw:** bad content, a refused edit and a broken shape file all come back
   as findings; exceptions only for programming errors.
6. **Plain JSON throughout:** every result (tree, findings, records, edit results) is serialisable,
   extending the shape node's rule; no `serialize()` step.
7. **Typed per shape:** the type generator also writes record types and a typed facade
   (`mq.shapes.recipe.extract(doc): RecipeRecord[]`), so data consumers get what components get.
8. **Small on purpose:** a short list of exports, guarded by the API report (SPEC-199, Public
   contracts); the resolver, the adapters and the front ends stay internal.

### Typed access (2026-11-17)

Point 7 above in depth. The spike generates one family already (`src/types-gen.ts`, React props); a
data store needs four, each different on purpose:

```ts
// generated from shapes/recipe.md
export interface RecipeRecord {          // what reading gives
  readonly shape: 'recipe';
  readonly id?: string;
  title: string;
  servings: number;                      // default filled in, so required
  readonly totalTime?: IsoDuration;      // read-only: extracted by a regular expression
  ingredients: IngredientItem[];         // item model, keyed by `name`
  method: Markdown;                      // a block field
}

export interface RecipeInput {           // what creating accepts
  title: string;
  servings?: number;                     // the default applies
  ingredients?: IngredientItem[];
  method?: Markdown;                     // no totalTime: it cannot be written
}

export type RecipeAddress =              // what addresses can name
  | 'title' | 'servings' | 'totalTime' | 'method'
  | 'ingredients' | `ingredients[${number}]` | `ingredients["${string}"]`
  | `ingredients[${number}].${keyof IngredientItem}` | `ingredients["${string}"].${keyof IngredientItem}`;

export interface RecipeProps { /* per renderer, as in the spike */ }
```

- Records fill in defaults; inputs do not require them.
- **Read-only fields are `readonly` in records and absent from inputs** (fields read only by a regular
  expression, written with conditions or variables, or included), so the write path's rules become
  compile errors.
- Forms appear nowhere: a compact and an explicit track have one type, as they have one address.

**Three ways to write:** (a) typed string addresses (`doc.set('recipe.servings', 4)`), matching
findings, the CLI and MCP, but checking the value against the address takes type-level path parsing,
slow and with poor errors; (b) generated accessors (`doc.recipe.ingredients.byKey('Salt').amount.set(…)`),
excellent completion but generated runtime code the size of the schema, Prisma's model; (c) **drafts**:

```ts
const next = doc.update('recipe', (r) => {
  r.servings = 4;
  r.ingredients.push({ name: 'Salt', amount: '1 pinch' });
  r.totalTime = …;            // compile error: read-only
});
next.ok ? next.source : next.findings;
```

The draft is a `RecipeRecord`, so the types come free; a proxy records the changes and turns them into
the same batch of operations at addresses (Immer's `produceWithPatches` does this). **Sync with a store
is the same machinery** (section 18, Integrations): a diff of two records gives operations, and
declared item keys let it recognise a move as a move. *Leaning:* (c) for application code, string
addresses as the serialisable protocol underneath (CLI, MCP, AI agents, connectors), address types
checking only that a literal names something real; (b) adds nothing (c) does not give.

**Generated types, no generated runtime code:** the core API stays generic and small, and the generated
file plugs types into it by declaration merging (TanStack Router's `Register`, Vue's
`GlobalComponents`, Astro's content collections):

```ts
// generated: .marquise/types.d.ts
declare module '@marquise-md/core' {
  interface ShapeRegistry {
    recipe: { record: RecipeRecord; input: RecipeInput; address: RecipeAddress };
  }
}
```

`doc.records('recipe')` then returns `RecipeRecord[]`, `doc.update('recipe', …)` passes a typed draft,
`mq.create('recipe', input)` checks its input. `marquise generate` writes the file, as `astro sync`
does; the Vite and Astro integrations and the language server regenerate it when a shape is saved. A
shape library on npm ships its generated types and a project's registry merges them (generated types
are a public contract, SPEC-199). Document shapes (Z4) type whole documents the same way:
`mq.load<'article'>(…)` gives a typed `doc.record`, frontmatter and body fields together.

**Value types need JSON forms** (records are plain JSON, point 6), each with one TypeScript type:

| Value type | JSON | TypeScript |
|---|---|---|
| `date` | `"2026-11-17"` | `IsoDate`, a branded string |
| `duration` | `"PT3M45S"` | `IsoDuration`, a branded string |
| `money` | `{ "amount": 29, "currency": "USD" }` | an object |
| a `block` field | Markdown source | `Markdown`, a branded string |

Branded strings stop a plain string standing in for a date and cost nothing at runtime; helpers convert
(`toDate()`, `toSeconds()`); the formatter writes `PT3M45S` back as the author's `3:45`.

**Compile time and runtime from one source:** types promise things about code; data on disk was
written by people and is validated when loaded against the same shapes, records arriving with
findings. The guarantee Zod gives, without anyone writing Zod.

### Addresses (2026-11-17)

Refrakt has three unrelated ways to point at things: findings at `file:line`, includes at `file#id`
(SPEC-168), and plan's `--check` by text (`plugins/plan/src/commands/update.ts:175`, the first
unchecked line containing the string), fragile but what a person or an AI actually knows.

**Decided (2026-11-17), answering A1:**

- **Dots, with brackets for indexes and key matches,** as in JavaScript: `hero.headline`,
  `hero[1].align`, `#pricing.tiers[2].price`, `recipe.ingredients[name="Salt"].amount`,
  `section.body.callout.title`, and across files SPEC-168's form extended: `docs/guide.md#install.steps[3]`.
  It is what developers write against records and props (lodash `get`, form libraries, Zod's printed
  paths), it gives one index form, and it keeps folders (before `#`) apart from fields. Slash was
  considered (a neutral "go down", JSON Pointer's form); the cost of dots is that `#pricing.tiers`
  resembles Markdoc's `#id .class` shorthand, only where an address starts with an id. Ids may not
  contain dots; key values are always quoted.
- **Two forms:** structured (an array of steps) inside the API, the string for findings, the CLI, MCP
  and people, converted both ways; `toPointer()` for generic JSON tools.
- **camelCase is canonical**, matching records and props (decision 8); kebab-case accepted on input
  and normalised, since names are unique within a shape. A finding's message uses the source name,
  its address the data name.
- **No sigils:** attributes, fields and dimensions share one namespace already, since they become one
  flat props object; the schema knows which a name is, and inside a block field a name is a shape.
- **Indexes from 0,** with the line beside the address in findings.
- **Item keys are declared** (`itemModel: { key: name }`), optional: stable identity in records (M3),
  the shorthand `ingredients["Salt"]`, duplicates reported. Without one, items are addressed by index,
  and `[field="value"]` works on any field (plan's text match made explicit).
- **An absent field has an address:** `content-missing` reports `hero.headline`, where `set` would
  put it. Content no field claimed reports the shape's address plus a source range.
- **Addresses check against the schema without a document,** for MCP inputs and typed addresses
  (`Address<'recipe'>`).
- **Findings and records report the most stable address:** id, then key, then index.
- **A batch resolves every address against the version it targets,** before any operation applies;
  overlapping targets are refused, several `add`s to one list apply in batch order, `move` is its own
  operation. Writers building a batch from one read never compute shifted indexes, as JSON Patch's
  sequential model would make them; sequential behaviour is several batches.

## 20. Satellites and scope

*Added 2026-11-17.* Directives (`include`, `data`, `snippet`) and tools like refrakt's diff algorithm:
useful, but are they Marquise's? Refrakt shows how creep happens: `lib/line-diff.ts` (83 lines, an
LCS diff) was pulled out of the `diff` rune into the core rune package so `snippet review` could share
it (WORK-592). Nobody decided it belonged there; the monorepo made it the easiest place.

**Marquise owns the seams, not the tools:**

| Seam | What plugs in | Refrakt examples |
|---|---|---|
| Preprocess (directives) | content in place before the content model reads it | `include`, `data`, `snippet` |
| Computed (`prepare`) | values derived from resolved fields | diff hunks from two fences; perhaps highlighting |
| Render middleware (section 12) | presentation only | lazy images, edit hints |

Marquise's job is making them complete: **provenance** (included or generated content remembers its
origin, so findings point at the right file and the write path redirects or refuses edits),
**bounded file access** (the `files` callback), **declared dependencies** (a directive names the files
it read, for caching, hot reload and determinism) and **typed outputs** (a computed value appears in
the published schema and in records: a diff's hunks are data too).

**The cases:**

- **Diff:** the algorithm is not Marquise's, or even refrakt's to own (mature libraries exist, jsdiff
  for one). A `diff` shape in someone's library declares two fence fields and a computed `hunks` field
  calling a library; Marquise's part is the computed seam with typed output. A test case for the seam.
- **`data` and `snippet`:** not Marquise's at all. Refrakt keeps them, using the public preprocess hook
  from outside, which tests the hook better than anything Marquise builds itself.
- **`include`** (*decided 2026-11-17*): moves to a satellite. SPEC-199 kept it in core because it runs
  before the content model, but that argument proves the *hook* belongs in core, not the directive;
  what core needs is provenance, which every directive needs. `include` (182 lines) becomes the
  reference directive, optional, proving the hook on day one.
- **`schema` and `compose`:** satellites too. Compose is the hardest test: a template places other
  shapes, so if it cannot be built from public contracts alone, the contracts are missing something.

**The scope rule for core:** a piece belongs in core only if the content model, validation, records or
the write path cannot be correct without it, or every user needs it. Everything else sits behind a
public seam; an add-on needing a private import gets a new seam, not a deep import.

**Separate repositories** (*leaning*), because they **enforce the public contract**: in a monorepo a
sibling can import anything (how refrakt's `runes` reached 111 exports); in its own repository a
satellite has only the published API. The friction is the point: a change needing core and an add-on
together forces "is this a seam?". Costs for one maintainer: slower cross-repository changes, a
compatibility matrix, duplicated CI and release setup. Mitigations: one template repository for
satellites; a contract-test harness from core (`@marquise-md/test`) each satellite runs against core's
current and next versions; satellites depend only on published packages. The alternative, one
repository with enforced boundaries (exports maps, a dependency-cruiser rule), is cheaper and can be
bypassed. Refrakt's creep came less from monorepo mechanics than from saying yes to directions, so the
written rule matters most; separate repositories make it hard to ignore.

| Where | What |
|---|---|
| Marquise core repository | content model, shapes, validation, records, write path, API, CLI, language server, renderers, the three seams |
| First-party satellites | only those proving a seam: `include` (preprocess), `schema` (output); perhaps `compose` later |
| Refrakt (the lab) | `data`, `snippet`, diff, everything else, through Marquise's public seams |
| Third parties | anything else |

SPEC-199 updated (2026-11-17): the 1.0 table, the core module table and "Satellites" replacing
"Add-ons".

## 21. An outside review of the concept docs (2026-11-18)

The README and concept docs were written into `marquise-md/marquise` and `marquise-md/riviere`, then
reviewed by another agent: a cold read of the docs first, then a check against SPEC-199 and these notes.
The full report is kept in `notes/marquise-review-2026-11-18.md` (its line numbers refer to the
repositories as they were before the fixes).

**Fixed in the docs the same day:** a "Scope of 1.0" page restoring SPEC-199's table; markers that
overstated decisions (the write path's batch rules, satellites in their own repositories, the decided API
example, Rivière's engine seam, "no general site layer"); missing definitions (identity and `ref`,
deferred shapes as a seam, directives, the full address rules, the slot namespace rule); examples that broke
the docs' own rules (`label` without `as: text`, the hero's plain tag, `blockedBy` in a shape file,
id-rooted addresses without `#`, `acyclic` outside Rivière's namespace, `to` naming collections).

**The design challenges, to discuss one at a time** (questions X1–X12 in section 22):

1. **1.0 is not small, and its scope was missing.** Cut 1.0 to the read path: shapes, content models,
   validation, typed props, records with JSON Schema, the plain presentation, one syntax, `validate`,
   `types`; the write path, kits, dimensions, middleware, migrations and a second syntax after.
2. **Build plan's rebuild on a pre-1.0 Marquise,** since Rivière needs identity, `ref`, deferred shapes,
   task-list items, heading-bound sections and list-valued references, and finding gaps after 1.0 means
   majors.
3. **Deterministic content models** (XML Schema's unique particle attribution): an ambiguous model fails
   at load; writes become predictable, completions and streaming validation come almost free; the
   matching algorithm is specified normatively.
4. **The write path as lens laws,** adding "writing back the value just read produces zero edits".
5. **Positions decide the parser:** byte-exact writes need inline ranges; recalled that markdown-it (under
   Markdoc) lacks them; micromark and mdast have them, and `remark-directive` implements the syntax Comark
   descends from. One spike changing an inline value in each settles it.
6. **Identity is `(collection, id)`,** not the address, so a move does not change identity.
7. **Block fields as structured values** (`{ markdown, text, shapes }`), so records do not depend on the
   syntax and addresses do not point into strings.
8. **Value types keep the author's text** (`{ value, source }`); money as a decimal or minor units, never a
   float, never an inferred currency; perhaps only `number`, `date`, `url`, `boolean` in core.
9. **Security gaps:** untrusted `{% collection %}` and `{% expand %}` can read any collection (a per-collection
   "readable from untrusted content" flag, off by default); frontmatter choosing a looser shape than the
   host's; forgeable context-bundle delimiters; the trust boundary marked only a leaning.
10. **Concurrency claims are too strong:** the hash check holds within one working tree; claims across
    clones need a conflicting write (an assignee) or a pushed ref; `apply` should verify every hash, write
    temporary files, then rename, with rollback.
11. **Borrow formats rather than invent them:** the language server protocol's `WorkspaceEdit` for
    changesets (file renames and deletes included); SARIF for findings, with suggested fixes; CEL or
    JSONata for `computes`; an export to SQLite or DuckDB instead of a query-engine seam.
12. **Smaller points:** generic MCP tools by default (clients degrade as tool counts grow); a strict
    JSON Schema profile for model APIs' structured output; `createMarquise<Shapes>()` beside the global
    type registry; accessibility of the plain presentation (heading fields rendered as headings);
    identity and addresses across locales; pinning YAML 1.2 for shape files; prior art worth reading
    (Keystatic, TinaCMS, Sphinx-Needs, Doorstop, Obsidian's Dataview and Bases, SHACL's "shapes").

### The second review (2026-11-19)

Run again after the decisions X1 to X12 were written into both repositories, with a third pass comparing
against the first review. The full report is kept in `notes/marquise-review-2026-11-19.md`. Most of the
first review's findings were resolved; the round of changes introduced about sixteen new inconsistencies.

**Fixed the same day:** Rivière's timing (0.x on Marquise 0.x, 1.0 after Marquise's, in every place);
the matching rules, a shape's analysis and strict shapes written into Marquise's content-models page,
matching SPEC-201; stale and wrong statements (nested shapes "still open", an index address for a shape
with an id, Comark's positions, identity marked a leaning in Marquise); the plain-presentation example
(emphasis kept, paragraphs and lists inside wrappers, ids prefixed and numbered per page, `role="group"`
for a `div` root), also in SPEC-199's decision 3; renderers in 1.0 stated, Comark's renderers a later
question; suggested fixes described in 1.0 and applied with the write path after it; the structured-output
profile built from the **input** schema; Marquise's and Rivière's writing rules joined (Marquise gives no
atomicity across documents, Rivière's `apply` adds it; a stale batch is refused, and a caller may rebase);
the changeset as `{ ok, operations, edit, expectedHashes, findings }`, with `edit` a strict
`WorkspaceEdit` using file URIs; what `rename` touches (the id where written, the file name, references,
mentions, links); **rebase by value only for operations addressed by id or key** (an index address could
land on the wrong item silently); **two-phase loading** (index every document with Rivière's shapes as
placeholders, then expand against the finished snapshot; corpus findings on the snapshot) and
`expand-cycle`; an unreadable and a missing `ref` giving the same finding in untrusted mode, and field
lists applying to filters, sorts and paths; bundle tokens of at least 128 bits, escaped token lines, JSON by
default over MCP; MCP wording; SPEC-199's worked example in the revised content-model format, and its
acceptance criteria rewritten for early extraction.

**Still to discuss** (Y1 to Y16 in section 22): strict by default; compact forms in 1.0; 0.x exit
criteria; document shapes' body in 1.0; examples in 1.0; corpus-unique ids; a unified diff beside the
edit; saying the primary syntax is Markdoc; further security gaps; cuts from Rivière's first release; rich
text's size and an opt-in tree; SPEC-201's open questions; the acceptance test's missing pieces; query
semantics; smaller remaining gaps; opportunities and prior art.

### The third review (2026-11-21)

Run after a day of design (rules, G1–G17, the worked domains, the five themes, T6/E2, D1–D6), by a reviewer
who had not seen that discussion, cold on the concept docs, then against SPEC-201, SPEC-199 and the decision
log. Saved as `notes/marquise-review-2026-11-21.md`. Its headline findings, to be worked through as Q1 onward
in section 22: text templates break the path templates that use them (`{id}-{slug}` reads id `WORK`); none of
the four worked pages loads as written (name collisions, unacknowledged shadowing, undefined keys); lists of
references have two readings after the landing rule, and plan's selectors use the other one; the selector
language needs a written grammar (quoting against `github:…#123`, `+` doing two jobs, reserved words); scope
pages, READMEs and SPEC-199 lag the decisions, and Marquise's rules depend on a selector language no Marquise
page defines.

## 22. Open questions

**Stack**

- S1. Corpus layer branding: part of Marquise's family (`@marquise-md/corpus`), or its own package?
  *2026-11-17:* its own project, named Rivière (section 3); its scope is S5.
- S5. *Answered 2026-11-17:* the unscoped `marquise` for core, `@marquise-md` for everything else
  (SPEC-199 updated); Rivière under `@riviere-md`. Still to do: claim both npm organisations, and
  perhaps ask the owners of `@marquise` and `@riviere`.
- S2. Should a design language be a separate package from any theme, so Lumina is one
  implementation among several?
- S3. First-party satellites at 1.0: `include` and `schema` only, or `compose` too (section 20)?
- S4. Separate repositories in a Marquise GitHub organisation (*leaning*), or one repository with
  enforced boundaries?

**Kits and bindings**

- K1. The name "kit".
- K2. Where bindings live: a TypeScript file whose body is plain data, or a data file with
  component references resolved by the renderer?
- K3. Dimensions a library cannot express on one component (`width`, `spacing`): an optional
  wrapper element the binding asks for?
- K4. How two kits combine when they overlap: precedence rules, explicit choice in config?
- K5. Interaction contracts with a bound library: a test run against output, or trust?

**Dimensions**

- D1. Values not from a list (ratios, numbers): enums and presets only in a first version, typed
  formats later?
- D2. Dimensions that belong together (`tint` and `tint-mode`): one dimension with a
  sub-attribute, or two linked files?
- D3. Responsive values (`density="compact"` on small screens only): a kit concern, or room in
  the format?
- D4. The `provides` vocabulary: declared by the design language, so capabilities mean the same
  across kits?

**Presets**

- P1. Should the shape node record that expanded values came from a preset (useful for the
  editor, noisier node)?
- P2. Where token names are declared (the tokens contract), so `token` fields can be checked.
- P3. Are whole-theme presets (`tideline`) presets of a dimension at all, or a site-level choice
  of all tokens at once? Hunch: the latter.

**Behaviours**

- B1. Write the headless logic, or build on an existing headless library?

**Tags that are not shapes**

- T1. *Answered 2026-11-13:* no `t` for content authors; content is translated as whole
  documents (section 10).
- T2. *Answered 2026-11-13:* the host bridge is the only mechanism; Marquise ships no engine
  (sections 10, 11).
- T3. Placement rules for primitives: "only templates may place this" is the first; refrakt also
  has `requiresParent` ("only inside X"). Do placement rules belong on shapes generally?
- T4. Icon sets: a lookup tag, or an open dimension with presets? *Leaning 2026-11-13:* a lookup
  callback (`icon`), plus a manifest field for kits that ship sets.

**Extension points**

- H1. Lookups that must resolve without a framework (static HTML export, the plain presentation):
  the HTML renderer calls the same `translate`; confirm for every output path.
- H2. Translated attribute values (an `aria-label`, a `summary` a template sets): a lookup node
  inside an attribute value needs support in each renderer.
- H3. Lookups in structured data: JSON-LD is built at transform time, so a translated label there
  needs transform-time translation, or structured data stays in the source language.
- H4. *Decided 2026-11-18* (section 11): extensions in shape files use one namespace each; a namespace
  not installed is an info finding and passed through; the summary projection is core, context hints
  Rivière's; refrakt's keys move under `refrakt:` as a first use of the migration format.

**Middleware**

- W1. What `node.source` holds: a line, a range, or a file and range. It matters for SPEC-198's
  `source()` too, and for included content, whose file is not the page.
- W2. Typed annotations (`edit-hint`, `source-line`) so the editor knows what it reads, or free-form
  `data-*` names with conventions?
- W3. The React and Svelte fallthrough gap: tell kits to spread `rootProps` on every component as a
  rule, with `marquise check` warning when one does not?
- W4. Can middleware add whole shapes (an editor's "add block here" between shapes)? A structural
  change, which may need its own deliberate API.

**Islands and images**

- I1. Author-level image attributes: Markdown has no place for a focal point. Markdoc annotations
  on images (`{% focus="top" %}`) may work if Markdoc supports annotating image nodes (to check);
  otherwise the image goes inside a small shape.
- I2. Should authors override `hydrate` per instance (`{% calculator hydrate="load" %}`)? Probably
  not, as it is a performance decision, but a calculator at the top of a page might want it eager.
- I3. Images inside slots a component places: does render context reliably reach them in every
  framework, or do some renderers need hints passed down explicitly?
- I4. Other media (video, audio, embeds) have similar facts (poster, captions file, preload):
  same pattern, or later?
- I5. Marquise and `@astrojs/markdoc`. *Leaning 2026-11-13:* a preset first, a pre-transform hook
  proposed upstream, a separate integration as fallback (section 14), after a spike.

**Integration packages**

- N1. Which integration comes second after Astro: Nuxt (matching the Nuxt UI kit idea) or Next
  (the largest audience)?
- N2. Nuxt Content: can Marquise plug in as a file type, or does it conflict with MDC? Check its
  current docs. *Answered 2026-11-17* (section 14): through the `content:file:afterParse` hook, on
  MDC's tree; custom sources supply raw files only.
- N3. *Answered 2026-11-13:* the plain presentation is what `@marquise-md/html` renders for unbound
  shapes (section 15).
- N4. Next without Vite: a separate small plugin, or a loader that needs no build integration
  (transform at request time)?
- N5. *Answered 2026-11-18* (section 14): the Standard Schema validator is in Marquise core, one object
  per shape implementing `StandardSchemaV1` and `StandardJSONSchemaV1`, no dependencies; Zod only in
  the Astro integration.
- N6. A React renderer that works as a server component (no context, per-request state): a 1.0
  requirement?
- N7. *Decided 2026-11-18:* the serialisable snapshot is in Rivière's core.
- N8. The integration contract (the eight questions): into SPEC-199 now, or in the notes until Rivière
  has a spec of its own?

**The HTML renderer**

- R1. Sync or async components? Async allows fetching inside a component but complicates streaming
  and caching; the shape node is already resolved, so sync may be enough, and async can be added
  later without breaking anything.
- R2. Escaping guarantees for library templates: with `html.raw` the template engine owns escaping.
  Refuse unescaped output by default, with an explicit opt-in per component?
- R3. Custom-element attribute types: strings map cleanly; booleans, numbers and item lists need
  conventions (boolean attributes, JSON in an attribute, child elements per item).
- R4. Server-side rendering of web components: content inside shadow DOM is not in the initial
  HTML. Light-DOM slots avoid that for content, which suits Marquise; recommend it to kits.

**Seams not yet discussed** (section 16): Z1–Z6, each still open; to be walked through one at a
time.

- Z1a. Build on Comark (syntax, tree, renderers) as well as, or instead of, Markdoc? Options A, B, C
  and what to settle first are in section 16 (deep dive). To be settled
  before renderers are built.
- Z1b. *Answered 2026-11-13:* yes, in both syntaxes, as the explicit form of what inference does
  (section 16, "Explicit slots").
- Z1f. Explicit-only fields: a per-field flag (`infer: false`), or a kind of field (like refrakt's
  `region`)?
- Z1g. Should validation hint when explicit slots match exactly what inference would produce?
  Probably not: noise, and explicit is not wrong.
- Z1h. *Answered 2026-11-15:* Markdoc's native slots are usable (`{% slot "name" %}` with
  `slots: true`); no Marquise tag needed. Their status in Markdoc (stable or experimental) still to
  confirm.
- Z1l. With a delimited shape, does `#default` mean "infer across all remaining zones", or only the
  primary zone?
- Z1m. The template placement tag's new name (`place`, or another), and whether it also absorbs
  refrakt's `{% field %}` for values.
- Z1i. Which syntax is primary (leaning: a primary plus the other as accepted input, section 16,
  "Compositions")? *Decided 2026-11-19 (Y8):* Markdoc; Comark as input later, on demand; Comark's renderers
  evaluated separately during 0.x.
- Z1j. Template variables: Comark's binding (`attrs.align`, `props.x`) or SPEC-195's `$attrs`?
  Decide together with Z1e, so `computes` and templates share one style.
- Z1k. Who may define compositions: the site's `shapes/` and kits only, or also content files (a
  one-off composition inline on a page)? Powerful, but it blurs where shapes are defined.
- Z1c. Formatting components (`date`, `number`, `currency`): shipped by Marquise, or by kits and
  hosts? They need the locale, which suggests kits and hosts.
- Z1d. Comark's `data` namespace is render-time; should the host values Marquise uses at transform
  time use the same names, so `data.user` means one thing in both places?
- Z1e. `computes` expressions: borrow Comark's dot-path style (`attrs.title`) for consistency with
  content, or keep SPEC-195's function syntax? *Answered 2026-11-21:* CEL, with plain dot paths.
- Z2a. Old content inside fenced code: refrakt's regex codemods rewrote fenced examples too,
  sometimes wrongly. Should codemods touch fences at all? Probably only `example` blocks, never
  arbitrary code.
- Z2b. `removeAfter` for third-party libraries: Marquise enforces expiry in its own tests, but a
  kit's is the kit's choice. Is a warning to the kit author enough?
- Z2c. Moving between kits with different shapes: a migration too (a mapping file between kits), or
  out of scope? *Answered 2026-11-23 (Q15): a package of migration files.*
- Z3a. Raw HTML in untrusted mode: off entirely, or a small allowlist (`kbd`, `sup`, `sub`,
  `details`)?
- Z3b. One default everywhere (untrusted), or by context (trusted for build-time sites, untrusted for
  runtime parsing)? One default is simpler to explain.
- Z3c. Own sanitisation or Comark's plugin? The Markdoc path needs Marquise's own URL and attribute
  rules anyway; Marquise could own those for both paths and use Comark's plugin for HTML tags only.
- Z3d. Raise with Comark's maintainers: a strict preset for the security plugin. Its defaults are
  documented, so not a bug, but `security()` without options looks protective and is not.
- Z4a. How a document gets its shape: frontmatter (`shape: article`), a host mapping by folder or
  collection, or both?
- Z4b. Frontmatter with a host schema (Astro): generate the host's schema from the shape (through the
  published schema, Z5), or the reverse? From the shape keeps Marquise the source.
- Z4c. Broken links: is the host reporting missing targets enough, or do anchors in other documents
  need the corpus layer?
- Z4d. Documents without a shape stay untyped, with no validation of the body. Should a project be
  able to require one?
- Z4e. Precedence: does "an author's value anywhere above beats a designer's default" hold for every
  dimension, or should a dimension declare which way it goes?
- Z4f. Documents without a shape: dimensions still apply through a generic document target, so
  `tint: ocean` works on any page? Leaning yes.
- Z4g. Name collisions: frontmatter fields and dimensions share one namespace on a document, so a
  shape cannot declare a frontmatter field named after a dimension (`name-collision`, as for
  attributes).
- Z4h. The host-default hook: a dedicated `documentDefaults(path)` callback, or part of `values`?
- Z5a. The input schema's format: Marquise's own, or JSON Schema with custom keywords for content
  models (partly usable by JSON Schema tooling, at the cost of only looking standard)?
- Z5b. Editor hints (multi-line editing, a widget for a value) in the schema, or left to editors?
  Refrakt's `editHints` are partly covered by SPEC-200's `as`.
- Z5c. Edit operations and migrations: a migration is a batch of edits defined by a file; one engine
  for both?
- Z5d. Collaborative editing: text edits against a version work for one editor at a time; in scope
  at all? Leaning no.
- Z6a. Where the list lives: SPEC-199 (where it is now), or its own document every package links to?
- Z6b. Kits have contracts of their own (their shapes and dimensions): give them a checklist or
  tooling (`marquise diff`, Z2)?
- Z6c. Deprecation periods for finding-id and markup aliases: counted in releases or in time?
- Z6d. Before 1.0: are the rules followed from the first 0.x release, or only from 1.0? *Decided
  2026-11-19 (Y3):* a lighter version: breaking changes allowed in 0.x minors, each listed with migration
  notes and a codemod when it changes content.

**The content model** (section 17)

- C1. Which value types belong in core (`number`, `date`, `url`, `boolean`) and which in kits
  (`money`, `duration`)? *Decided 2026-11-19 (X8):* core in 1.0: `number`, `integer`, `boolean`, `date`,
  `datetime`, `url`, `duration`; the rest, money included, through a value-type registry after 1.0.
- C2. Does the combinator surface replace the named patterns, or sit beside them as an advanced form?
  Replacing is cleaner; beside eases migration.
- C3. Is `as: data` for child shapes compatible with explicit slots and templates, or a second way
  to compose?
- C4. A spec now (a content-model revision for Marquise 1.0, refrakt's runes migrated by codemod), or
  after the syntax decision (Z1i)?
- C5. Compact forms in the shape file: a `compact` key as sketched, or named alternative content models
  (`forms: { item: …, section: … }`)? *Leaning 2026-11-17:* `{% form %}` blocks in the body, the
  template defining the form, frontmatter matchers only for tolerance (section 18, Writing forms).
- C6. Parent defaults: a general `$parent` reference in `defaults`, or inheritance declared on the
  attribute, like a dimension's `inherit`?
- C7. Mixing forms in one list: compact items and explicit tracks together, in order (as today's
  `list|tag:track` allows)? The resolver must then keep order across both forms.

**Marquise as a data store** (section 18)

- M1. Rich-text fields in extracted data: Markdown source, plain text, HTML or tree, by default and
  per field? *Leaning 2026-11-19 (X7):* a structured value `{ markdown, syntax, text, shapes }`.
- M2. *Decided 2026-11-19 (X1):* extraction is in core and in 1.0. (Was: extraction in core for 1.0, or an add-on (`@marquise-md/extract`)? It is small, since the shape
  node is already data, which argues for core.)
- M3. *Decided 2026-11-18:* Marquise core declares identity and `ref` types and checks them per
  document; Rivière resolves them across documents (section 3).
- M4. Creating records: should the write path scaffold a new document from a shape
  (`marquise new article`), with required fields as placeholders?
- M5. Read-only fields: is a field extracted only by a regular expression acceptable as read-only, or
  should the schema require a formatter for every extracted field?
- M6. Where scaffolding lives: creating a document from a shape is per document (Marquise), but its
  file name and location are site or corpus policy.
- M7. *Decided 2026-11-18:* the corpus layer is its own project, Rivière, in the Marquise
  organisation, built only on the public API, after Marquise 1.0. *Revised 2026-11-19 (X2):* Rivière starts
  as 0.x on Marquise 0.x; Rivière 1.0 follows Marquise 1.0.
- M11. *Decided 2026-11-18:* plan rebuilt on Rivière is its acceptance test (section 3).
- M8. Queries: reuse refrakt's filter grammar (`field:value`, SPEC-195's `matches()`), or something
  richer? The "no query language" line argues for reuse.
  *Leaning 2026-11-17:* reuse, extended with typed capabilities (section 3, Rivière's queries).
- M9. A store as a source (shape nodes from JSON, no Markdown): allowed in 1.0, or later? Either way
  Marquise ships no connector (decided 2026-11-17).
- M10. The rich-text hook: one converter interface (`toRichText`, `fromRichText`) per format, applied
  to every `block` field, or per field?

**The second review** (section 21, "The second review")

- Y1. *Decided 2026-11-19* (SPEC-201 D3 revised): **content models are strict by default** (an
  unacknowledged `field-shadowed` is an error). Deciding argument: relaxing later is additive, tightening
  later breaks shape libraries, and the format freezes at 1.0; also, Marquise's authors cannot see the
  shape. **Deliberate shadowing is acknowledged per overlap** with `shadows: [field]` on the earlier field
  (then info, still visible to hover, the write path and the schema; a stale `shadows:` is reported);
  `field-unreachable` always an error; `strict: false` per shape or project as the migration escape hatch.
  Refrakt starts lenient; SPEC-201's review turns kept overlaps into `shadows:` annotations, then refrakt
  turns strict on.
- Y2. *Decided 2026-11-19:* **compact forms move after 1.0,** graduating together with write templates.
  They are additive (a new key on the child shape; a parent's match accepting list items too), so nothing
  written for 1.0 changes. Reasons: not built yet; their design is tied to write templates and the write
  path, both after 1.0 (frontmatter matchers alone would freeze half of it); item-field order (Y12) is not
  settled. **1.0 has item models** (a list read into records) **and `tag:` matches** for explicit child
  shapes; a bare shape name (`match: track`) arrives with compact forms, meaning "any of its forms", which
  also ends the `match: track` and `tag:card` inconsistency. **Refrakt keeps `emitTag`** for its ten
  compact-form runes in its own extension namespace (`refrakt: { emitTag }`), run after Marquise resolves,
  until compact forms graduate from the lab. Marquise's scope and content-models pages and SPEC-199's
  tables updated.
- Y3. *Decided 2026-11-19* (SPEC-199, acceptance criteria, "When 1.0 is declared"): **1.0 is declared when
  every contract it freezes has survived its hardest real user,** not when features are done. One exit test
  per contract: the content-model syntax (all covered refrakt runes in the revised format, SPEC-201's
  analysis clean, refrakt strict, the proof project's shapes written from the docs alone); addresses (a
  write-path prototype editing an attribute and a field through the chosen positions route; `toPointer()`
  and Standard Schema paths agreeing); records and rich text (plan's records consumed outside Marquise; size
  measured; Y11 decided); the plain markup (snapshots, an accessibility check over refrakt's site); the
  shape node and renderers (two renderers, React as server components); the finding catalogue; the
  published schema (one outside consumer); the trust boundary (the hostile suite); generated types; CLI
  output; enforcement in place. **Stability:** two consecutive 0.x minors, at least eight weeks in all,
  without a breaking change while refrakt and the proof project depend on it. **During 0.x** (answers Z6d):
  breaking changes allowed in minors, each listed with migration notes and a codemod when content changes.
  Rivière's 1.0 follows the same pattern.
- Y4. *Decided 2026-11-19:* **document shapes in 1.0, minimal:** a shape applied to a whole document (by the
  host's mapping, or frontmatter `shape:` under the trust rule), frontmatter as its attributes (declared
  keys validated; where the host types frontmatter, the integration decides who owns it), the body read by
  its content model, one record per document. Not built yet, so **built and used during 0.x through plan's
  rebuild** (no wrapper tags), an added exit test in Y3. **After 1.0:** dimensions on documents and
  inheritance, `fills`, folder defaults. **To avoid a later break:** frontmatter keys a shape does not
  declare pass through to the host without a finding (they never reach components; host keys such as
  `layout` and later dimensions such as `tint` stay valid); `shape`, `id` and `lang` are reserved now (a
  shape cannot declare them as attributes); later additions only add optional keys whose absence means what
  1.0 means. Answers Z4d (a document with no shape stays untyped: its tags resolve on their own).
- Y5. *Decided 2026-11-19:* **examples in the shape's body in 1.0** (`{% example %}` blocks only, per
  SPEC-197 D2; write templates still later), **with `file#id`** (SPEC-197 D3, read by the `include`
  satellite). Built and used during 0.x by moving refrakt's fixture files into its definitions (SPEC-197
  D6), an added exit test in Y3. Sidecar files were rejected: they match today's fixtures, but once body
  examples came there would be two places forever. Y3's exit tests require examples (every finding id has
  one), so 1.0 needed a home for them.
- Y6. *Decided 2026-11-19* (Rivière's `corpus.md`): **ids stay unique per collection by default** (V5
  kept): slug ids collide naturally across collections (a blog post and a docs page both `introduction`),
  and corpus-unique by default would give ordinary sites findings on day one. The reviewer's real objection,
  an ambiguity rule on every surface, is met by **one resolution rule for a bare id,** used by references,
  mentions, the CLI, id-rooted addresses and bundles: qualified (`spec:SPEC-12`) wins; then a reference's
  `to` constrains; then corpus-unique collections are searched together; otherwise one match resolves and
  several are an ambiguity finding with the qualified form as its fix. **`ids: 'corpus'`** per collection
  makes duplicates with other such collections a finding, **inferred** from id patterns with distinct
  literal prefixes (`WORK-{n}`, `SPEC-{n}`), so plan needs no declaration. **`#id` in an address** is local
  to the document in Marquise and resolved through the rule in Rivière (answers the reviewer's question 7).
- Y7. *Decided 2026-11-19* (Rivière's `writing.md`, Marquise's `writing.md`): **a patch is a derived view**
  of every changeset (`cs.toPatch()`, a unified diff with renames and creations) and of Marquise's
  single-document edits; `--dry-run` prints it and MCP returns it beside each changeset, formalising the
  CLI's earlier "the changeset as a diff". **The changeset stays the model; applying stays Rivière's
  `apply`** (hashes, rebase by id or key, all-or-nothing with recovery), since `git apply` matches by text
  context, not addresses and values; a patch is for reviewing, though git can apply it. **The journal
  stays,** since `apply` must work without git and on trees with uncommitted changes.
- Y8. *Decided 2026-11-19, looked at fresh:* **syntax and renderers are separate decisions** (the first
  spike rendered Markdoc content through Comark's React renderer unchanged), so "renderers for free" is no
  reason to choose Comark's syntax. **Markdoc is Marquise's syntax:** everything in the lab is built on it
  (resolver, parser, formatter, language server, content), it is stable and safe by default, Astro supports
  it, and refrakt's content works unchanged; Comark is 0.9 and the MDC transition is under way, so freezing
  Marquise's syntax on it would break "1.0 ships what is built". Comark's real strengths (lighter syntax,
  `#name` slots, streaming, the Nuxt audience, `remark-mdc`'s positions) make it a candidate **input syntax
  after 1.0, on demand**, without tooling of its own. **Comark's renderers are evaluated during 0.x** with
  Markdoc as the syntax: shape nodes converted internally into Comark's document, Comark's packages
  rendering (Angular included), Marquise's layer on top (plain presentation, bindings, middleware,
  hydration), the shape node remaining Marquise's contract; decided after talking to Comark's maintainers
  (format stability, a fallback keeping unbound content, positions, React Server Components); refrakt's
  generic renderers the fallback. Marquise's docs rewritten (`syntax.md`, `rendering.md`, slot examples in
  Markdoc); SPEC-199 updated. Answers Z1i.
- Y8a. *Decided 2026-11-19* (Marquise's `syntax.md`, "Markdoc inside core"): **no separate Markdoc package
  in 1.0.** Every 1.0 user needs it (the scope rule), and a front end's interface is wide (positions, typed
  attributes, evaluating `if` and variables, slots, `#id`, example blocks, insignificant nodes, later
  printing for writes), so publishing it with one implementation would freeze an unproven contract.
  Instead: one internal module in core, an import rule checked in CI keeping the rest of core
  syntax-neutral, Marquise's public types free of Markdoc's, and Markdoc an ordinary pinned dependency
  rather than a peer dependency (SPEC-199 updated). **When a second syntax arrives,** the interface is
  designed against both and the front ends become packages (`@marquise-md/markdoc`,
  `@marquise-md/comark`), `marquise` still depending on Markdoc's by default: non-breaking.
- Y9. *Decided 2026-11-19*, as details of X9's boundary (Marquise's `trust.md`, Rivière's `writing.md`).
  (1) **Content reads only the host values exposed to it** (`contentValues`); shapes, templates and
  components see everything; an unexposed read is `value-not-exposed` and renders nothing; the same list
  governs content functions; trusted mode exposes all. (2) **The host sets the confirmation policy**
  (`confirm: { operations, collections, filesOver, agents }`); Rivière computes `needsConfirmation`, a
  proposer can raise it but never lower it, and `apply` refuses without a person's approval when required,
  a step an agent cannot perform over MCP. (3) **Patterns in the RE2 subset** (no backreferences or
  lookaround, `pattern-unsupported` at load), run by a linear-time engine with a length cap. (4)
  **Frontmatter parsed defensively:** aliases off, a size limit, prototype-free objects, `__proto__`,
  `constructor` and `prototype` keys rejected; the same settings for shape and kit files. (5)
  **`resolveAsset` limited to project paths and allowlisted hosts** in untrusted mode, other remote URLs
  passed through unfetched. DOM ids were already prefixed (second review's fixes).
- Y10. *Decided 2026-11-19* (Rivière's new `scope.md`): the first release contains what the acceptance
  test and the first two consumers need. **`claim` becomes a generic saved write** declared in config
  (`writes: { claim: { require, set: { status, assignee: '$actor' }, push: true } }`), plan supplying the
  vocabulary; **context bundles become the first-party satellite `@riviere-md/context`** (public API only);
  **`--against` stays, the git history source comes later** (plan keeps its own `history` meanwhile). In:
  the snapshot, identity and resolution, references and validation, selectors, `count`, saved views and
  writes, changesets (`apply`, rebase, patches, confirmation policy), the five shapes with two-phase
  loading, watching and overlays, the serialisable snapshot, the CLI, generic MCP tools, the JSONL export;
  `@riviere-md/astro` (build-time loader) as a satellite. Later: the history source, the live loader,
  translations, per-collection tools, the SQLite export, ref-based claims, an engine seam if ever. Exit
  tests: plan rebuilt with "Plan, as shapes" to-do list empty, the Astro loader on a real site, one consumer
  unlike plan, a stability period.
- Y10a. *Decided 2026-11-19* (asked by the user: can Rivière run hosted?), Rivière's `corpus.md`, "Sources
  and sinks": **Rivière's core uses no filesystem or git directly;** it talks to a **source** (lists
  documents, returns content, hashes and optionally a version) and a **sink** (applies a changeset
  atomically or refuses it). Local: files by glob and the git CLI, with the lock and journal. Hosted on
  GitHub: the API's tree at a ref, and one commit (or a pull request) per changeset, which is atomic by
  nature and gets server-side compare-and-swap, so claims across machines conflict at once; webhooks in
  place of watching. Stores and in-memory sources through the same seams. `@riviere-md/node` in the first
  release; `@riviere-md/github` later as a satellite (what a hosted product needs). Files stay the truth,
  in a remote repository rather than on a disk.
- Y10b. *Decided 2026-11-20* (asked by the user: does a saved write have consumers beyond plan?), Rivière's
  `queries.md`: yes. "Saved writes" is our name; the concept exists as workflow transitions in issue
  trackers (conditions and post-functions, the closest relative), stored procedures (but code), CQRS
  commands and GraphQL mutations. Consumers: publishing (`publish`, `unpublish`, `archive`), docs
  maintenance (`mark-reviewed`), requirements traceability (`approve`, `reject`, an audit trail in git), a
  support compendium (`seen-again`, `resolve`), eval datasets, gardening agents (`mark-stale`), events
  (`cancel`). Added from them: built-in `$now` and `$today` beside `$actor`, and **declared inputs**
  (`input: { reason: { type, required } }`, passed as `--reason`, validated like any value); the confirmation
  policy decides which writes need a person (`approve`). No new machinery: a condition, field values and an
  optional push.
- Y11. *Decided 2026-11-19* (Marquise's `records.md`, Rivière's `corpus.md`): **`nodes`, on request,** the
  field's tree in the shape-node format (no new format), for consumers that cannot run Marquise and must
  render rich text themselves, and which shows where nested shapes sit in the prose; **members chosen per
  call,** defaults `markdown`, `syntax`, `text`, `shapes`; **Rivière's serialised snapshot stores sources and
  the index, records computed on demand,** so nesting's repetition never reaches a snapshot; **defaults
  revisited after measuring** record size on refrakt's content in 0.x (a Y3 exit test). Also settles X7's
  sub-question on default members.
- Y12. *Decided 2026-11-19* (SPEC-201 D1.1, D1.10, D6). **Item models read in any order** (reading more
  tolerant than writing): edits change a field in place and keep the author's order, write templates
  order only new items, reading derived from templates is order-free too. **The comment defect, tested**
  against Markdoc 0.5.13 with refrakt's resolver: Markdoc makes `comment` nodes only when its *tokenizer*
  has `allowComments: true` (`parse` ignores the option), and refrakt's parser does not enable it. Comments
  off: `<!-- draft -->` is a text paragraph, taken as the hero's eyebrow and rendered visibly, the headline
  then reported missing. Comments on: the cursor does not skip the `comment` node, so the eyebrow is
  skipped, the headline reported missing and the real paragraph and heading unmatched; one comment breaks
  the whole tag. **Fix:** comments enabled, the cursor skips insignificant nodes, comments never reach
  records or rendering and writes keep them; in refrakt a behaviour change for the changelog. Tracked as
  SPEC-201 acceptance criteria with a test per failure (the plan CLI and MCP tools were not available in
  the session to file a separate bug).
- Y13. *Decided 2026-11-19* (Marquise's `content-models.md` and `records.md`; Rivière's new
  `plan-as-shapes.md`), all in 1.0 as part of the content-model revision, built and used through plan's
  rebuild. (1) **A `task` matcher** for task-list items (`[ ]` false, `[x]` true), criteria keyed by their
  text; ticking is a one-character edit at a fixed place on the line. (2) **Sections found by heading text**
  with aliases (matched after slugifying; per-locale aliases already built in refrakt as `i18nAliases`),
  any order, a section twice a finding, deprecated aliases a finding with a fix, unmatched sections kept
  (`other: keep`); refrakt's `knownSections` is mostly this, built. **Sections nest** (a section's body is
  any content model, another split one level deeper): specs' decisions (`### D3: …`, addressable as
  `#SPEC-201.decisions["D3"]`), recipes' grouped ingredients, reference docs; each nested level splits at
  an explicit deeper heading level (automatic level detection not allowed in nested sections, a finding in
  strict shapes: answers SPEC-201's first open question for these cases); heading values read with a plain
  pattern (`"{key}: {title}"`), replacing regular-expression `headingExtract`. (3) **Lists of references**
  in attributes and frontmatter (`list: true`: a YAML array, or a comma-separated string on a tag) and in
  content (a list whose items are `{% ref %}` tags or bare ids); **a `ref` tag in a field typed as a
  reference is that field's value, an edge, and elsewhere a mention.** (4) **Ids may contain dots** (any
  character but whitespace, quotes, `#` and brackets), quoted in addresses when not plain names
  (`#"v1.0.0".status`), written as an attribute or in frontmatter, never with Markdoc's `#` shorthand
  (which reads `#v1.0.0` as id `v1` and two classes). (5) **"Plan, as shapes"** in Rivière's docs: complete
  `work`, `milestone` and nested `spec` shapes, collections and the `next` view, every plan command mapped,
  and the prototype's to-do list (rules across fields and entities, decided as Y17; `unblocked`'s meaning of finished,
  claiming, the git source, the wrapper-tag codemod).
- Y14. Query semantics: any or all over lists, quoting, ordering an enum by `-priority`, and `unblocked`
  as a path selector? *Partly decided 2026-11-20* (Rivière's `queries.md`; the user spotted that
  `unblocked: 'blockedBy'` was plan vocabulary, hiding plan's field name and its meaning of "finished"):
  **a path through a list means any by default** (false for an empty list); **`all:` asks for every item**
  (true for an empty list); **the `unblocked` view option is removed,** plan's `next` view written in plan's
  own words: `status:ready all:blockedBy.status:done,cancelled,superseded`. *Completed 2026-11-20:*
  **quoting:** double quotes for values with whitespace, `,`, `:` or `"`, or starting with `-`, `<`, `>`;
  literal inside (no glob), `\"` and `\\` escaped; unquoted values exact or a glob with `*`; regular
  expressions only in the RE2 subset, run in linear time. **Sorting:** a field with allowed values sorts in
  the shape's declared order (so plan's views sort by `priority`, not `-priority`, which every example had
  wrong: alphabetical or reversed order never put `critical` first); numbers, dates and booleans by value;
  text by Unicode code point after NFC (locale order a later host option); missing values last in both
  directions; ties broken by collection, then id.
- Y15. *Decided 2026-11-20.* (1) **`shape-unbound` and `dimension-unsupported` come from the renderer or
  integration and from `marquise check`, never from `doc.findings`** (core cannot know bindings). (2)
  **Reserved names:** `shape`, `id`, `address`, `slot`, `lang`. (3) **Colon durations:** two parts are
  minutes and seconds, three are hours, minutes and seconds; `format: 'h:mm'` for hours and minutes. (4)
  **Written-out values** read with locale data for `lang` or `$locale`, English as fallback; **a zoneless
  `datetime` is `value-ambiguous`** unless a zone is declared or given. (5) **`plain: { level }` per field**
  fixes a heading's level in the plain presentation. (6) **Renames:** `plain: { tag }` to
  `plain: { element }` ("tag" is the author's word); `c.expand(doc)` and Marquise's
  `expand(placeholder, values)` to `fill`. **`data-slot` kept,** after the user asked whether refrakt's
  markers were considered: refrakt has three, `data-name` (a rune's structural part, the BEM element),
  `data-field` (a value-carrying property, the data channel) and `data-slot` (a composed rune's part placed
  through a template, its published name, SPEC-145 D10c); the plain wrappers mark a shape's named part,
  refrakt's `data-slot` meaning, and a stylesheet targeting `[data-slot]` then works on refrakt's composed
  output and Marquise's plain output alike; `{% slot %}` (fill) and `data-slot` (mark) are input and output
  of one concept; the real double meaning, refrakt's template placement tag, is to become `{% place %}`.
  **Pages written:** "Getting started" (as proposed: shape, content, validate, types, a React server
  component, records, an MDX comparison, untagged Markdown and `shape-unknown`), "Commands and
  operations" (one table with releases; `format` defined: indents nested block tags only, checks the parsed
  tree is unchanged, so safe before the write path), "The published schema" (input grammar and output JSON
  Schema, contents, versioning, delivery), and a glossary in each repository.
- Y16. Opportunities and prior art: `marquise explain` and inlay hints; a form editor and an OpenAPI export
  generated from shapes; ProseMirror's content expressions, Augeas, Djot, Sphinx domains and MyST, GROQ,
  org-ql, beads and git-bug, Datasette, shadcn's registry? *Decided 2026-11-20:* (1) **`marquise explain
  [file][#address]` and inlay hints in 1.0:** the resolver records each decision (nodes per field and why,
  dropped nodes); the language server shows it as inlay hints and on hover; the JSON trace is not frozen in
  1.0; built in refrakt with the SPEC-201 revision (an acceptance criterion there). (2) **No first-party form
  editor:** generic JSON Schema form generators (JSON Forms, react-jsonschema-form) draw forms from the input
  schema; one of them is the published schema's outside consumer in its 1.0 exit test. (3) **Static JSON
  endpoints and an OpenAPI document are a recipe** in Rivière's integrations page, built from the JSONL export
  and Marquise's JSON Schemas, not a package. (4) *Leanings, after the first releases:* `marquise add
  <registry>/<shape>` copying shape files shadcn-style, with their source and version recorded, beside npm
  kits for anything carrying code; hashed ids (`{hash6}`) in Rivière's id patterns for many concurrent
  writers, after beads; an intersphinx-style inventory for references across corpora; the SQLite export
  designed for Datasette; missing-content fixes computed as ProseMirror's `fillBefore` does. `fields:` on
  views (GROQ's projections) stays open. (5) **Prior art pages** in both repositories, each entry saying what
  is taken and where the design differs, every claim checked against the project's own docs.
  *Written 2026-11-20* (`prior-art.md` in both repositories, X12.7's list included). Checking corrected
  four recollections: Djot's option is `sourcePositions`; Sphinx-Needs removed `needfilter` (4.0) and
  configures links in `needs_links`; beads stores data in Dolt now, JSONL only an export; SHACL's rules are
  a working-group note, not the Recommendation. Two consequences: the lens laws are cited to Boomerang,
  since Augeas's docs do not state them; and JSON Forms and react-jsonschema-form default to draft-07 while
  Marquise publishes 2020-12 (open in `schema.md`: the form test decides; a draft-07 profile if needed).
  Doorstop's *suspect links* (a reference whose target changed since review) noted as an open idea for
  Rivière. Unverified (sites unreachable): DITA 2.0's status, JSON Forms' list of drafts.
- Y17. Rules across fields and entities (the last design item on "Plan, as shapes"' to-do list).
  *Decided 2026-11-20* (Marquise's `validation.md`, "Rules a shape declares"; Rivière's `references.md`,
  "Rules across entities", `queries.md`, `plan-as-shapes.md`, "Plan's checks, as rules"): (1) **a shape
  declares `rules`, written with Rivière's selectors** (no new language): `when` (the condition), optional
  `require` (without it, the state itself is the finding), `severity`, `message`; **the rule's name is its
  finding id**, entering the published catalogue. Rules run after content is resolved, so they never change
  matching. (2) **Rules across entities live in Rivière,** in the shape's `riviere: { rules }` namespace, in
  the same form, with a new path step **`backrefs(collection.field)`** (entities whose named field
  references this one; any/`all:` apply; mentions never count). Findings belong to the declaring entity, run
  on the snapshot, and `--against` reports rules newly broken on a branch. (3) **An optional `fix`, in the
  form of a saved write's `set`,** becomes the finding's suggested fix (applied with the write path, after
  Marquise 1.0; in Rivière `riviere fix <rule>` applies it as one changeset). (4) **Selectors only;** what
  they cannot express is a **registered check** (code under a name, like directives and `prepare` stages),
  so `rules` never grows into a language. (5) **Timing:** within-document rules built and used during 0.x
  through the plan rebuild, in Marquise 1.0 if they have proven themselves (additive otherwise);
  cross-entity rules in Rivière's first release. Every `plan validate` check classifies as built in (unknown
  values, missing sections, references, duplicate ids, cycles, deprecated aliases), a rule on one document
  (`done-without-resolution`, `resolution-not-done`, `superseded-without-target`, `active-without-criteria`,
  `shipped-without-release`, `release-without-shipped`), or a rule across entities (`stale-blocked`,
  `spec-status-lag`, `spec-status-ahead`, `spec-started-in-draft`, `milestone-complete-with-open-work`);
  none needs code. The exact set is settled during the rebuild against what `plan validate` reports.

**Domains beyond plan** (2026-11-20: Rivière's design tried on requirements traceability, a docs site with a
glossary, events for a small business, worldbuilding, research notes, a service catalogue, course design,
and agent memory and evals, since plan alone hides what other domains need; gone through one by one)

- G1. Many entities in one file (glossary terms, eval cases, changelog entries, menu items). *Decided
  2026-11-20* (Rivière's `corpus.md`, `writing.md`, `queries.md`): **a collection collects every instance of
  its shape in its files**; a document shape's instance is the document, so one-per-file collections are
  that case, with no mode option. Ids **written** or **derived from a field** (`id: { from: 'term' }`) by one
  fixed slug rule (NFC, lower case, non-alphanumeric runs to `-`), a written id winning and disagreement a
  finding; renames of derived ids decided with G5. An instance without a derivable id in a collection's files
  is `entity-id-missing`. **`into`** places new ones (end of a `file`, sorted by `order` when the file is
  sorted, or another entity's field: `into: { container: '#suite.cases' }`); delete removes the tag, move is
  delete plus insert. **Entities inside entities:** the container is an implicit edge, the built-in member
  **`$container`**; built-ins start with `$` (`$collection`, `$file`, `$container`). **No document-scoped
  ids** (refrakt's `scope: 'page'` ties identity to location); **one instance in at most one collection**
  (`collection-overlap`). In the first release, tested with a glossary and an eval-suite fixture beside
  plan. Refrakt's SPEC-144 `registers` (per-instance entities, `idFrom`, `aliases`, edge tags such as `bond`)
  is the lab precedent.
- G2. Links with data (traceability's "verifies", evidence with a stance, a cast's roles): an item model
  with a ref field plus fields covers most; `backrefs()` over nested paths (`backrefs(paper.evidence.claim)`),
  rules seeing sibling fields; or edge tags as entities (refrakt's `bond`)?
  *Decided 2026-11-20* (Rivière's `references.md`, "Links with data"; `queries.md`): (1) **both forms**: data
  beside the reference in an item model on the side that owns it, or the link as an entity of its own (a
  collection with two reference fields, like `bond`) when it has its own prose or neither side owns it;
  guidance in the docs. (2) **A reference step lands on whatever holds the reference field:** the entity for
  a top-level field, the list item for a nested one, with the built-in **`$entity`**. (3) **Brackets scope
  conditions to one item** (`evidence[stance:contradicts claim.status:accepted]`,
  `backrefs(paper.evidence.claim)[stance:supports $entity.status:published]`, `all:criteria[done:true]`):
  `$elemMatch`, in the first release's grammar. (4) **`at`** (where the link is written) in `c.refs()`, the
  exports' `refs` table and bundle "via" lines.
- G3. Data files (YAML, JSON, CSV) as collections: a document shape with attributes and no body?
  *Decided 2026-11-20* (Rivière's `corpus.md`, "Data files"; `queries.md`; `shapes.md`): (1) **a data file
  holds a shape's input, written directly;** rich-text fields are Markdown strings read by the field's `as`.
  (2) Collections include data files (YAML, JSON, NDJSON, CSV, TSV, by extension), many per file by G1's rule,
  `at` naming the list, a map keyed by id (`orient: index`) giving the key as the id. (3) CSV and TSV cells
  parsed by value types, as Markdown text is. (4) Writing keeps formatting and comments under the lens laws;
  a format failing its round-trip tests is read-only. (5) Formats a seam (built in, others registered).
  (6) Rivière's, not Marquise's. First release: all five read, YAML and JSON written once round trips pass.
  **Implications from refrakt's `data` rune** (asked by the user): `data` does two jobs, tables for display
  (stays a refrakt directive on Marquise's preprocess seam; data tables are not Marquise's satellites) and
  records rendered per row (move to Rivière's `collection` over a data-file collection); its readers
  (`root`, `orient`, NDJSON) are the implementation to extract; loose numeric detection stays for rows no
  shape describes. **Grammar change, agreed:** comma for OR, **a repeated field for AND** (refrakt's
  `collection` and `data` read a repeated field as OR today; a codemod during 0.x, `a:x a:y` to `a:x,y`).
  The selector language becomes **one small package** shared by Rivière and corpus-free tools. **`$item`** is
  the per-item variable (`$row` an alias in `data`). The `collection` shape takes **`fields`** (projections),
  needed by refrakt's `collection` and `data` already; on saved views still open (*later:* decided for views,
  the API and the CLI, theme 4).
- G17. Deferred children inside another shape's content (raised by `data` with a body inside `accordion`).
  *Decided 2026-11-20* (SPEC-201 D7; Marquise's `extending.md`, `records.md`; Rivière's `shapes.md`):
  deferred shapes declare what they yield (template's top-level tag, or the collection's shape); the matcher
  treats a placeholder as zero or more of it inside a repeating field; `deferred-yield-mismatch` at load,
  counts after filling; explicit tags only for deferred children (`deferred-yield-untyped`), placeholders only
  where the matcher repeats unless `limit=1`; records keep the query (`Deferred<T>`), not results; filled
  content is generated (edits redirected or refused). Refrakt's `group-display="accordion"` (hand-built
  accordion markup) is the cost of not having it.
- G4. Time in views and rules: `$today` and relative dates (`reviewed:<$today-6mo`), recurrence, time
  zones; results then depend on the clock.
  *Decided 2026-11-20* (Rivière's `queries.md`, "Time"): (1) `$now` and `$today` in every selector, values of
  the snapshot, not parameters; (2) relative dates with units (`min`, `h`, `d`, `w`, `mo`, `y`), calendar
  months clamped, a date compared with a datetime as the start of its day; (3) the snapshot fixes its clock
  (`rv.load({ now })`, `--now`); (4) one time zone per corpus, UTC by default, also the zone for zoneless
  datetimes; (5) expansions record the clock among what they read; static sites show time-relative content as
  of their last build; (6) `--against` evaluates both sides at one `now`, reporting only what the branch
  introduced, so staleness shows in scheduled validation; (7) recurrence later, as a registered value type
  (RRULE) with `computes`.
- G5. Aliases and old ids, so a rename leaves a redirect (plan's published ids; derived ids from G1).
  *Decided 2026-11-21* (Rivière's `corpus.md`, "Former ids and names"): two needs kept apart. **Former ids:**
  a field the collection names (`formerIds: 'formerly'`, declared by the shape; no reserved key), written by
  `rename`; references to them resolve with `ref-former-id` (info, fix to the current id); never reused
  (`id-reused`, skipped by `next-id`, checked by `--against`); hand edits caught under `--against`
  (`id-changed`, fix adds the former id), which keeps G1's derived ids safe; passed to integrations for
  redirects. **Names:** opt-in `names: [...]` per collection, resolving last (id, then former id, then name),
  exact after NFC, a shared name always ambiguous (unlike refrakt's first-owner `registers` aliases). First
  release: former ids (plan's renumbering); names later, their step reserved.
- G6. Inverse and derived fields across entities (`children` as the inverse of `parent`): Rivière-level
  `computes`.
  *Decided 2026-11-21* (Rivière's `references.md`, "Inverses and symmetric references"; `corpus.md`): (1)
  inverses declared in the shape's `riviere:` namespace (`inverse: { work: { of: work.source } }`), usable in
  selectors, bundles, the API and types, `backrefs()` for the rest; (2) **an entity is `{ record, links }`**,
  inverses in `links`, never in the record; the Astro loader puts them in `data` as read-only references;
  (3) writes to an inverse refused (`field-derived`), the fix editing the other side; (4) `symmetric: true`
  on reference fields (refrakt's `bond` `bidirectional`); (5) values computed across entities wait for
  `computes`, `count` and `aggregate` until then; (6) inverses and symmetric references in the first release.
- G7. Transitive paths in selectors (`blockedBy*`, everything under a page).
  *Decided 2026-11-21* (Rivière's `queries.md`, "Transitive paths"): `+` after a reference step, inverse or
  `$container` means one or more steps (SPARQL's notation; no `*`, which is a glob in values); any, `all:`,
  brackets and id comparison unchanged (`parent+:guides`); cycles terminate (visited once), reported by the
  graph checks; closures cached per snapshot, a ceiling in untrusted content. First release (plan's
  "transitively blocked"). Open: ordering by the tree, with the docs-site worked example.
- G8. Transition rules (`from:`/`to:`), checked between a base and a head with `--against`.
  *Decided 2026-11-21* (Rivière's `references.md`, "Transitions"): (1) `transitions` per field in `riviere:`,
  a state machine with `$new` for creation, states without an entry terminal; (2) rules with `from` (selector
  on the old version) and `changed` (fields that differ), beside `when`/`require`; (3) strict on Rivière's own
  writes, **by reachability** under `--against` (endpoints only: `draft` to `done` in one branch passes), the
  language server against the last commit; (4) saved writes checked against the map at config load; (5)
  Rivière's, first release; deeper history later. Plan's maps (incl. `pending`) settled in the rebuild.
- G9. Git-derived fields (`created`, `lastModified`, `authors`) before the full history source.
  *Decided 2026-11-21* (Rivière's `corpus.md`, "Dates and authors"): `$created`, `$modified`, `$authors` as
  built-in members, provided by the source (absent when it cannot); per file in the first release, per entity
  with the history source; one `git log` pass with rename detection; uncommitted files modified at the
  snapshot's `now`; `history-unavailable` in shallow clones, never a guessed date; names only, readable from
  content only when allowed; docs recommend an explicit review date for staleness.
- G10. References outside the corpus: typed external ids (`doi:`, `github:org/repo#12`).
  *Decided 2026-11-21* (Rivière's `references.md`, "References outside the corpus"): external kinds declared
  in config (`pattern`, `normalise`, `url`; *later:* `pattern` became `template`, Q1), typed `to: [kind]`; **`namespace:value`** the one qualified
  notation for collections and kinds, names never colliding; pattern checks always (`external-malformed`),
  existence only through registered resolvers, opt-in, cached, never on untrusted content (later); edges to
  nodes outside the corpus, in the graph and exports, queryable both ways, not entities; Rivière ships no
  kinds. First release without resolvers; plan's `pr` becomes `{ type: ref, to: [github] }` and its PR
  rollups a query.
- G11. Overlays: read-only fields from another source (progress, CI results) joined at query time.
  *Decided 2026-11-21* (Rivière's `corpus.md`, "Overlays"): typed, read-only fields from a registered loader,
  keyed by identity, declared in config; in `links`, queryable like fields, collisions reported; loaded with
  the snapshot and fixed for it, dependencies recorded; writes refused; per-viewer data (learner progress)
  left to the site or app; loaders are host code, content reads overlay fields only where allowed. After the
  first release; overlays on external nodes with resolvers.
- G12. Baselines (a named snapshot, a diff between two) and suspect links (Doorstop).
  *Decided 2026-11-21* (Rivière's `corpus.md`, "Baselines"; `references.md`, "Suspect links"): baselines are
  git refs, `rv.load({ at })` read-only (first release, as `--against` already builds it); `riviere diff`
  compares snapshots by identity (entities, fields at addresses, references, renames through former ids) and
  named baselines in config, later; suspect links through recorded fingerprints (`fingerprint: [...]` on the
  target shape, a `fingerprint` value on the link, `link-suspect` with a fix, unrecorded counts as suspect),
  needing no history, later.
- G13. Bulk saved writes over a selection, with one preview.
  *Decided 2026-11-21* (Rivière's `writing.md`, "Writes over a selection"): `--where` for saved writes and
  `set` (`where` in the API and MCP tools); each entity checked against `require` and transitions, failures
  skipped and listed (refused under `--strict`); one all-or-nothing changeset, previewed by default, `--all`
  above a ceiling of 50 (configurable); the confirmation policy applies to agents unchanged (*later:* the write
  policy, G15); first release.
- G14. Generated regions: a file region kept in sync with a view, with a drift check.
  *Decided 2026-11-21* (Rivière's `shapes.md`, "Generated regions"): comment markers holding plain Markdown,
  configured like the `collection` shape or by a saved view; tables and link lists until `compose`;
  `riviere generate`, `--check` for CI, `region-stale` with a fix; deterministic bytes, `region-clock` for
  clock-dependent queries; edits inside refused; only where no content model reads (`region-in-shape`);
  `content.read` applies. After the first release.
- G15. Write permissions per collection or field (CODEOWNERS-like), for agents.
  *Decided 2026-11-21* (Rivière's `writing.md`, "The write policy"): one ordered policy with `allow`,
  `confirm` and `deny`, first match wins, replacing `confirm`, allowing by default; rules on actors,
  collections, operations (saved writes by name, `write:claim`), field prefixes, file counts and `where` on the
  entity before the write (`assignee:$actor`); `write-denied` naming the rule, skipped and listed in bulk
  writes; actors supplied by the caller; documented as a guardrail, not access control (the forge's controls
  are). First release; checking hand edits in CI later.
- G16. Several repositories as one corpus; scale (review question 13).
  *Decided 2026-11-21* (Rivière's `integrations.md`, "Across corpora"; `corpus.md`, "Scale"): **a corpus is one
  repository,** changesets never span repositories; other corpora linked through imported inventories
  (`imports`, `infra.service:api-gateway`), checked not loaded, `riviere export --inventory` with former ids
  (later); several repositories as one read-only graph later. Scale: a first-phase cache keyed by content,
  shapes and Marquise's version; snapshots hold records and the index, trees on demand; a generated benchmark
  corpus in CI, targets set by the first measurement and held as a 1.0 exit test (first release).

**The third review** (section 21, "The third review"; `notes/marquise-review-2026-11-21.md`; design questions
one by one, then the mechanical fixes in one pass)

- Q1. Templates that cannot find where their values end (review D1, F-D2, F-E4, C9, C10, S4, S5, the
  overloaded `text`). *Decided 2026-11-21* (Marquise's `content-models.md`; Rivière's `corpus.md`; SPEC-201
  D8 revised, D1.10 scoped): (1) typed placeholders consume by their type's grammar (dates ISO, numbers
  digits, enums longest value, ids and references by their collections' id patterns); untyped text up to the
  next literal; a closing literal matched from the end; (2) `:slug` is decoration, never compared; other path
  values compared in the path's format; (3) id patterns are creation-time templates, opaque afterwards
  (events: `id: '{start:date}-{title:slug}'`), continuously derived ids an option; (4) the key renamed
  **`template:`**, placeholders as members of what the template reads (`term.name`); (5) `template:` writes
  nodes and items, `{% form %}` only compact forms; (6) the engine public (`template()`); heading templates
  in 1.0, paragraph and item templates in 1.0 if proven.
- Q2. Lists of references read two ways after G2's landing rule; plan's `## Blocks` unused (review C1, F-P3,
  F-P4, F-P1, F-T8). *Decided 2026-11-21* (Marquise's `content-models.md`, `records.md`; Rivière's
  `references.md`, `queries.md`, `plan-as-shapes.md`): (1) `items:` with a single value declaration is a list
  of values (`items: { as: ref, to: […] }` is `Ref[]`), whose steps reach the entities; items with named
  members are records, whose steps land on the item; (2) an inverse over nested references holds items with
  `$entity`, over a list of references the entities; (3) **`riviere: { inverseOf: blockedBy }`** joins two
  written fields into one edge set for selectors, `next`, rules, walks, `+`, bundles and the cycle check,
  each edge once, writes staying on the side they target; (4) plan's `criteria`, `blocked-by`, `blocks`
  optional.
- Q3. The selector language had no written grammar (review section 4, C3, D6). *Decided 2026-11-21*
  (Rivière's `queries.md`, "The grammar"; Marquise's `shapes.md`): an EBNF grammar, normative; only the first
  `:` separates (colons later are the value's), quoting only for whitespace, `,`, `"` (and `]` in brackets) or a
  leading `$`, `/`, `*`; quoting never changes a type; `+` closure after a step, arithmetic before a digit; a
  bare bracketed path means `has:`, other bare words `selector-bare-word`; brackets filter at their step and
  paths continue, quantifiers over what the whole path reaches; operators per value; top-level commas in
  `fields`; `$actor` wherever there is one (`selector-no-actor` in content); **dates against datetimes at the
  coarser precision** (fixes docs-behind-code firing on review day); `has` and `all` reserved; no cross-field
  OR, with the reason; the review's tricky cases into the catalogue first. Where the grammar lives: Q4.
- Q4. Who owns selectors (review S2, and Marquise 1.0 leaning on Rivière). *Decided 2026-11-21* (Marquise's new
  `selectors.md`; `extending.md`, `commands.md`; Rivière's `queries.md`): (1) Marquise owns the language, in
  `@marquise-md/selectors`, core depending on it; the grammar page moved to Marquise; (2) the grammar is
  generic: registered step functions and `$` built-ins; Rivière adds vocabulary, never grammar; (3) evaluation
  through a resolver, Marquise's for one record (references compared, not followed), Rivière's extending it;
  `selector-unavailable` at load; (4) clock built-ins registered by the host; (5) in 1.0 with rules, the
  catalogue as the exit test in both settings. **Added by the user:** (6) the vocabulary API is **public and
  documented for any third party,** and Rivière uses it as one would: registrations declare name, typed
  arguments and result; deterministic and bounded (no I/O, clock or randomness at evaluation); host code only;
  names unique per host, collisions an error, third parties prefix (`acme.related()`); listed by
  `marquise reference` and the language server; a row in the seams table.
- Q5. The remaining design risks (review D3, D5–D11, F-T5; D1, D2, D4, D12 answered by Q1–Q4). *Decided
  2026-11-21*: (1) CEL: `done * 100 / total`; the bridge renamed **`selects()`** (CEL's `matches` is its regex
  function); **Marquise's values map onto CEL's native types** (`duration`, `timestamp`, dates as timestamps at
  the start of the day, amounts as a custom type with functions), since CEL forbids operator overloading: a
  true subset, conformance applying (corrects "own operators"); (2) a **size table** on each scope page;
  `$created`/`$modified`/`$authors` registered by `@riviere-md/node`; (3) `history-unavailable` fails `validate`
  unless `history: optional`, the date table keyed by HEAD; (4) CLI actors from `--actor`/`RIVIERE_ACTOR`,
  otherwise `unknown` in a non-interactive shell, treated as `confirm`; traceability's claim softened; (5) MCP
  gains `set`, `write`, `preview`, `apply`; (6) `links` holds everything not in the entity's own source,
  exported beside the record; (7) data files read-only in the first release; regions for documents outside
  collections; (8) `from`/`changed` rules per commit under `--against`, endpoints as info when shallow.
  **The design questions are done; next, the mechanical fixes from the review in one pass.**
- Q6. **The mechanical fixes, done 2026-11-21** in one pass over both repositories and SPEC-199: the four worked
  pages load as written (title from the heading; `shadows:` acknowledged; all five plan shapes, bugs in
  inverses and terminal lists; quoted keys; former ids; `riviere add` for lists; the glossary a page; kebab
  names; `docs-behind-code` declared; grouping example); contradictions resolved (editor buffers renamed
  `rv.buffer`; `rv.load({ now })`; navigation wording; what names shapes and what names collections;
  `c.backrefs` marks edges and mentions; `symmetric` in `riviere:`; one exit-code table; `c.document()`);
  **finding catalogues** in both repositories (`findings.md`), new ids for unnamed findings, **rule ids
  scoped by shape** (`work/done-without-resolution`, `rule-id-reserved`); one table of every `$` name, CEL's
  spellings reserved, `$$` for a literal; Marquise's content-model page marked decided where SPEC-201
  decides, inline matchers, groups, `position: last`, counts, keys comparing text, a neutral template example;
  attributes gain `pattern`, `positional`, `as: inline|block`; rule fixes as Marquise's `set`; selectors
  accept both name spellings, `has:` present and non-empty, regular expressions search; both scope pages
  complete; **features not yet graduated live in their own 0.x packages beside Marquise 1.0** (keeping "no
  experimental flags"); READMEs generated from the concept indexes; SPEC-199's tables and stale details
  updated; several creates in one changeset allocate distinct ids. Glossaries filled.
- Q7. Rivière's extension points (asked by the user, after the size assessment: Rivière's risk is breadth).
  *Decided 2026-11-21* (Rivière's new `plugins.md`; `scope.md`): (1) **core is what every corpus needs and what
  cannot be built on the public API** (snapshot, cache, clock; collections, identity, former ids; references,
  inverses, `inverseOf`, symmetric, mentions; rules across entities, views, saved writes; changesets, sinks,
  the write policy; the deferred shapes; YAML/JSON data files; JSONL); (2) **a plugin model**: config keys under
  the plugin's name with a published schema, selector vocabulary through Marquise's API, **derived members
  with declared dependencies**, checks over the snapshot and **over a change**, sources/sinks/formats/
  resolvers/overlay loaders/id generators, CLI commands and MCP tools from one declaration, prefixed
  findings; Marquise's constraints; (3) out of core: `tree`, `workflow` (transitions, `from`/`changed`),
  `trace` (fingerprints, diff, baselines), `formats` (CSV, TSV, NDJSON), `regions`, `federation`, `sqlite`; git
  in `@riviere-md/node`; (4) **`tree`, `workflow` and `formats` ship first-party in the first release,** plan's
  rebuild depending on `workflow`; (5) **corpus definitions** (shapes, collections, views, writes, rules) as
  publishable packages, plan's first (`@refrakt-md/plan-corpus`), the worked domains next.
- Q8. The write path's many ways of reading and writing (asked by the user). *Decided 2026-11-22* (Marquise's
  `writing.md`, "Two writers"; `content-models.md`; `shapes.md`; SPEC-201 D1.10, D8): (1) **`template:` replaces
  `{% form %}`:** compact forms are templates in frontmatter (`compact: { item: { template } }`), matchers derived
  from them, link destinations as placeholders in `(…)`, no Markdoc `if` or sentinel; (2) **part-based item
  models are written in the fields' declared order,** each in its matcher's canonical markup; existing items
  keep their order; (3) **`from`/`extract` removed,** a link's text and destination read by a template;
  (4) **regular expressions only constrain values** (`pattern`), never extract fields; refrakt's `budget`
  moves to a template; nothing is read-only for being regex-extracted; (5) **one write hint,** `write: { level }`,
  only where the model leaves a choice; (6) **two writers** (the content-model writer, the template engine)
  beside the attribute tokenizer and value formatters, tested by one round-trip property over every example.
  Answers F4, F5 and F6. Not simplified: source positions, the next topic.
- Q9. Source positions for the write path (X5a). *Decided 2026-11-22* (Marquise's `syntax.md`, "Reader,
  locator, printer"; `writing.md`; `findings.md`): (1) Markdoc stays the only reader; (2) the first locator is
  micromark with a Markdoc-syntax extension, indented code and raw HTML switched off, and attribute values
  located by Markdoc's own `tag.pegjs` compiled with locations; (3) structural matching, `write-unlocatable`
  on any disagreement, every write verified by re-reading (`write-unverified`); (4) frontmatter through a YAML
  CST; (5) a second spike decides it, measuring agreement over refrakt's corpus and an extended edit suite;
  (6) one parser later only if the measurement supports it, upstream positions offered not depended on.
  **Added by the user:** (7) **the mechanism behind a seam:** a front end is reader, locator and printer; the
  two writers are syntax-neutral; verification sits outside the front end; the interface stays internal until
  a second implementation (another locator, or Comark's with `remark-mdc`) exists. Answers X5a.
  *Spike run 2026-11-22* (`spike/markdoc-locator/FINDINGS.md`): micromark extension (~150 lines) and
  Markdoc's `tag.pegjs` recompiled with peggy for value offsets; **99.4% agreement** over 1,474 files (97.1%
  against plain `Markdoc.parse`, 99.0% with refrakt's `escapeFenceTags`), the nine left being eight unclosed
  inline tags in prose and one `|` in a code span in a table cell, both refused; no indentation shim needed;
  **11/11 edits verified, 2/2 disagreements refused;** ~5 ms a file (5.5x Markdoc). Consequences: the reader
  includes the fence escape (Markdoc processes tags in fences by default, and plain Markdoc renders the rest
  of a page inside the `<pre>` after an unclosed tag in a code example); frontmatter through `yaml`'s CST API,
  not its document API; the printer keeps the author's spelling (markdown-it percent-encodes destinations);
  one parser later only after matching markdown-it's tolerance of malformed content. A dialect pre-pass
  (refrakt's `normaliseEach`, rewriting bare `each`/`chrome` to `=true`) needs a counterpart in the locator's
  grammar, or the locator refuses those tags' attributes.
- Q10. Bundle size and the document handle (asked by the user: a playground rendering user content should not
  carry the write path). *Decided 2026-11-22* (Marquise's `api.md`, `scope.md`, `commands.md`, `findings.md`):
  (1) **optional capabilities installed into the instance,** `createMarquise({ writer, computes })`, core holding
  only interfaces, so the handle keeps `doc.edit` (the user's wish) while read-only bundles have no path to the
  write code; (2) **calling an uninstalled capability throws** with the fix in the message (a programming
  error); a shape with `computes` and no evaluator is a finding (`computes-unavailable`); (3) **capability-aware
  types:** documents have `edit` in their type only when a writer is installed; (4) **no import-time patching
  or registration;** (5) heavy optional packages (`@marquise-md/write`, `@marquise-md/cel`) **stay separate after
  graduating,** versioned in lockstep, narrowing "graduating moves it into core" to light, near-universal
  features; core ESM with `sideEffects: false`, tooling outside the runtime; `marquise build-shapes`
  (precompiled shapes) a leaning after 1.0; **a browser read-and-render size budget as a 1.0 exit test.**
  (6) **Operations as plain JSON with schemas, no transport layer** (asked about MongoDB's client model):
  every operation's input and result serialisable and declared once in the table of operations, from which
  CLI and MCP are generated and a remote client could be; none built until a hosted product needs it, since
  the read API is synchronous by design and transports freeze guesses. Answers A4 (the table is one
  declaration per operation: input schema, result schema, function).
- Q11. Sync or async (asked by the user, since it is costly to change later; Prettier 3's move to async the
  cautionary precedent, unified's dual API the other). *Decided 2026-11-22* (Marquise's `api.md`,
  `commands.md`; Rivière's `writing.md`, `corpus.md`, `scope.md`): (1) **producing is async, reading is
  sync,** in both projects: `load`, `edit`, `update`, `fill`, `rebase`, Rivière's writes and `apply` async;
  findings, tree, records, selectors, rules and queries sync; (2) host callbacks may be async and are called
  only while producing (answers the review's "which callbacks may be async?"); (3) capabilities may be given
  as loaders, resolved on first use; (4) no synchronous edit variant unless a real need appears. Use cases the
  user asked for, beyond local and a GitHub app: hosted editor and agent sessions ending in one commit;
  real-time collaboration, offline-first editing and store sync (edits against moved text); codemods and
  gardening jobs on serverless runtimes (cancellation, progress); review bots and AI drafting (proposing,
  streaming); browser, desktop and blob-store hosts. From them: (5) **a working copy in Rivière,**
  `c.with(cs)`, later writes and queries seeing pending changes, applied once; **changesets compose**
  (`cs.then`), checked against the session's starting hashes, ids allocated across the session; (6)
  **`rebase(result, newSource)` in Marquise:** untouched spans move, changed ones re-resolved by address or
  refused; (7) **`AbortSignal` on every producing operation,** progress for bulk ones; (8) **review
  suggestions as a sink** in `@riviere-md/github`, later. Streaming validation stays open.
- Q12. A database instead of files and git (asked by the user: a site builder like a hosted website creator).
  *Decided 2026-11-22* (Rivière's `corpus.md`, "Stores"; `scope.md`): Marquise fits unchanged (storage-free,
  untrusted by default, customer-defined blocks safe as data, kits, forms, the write path). For Rivière:
  (1) **Markdown source as the stored truth,** records a derived projection; (2) **paths are document keys,**
  so globs, templates, path-derived ids and folder parents work on any store, a move re-keying; (3) **sources
  declare capabilities** (`versions`, `history`, `dates`, `watch`), missing ones giving findings; (4) **store
  sinks apply in one transaction** with compare-and-swap on expected hashes, the lock and journal only for
  files; (5) **sinks may maintain a records projection** on apply; (6) **the in-memory source and sink
  first-party in the first release,** through the same suite as files; a SQL source and sink later. Written as
  the fifth worked domain, **`site-builder-as-shapes.md`**: tables (documents, revisions, records, drafts),
  a customer-designed block, one corpus per site with configuration as JSON, the editor through a working copy,
  persisted drafts rebased on reopening, publishing as a saved write under the workflow plugin, a published
  version served beside the current one. Its to-do list: (S1) named versions as a source capability,
  generalising baselines beyond git refs; (S2) shapes from a store (strings or precompiled) for
  `createMarquise`; (S3) **configuration as plain data throughout,** code only by registered names; (S4)
  customers renaming fields in their blocks need migrations sooner than after 1.0; (S5) many sites per process:
  eviction and cross-instance invalidation; (S6) a helper for persisted drafts, open. Also aligned:
  `transitions` under the workflow plugin's `workflow:` key.
- Q13. Configuration as plain data (S3). *Decided 2026-11-22* (new `configuration.md` in both repositories;
  `api.md`, `commands.md`, `findings.md`): (1) **two layers:** configuration, what a project declares, as plain
  JSON; host bindings, what a program provides, as code (callbacks, capabilities, sources and sinks, registered
  plugins, resolvers, loaders, checks, formats, vocabulary); (2) **`marquise.config.json` and
  `riviere.config.json`,** validated against published schemas, **never executed**, so every tool (and a hosted
  service reading someone else's repository) reads them without running code; (3) **code by registered names
  only,** `config-unregistered` otherwise, package names resolved by the node packages locally and registered
  explicitly when hosted; (4) **`createMarquise(config, bindings)`, `createRiviere(config, bindings)`**, code
  may produce configuration but never contain it; (5) **`extends`** reads corpus definitions as data packages,
  keyed maps merged by key with the project winning, lists replaced; (6) no interpolation; Rivière's file names
  Marquise's. Also answers S2: shapes may be paths, strings or (later) precompiled. Refrakt's own
  `refrakt.config.json` was the precedent.
- Q14. Named versions (S1). *Decided 2026-11-23* (Rivière's `corpus.md`, "Versions", replacing "Baselines";
  `findings.md`, `scope.md`, `plugins.md`): (1) **a version is an immutable identifier** a source loads at
  (commit, revision, snapshot id); snapshots carry it and are cached by it forever; (2) **a named version is
  a mutable pointer** the source resolves (`head`, `published`, a branch or tag), with configuration aliases
  (`"versions": {…}`) replacing the trace plugin's `baselines`; (3) **`rv.moveVersion(name, version, {
  expected })`** through the sink, compare-and-swap, `version-moved` on failure, `version-unknown` for what
  cannot be resolved; (4) **a `versions` capability** (list and resolve names, load at, move, common ancestor);
  **`--against` source-neutral,** through the common ancestor when offered; (5) **the structural diff in core**
  (`c.diff`, `diff.toChangeset()` for revert, sync and review, `riviere diff`), the trace plugin keeping
  fingerprints, suspect links and change reports; (6) **two publishing models:** head is live with drafts as
  working copies (the site builder's default, per-page publishing free), or named versions for whole releases,
  staging and rollback. First release: the model, aliases, `--against`, the diff, the in-memory source's full
  support; moving names through git and store sinks later.
- Q15. Migrations (S4, with SPEC-189 revisited). *Decided 2026-11-23* (Marquise's `extending.md`,
  "Migrations"; `shapes.md`, `scope.md`, `commands.md`, `findings.md`; Rivière's site-builder page; SPEC-189
  revision note): (1) **declarative and structural tiers;** declarative soon (tag, attribute, value, slot and
  frontmatter-key renames, value maps to patches), structural with `compose`, lookups as registered code;
  renaming a content field needs no migration (fields match by position); (2) **placement by identity:** a
  shape's or dimension's own `migrations:` when it keeps its identity (a tag renamed onto it included); a
  migration file (shape-file format, old form in frontmatter, `compose` template body when structural) when
  the old form has no owner left (structural changes, merges, splits, retired dimensions, kit-to-kit
  mappings); asked by the user, who also asked about dimensions; (3) **`migration-applied` findings whose
  fixes write the new form;** old content keeps reading; (4) **the codemod is applying those fixes** through
  the write path (one document, `riviere fix`, a store transaction); (5) CEL for values, templates for text,
  no regular expressions; (6) expiry by `removeAfter` or **`until: unused`** (`migration-unused`); (7)
  dimension migrations reach everything in `appliesTo` and documents; (8) the declarative read half in 1.0 if
  proven, refrakt's deprecations the test. Answers Z2c (moving between kits: a package of migration files).
- Q16. Reusing vocabulary: structured data, variants and `extends`. *Decided 2026-11-23* (Marquise's
  `shapes.md` "Extending a shape", `rendering.md` "Structured data", `selectors.md`, `records.md`,
  `extending.md`, `commands.md`, `findings.md`, `scope.md`, glossary; Rivière's `corpus.md`, `queries.md`,
  `plugins.md`): (1) **schema.org mappings declared on fields,** in the schema satellite's namespace, type and
  nested types once per shape, property paths (`author.name`, `recipeInstructions[].text`); asked by the user,
  who questioned a separate mapper; (2) child shapes map themselves, the parent says where they go
  (`items: { property: hasPart }`); (3) `schema="none"` per instance; no ontology validation, the resolved
  mapping shown by `reference` and `explain`; (4) **no roles:** abstract bases serve as interfaces; (5) **no
  variants and no conditional mappings:** a value that changes meaning makes a different shape, one that
  changes look is a dimension or attribute; refrakt's playlist becomes a family (`album`, `mix`, `podcast`,
  `audiobook`, `series`; `track`, `episode`, `chapter`) with a migration from `playlist type=…`; reached after
  the user asked whether playlist's conditional types fit, then whether overlays should be general, then
  suggested separate shapes; (6) **`extends`:** one base, `abstract: true`; (7) **add and narrow only,**
  `extends-widens` otherwise; dropping refused at the user's prompting (factor into an abstract base, or copy);
  (8) chains flattened at load, analysed flattened (`extends-cycle`, `extends-unknown`, `shape-abstract`);
  (9) bases stand for descendants in content models, bindings (most specific wins), collections, selectors
  (`$shapes`) and generated types; (10) a base's migrations apply to descendants; (11) extend to stay
  connected, copy to own (`marquise add`, `marquise flatten`); a project may replace a kit's shape only by
  extending it; (12) in 1.0 if proven, refrakt's playlist family and plan's corpus the tests. Still open from
  the reusability brainstorm: fragments, and whether presentation roles are needed.
- Q17. CEL's implementation, after the spike. *Decided 2026-11-24* (refrakt's `spike/marquise-cel/FINDINGS.md`;
  Marquise's `syntax.md`, `scope.md`, `findings.md`; Rivière's `references.md`; SPEC-195's D1 note): measured on
  `@marcbachmann/cel-js` 8.0.0 and `@bufbuild/cel` 0.6.2: checker 18/18 against a stub (calls, fields and
  comprehensions throw), conformance 73% against 84% in plain-value terms, 21 and 19 of 25 worked cases,
  23 kB against 68 kB gzipped, compiling ~10× faster; cel-js's `matches()` backtracks (10 s on 29 characters)
  and cannot be overridden; `@bufbuild/cel` has no optionals and reads `timestamp(int)` as milliseconds.
  Decided: (1) cel-js inside `@marquise-md/cel`, `@bufbuild/cel` revisited once its checker ships; (2) no
  `matches()` in `computes`, lifted by an RE2 option in cel-js; (3) no macro inside a macro, chained allowed;
  (4) the profile as Marquise's own AST walk, findings `computes-not-in-profile`, `computes-order`,
  `computes-type`, `computes-error`; (5) `first`, `round`, `clamp` kept, `days` and `nextAfter` added, amounts
  as maps; optionals for absent attributes only; (6) integer and number strict; (7) evaluation errors are
  findings with the value absent; (8) the profile's conformance subset in CI with known deviations listed and
  fixed upstream; (9) synchronous functions only.
- Q18. Untrusted shapes (the fourth review's first point). *Decided 2026-11-24* (Marquise's `trust.md`,
  "Untrusted shapes"; `findings.md`, `scope.md`, `syntax.md`; Rivière's site-builder and context-bundles pages):
  the trust model treated shapes as code, while the site builder stores customers' shapes and the CEL limits
  assumed untrusted ones. (1) a trust level per shape source, apart from content's; an untrusted shape's
  instances are always untrusted content; `untrusted: true` on the site-builder page replaced; (2) untrusted
  shapes are data that narrows: no code the host has not listed, no `requires: trusted`, only listed
  namespaces; (3) `plain.element` from an inert allowlist; (4) host-set size ceilings with defaults; (5) may
  extend a trusted shape, never replace one; migrations only onto its own shapes; (6) text escaped for people
  and marked as untrusted for agents (a prompt-injection path through `description`, found while listing what
  a shape reaches); (7) findings `shape-untrusted-code`, `shape-untrusted-element`, `shape-too-large`,
  `shape-untrusted-replaces`, `shape-untrusted-namespace`; (8) after 1.0, additive, arriving with stores.

**The outside review** (section 21)

- X1. *Decided 2026-11-19:* Marquise 1.0 is the read path, records included: one syntax (Markdoc); shape
  files with the revised content model, `as`, `description`, `summary`, `plain`; validation, finding ids,
  addresses on findings; records, JSON Schema, the Standard Schema validator, generated types; the shape
  node, the plain presentation, the renderers refrakt already has; `validate`, `types`, `extract`,
  `format`, the language server. After 1.0: the write path and write templates, body blocks, `computes`
  and `prepare`, document and deferred shapes, kits, dimensions, presets, bindings, middleware,
  migrations, MCP, `compose`, a second syntax. Reading compact forms may be in 1.0 with matchers declared
  in frontmatter. **The content-model revision is built in refrakt first,** so 1.0 ships the revised format
  rather than a 2.0 following at once.
- X2. *Decided 2026-11-19, revising SPEC-199 decision 4:* **extract early rather than incubate.** Building
  both projects and plan's rebuild inside refrakt's monorepo would let refrakt-shaped seams grow with
  nothing forcing a public API (how `runes` reached 111 exports), could not verify seams that only prove
  themselves across a boundary, and would turn the move into a large, late migration. So: the
  content-model revision in refrakt; Marquise extracted as 0.x to its own repository as soon as the read
  path exists, with refrakt depending on it at once; Rivière in its own repository as 0.x, plan rebuilt
  on it; the parser spike (X5) before anything writes; 1.0 for each after a period of stability with a
  consumer besides refrakt (the proof project for Marquise, a consumer unlike plan for Rivière). Building
  and freezing differ: 0.x builds a lot while still allowed to break. SPEC-199's decision 4 and "Order"
  updated.
- X3. *Decided 2026-11-19,* written as SPEC-201: refrakt's resolver is already deterministic (ordered,
  greedy, forward-only, no backtracking, as a PEG), and that algorithm becomes normative, unchanged.
  XML Schema's unique particle attribution rule is not the default, since it would reject `hero`'s
  intended "first paragraph is the blurb" shadowing; backtracking is rejected (unpredictable, exponential
  on untrusted text, reassigns streamed fields, not invertible). A load-time analysis reports
  `field-unreachable` (error) and `field-shadowed` (info; warning when the shadowed field is required),
  serving shape authors, the write path, completions, streaming validation and the published schema. A
  **strict mode** (per shape or project) makes shadowing an error, guaranteeing everything is writable by
  inference alone.
- X4. *Decided 2026-11-19* (Marquise's `docs/concepts/writing.md`, "The laws"): the write path is a
  lens (get = resolve, put = edit; the source keeps the complement: formatting, comments, unclaimed
  content, forms, the author's spelling of values) and keeps three laws. **PutGet** is the round-trip rule.
  **GetPut**, new: writing back what was read gives zero edits, so operations come only from values that
  changed, compared as typed values (`3:45` equals `PT3M45S`), and a changed value's formatter reuses the
  existing text's style; needed for store syncs, agents resending whole records, unchanged drafts and empty
  Rivière changesets. **PutPut** holds for values but not always for form: a promotion to explicit is
  sticky, reverted only by `convert`. Tested as properties over every example in a shape library (values
  generated from each field's JSON Schema; bytes outside a changed range identical); read-only fields
  excluded from PutGet, still checked by GetPut. Goes into the write path's spec when it is written (after
  Marquise 1.0).
- X5. *Run 2026-11-19* (`spike/parser-positions/`, FINDINGS.md). **Markdoc** (0.5.13) gives line ranges,
  inline nodes inheriting their block's lines, no columns; **Comark** (0.9.2) the same on its markdown-it
  tokens (every block has a line map, correcting "only components"), its tree nothing; **mdast**
  (micromark) exact offsets on every node, inline included. Finding a value by scanning a block's lines
  **failed silently on ordinary content** (an `href` edit hit a look-alike inside a code span, corrupting
  it); exact offsets found it inside the link's own span. A **hybrid** (Markdoc for structure, micromark
  re-reading one block for inline positions, matched by order) worked, but needs verify-and-refuse, since
  the two parsers must agree and Markdoc's inline tags are text to micromark. **No parser locates
  attribute values**: a small tokenizer over the tag's opening is needed whichever is chosen. **The MDC
  syntax already has a positioned parser,** `remark-mdc` (3.11.1, nuxt-content, updated July 2026), with
  explicit slots. Implications: the read-path 1.0 on Markdoc is unaffected (line positions suffice for
  findings); the write path (after 1.0) needs inline positions, through (a) the hybrid with
  verify-and-refuse, (b) a micromark extension for Markdoc's tag syntax, (c) the MDC/Comark syntax family
  through `remark-mdc`, or (d) inline positions contributed upstream to Markdoc or Comark. Open (X5a),
  and a data point for the primary-syntax question (Z1i).
- X6. *Decided 2026-11-19* (Rivière's `docs/concepts/corpus.md`): **identity is `(collection, id)`**; the
  address is the **location**, where an entity currently is; a **reference** points at an identity. So
  moving a file rewrites only Markdown links to it, never typed references or mentions; only renaming an id
  rewrites references. An entity is a shape instance with an id, in a collection; other instances are
  addressable but not referenceable. A document's id comes from frontmatter, its tag or the collection's
  file pattern, disagreement being a finding; entities from a store or history have identity without
  location; the snapshot stays keyed by file, the entity index by identity; a qualified mention
  (`spec:SPEC-12`) settles ambiguity. Open: a locale in identity (with X12).
- X7. *Leaning 2026-11-19* (Marquise's `docs/concepts/records.md`, "Rich text"): a `block` or `inline`
  field is `{ markdown, syntax, text, shapes }` in a record, not a Markdown string. `markdown` is the source
  (round trips, re-rendering through Marquise; not safe HTML); `text` is derived and read-only (search,
  embeddings); `shapes` holds nested shapes as full records with their addresses, so addresses through a
  field resolve (`recipe.body.callout.title`), types are precise (`RichText<CalloutRecord | …>`), and
  Rivière finds entities nested in prose. `as: text` stays a string. All members by default (leaning), with
  an option to drop some for large exports. A batch changing both `markdown` and a nested shape is refused
  as overlapping targets (follows from A1). Not included: prose order around nested shapes (the tree through
  the API) and HTML (the host's, from rendering). Answers A7 and M1. Records are in 1.0, so this is a 1.0
  question.
- X8. *Decided 2026-11-19* (Marquise's `docs/concepts/records.md`, "Value types"): **records hold plain
  typed values**, not `{ value, source }`: the author's style is kept by the write path, which never touches
  an unchanged value (GetPut) and, when a value changes, detects the style of the old text at the field's
  location and reuses it (`3 min 45 s` stays in that style); a new value takes the field's declared style
  (`format: clock`), the examples' style or the type's default; a consumer wanting the author's wording asks
  by address. **Only unambiguous forms are parsed** (ISO dates, written-out months, plain numbers);
  `11/12/2026` or `29,000` is `value-ambiguous` unless a format or locale (`lang`, `$locale`) is known.
  **Core value types in 1.0:** `number`, `integer`, `boolean`, `date`, `datetime`, `url`, `duration`
  (refrakt uses it; schema.org needs ISO 8601 durations). **After 1.0, a value-type registry** (parser,
  style-detecting formatter, JSON form, JSON Schema, TypeScript type) for ratings, measurements, money.
  **Money, when it comes:** a decimal string with an explicit currency, never a float, never a currency
  inferred from an ambiguous symbol (`money-currency-unknown`).
- X9. *Decided 2026-11-19.* (1) **Collections opt in to being read from content**
  (`content: { read: true | [fields] }`), off by default in untrusted mode, on in trusted mode; a query on
  an unreadable collection behaves as empty, with `collection-not-readable` for the author, and a `ref` to
  an unreadable entity renders as plain text, so nothing reveals existence; the API, exports and MCP act
  for the host and are unaffected (Rivière's `corpus.md`, `shapes.md`). (2) **In untrusted mode the host's
  shape wins;** frontmatter may choose only among shapes the host allows for that folder or collection;
  trusted mode keeps frontmatter winning (Marquise's `trust.md`, `shapes.md`). (3) **Bundle delimiters
  carry a token derived from the bundle's hash** (content cannot contain the hash of the bundle containing
  it), keeping bundles deterministic; only token lines are structure, and the JSON form cannot be forged
  (Rivière's `context-bundles.md`). (4) **The trust guarantee is decided** (untrusted by default, no code in
  content, declared attributes only, URL allowlist, readable collections only, frontmatter within the
  host's shapes); its details (allowlists, blocked elements, limits) stay a leaning. Also stated: content
  written by agents is untrusted content.
- X10. *Decided 2026-11-19* (Rivière's `docs/concepts/writing.md`, "Concurrency"). (1) **Scoped
  guarantees:** expected hashes give no lost updates within one working tree; a short exclusive lock
  (`.riviere/lock`) closes the race between processes applying at once. (2) **Claims across clones conflict
  in git:** identical edits merge silently, so a claim writes its claimant (`assignee: agent-7`); the
  second push is rejected or its rebase stops, Rivière re-validates and refuses the second claim; **a claim
  is final once pushed**; `riviere claim` writes, commits and pushes in one step; claiming by pushing a git
  ref is a later option. (3) **Recoverable applies:** lock, verify every file, temporary files, a journal
  with backups, atomic renames; restored on failure, and by the next command after a crash; no
  transactions in the database sense. (4) **Rebase by value:** changesets keep operations and the values
  expected at each target beside the compiled `WorkspaceEdit`; on a hash mismatch, if every target still
  holds its expected value the edits are recomputed against the current version, otherwise refused naming
  the target, so an unrelated typo fix elsewhere no longer blocks an agent.
- X11. *Decided 2026-11-19:* borrow standard formats at the edges. (1) **Changesets are shaped as the
  language server protocol's `WorkspaceEdit`** (checked against `vscode-languageserver-types` 3.18.5):
  per-document text edits plus `create`, `rename` and `delete` file operations, and change annotations
  (`label`, `description`, `needsConfirmation`) carrying the changeset's metadata; Rivière adds content
  hashes beside the format's integer `version`; positions converted exactly to its UTF-16 line and
  character offsets; any editor previews, applies and undoes them (Rivière's `writing.md`). (2) **SARIF
  export** (`marquise validate --format sarif`, read by GitHub's code scanning), and **suggested fixes on
  findings** as edit operations where Marquise knows one (Marquise's `validation.md`). (3) **`computes`
  evaluates CEL first** when it graduates (guaranteed to finish, typed, specified), refrakt's value
  functions as CEL custom functions; JSONata only if transformation power is needed. (4) **Rivière exports**
  (`riviere export --jsonl` first, read by DuckDB and `jq`; SQLite later) instead of a query-engine seam,
  which stays deferred, perhaps for good (Rivière's `queries.md`).
- X12. *Decided 2026-11-19*, except where marked. (1) **Generic MCP tools by default** (`find`, `get`,
  `create`, `update`, `context`, each taking `collection`; schemas as resources; per-collection tools as an
  option), since agents choose worse among many tools (answers V19). (2) **A structured-output schema
  profile** for model APIs' strict modes, the output still validated by Marquise. (3) **Typed instances,**
  `createMarquise<Shapes>()`, beside the global registry. (4) **The plain presentation keeps the source's
  semantics:** heading fields as headings at the author's level, lists as lists, alt text kept, the root
  labelled by its heading (`aria-labelledby`); fixed before 1.0, since the markup is a contract. (5)
  **Content hashes after normalising line endings to LF; text comparisons in NFC,** case-sensitive;
  **translations as locale variants** of one identity (*leaning*, Rivière after 1.0: `lang` by frontmatter
  or folder, references resolving to the reader's locale with fallback, keys per variant, per-locale
  heading aliases). (6) **YAML 1.2** for shape, dimension and kit files. (7) **Prior art** (Keystatic,
  TinaCMS, Sphinx-Needs, Doorstop, Obsidian's Dataview and Bases, SHACL, DITA, DocBook): a reading task
  producing a "Prior art" page in Marquise's docs (section 23).

**Rivière** (section 3)

*All decided 2026-11-18:*

- V1. The corpus snapshot is Rivière's centre, mirroring Marquise's document handle.
- V2. Collections are declared in Rivière's config: file layout is the project's, and one shape can
  live in two collections.
- V3. CLI writes default by how many files they touch: a changeset within one document applies by
  default (`--dry-run` available: `set`, `create`, `update`); one spanning several documents is shown
  and needs `--apply` (`rename`, `move`, `delete --force`), as `plan update` and `plan migrate` do today.
- V4. Saved views, as stored arguments to `find` or `count` only: no parameters, no views built from
  views; logic makes a script.
- V5. Ids unique per collection (Astro agrees); the CLI accepts a bare id when only one collection has
  it and reports ambiguity otherwise.
- V6. The built-in grammar gains negation, comparison, existence, nested fields and paths through
  references; OR across different fields stays out until the catalogue asks for it.
- V7. The engine seam lives in Rivière only.
- V8. The query catalogue comes first, before any grammar change.
- V9. SPEC-138 is narrowed in refrakt, the lab: its catalogue and the typed extensions are tried there to
  graduate to Rivière; the engine seam is deferred (note added to SPEC-138). *2026-11-19 (X11):* an export
  (JSONL, later SQLite) serves queries beyond the selector language instead; the seam may never be needed.
- V10. The URL policy lives in each integration (the Astro loader takes `urls`).
- V11. Astro is Rivière's first integration; the loader needs no private seam.
- V12. Rendering in Astro: (c) static HTML plus the stored tree first, (b) deferred rendering through a
  Marquise content entry type as the end state.
- V13. Became a task (section 22): the deferred-rendering spike.
- V14. The query shapes (`collection`, `aggregate`, `relationships`, `expand`) live in Rivière's core:
  small, the API's authoring form rather than a vocabulary, one package fewer.
- V15. `ref` is in Rivière's core: prose mentions are indexed.
- V16. `relationships` defaults to the page's own entity when the document is one (a document shape with
  an id); otherwise `of=` is required, and leaving it out is a finding.
- V17. Per-item templates before `compose`: components and the plain presentation only; no temporary
  template mechanism.
- V18. Context bundles: designed 2026-11-18 (section 3); its open parts are V21 to V24.
- V19. Generated MCP tools: one set per collection (`find_work`, `create_work`), or generic tools with a
  `collection` argument whose schema is a union? Many collections mean many tools. *Decided 2026-11-19
  (X12):* generic by default, per-collection as an option.
- V20. Changeset metadata: which fields (author, agent, reason, source finding), and how they reach git?
  *Partly answered 2026-11-19 (X11):* carried by `WorkspaceEdit` change annotations (label, description,
  `needsConfirmation`); the extra fields and the git trailer mapping remain open.
- V21. Defaults for what a bundle follows: on the shape's reference fields under `riviere:`,
  overridable in config (*leaning*), or in config only?
- V22. *Decided 2026-11-18:* the summary projection is a core shape-level declaration (section 11),
  reused by bundles, CLI tables, MCP lists and `collection` items.
- V23. Deferred shapes in bundles: not expanded, expanded as summaries, or in full?
- V24. The budget: required in the API with a CLI default (8,000?), or unlimited when not given?

**Writing forms** (section 18)

- F1. Is reading derived from a write template tolerant enough for real authors? To try on refrakt's
  ten compact-form runes (playlist, accordion, timeline, cast, itinerary, reveal, plot, character,
  faction, realm).
- F2. Which optional parts a generated snippet includes: required fields only, plus parts marked
  `snippet: true`?
- F3. The block's name: `form`, or another?
- F4. Comark's equivalent of Markdoc variables and `if` for write templates (untested). *Answered 2026-11-22 (Q8).*
- F5. Do item models become write templates (`{% form "<field>" %}`), with matchers derived as for
  compact forms? *Answered 2026-11-22 (Q8).*
- F6. The set of write hints on content-model fields: heading level, the alternatives' order, anything
  else a generated writer cannot decide? *Answered 2026-11-22 (Q8).*

**The programmatic API** (section 19)

- A1. *Answered 2026-11-17* (section 19, Addresses): dots and brackets, camelCase, indexes from 0,
  declared item keys, batches resolved against the version they target.
- A2. Cross-document reads in 1.0: `extractAll` over a directory is cheap and useful; resolving
  references between documents starts to be the corpus layer (M3, M7).
- A3. Incremental reparsing for the language server, or whole-document reloads cached by hash?
- A4. The table of operations: one declaration per operation (input schema, result schema, function)
  from which the CLI, MCP tools and docs are generated, as plan's bindings do by hand today? *Answered 2026-11-22 (Q10): yes.*
- A5. Drafts (`doc.update`) as the typed way to write, with string addresses as the protocol, or typed
  string addresses (`doc.set`) as well?
- A6. Value types as branded strings in JSON forms (ISO dates and durations), or richer runtime
  objects, which would break the plain-JSON rule?
- A7. Shapes inside a block field: reached through their own records and addresses with the field
  typed `Markdown`, or a typed union of the shapes allowed there? Depends on M1. *Leaning 2026-11-19
  (X7):* both: the field is `RichText<…>` typed by the shapes it allows, and its `shapes` member holds them
  as records with their own addresses.
- A8. Address types: literal checking only, or the value type at each address too (only if typed
  `doc.set` is wanted)?

## 23. Next topics

- In refrakt: migrate `collection` and `data` filters to comma-for-OR, repeated-field-for-AND, with a codemod
  over `site/content` and `plan/` (G3).
- Rivière's design tried on other domains: all gaps decided (G1 to G17, section 22). Worked domain pages
  beside "Plan, as shapes", as test fixtures: **traceability written 2026-11-21** (Rivière's
  `traceability-as-shapes.md`); its to-do list: (T1) item text patterns (`"{req} ({coverage}, reviewed
  {reviewed})"`), a content-model question for SPEC-201's revision; (T2) the latest result per test (a
  `latest` step or `computes`); (T3) paths in `fields` projections; (T4) coverage percentages (`computes`);
  (T5) ordering by the tree (open from G7; *later:* decided, theme 2); (T6) negating a bracket clause, to state in the grammar. **A docs
  site written 2026-11-21** (`docs-site-as-shapes.md`); its to-do list: (D1) ids and parents derived from
  paths (`id: { from: 'path' }`, a parent from the folder); (D2) ordering by the tree, again (T5); (D3) a
  paragraph read by a pattern (`"**{term}.** {definition}"`), the same question as T1; (D4) mentions in
  selectors (`mentions()`); (D5) Markdown links as edges ("pages nobody links to"); (D6) a local resolver
  (file exists) as safe in the first release, refrakt's `refrakt.stale` the precedent; (D7) versioned docs, as
  variants like translations. **Events written 2026-11-21** (`events-as-shapes.md`); its to-do list: (E1)
  writing without git (forms from the input schema, an API sink, host identities for `editors`); (E2)
  comparing two fields (`end:>start`); (E3) money as a value type; (E4) recurrence and opening hours; (E5)
  grouping in the `collection` shape (refrakt's has `group`); (E6) formats in path patterns
  (`{start:date}`); (E7) tickets as an overlay. **Across the three pages, the recurring themes:** patterns
  reading several fields from one list item or paragraph (T1, D3); ordering by the tree (T5, D2); `computes`
  (T2, T4, E4); projections and grouping in `collection` (T3, E5); a sink beyond the local checkout (E1).
  Going through them in that order (user, 2026-11-21). **(1) Text templates, decided 2026-11-21** (SPEC-201
  D8; Marquise's `content-models.md`, "Several fields from one run of text"): `text:` templates on headings,
  paragraphs and list items, Markdown inline syntax matched structurally, typed placeholders, left to right
  without backtracking (`text-template-ambiguous`), optional groups `[? … ]`, `text-mismatch` keeping the node,
  the template doubling as the write template, a template or parts per item model; in 1.0. Closes T1 and D3;
  the worked pages and external kinds (renamed `pattern` to `text`, since `pattern` means RE2 in shapes) use
  them. **(2) Ordering by the tree, decided 2026-11-21** (Rivière's `queries.md`, "Ordering by the tree"):
  `tree: { parent, order }` on a collection, one per collection; `sort: '$tree'` depth-first, siblings by the
  declared order, then title, then id; positions over the whole collection before filtering; `$depth`,
  `$position`, `$prev`, `$next` in `links` and the loader; `tree-cycle` placing the cycle at the root; derived
  parents and `reorder` later; first release. Closes T5 and D2. **(3) Computes in CEL, decided 2026-11-21**
  (Marquise's `syntax.md`, "Expressions in shape files: CEL"; Rivière's `references.md`): the user asked for
  fresh eyes, since SPEC-195 chose Markdoc call syntax without comparing CEL, on a premise (one content
  syntax) that Comark undoes. Researched: CEL's spec (linear time, cost model, type checker, Kubernetes
  `variables` as computed values in YAML); JS implementations `@marcbachmann/cel-js` (light, public
  checker, no conformance claim) and `@bufbuild/cel` (conformance-tested, beta, heavy, checker not public);
  Comark has no expression language (path lookups, `::if` with comparison props). JSONata compared at the
  user's request: tersest for paths, but Turing-complete, untyped, JSON-only, a query language; SPEC-138 had
  it as a finalist for the dropped engine seam, not rejected on merit. Decided: (1) CEL as a defined profile
  for `computes`; (2) plain dot paths (answers Z1e), Marquise's value types as CEL types; (3) SPEC-195's
  vocabulary as CEL custom functions with its admission rule and guardrails; (4) **selectors choose, CEL
  computes**, bridged by `matches()`; **templates look up, they do not compute** (works in Markdoc and
  Comark); (5) a spike on both JS implementations before freezing, Kubernetes' `variables` as the evaluation
  model; (6) SPEC-195 D1 and D8 reopened, the rest kept. Rivière's computed values across entities in CEL,
  in `links`, after the first release (T2, T4, E4 designed). **(4) Projections and grouping, decided 2026-11-21** (Rivière's
  `queries.md`, "Projections and grouping"): `fields` entries are selector paths (lists shown as lists), `as`
  labels, typed columns in the resolved node beside records; `group` by a path (sort order, a last group for
  missing values, fan-out for list values, one level); groups as data, `group-display` replaced by
  composition; on views, the API, the CLI and regions; first release. Closes T3 and E5. **(5) Writing without git, decided
  2026-11-21** (Rivière's `corpus.md`, "Writing without git"; `writing.md`): hosted writes on the server
  behind the host's sign-in, never a token in the browser; actors and groups from the host, commits by the app
  with the editor in a trailer (names, no emails unless no-reply); the policy's `confirm` opens a pull request
  through a hosted sink, `allow` commits directly; stale form edits rebased by value or refused with a finding
  for the person; changesets gain binary file operations limited by the host's asset rules; no editing UI,
  a recipe once `@riviere-md/github` exists. Closes E1 in design. **The recurring themes are done;** left on
  the worked pages' to-do lists: T6 (negating a bracket), D1 (ids and parents from paths), D4 (mentions in
  selectors), D5 (links as edges), D6 (a local resolver), D7 (versioned docs), E2 (comparing two fields), E3
  (money), E6 (formats in path patterns), E7 (tickets as an overlay, designed). **T6 and E2, decided 2026-11-21**
  (Rivière's `queries.md`, "Negation", "Comparing two fields"): a leading `-` negates the whole clause (a table
  in the docs; `-all:` and `[-…]` differ only on empty lists); two-valued logic, clauses about missing values
  false so their negation true, `has:` the explicit check; `$this` (the record tested, the item in brackets)
  and `$root` (the entity evaluated for) as right-hand values; right-hand paths give one value
  (`selector-value-list`); comparable types checked against the shape; `±duration` the only arithmetic; first
  release, in the shared selector package. **D1 and E6, decided 2026-11-21** (Rivière's `corpus.md`, "Paths
  are two-way templates"): a collection's `path` is read and written by the text-template engine (D8);
  formats `{x:date}`, `{x:year}`, `{x:month}`, `{x:slug}`, `{id:path}` (may contain `/`); alternatives read in
  order, written with the first (`docs/{id:path}/index.md`, then `docs/{id:path}.md`, as Astro's file ids),
  `path-unmatched`; a path supplies a field the document does not state, written values win (`path-mismatch`,
  fixed by a move); `tree: { parent: { from: 'folder' } }` a derived reference named `parent` in `links`,
  nearest existing ancestor, writes `field-derived`; moving renames with former ids. First release. **D4 to D6,
  decided 2026-11-21** (Rivière's `references.md`): `mentionedBy(collection)` and `mentions(collection)` as
  explicit steps, mentions kept out of ordering, cycles, `next`, `+` and default bundle paths; a Markdown link
  resolving to an entity (or an entity's anchor) is a mention, external URLs only later through kinds' `url`
  templates; a built-in `local-file` resolver, on by default (`external-missing`); repository files get
  `$modified`, so docs-behind-code is a rule (refrakt's `refrakt.stale` as configuration). First release.
  **Left on the worked pages:** D7 (versioned docs, like translations), E3 (money, value-type registry), E7
  (tickets, an overlay): all placed after 1.0 or designed.
- The second review: all taken (Y1 to Y17 decided).
- Send the message to Comark's maintainers (draft revised 2026-11-19 for Y8: Markdoc is the syntax; the
  interest is their renderers and document format).
- The outside review's design challenges: all taken (section 21; X5's parser route for the write path and
  X7's sub-questions still open). The "Prior art" pages (X12.7) are written (Y16).
- The seams Z1–Z6: all explored once (2026-11-13); their open questions remain (section 22).
- The content model's revision (section 17, C4).
- Marquise as a data store (section 18).
- The Astro spike (section 14).
- How kits combine when two overlap (K4).
- The tokens contract (P2).
- Interaction contracts as tests (K5, B1).
- When Rivière's work starts: the deferred-rendering spike (can a custom Astro loader use
  `deferredRender`, and how does a Marquise entry type coexist with Astro's own `.md`?), then the query
  catalogue (V8).
