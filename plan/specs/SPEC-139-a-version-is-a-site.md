{% spec id="SPEC-139" status="draft" tags="versioning, sites, routing, registry, content, config, docs" %}

# A version is a site

Model a documentation version as what it structurally already is — a site with
its own corpus, registry and route prefix — rather than as a frontmatter grouping
over one shared corpus. The current version lives at the root; older versions
mount under a prefix; where each version's content comes from is pluggable.

## Problem

### A rendering slice already ships, on a data model that cannot be correct

Version switching is half-built in `main`, and has been for long enough that a
theme-authoring page advertises it:

| Piece | Location |
|---|---|
| Layout region, wired into `docsLayout`, conditional | `packages/transform/src/layouts.ts:200`, `:299` |
| Computed markup builder | `packages/transform/src/computed.ts:320` — `buildVersionSwitcher` |
| Client behavior | `packages/behaviors/src/behaviors/version-switcher.ts` |
| CSS | skeleton page-shell layouts, plus Lumina |
| i18n | `core.versionSwitcher.label`, `en` + `de` |
| Type | `LayoutPageData.versionGroup` — `packages/transform/src/types.ts:774` |

The model is per-page frontmatter: a page declares `version` and `versionGroup`,
and the builder collects peer pages sharing that group, sorts them with
`Intl.Collator({ numeric: true })`, and emits a `<select>` of their URLs.

Four things are true of it, all verified:

- **`version` and `versionGroup` are not declared** on the `Frontmatter`
  interface (`packages/content/src/frontmatter.ts:3`). They are read through the
  index signature — exactly the class WORK-545 corrected for `type`, `id`,
  `created` and `modified`: *"consumed by refrakt and invisible to both the type
  and the docs."*
- **Nothing documents it.** `versionGroup` appears nowhere in `site/content/`.
  `extend/theme-authoring/components.md:40` nonetheless lists *"Version Switcher —
  Version switching for versioned documentation pages"* for theme authors, with no
  instructions anywhere in the corpus.
- **Nothing uses it.** No page in `site/content/` or `plan-site/` sets either
  field. The feature has never run on real content.
- **Nothing specifies it.** No spec, no ADR. {% ref "SPEC-013" /%} lists a
  version selector as a layout concern in a table; {% ref "SPEC-011" /%} notes a
  symbol index would need version awareness. Neither decides anything.

Because it is undocumented and unused, none of it is a compatibility constraint.
This spec treats the data model as unbuilt and reuses only the UI.

### One corpus means one registry, and registration is last-write-wins

The shipped model puts every version in one `contentDir`, so every version's
pages go through one `runPipeline()` call, and `pipeline.ts:69` constructs exactly
one `EntityRegistryImpl` per call. Registration is unconditional
(`registry.ts:44`):

```ts
typeMap.set(key, normalized);
```

So with `v1/hint.md` and `v2/hint.md` both registering entity `hint`:

- `{% collection type="rune" %}` lists both versions' entities, interleaved
- `{% xref "hint" /%}` resolves to whichever version the scanner reached last
- `getAll('rune')` returns N× the entities
- **Nothing warns.** No error, no diagnostic, no collision report

That is wrong data presented confidently — the failure class
{% ref "SPEC-135" /%} D7 refuses to tolerate, and the same shape as the duplicate
plan IDs that spec was partly written to catch.

It is not a bug to fix within the model. One corpus *means* one registry; the
only repair is to scope the registry per version, and a per-version registry with
a per-version route prefix is a site. The model's defect and this spec's proposal
are the same observation.

### Peer discovery forecloses everything else

`buildVersionSwitcher` filters `pages` — the page list of the build it is running
in. A version it cannot see does not exist. That single property rules out every
storage arrangement except "all versions present in one build", which means
duplicated directories, permanently, as the only option the design can express.

Ordering has the same shape of problem: a numeric collator sorts `1.0 < 2.0`
correctly and silently mis-sorts `1.0-beta`, `next` and `canary` against them.
The list is emergent, so there is nowhere to state the order an author intends.

## What already exists

Nearly every mechanism this spec needs is present and dogfooded. The new work is
a relation between sites, not a build pipeline.

