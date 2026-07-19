{% spec id="SPEC-119" status="draft" version="0.3" tags="content, ai, cli, output, agents" %}

# Addressable page representations for machine consumers

Serve each refrakt page's authored source and transformed structure at predictable, per-URL addresses — `/path.md` (raw Markdoc) and `/path.json` (structured envelope) — backed by a single shared page serializer that also powers a `refrakt render` CLI command for local debugging.

-----

## Problem

refrakt already believes machines should consume site content, and ships two proofs of it: `/llms.txt` (a section-grouped page index) and `/llms-full.txt` (which concatenates every non-draft page's raw Markdoc source into one document). An agent doing research over a refrakt site can already get the authored rune source — in bulk.

What it can't do is get **one page's** representation at **that page's** address. The raw source exists only as the single aggregated `llms-full.txt` blob; there is no route that serves an individual page's Markdoc or structured content. An agent that lands on `/docs/hint` and wants to understand or edit *that* page has two bad options: re-download and scan the entire corpus, or scrape the rendered HTML.

Scraping the HTML is getting worse, not better. The identity transform already strips the typed field-value channel (`data-rune-fields`, per SPEC-082) from rendered output, and in-flight work (WORK-323/329/331/332) is dropping `data-field` metas further. The semantics an agent wants — *this is a `hint`, its `type` is `warning`, this slot is the `icon`* — are increasingly consumed into presentation and not recoverable downstream. The structured data exists in memory during the build (`SitePage.renderable`), but it is only ever emitted as HTML.

Meanwhile there is no way, even locally, to ask "what does *this authored page* transform into?" `refrakt inspect <rune>` answers that for a single rune with synthetic attributes, but there is no page-level equivalent. When a real page renders wrong, there is no command that dumps its transformed tree so you can tell whether the fault is in the schema transform, the identity transform, or the CSS.

This spec closes both gaps with one primitive: a per-page representation, addressable over HTTP and dumpable from the CLI, produced by a single serializer so the two surfaces cannot drift.

-----

## Design Principles

**One page, one address, three forms.** Every page already has a canonical URL. Its machine representations hang off that same URL by suffix — `/docs/hint`, `/docs/hint.md`, `/docs/hint.json` — so discovery is trivial: an agent that has the HTML URL (or a `sitemap.xml` / `llms.txt` entry) can derive the others by string manipulation, no separate manifest required.

**The structured tree is the point; HTML is a convenience.** The differentiating artifact is a JSON tree where rune identity and typed field values are first-class keys instead of stringified HTML attributes. A rendered `html` string is offered because it is cheap, but it is opt-in, not the reason the endpoint exists.

**Default to the lossless, authored form.** Of the two structured trees the pipeline produces, the default is the pre-identity-transform tree (`authored`), which carries the complete typed field data upstream of the presentation churn. The post-transform render twin (`rendered`) is available on request. See *Representations*.

**Suffix routes, not content negotiation.** refrakt sites are fully prerendered static output (`export const prerender = true` on every route). Static hosts don't negotiate on `Accept`. A suffix convention (`.md`, `.json`) prerenders to real files and works on any static host; content negotiation does not. The suffix is the contract.

**The CLI and the endpoint share one serializer.** `refrakt render <path> --json` and `GET /path.json` MUST call the same `serializePage()` function. The terminal output *is* the deployed contract. This is the same discipline `renderToHtml` already keeps by deliberately mirroring `Renderer.svelte`'s attribute logic — a shared function removes the need for any "mirrors X" comment because there is nothing to mirror.

**Resolved, not raw.** The representation is produced from the same `loadContent` pipeline the site build uses, so cross-page resolution (`breadcrumb auto`, resolved `{% ref %}` links, aggregated indexes) is already applied. This is the thing raw `content` alone cannot provide, and it is why the JSON form is more than a reformat of the `.md` form.

**Representations never exceed the published set.** A page has a `.md`/`.json` if and only if it has a prerendered HTML page. This parity is a security invariant, not an incidental detail — it makes "the machine endpoint leaks content the HTML never exposed" structurally impossible. See *Visibility invariant*.

-----

## Representations

Every page carries, in memory at build time, everything the representations need — `SitePage` already holds `route`, `frontmatter`, `content` (raw Markdoc body), `renderable` (the transformed node tree), `headings`, and `seo` (`packages/content/src/site.ts`). The three forms are projections of that record.

### `.md` — raw Markdoc source (round-trippable)

A complete `.md` file — frontmatter **and** body — not just the body. `SitePage.content` is the post-frontmatter body only; serving that alone hands an editing agent something it cannot safely write back (title, layout, tint inputs, draft flag all lost). Instead:

- **File-backed pages** (`SitePage.source.type === 'file'`, SPEC-069): serve the **original file bytes verbatim**. Re-serializing parsed frontmatter loses key order, comments, and formatting; verbatim bytes give a byte-stable round-trip (the property an editing agent or a `git diff` needs) — and it is *less* work than reconstruction.
- **Contributed pages** (`source.type === 'contributed'`): no file exists on disk, so reconstruct `serialize(frontmatter) + content`. Not byte-perfect, but there is no original to be faithful to.

This deliberately differs from a page's slice of `llms-full.txt` (which stays body-only, for bulk *reading*). `.md` is the *editing* surface: the one form that round-trips back into the authoring pipeline.

### `.json` — structured envelope

The centerpiece. A single JSON object projecting the page's full record:

```jsonc
// GET /docs/hint.json
{
  "contractVersion": "1.0",
  "refraktVersion": "0.12.0",
  "url": "/docs/hint",
  "frontmatter": { "title": "Hint", "description": "Callout boxes" },
  "headings": [ { "level": 2, "text": "Variants", "slug": "variants" } ],
  "seo": {
    "title": "Hint — refrakt",
    "og": { "title": "…", "image": "…" },
    "jsonLd": [ { "@context": "https://schema.org", "@type": "TechArticle" } ]
  },
  "content": "{% hint type=\"warning\" %}\nWatch out for this.\n{% /hint %}",
  "form": "authored",
  "tree": { /* the node tree — see Forms below */ }
  // "html": "…"   — present only under ?form=rendered or ?include=html
}
```

`tree` is **not** an HTML string. It is the serialized tag tree — recursive `{ name, attributes, children }` nodes — with the internal `$$mdtype` marker stripped (the same attribute `renderToHtml` already skips via its `INTERNAL_ATTRS` set, done in exactly one place so the JSON and HTML strip lists cannot diverge).

### Forms: `authored` (default) vs `rendered`

The pipeline produces two structured trees at different stages. They answer different questions and have different stability profiles. **Naming note:** in the codebase, `SitePage.renderable` is the *pre*-identity-transform tree (`Markdoc.transform(ast)`); the engine runs later, at render time, inside the adapters. This spec avoids the overloaded word "renderable" and uses `authored` / `rendered`.

| Form | Pipeline stage | Carries | Answers |
|------|---------------|---------|---------|
| **`authored`** (default) | pre-identity-transform (`page.renderable`) | `data-rune`, the **`data-rune-fields` typed JSON bag**, `typeof` RDFa, `<meta data-field>` children | "the authored content model, losslessly" |
| **`rendered`** | post-identity-transform (engine applied) | `data-rune` + projected `data-*`, BEM `class`, injected structural chrome | "what actually renders, correlated with the DOM" |

**`authored` is the default.** The rune node already carries `data-rune="hint"` (the engine keys off it) *and* the complete `data-rune-fields` bag (`{"type":"warning"}`) — every field value, typed, in one object, **before** the engine consumes and strips it. This is:

- **Lossless** — it is upstream of the WORK-323/329/331/332 stripping and of field consumption; fields the render path discards (icon selection, etc.) are still here. The `rendered` tree is subject to the *same* stripping degrading the HTML, so serving it alone would give "HTML's information as a tree," not more data.
- **Cheap** — it is `page.renderable` straight from memory: no engine run, no resolved-theme-config dependency on the hot path.
- **Legible** — `data-rune` identity + a typed `data-rune-fields` object is arguably friendlier than the `rendered` tree's scattered `data-*` attributes.
- **Stable** — its shape derives from rune *schemas*, not the theme (see *Versioning & contract*).

`?form=rendered` opts into the post-transform tree (runs the engine + theme config) for consumers correlating with the rendered DOM or reading BEM/styling hooks.

### The `html` key (opt-in)

`renderToHtml()` of the `rendered` tree — the transformed content *fragment* (not the full SvelteKit page; ThemeShell/nav/regions/`<head>` are not included). It is **omitted from the default envelope** and appears only when `?form=rendered` (the engine has run anyway) or `?include=html` is requested. Rationale: including it by default would drag the entire transform engine + theme config onto the cheap `authored` hot path just to fill a key most structured consumers never read, and it is pure payload for a tree-walking agent.

-----

## Shared serializer

A single function is the source of truth for every representation:

```typescript
// packages/content/src/serialize-page.ts (proposed)
interface PageJson {
  contractVersion: string;
  refraktVersion: string;
  url: string;
  frontmatter: Frontmatter;
  headings: HeadingInfo[];
  seo: PageSeo;
  content: string;
  form: 'authored' | 'rendered';
  tree: RendererNode;            // $$mdtype stripped
  themeVersion?: string;         // present when form === 'rendered'
  html?: string;                 // present under form=rendered or include=html
}

function serializePage(
  page: SitePage,
  opts?: { form?: 'authored' | 'rendered'; includeHtml?: boolean },
): PageJson;
```

Both the HTTP route and the CLI command call this. The `authored` default needs only `page.renderable` and the plain `SitePage` fields. Producing `rendered`/`html` requires the identity-transform engine + resolved theme config, so `serializePage` takes those as injected dependencies (the build already has them) rather than reaching for globals. The `.md` route needs only the raw file/`page.content`, so it can bypass the JSON projection entirely.

-----

## HTTP surface

Prerendered suffix routes in `site/src/routes/`, mirroring the existing `llms-full.txt/+server.ts` pattern (which already iterates non-draft pages and emits a computed body):

- `[...slug].md` → `text/markdown`, body = round-trippable source (see `.md` above)
- `[...slug].json` → `application/json`, body = `serializePage(page, { form })`

Both `export const prerender = true` and enumerate the **same page set the HTML routes do** — the parity invariant (see *Visibility invariant*).

### Reserved suffixes

`.md` and `.json` are **reserved representation suffixes** — but only as a *trailing* segment. Dots elsewhere are fine (`/reference/v1.2.3`, `/api/foo.bar`); only a page slug that *ends* in `.md`/`.json` collides. Because prerendering enumerates the whole page set at build time, a colliding slug is a **hard build error** with a remedy, not a runtime ambiguity:

> slug `reference/package.json` ends in a reserved representation suffix; rename it or set an explicit `slug:` in frontmatter (e.g. `reference/package-json`).

This keeps addressing **bijective**: `/x.json` means "representation of `/x`" *universally*, with no "unless a literal page exists there" caveat. A precedence rule (real page wins) was rejected — it makes a page's representation unreachable whenever another page occupies the `.json` slug, a silent hole worse than a loud build error. The forbidden case is rare and has a one-line frontmatter escape.

### Root and index addresses

The root page (empty slug) needs a spelled-out address, since `/.json` is nonsense. Convention: **root → `/index.md`, `/index.json`**; every other page → `<slug>.{md,json}`. Section-index pages follow the normal rule (`docs` → `/docs.json`).

### Advertising (discovery)

Because derivation is mechanical, no per-entry manifest is emitted. The affordance is advertised two cheap ways:

1. **`<link rel="alternate">` in each page `<head>`** (primary) — emitted by `ThemeShell`:
   ```html
   <link rel="alternate" type="application/json" href="/docs/hint.json">
   <link rel="alternate" type="text/markdown"    href="/docs/hint.md">
   ```
2. **A one-line note in the `llms.txt` header** (for `llms.txt`-first agents) — fits the file's existing "machine-readable" self-description without tripling every entry's links.

Advertising tracks availability: if a representation is disabled (see *Configuration*), its `rel="alternate"` link and `llms.txt` note are not emitted. A dedicated single-fetch manifest is deferred; if demand appears, the root `index.json` or a purpose-built `/pages.json` is the natural home.

`robots.txt` (crawlability) is orthogonal to route existence — a site can serve the routes but `Disallow` them for crawlers, or vice versa.

-----

## CLI surface

A `refrakt render` command in `packages/cli`:

```bash
refrakt render <path>                    # pretty HTML fragment (renderToHtml pretty mode)
refrakt render <path> --json             # the full PageJson envelope (form=authored)
refrakt render <path> --form rendered    # post-transform tree (+ html) with --json
refrakt render <path> --html             # explicit HTML fragment (default when no --json)
```

`<path>` is a content file path (e.g. `content/docs/hint.md`) or a page URL; the command loads it through the same `loadContent` pipeline as a build (so cross-page resolution is applied) and calls `serializePage`. This is the page-level sibling of `refrakt inspect <rune>` — `inspect` stays rune-scoped with synthetic attributes; `render` operates on a real authored page.

Primary value is debugging: when a page renders wrong, `refrakt render <path> --json` shows the transformed tree so the fault can be localized to schema transform vs identity transform vs CSS, without spinning up the dev server and reading the DOM. The CLI is **unrestricted with respect to drafts** — it is a local dev tool operating on your own source, exactly as your editor can open a draft `.md`.

-----

## Versioning & contract

`.json` becomes a compatibility surface once external tools consume it. The two forms get **two different stability commitments**, because their shapes derive from different sources.

**`authored` tree + envelope fields (`frontmatter`, `headings`, `seo`, `content`) — stable public contract.** The `authored` tree's shape is a function of **rune schemas** (the `data-rune` identity and the field names in `data-rune-fields`), not the theme. refrakt already treats schema-derived structure as contract-able — that is what `contracts/structures.json` + `refrakt contracts --check` exist for. This tier is semver'd via `contractVersion`; breaking changes require a major bump.

**`rendered` tree — theme-coupled, tracked-not-frozen.** Its shape (BEM classes, injected chrome, which `data-*` survive) is a function of the **theme + engine config** — the surface `contracts/structures.json` already snapshots and CI already gates. Not a free-for-all (drift surfaces as a reviewable contract diff), but it *will* change at theme/major versions. Stamped with `themeVersion`; documented as "reflects the current theme; pin a version or expect changes." Consumers keying off BEM opt into that coupling.

**Alignment with the WORK-323/329 migrations.** The stable contract reads field values from the **`data-rune-fields` bag** (the modern, retained channel present in the `authored` tree), and treats the legacy `<meta data-field>` children as **non-contractual and removable**. The migrations strip exactly those legacy metas / legacy engine machinery — none of which the contract depends on — so the in-flight work is *compatible*, not breaking.

**Mechanics.**

1. Every response is version-stamped (`contractVersion`, `refraktVersion`, plus `themeVersion` when `form=rendered`).
2. A JSON Schema for the envelope is published at a versioned route, mirroring the existing `refrakt.config.schema.json` precedent (`.../schemas/vX.Y/page.schema.json`), giving consumers something to validate against.
3. `refrakt contracts` is extended to emit/verify the `authored` envelope shape, so CI catches unintended changes to the stable tier the same way it catches rendered drift.

-----

## Visibility invariant

**Representation set ≡ prerendered page set.** A `.md`/`.json` is emitted for a URL if and only if that URL has a prerendered HTML page. This is a structural property (both come from one page enumeration), not a filter that can be forgotten — so a draft that produces no HTML page can never leak via `.json`.

Consequences:

- **No separate draft-exposure mechanism.** Whatever draft policy the build uses (exclude in production; include in preview via the existing draft-inclusion flag), the representations inherit it for free. No new auth surface on otherwise-static output.
- **Keyed on "is it rendered," not on `draft` specifically.** A published-but-`noindex` page is reachable HTML, so it gets a representation (parity); only *non-emitted* pages (drafts, otherwise-excluded) get none. Stating the rule over exclusion-in-general keeps it correct as exclusion axes evolve.
- **Dev/preview/CLI** cover the author's "see my draft's structure" need without public exposure — the dev server already renders drafts; `refrakt render` runs locally on source.

-----

## Configuration

Representations are **on by default** (agent-friendliness is the feature's purpose, matching refrakt's existing `llms.txt`/`llms-full.txt` posture) but individually disablable. Configured **per-site** (multi-site projects configure each site independently) in `refrakt.config.json`:

```jsonc
{
  "representations": {
    "md":   true,   // raw round-trippable Markdoc route
    "json": true    // structured envelope route
  }
}
```

**Per-representation, not one boolean**, because `.md` (raw source) and `.json` (structure) are different exposure postures — an owner may want structured semantics for agents but not a raw-source dump, or vice versa. Each toggle also accepts an object form for finer control; the most useful is dropping raw source from the envelope while keeping structure:

```jsonc
"json": { "content": false }   // expose structure + semantics, omit the raw Markdoc `content` key
```

This "structure without source" middle ground is likely what a source-cautious owner actually wants.

**Consistency rules:**

- **Advertising tracks availability.** A disabled representation emits no `rel="alternate"` link and no `llms.txt` note — never advertise a 404. (Already assumed by the advertising rule above.)
- **Existence ≠ crawlability.** This config governs whether the routes *exist*; `robots.txt` governs whether crawlers *should fetch* them. They are orthogonal — a site may serve `.json` for its own agents while `Disallow`-ing third-party crawlers.

The `md: false, json: true` split (raw source opt-*in*, structure opt-*out*) is a defensible alternative default for source-cautious deployments; this spec defaults both on for parity with the existing `llms-full.txt` posture and simplicity.

-----

## Build cost &amp; caching

Emitting `.md` + `.json` per page adds output, but the build-time cost is small *when the pipeline is not re-run per route* — and that ordering matters: compute-sharing removes most of the cost before caching does anything.

### Compute-sharing is a v1 requirement, not an optimization

The site build already parses + transforms every page to emit HTML. The representations MUST be **projections of that single per-page pipeline run**, read from the loaded `Site` (via the SvelteKit adapter's virtual modules), not independent endpoints that re-invoke `loadContent` / re-parse / re-transform. The naive "three independent endpoints" implementation would run the pipeline 3× per page and genuinely triple the build — an architecture bug to design out from the start. With compute shared, marginal cost per page is:

| Output | Marginal work | Cost |
|--------|--------------|------|
| `.md` | copy original file bytes (or in-memory `page.content`) | ~free |
| `.json` `authored` | walk `page.renderable`, strip `$$mdtype`, `JSON.stringify` | small |
| `.json` `rendered` / `html` | identity transform + `renderToHtml` — **reuses the HTML prerender's transform** | ~free when reused |

On a typical site, build time is dominated by Svelte compilation + HTML prerender; JSON projection of already-transformed trees is noise beside it.

### Cache-ready by construction

`serializePage()` is a **pure function of well-defined inputs** (`SitePage` + resolved/aggregated data + version). This makes it cache-ready without redesign, so an incremental cache can be layered on later. The served files also carry an **`ETag`** (content hash), making conditional re-fetch (`If-None-Match` → `304`) a first-class affordance for agents polling a `.json` for changes — the highest-value caching in practice, and nearly free for static output.

### Incremental build cache — deferred, with one hard constraint

An incremental/persistent cache (skip re-serializing unchanged pages across rebuilds; restore in CI) is a **scale optimization, deferred** until a large-site user needs it — with compute shared, first-build serialization is already cheap. Any such cache MUST respect **cross-page resolution**: a page's `.json` can change even when its own source did not (a new sibling shifts `breadcrumb auto` / nav / aggregated indexes). So the cache key cannot be the page's own source hash alone — it must fold in a fingerprint of the resolved inputs the page depends on, or invalidate whenever the aggregate phase output changes. Getting this wrong serves stale breadcrumbs; hence deferred and flagged rather than improvised.

-----

## Open Questions

None currently open — all refinement questions (v0.1 → v0.3) are resolved below. Ready for an `accepted` review; the natural next step is decomposing into work items (serializer + `.md`/`.json` routes + `refrakt render` + config + versioned schema).

-----

## Resolved Questions

Trail of the design decisions settled during refinement (v0.1 → v0.2):

1. **`.md` frontmatter** — serve the *full file*; verbatim original bytes when file-backed, reconstructed `frontmatter + body` for contributed pages. `.md` is the editing/round-trip surface, distinct from the body-only `llms-full.txt` reading surface.
2. **Default `form`** — `authored` (pre-identity-transform `page.renderable`). Reverses v0.1's Decision #4, which defaulted to the post-transform tree. The `authored` tree is lossless (carries `data-rune-fields` upstream of stripping), cheap (in memory, no engine run), legible, and stable (schema-derived). `rendered` is opt-in.
3. **`html` key** — opt-in only (`?form=rendered` or `?include=html`); omitted from the default envelope to keep the `authored` hot path engine-free and the payload lean.
4. **Suffix collisions** — reserve trailing `.md`/`.json`; hard build error on a colliding slug; addressing stays bijective. Root → `index.{md,json}`.
5. **`llms.txt` manifest** — no per-entry annotation; advertise via `rel="alternate"` head links + a one-line `llms.txt` header note; dedicated manifest deferred.
6. **Contract** — two tiers: envelope + `authored` = versioned/schema-published/CI-checked contract defined over `data-rune-fields`; `rendered` = theme-coupled, versioned-by-theme. Aligns with (does not fight) the WORK-323/329 stripping.
7. **Drafts** — no new mechanism; representation set ≡ rendered page set as a security invariant; CLI unrestricted locally.
8. **Opt-out / configuration** — on by default, per-site, per-representation (`md` / `json`) with an object form (`json: { content: false }`) for structure-without-source; advertising tracks availability; existence orthogonal to `robots.txt` crawlability.
9. **Build cost / caching** — compute-sharing (one pipeline run per page, all forms project from it) is a v1 requirement; `serializePage()` is a pure, cache-ready function; served files carry `ETag`; an incremental build cache is deferred and must key on cross-page-resolution inputs.

-----

## Decisions

### 1. Suffix routes, not `Accept`-header content negotiation

Static prerendered hosting can't negotiate. `.md`/`.json` suffixes prerender to real files and work on any static host, CDN, or `file://` mirror. This also makes the representations trivially discoverable (derive by string from the HTML URL) and cacheable as distinct resources.

### 2. One serializer shared by HTTP and CLI

`serializePage()` is the single source of truth. The endpoint and `refrakt render --json` produce byte-identical envelopes because they call the same function. This prevents the class of drift that otherwise requires "keep this in sync with X" comments, and makes the CLI a faithful local preview of the deployed contract.

### 3. `tree` is served as a tree, not stringified HTML

The reason to build this at all is to expose semantics as first-class JSON keys. Serving `tree` as `{ name, attributes, children }` nodes (with `$$mdtype` stripped) — rather than a pre-rendered HTML string — is what makes the JSON form more useful than the HTML it is derived from. `html` is an opt-in convenience projection, not the primary payload.

### 4. `authored` (pre-identity-transform) tree is the default `form`

Reverses v0.1's Decision #4. Of the two available trees, the pre-transform one uniquely combines the clean `data-rune` identity, the complete `data-rune-fields` typed bag (the exact data HTML is shedding), cheapness (already in memory, no engine/theme dependency), and contract stability (upstream of theme churn and the WORK-323/329 stripping). The post-transform `rendered` tree — the render twin, subject to that churn — is available via `?form=rendered`. The one accepted cost: `authored` exposes refrakt's internal `data-rune-fields`/`typeof` conventions, which are less self-documenting than `data-rune="hint" data-type="warning"`; acceptable given the richer, more stable payload.

### 5. `refrakt render` is page-scoped; `refrakt inspect` stays rune-scoped

Rather than overload `inspect`, add a sibling command. `inspect` answers "what does rune X produce for attribute set Y" (synthetic, single rune); `render` answers "what does this real authored page become" (full page, real content, cross-page resolution applied). Distinct questions, distinct commands, shared serializer underneath.

### 6. Reserve the representation suffixes; error on collision

Bijective addressing is the value proposition — `/x.json` must *always* mean "representation of `/x`". Reserving trailing `.md`/`.json` and failing the build on a colliding slug (with a one-line frontmatter escape) guarantees this, versus a precedence rule that would silently shadow a page's representation. Consistent with refrakt's existing build-time integrity checks (contract `--check`, plan validation).

### 7. Two-tier stability contract defined over `data-rune-fields`

The stable tier (envelope + `authored`) is schema-derived and semver'd; the `rendered` tier is theme-coupled and versioned-by-theme. Reading field values from `data-rune-fields` (not the legacy `<meta data-field>` children) aligns the contract with the WORK-323/329/331/332 migrations, which remove the legacy channel the contract deliberately does not depend on.

### 8. Representation set ≡ prerendered page set

Parity between representations and rendered pages is a security invariant enforced structurally (one page enumeration feeds all outputs), not a filter. Drafts and excluded pages get no representation because they produce no HTML page; no separate draft-exposure or auth mechanism is introduced.

### 9. Representations on by default, per-site, per-representation

On by default matches the feature's purpose and refrakt's existing `llms.txt` posture; per-representation toggles (with a `content: false` sub-option) let owners express distinct exposure postures — structure-without-source in particular — that a single boolean cannot. Configured per-site because multi-site projects have independent audiences. Route existence is kept orthogonal to `robots.txt` crawlability.

### 10. Compute-sharing over caching; cache-ready serializer

The dominant build-cost risk is re-running the pipeline per route, so the mitigation is architectural: one pipeline run per page, all forms projecting from the loaded `Site`, with `rendered`/`html` reusing the HTML prerender's transform. Caching is secondary — `serializePage()` is written as a pure function so an incremental cache is possible later, but it is deferred (and must key on cross-page-resolution inputs to avoid stale output). `ETag` on served files covers the high-value serving-side caching for polling agents.

{% /spec %}
