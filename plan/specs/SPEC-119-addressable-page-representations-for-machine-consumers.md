{% spec id="SPEC-119" status="draft" version="0.1" tags="content, ai, cli, output, agents" %}

# Addressable page representations for machine consumers

Serve each refrakt page's authored source and transformed structure at predictable, per-URL addresses — `/path.md` (raw Markdoc) and `/path.json` (structured envelope) — backed by a single shared page serializer that also powers a `refrakt render` CLI command for local debugging.

-----

## Problem

refrakt already believes machines should consume site content, and ships two proofs of it: `/llms.txt` (a section-grouped page index) and `/llms-full.txt` (which concatenates every non-draft page's raw Markdoc source into one document). An agent doing research over a refrakt site can already get the authored rune source — in bulk.

What it can't do is get **one page's** representation at **that page's** address. The raw source exists only as the single aggregated `llms-full.txt` blob; there is no route that serves an individual page's Markdoc or structured content. An agent that lands on `/docs/hint` and wants to understand or edit *that* page has two bad options: re-download and scan the entire corpus, or scrape the rendered HTML.

Scraping the HTML is getting worse, not better. The identity transform already strips the typed field-value channel (`data-rune-fields`, per SPEC-082) from output, and in-flight work (WORK-323/329/331/332) is dropping `data-field` metas further. The semantics an agent wants — *this is a `hint`, its `type` is `warning`, this slot is the `icon`* — are increasingly consumed into presentation and not recoverable downstream. The structured data exists in memory during the build (`SitePage.renderable`), but it is only ever emitted as HTML.

Meanwhile there is no way, even locally, to ask "what does *this authored page* transform into?" `refrakt inspect <rune>` answers that for a single rune with synthetic attributes, but there is no page-level equivalent. When a real page renders wrong, there is no command that dumps its transformed tree so you can tell whether the fault is in the schema transform, the identity transform, or the CSS.

This spec closes both gaps with one primitive: a per-page representation, addressable over HTTP and dumpable from the CLI, produced by a single serializer so the two surfaces cannot drift.

-----

## Design Principles

**One page, one address, three forms.** Every page already has a canonical URL. Its machine representations hang off that same URL by suffix — `/docs/hint`, `/docs/hint.md`, `/docs/hint.json` — so discovery is trivial: an agent that has the HTML URL (or a `sitemap.xml` / `llms.txt` entry) can derive the others by string manipulation, no separate manifest required.

**The structured tree is the point; HTML is a convenience.** The differentiating artifact is `renderable` as a JSON tree, where `data-rune` / `data-field` / `data-name` are first-class keys instead of stringified HTML attributes. A rendered `html` string is included because it is nearly free to produce and makes the envelope a superset of "just scrape the page", but it is not the reason the endpoint exists.

**Suffix routes, not content negotiation.** refrakt sites are fully prerendered static output (`export const prerender = true` on every route). Static hosts don't negotiate on `Accept`. A suffix convention (`.md`, `.json`) prerenders to real files and works on any static host; content negotiation does not. The suffix is the contract.

**The CLI and the endpoint share one serializer.** `refrakt render <path> --json` and `GET /path.json` MUST call the same `serializePage()` function. The terminal output *is* the deployed contract. This is the same discipline `renderToHtml` already keeps by deliberately mirroring `Renderer.svelte`'s attribute logic — a shared function removes the need for any "mirrors X" comment because there is nothing to mirror.

**Resolved, not raw.** The representation is produced from the same `loadContent` pipeline the site build uses, so cross-page resolution (`breadcrumb auto`, resolved `{% ref %}` links, aggregated indexes) is already applied. This is the thing raw `content` alone cannot provide, and it is why the JSON form is more than a reformat of the `.md` form.

-----

## Representations

Every page carries, in memory at build time, everything the representations need — `SitePage` already holds `route`, `frontmatter`, `content` (raw Markdoc body), `renderable` (the transformed node tree), `headings`, and `seo` (`packages/content/src/site.ts`). The three forms are projections of that record.

### `.md` — raw Markdoc source

The post-frontmatter Markdoc body string (`SitePage.content`), served as `text/markdown`. This is the per-URL version of what `llms-full.txt` already emits in aggregate — the same `page.content`, addressable one page at a time. Trivial to implement; included because it is the lowest-friction form for an agent whose task is *editing* (it round-trips straight back into the authoring pipeline).

### `.json` — structured envelope

The centerpiece. A single JSON object projecting the page's full record:

```jsonc
// GET /docs/hint.json
{
  "url": "/docs/hint",
  "frontmatter": { "title": "Hint", "description": "Callout boxes" },
  "headings": [ { "level": 2, "text": "Variants", "slug": "variants" } ],
  "seo": {
    "title": "Hint — refrakt",
    "og": { "title": "…", "image": "…" },
    "jsonLd": [ { "@context": "https://schema.org", "@type": "TechArticle" } ]
  },
  "content": "{% hint type=\"warning\" %}\nWatch out for this.\n{% /hint %}",
  "renderable": { /* the node tree — see below */ },
  "html": "<div class=\"rf-hint rf-hint--warning\" data-rune=\"hint\" …>…</div>"
}
```

`renderable` is **not** an HTML string. It is the serialized tag tree — recursive `{ name, attributes, children }` nodes — with the internal `$$mdtype` marker stripped (the same attribute `renderToHtml` already skips via its `INTERNAL_ATTRS` set). Illustrative shape for the hint above:

```jsonc
{
  "name": "div",
  "attributes": {
    "class": "rf-hint rf-hint--warning",
    "data-rune": "hint",
    "data-type": "warning"
  },
  "children": [
    { "name": "div",
      "attributes": { "class": "rf-hint__icon", "data-name": "icon" },
      "children": [ /* icon svg */ ] },
    { "name": "div",
      "attributes": { "class": "rf-hint__body" },
      "children": [ "Watch out for this." ] }
  ]
}
```

The `html` key is `renderToHtml(renderable)` — one function call, included so a consumer that only wants the final markup need not walk the tree, and so the JSON form is a strict superset of scraping the page.

### Which tree: the `form` axis

There are two structured trees available, and they answer different questions:

| Form | What it is | Carries | Answers |
|------|-----------|---------|---------|
| `renderable` (default) | post-identity-transform serialized tree | `data-rune`, `data-field`, `data-name`, BEM `class` | "what renders, with semantics as keys" — the lossless channel HTML is giving up |
| `semantic` | pre-identity-transform tree (`page.renderable` before BEM) | RDFa `typeof` / `property`, meta tags, no BEM | "authored semantics" — cleaner intent, no presentation |

The default is the post-transform tree, because that is precisely the metadata the HTML is losing and therefore the highest-value thing to expose losslessly. A `?form=semantic` query parameter (and `--form` CLI flag) offers the pre-transform view for consumers that want intent without presentation. Both are cheap — the pipeline produces both during a normal build.

-----

## Shared serializer

A single function is the source of truth for every representation:

```typescript
// packages/content/src/serialize-page.ts (proposed)
interface PageJson {
  url: string;
  frontmatter: Frontmatter;
  headings: HeadingInfo[];
  seo: PageSeo;
  content: string;
  renderable: RendererNode;      // $$mdtype stripped
  html: string;                  // renderToHtml(renderable)
}

function serializePage(page: SitePage, opts?: { form?: 'renderable' | 'semantic' }): PageJson;
```

Both the HTTP route and the CLI command call this. The `.md` route needs only `page.content`, so it can read the same `SitePage` without the JSON projection.

Stripping `$$mdtype` is the one transform between the in-memory tree and the public JSON. It is done in exactly one place (`serializePage`), reusing the `INTERNAL_ATTRS` concept from `packages/transform/src/html.ts` so the JSON and HTML strip lists cannot diverge.

-----

## HTTP surface

Prerendered suffix routes in `site/src/routes/`, mirroring the existing `llms-full.txt/+server.ts` pattern (which already iterates non-draft pages and emits a computed body):

- `[...slug].md/+server.ts` → `text/markdown`, body = `page.content`
- `[...slug].json/+server.ts` → `application/json`, body = `serializePage(page)`

Both `export const prerender = true` and enumerate the same page set the HTML routes do, so every non-draft page gets a `.md` and `.json` sibling in the static output. Draft handling matches `llms-full.txt` (drafts excluded).

`robots.txt` and `sitemap.xml` are unchanged; an optional follow-on could annotate `llms.txt` entries with their `.md`/`.json` sibling URLs so the index doubles as a machine manifest (see Open Questions).

-----

## CLI surface

A `refrakt render` command in `packages/cli`:

```bash
refrakt render <path>                    # pretty HTML (renderToHtml pretty mode)
refrakt render <path> --json             # the full PageJson envelope
refrakt render <path> --form semantic    # pre-transform tree (with --json)
refrakt render <path> --html             # explicit HTML (default when no --json)
```

`<path>` is a content file path (e.g. `content/docs/hint.md`) or a page URL; the command loads it through the same `loadContent` pipeline as a build, so cross-page resolution is applied, then calls `serializePage`. This is the page-level sibling of `refrakt inspect <rune>` — `inspect` stays rune-scoped with synthetic attributes; `render` operates on a real authored page.

Primary value is debugging: when a page renders wrong, `refrakt render <path> --json` shows the transformed tree so the fault can be localized to schema transform vs identity transform vs CSS, without spinning up the dev server and reading the DOM.

-----

## Open Questions

Intentionally unresolved for the first draft; to be settled during refinement before this moves to `accepted`.

1. **`.md` vs `.md`-as-rune-source.** `page.content` is the body *after* frontmatter is stripped. Should the `.md` endpoint re-emit the YAML frontmatter block so the file round-trips exactly back into the authoring pipeline, or serve the body only (matching `llms-full.txt`)? Round-tripping argues for re-emitting.

2. **Default `form`.** Post-transform (`renderable`) is proposed as default because it is the lossless channel HTML is losing. But an agent that wants "authored intent" might expect the pre-transform `semantic` tree by default. Which is the least-surprising default?

3. **Should `html` be in the default envelope, or opt-in?** It is cheap but roughly doubles payload size for a key many consumers won't read. A `?include=html` opt-in keeps the default lean; always-included keeps it a strict superset of scraping.

4. **Suffix collisions.** A content file literally named `foo.json.md` (or a page whose slug ends in `.json`) could collide with the suffix routing. How does the router disambiguate a page slug that ends in `.md`/`.json` from the representation suffix? Reserve the suffixes, or escape?

5. **`llms.txt` as manifest.** Should `llms.txt` entries gain explicit `.md`/`.json` sibling links so the existing index becomes a first-class crawl manifest, or is suffix-derivation from the HTML URL enough?

6. **Structured-tree stability as a contract.** If the `.json` `renderable` shape is consumed by external tools, the BEM/`data-*` output becomes a compatibility surface. Is the transformed tree a stable contract (versioned, like `contracts/structures.json`), or explicitly "best-effort, may change with the theme"? This interacts directly with the WORK-323/329 metadata-stripping migrations.

7. **Non-draft scope.** `.md`/`.json` follow `llms-full.txt` and exclude drafts. Should there be a way to expose drafts for authenticated/preview builds, or is draft exclusion absolute for these routes?

-----

## Decisions

### 1. Suffix routes, not `Accept`-header content negotiation

Static prerendered hosting can't negotiate. `.md`/`.json` suffixes prerender to real files and work on any static host, CDN, or `file://` mirror. This also makes the representations trivially discoverable (derive by string from the HTML URL) and cacheable as distinct resources.

### 2. One serializer shared by HTTP and CLI

`serializePage()` is the single source of truth. The endpoint and `refrakt render --json` produce byte-identical envelopes because they call the same function. This prevents the class of drift that otherwise requires "keep this in sync with X" comments, and makes the CLI a faithful local preview of the deployed contract.

### 3. `renderable` is served as a tree, not stringified HTML

The reason to build this at all is to expose semantics as first-class JSON keys. Serving `renderable` as `{ name, attributes, children }` nodes (with `$$mdtype` stripped) — rather than a pre-rendered HTML string — is what makes the JSON form more useful than the HTML it is derived from. `html` is included as a convenience projection, not as the primary payload.

### 4. Post-identity-transform tree is the default `form`

Of the two available trees, the post-transform one carries `data-rune`/`data-field`/`data-name` — exactly the metadata the identity transform is progressively stripping from HTML output. Exposing it losslessly as JSON is the highest-value form, so it is the default. The pre-transform `semantic` tree is available via `?form=semantic` for consumers wanting authored intent without presentation.

### 5. `refrakt render` is page-scoped; `refrakt inspect` stays rune-scoped

Rather than overload `inspect`, add a sibling command. `inspect` answers "what does rune X produce for attribute set Y" (synthetic, single rune); `render` answers "what does this real authored page become" (full page, real content, cross-page resolution applied). Distinct questions, distinct commands, shared serializer underneath.

{% /spec %}