| Piece | State |
|---|---|
| Multiple named sites — `sites: { name: SiteConfig }` | `packages/types/src/config.ts:42`. This repo declares two (`main`, `plan`) |
| Per-site URL prefix | `site.ts:215` — `new Router(opts.basePath ?? '/')` |
| **A fresh registry per build** | `pipeline.ts:69` — `new EntityRegistryImpl()` per `runPipeline()` |
| Build a site from a caller-assembled corpus | `loadContentFromTree(tree, options)` — `site.ts:826`, already takes `basePath` |
| Injectable content source | `ProjectFiles` — `read`/`list`/`exists` ({% ref "SPEC-113" /%}) |
| Sitemap generation | `generateSitemap(pages, baseUrl)` — `content/src/sitemap.ts:14` |
| Switcher UI — region, markup, behavior, CSS, i18n | Shipped; only its data source changes |

## Proposal

### A version is a site with a relation to its siblings

```json
"sites": {
  "docs": {
    "contentDir": "./docs",
    "theme": "@refrakt-md/lumina",
    "versions": [
      { "label": "2.0", "current": true },
      { "label": "1.0", "basePath": "/v1", "contentDir": "./docs-v1" },
      { "label": "0.9", "basePath": "/v0.9", "contentDir": "./docs-v0.9" }
    ]
  }
}
```

Each entry produces one full build: its own corpus, its own `EntityRegistryImpl`,
its own `Router(basePath)`. Versions share the site's theme, plugins and layout
configuration — only content varies.

Absent `versions`, a site builds exactly as it does today. One unversioned
corpus, no prefix, no switcher, no cost.

### Current at the root

The entry marked `current: true` takes `basePath: "/"`. Its URLs are the site's
URLs — `/guides/hint`, not `/v2/guides/hint`. Older versions mount under their
declared prefix.

A release therefore does not move a single current-version URL. What changes is
that the outgoing version acquires a prefix it did not previously have, which is
one redirect rule per release rather than a whole-site rewrite.

### Identity is the route, relative to the version root

`/v1/guides/hint` and `/guides/hint` are the same page in two versions because
both resolve to `guides/hint` within their version. No authored key, nothing to
maintain per page, and it holds for every page automatically.

This is also what makes the switcher able to answer a question the shipped model
cannot ask: *does this page exist in that version?*

### The switcher renders the declared list

`buildVersionSwitcher` keeps its markup, its behavior, its CSS and its i18n key,
and changes where its data comes from: the configured `versions` array, in
declared order, with the current page's version-relative route used to build each
option's href.

## Design decisions

**D1 — A version is a site, because a site is already the unit of registry
isolation.** The decisive property is `pipeline.ts:69`: one registry per build.
Everything else about versioning — prefixed routes, an independent page tree, its
own nav and breadcrumbs — the multi-site axis already provides, and this
repository already runs two sites in one config.

Modelling versions any other way means either accepting the collision described
in Problem, or re-implementing per-version scoping inside the registry, the
router and the aggregate phase. The second is strictly more work than reusing
`SiteConfig`, and produces a second concept that behaves almost but not exactly
like a site.

**D2 — The version list is declared in config, never discovered from pages.**
Discovery can only see the build it runs in, which is why the shipped model
cannot express any storage arrangement but duplication (Problem, §3). Declaration
is also the only place an intended order can live: a collator will always
mis-sort somebody's `next` against their `1.0`.

The cost is that adding a version means editing config rather than only adding
files. That is the correct trade — a version is a site-level fact, and the config
is where site-level facts already live.

**D3 — Current lives at the root; older versions carry a prefix.** The
alternative — every version prefixed, including current — is more symmetric and
worse. It puts a version number in every canonical URL, so every external link,
every search result and every bookmark points at a version that will eventually be
stale, and the site needs a root redirect to the current prefix on every release.

Prefixing only the old versions means the churn on release is confined to the
version leaving current, and the URLs people actually share never move.

**D4 — Cross-version identity is the version-relative route, not an authored
key.** A `versionGroup` field is a per-page maintenance burden on every page of
every version, and it fails open: a page whose tag is missing is
indistinguishable from a page that does not exist in that version. The route is
already unique within a version, already stable, and already what the switcher
needs to build an href.

**D5 — A version that lacks the current page still gets an option, pointing at
that version's root.** Three behaviours are possible when `guides/hint` has no
counterpart in v1: omit the option, render it disabled, or offer it pointing
somewhere valid.

Omitting is the shipped behaviour and it lies by omission — the reader cannot
tell whether v1 is missing or the page is. Disabling is honest but produces a
dead control, and a disabled `<option>` is poor for keyboard and screen-reader
users. Offering it and landing on the version root answers what the reader
actually wanted (*"show me this in v1"*) with the closest true answer, and the
option carries a data attribute so a theme can mark it.

**D6 — The content source per version is a `ProjectFiles` provider; a directory
is the default.** {% ref "SPEC-113" /%} already made the corpus injectable:
`ProjectFiles` is three methods and `loadContentFromTree` already builds a whole
site from a caller-assembled tree. Versioning does not need a storage mechanism —
it needs to stop assuming one.

This is what lets a team choose duplication, a git ref, or a host-supplied tree
without the build knowing the difference, and it is why the hosted renderer keeps
working: it supplies trees, as it already does for everything else.

**D7 — The git-ref source is a second provider and deliberately not the
default.** Reading an old version from a tag is the elegant version of this
feature: no duplication, and what renders is exactly what shipped. It also has a
failure mode duplication does not.

Old content is rendered by **today's** engine. A v1 page using a rune whose
content model has since changed renders differently, or refuses. A duplicated
directory can be migrated in place when that happens; a git tag cannot be, short
of rewriting history. So the directory source ships first and stays the
documented default, and the git source is for teams who accept that their frozen
docs are frozen against a moving engine.

**D8 — Older versions are excluded from the sitemap and declare a canonical link
to the current version.** Publishing N near-identical copies of a docs corpus is
a textbook duplicate-content problem, and it is worse than the usual case because
the copies are genuinely near-identical.

`generateSitemap` runs per corpus; the versioned build emits one sitemap
containing the current version only. Older versions remain reachable, indexable
if a crawler insists, and marked as non-canonical. A page with no current
counterpart (removed in v2) is the one exception — it self-canonicalizes, because
pointing it at a page that does not exist is worse than the duplicate.

**D9 — Site search covers the current version only.** `search` is already a
per-site boolean and the index is built externally by Pagefind. Indexing every
version produces a result list where the same page appears N times and the reader
cannot tell which is current — a worse experience than not finding the old one.

Older versions are excluded from the index. Per-version search is a real want and
an open question, not a v1 requirement.

**D10 — The shipped data model is deleted, not deprecated.** `version` and
`versionGroup` are removed from `LayoutPageData`, and the peer-discovery branch of
`buildVersionSwitcher` goes with them.

Deprecation exists to protect users. There are none: the fields are undeclared on
`Frontmatter`, undocumented in the corpus, and set by zero pages in either
dogfooded site. Carrying a compatibility path for a feature nobody could have
discovered would add a second code path to maintain in exchange for nothing.

The UI half — region, markup, behavior, CSS, i18n key — is kept wholesale. This
spec changes where the switcher's data comes from, not what it renders.

**D11 — N versions means N builds, and that cost is accepted.** A five-version
site runs the pipeline five times. There is no shared-work optimization in scope
and no attempt at one.

Frozen versions are exactly the case dependency-tracked invalidation is good at —
{% ref "ADR-025" /%}'s incremental rebuild would make a rebuild of four unchanged
versions nearly free. It is a natural follow-on and **not a prerequisite**: a
docs build that takes five times as long is tolerable, and pretending otherwise
would make this spec depend on a proposed ADR for no functional reason.

## Non-goals

- **Cross-version cross-references.** An `{% xref %}` from v2 to v1 crosses a
  registry boundary. Registry isolation is the entire point of D1, so reaching
  across it is a separate design with its own resolution rules. Out of scope; a
  version's content links within its own version.
- **Per-version themes, plugins or layouts.** `SiteConfig` would permit it and it
  is a trap: rendering v1 with v1's theme means keeping v1's theme package
  installed and building against it forever. Versions vary in content only.
- **Migrating old content to current rune APIs.** D7 names the hazard; solving it
  is a content-migration problem, not a routing one.
- **Creating a version.** Whether `refrakt version add 1.0` snapshots a directory
  or a team does it by hand is a workflow question, raised in Open questions and
  deliberately not answered here.
- **Version-aware symbol indexes.** {% ref "SPEC-011" /%} flagged this. It needs
  cross-version identity to mean something to the symbol layer, which is a
  consumer of this spec rather than part of it.
- **Per-version search.** D9.

## Acceptance Criteria

- [ ] A site with no `versions` key builds exactly as it does today — no prefix, no switcher, no additional pipeline run
- [ ] A site with `versions` produces one full build per entry, each with its own `EntityRegistryImpl`
- [ ] The entry marked `current: true` is served at the site root; its page URLs contain no version prefix
- [ ] Exactly one entry may be `current`, and a config with zero or multiple is rejected at config load, naming the site
- [ ] Non-current entries are served under their declared `basePath`
- [ ] An entity ID registered in two versions resolves independently in each, demonstrated by a test that would collide under a shared registry
- [ ] `{% collection %}` and `{% aggregate %}` in one version see only that version's entities
- [ ] The switcher renders options in declared config order, not collator order, covered by a test including a prerelease label
- [ ] The switcher marks the current version's option as selected
- [ ] A page present in one version and absent from another still gets an option for that version, pointing at its root and carrying a data attribute distinguishing it
- [ ] Each version's corpus is read through a `ProjectFiles` provider, with the directory provider as the default
- [ ] A git-ref provider resolves a version's corpus from a ref without a working-tree checkout
- [ ] The generated sitemap contains current-version URLs only
- [ ] Non-current pages emit a canonical link to their current-version counterpart, and self-canonicalize when none exists
- [ ] `version` and `versionGroup` are gone from `LayoutPageData` and from `buildVersionSwitcher`, with no compatibility path
- [ ] The switcher's markup, CSS classes, behavior hook and i18n key are unchanged from what ships today
- [ ] Docs cover declaring versions, the root-vs-prefix rule, and that versions share one theme

## Approach

Four phases. Phase 1 delivers the correctness win and is shippable without any UI.

1. **Version as site.** The `versions` config shape and its validation, N builds,
   per-version `basePath` routing, per-version registry. Directory source only, no
   switcher rendered. This is the phase that removes the collision, and it is
   worth landing alone: a site can be correctly versioned before it can be
   navigated between versions.
2. **The switcher on declared data.** Rewire `buildVersionSwitcher` to read the
   config list and the version-relative route; delete the peer-discovery path and
   the two frontmatter fields (D10). The markup and behavior do not change, so
   this phase is mostly deletion.
3. **The SEO posture.** Canonical links and sitemap scoping (D8), plus excluding
   older versions from the search index (D9). Separable and genuinely optional for
   a private docs site, which is why it is not folded into phase 1.
4. **The git-ref provider.** A `ProjectFiles` implementation over `git cat-file` /
   `git ls-tree`, plus the refusal path for a shallow clone. Last because D7 makes
   it the non-default source, and because phases 1–3 must not depend on git for the
   hosted build to keep working.

**Budget the config validation, not the builds.** Running the pipeline N times is
a loop. What decides whether this is safe is the validation around it — exactly
one `current`, prefixes that do not collide with each other or with a real
content route, a `basePath` that cannot be `/` on a non-current entry. Each of
those is silently destructive when wrong: two versions at one prefix means the
second overwrites the first's output, with no error at any layer.

## Open questions

- **What does a build actually cost at N?** D11 accepts the multiplier without
  measuring it. A five-version corpus the size of `site/content` (237 pages) should
  be timed during phase 1, because the answer changes whether
  {% ref "ADR-025" /%} is a nice follow-on or the thing that makes this usable.
- **How is a version created?** Snapshotting `./docs` to `./docs-v1` and adding a
  config entry is two mechanical steps, which suggests a command
  (`refrakt version add`). It is also the moment a team might prefer the git-ref
  source and no copy at all. Worth answering once both providers exist, not before.
- **Should older versions render a banner?** *"You are reading the docs for 1.0;
  the current version is 2.0."* Every docs site with versions has one, and it is a
  layout concern that sits adjacent to the switcher rather than inside it. Left
  out of v1 deliberately; it is additive.
- **How do per-version search indexes get built if D9 is revisited?** Pagefind is
  configured outside refrakt, so the answer is probably documentation rather than
  code — but it is undetermined, and a team that wants it will ask before v1 ships.

## References

- {% ref "SPEC-113" /%} — the `ProjectFiles` seam D6 builds on, and the hosted build D7 protects
- {% ref "ADR-025" /%} — incremental rebuild, the natural follow-on to D11's cost
- {% ref "SPEC-135" /%} — D7's "wrong data presented confidently", the class the registry collision falls into
- {% ref "SPEC-013" /%} — lists a version selector as a layout concern without deciding anything
- {% ref "SPEC-011" /%} — flags version-aware symbol indexes as a future need
- `packages/types/src/config.ts` — `SiteConfig`, the shape a version reuses
- `packages/content/src/pipeline.ts` — one `EntityRegistryImpl` per build, the property D1 turns on
- `packages/content/src/registry.ts` — last-write-wins registration
- `packages/content/src/site.ts` — `Router(basePath)` and `loadContentFromTree`
- `packages/transform/src/computed.ts` — `buildVersionSwitcher`, kept but re-sourced
- `packages/transform/src/layouts.ts` — the `version-switcher` region in `docsLayout`
- `packages/content/src/frontmatter.ts` — where `version` / `versionGroup` were never declared

{% /spec %}
