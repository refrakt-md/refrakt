{% spec id="SPEC-119" status="draft" tags="docs, content, pipeline, cli, architecture, versioning" %}

# Versioned Documentation

A build-time system for serving multiple versions of a documentation set side by side — `/docs/` for the latest release, `/docs/v1/` and older for frozen past releases — with a version switcher, cross-version page continuity, "you're viewing an old version" banners, and correct SEO. This is one of the two capabilities (alongside {% ref "SPEC-035" /%} multi-language) identified early as table-stakes for competing with established documentation frameworks.

## Motivation

Established documentation frameworks (Docusaurus, VitePress, Mintlify, Read the Docs) all let a project publish docs for every supported release, so a user pinned to an older version reads docs that match the code they run. Refrakt has no such story. A project that ships breaking changes today must either overwrite its docs (stranding users on old releases) or hand-maintain parallel content trees with no framework support.

The gap is acknowledged repeatedly in existing specs but never designed:

- {% ref "SPEC-047" /%} (sequential page navigation) declares "pagination across versioned doc sets" out of scope because "no versioning infrastructure exists yet."
- {% ref "SPEC-011" /%} (symbol rune) notes a symbol index "would need version awareness" and defers it.
- {% ref "SPEC-014" /%} (plan HTML adapter) lists "no version switcher" among its computed-content gaps.

This spec closes that gap. It also unblocks the refrakt documentation site itself: post-1.0 the site will want `/docs/` (latest stable) plus `/docs/next/` (unreleased) at minimum, and a frozen `/docs/v1/` once 1.0 ships.

## Current State — an orphaned UI primitive

A version *switcher widget* already exists in the codebase, built as a byproduct of {% ref "SPEC-013" /%}'s computed-content work. It was never designed as "versioned docs" and is a UI shell with no content or pipeline machinery behind it:

- **`buildVersionSwitcher()`** (`packages/transform/src/computed.ts`) — renders a `<select>` from peer pages that share a `versionGroup` frontmatter key and each carry a `version` value. It requires ≥2 peers, sorts them with a numeric collator, and marks the current URL selected. That is the entire logic.
- **CSS** — `styles/layouts/version-switcher.css` in both `@refrakt-md/lumina` and `@refrakt-md/skeleton`.
- **Behavior** — `packages/behaviors/src/behaviors/version-switcher.ts` navigates on `<select>` change.
- **Layout wiring** — `computed:version-switcher` (conditional) in `packages/transform/src/layouts.ts`.
- **Adapter plumbing** — `version` / `versionGroup` frontmatter is threaded into the layout page list by every adapter (sveltekit, nuxt, next, html, eleventy).
- **i18n** — {% ref "SPEC-035" /%} reserves the `core.versionSwitcher.label` key.

**What it is not:** there is no version *set* concept, no "latest" alias, no snapshotting, no per-version scoping of navigation / breadcrumbs / search, no cross-version page identity or fallback, no outdated-version banner, and no SEO handling. It relies on an author hand-maintaining perfectly-matched parallel trees. Nobody could ship real versioned docs on it today.

The good news: **the presentation layer (switcher markup, CSS, behavior, i18n key) is done.** This spec can focus on the content, pipeline, and CLI layers and treat the existing widget as the switcher's render target — modulo the targeting fix in the [Cross-version page continuity](#cross-version-page-continuity) section.

## Scope

This spec covers the **framework machinery for maintaining and serving multiple versions of a content collection**: how versions are declared, how a version is cut, how each version is routed and rendered as an isolated tree, how the switcher targets the equivalent page across versions, how outdated versions are signalled to readers and search engines, and the CLI that drives it.

It does **not** redesign the switcher widget (exists), and it treats versioning as a property of a designated content collection (typically `docs`), not of every page on the site.

## The Source-Model Decision

The one decision that shapes everything else: **when the build renders `/docs/v1/getting-started`, where does that page's content physically come from?** Three models were considered.

### Chosen: Snapshot / freeze

One live tree is edited (the "next"/current version); cutting a version copies it into a committed, frozen archive:

```
content/docs/            ← the only version authored ("next")
versioned_docs/
  v1.0/                  ← frozen copy, committed, never hand-edited
  v0.9/                  ← frozen copy
versions.json            ← ["1.0", "0.9"] — declared set + order
```

Each frozen version is an ordinary directory of Markdown that the existing content loader mounts as a second content root. No git, no checkout — a pure filesystem read. Cutting a version is a CLI command (`refrakt docs version <v>`) that copies the live tree and appends to the manifest. From that point the version is inert.

### Rejected for v1: Git-ref build

Old versions live only as git tags/branches; the build checks out each ref into a temp worktree, reads the docs as they existed at that tag, builds, and unions the outputs. Rejected because:

1. **It destroys build purity.** The build stops being a pure function of the working tree and becomes a function of working-tree + git history + a checkout step. That checkout/merge subsystem has to work identically across all six framework adapters' dev servers and build commands ({% ref "SPEC-058" /%} adapter parity) — a large cross-cutting surface.
2. **Old versions re-expose to framework drift.** Historical *content* is read from an old ref but rendered by *today's* engine, so a changed rune output contract, renamed CSS class, or dropped plugin silently breaks frozen docs on every build — the exact opposite of what versioned docs must guarantee. Pinning the refrakt version per docs-version to fix this means checking out old `node_modules`, a worse problem.
3. **CI fragility.** Building from arbitrary historical tags needs full history and tag fetches; hosted/shallow-clone environments make this brittle.

Note: refrakt's "git-native history" theme ({% ref "SPEC-038" /%}) extracts page timestamps/history from git *for display* — it does not build the site from multiple refs. The resonance with git-ref versioning is thematic, not code reuse.

### Rejected: Live parallel trees

Every version is a live, editable directory with no freeze guarantee. This is what the current primitive implicitly assumes. Rejected as the primary model because it moves the entire operate-correctly burden onto the author (accidental edits, structural drift between switcher peers) — the worst place for it in a batteries-included framework. It remains available as an unopinionated escape hatch (nothing stops an author making parallel dirs), but the spec's story is not built on it.

### Why snapshot

| Axis | **Snapshot** | Git-ref | Live parallel |
|------|--------------|---------|---------------|
| Old versions live in… | committed frozen dirs | git tags/branches | live editable dirs |
| Build is a pure fn of working tree | **yes** | no (needs checkouts) | yes |
| Old versions immune to framework drift | **frozen output** | re-rendered each build | re-rendered |
| Adapter / CI complexity | low | high (multi-checkout ×6) | low |
| Cut-a-version ergonomics | one CLI command | git tag | none (manual) |
| Backport a fix | edit 2 files (the tax) | maintain release branch | edit N files |
| Repo size | grows per snapshot (the tax) | flat | grows |
| Operate-correctly burden | on the tool | on git discipline | on the author |

Snapshot preserves the deterministic, self-contained build that is refrakt's core promise, and freezes old versions so they cannot rot. The expensive engineering — version-scoping the cross-page pipeline — is required in *any* model, and snapshot makes it tractable (each version is just another content root) instead of layering a checkout subsystem on top. Its two real costs are bounded chores, not architecture: repo bloat (mitigated by frozen-Markdown compression and an optional archive-to-branch policy) and backport friction (mitigated by a `refrakt docs backport` helper, and rare in practice — the usual answer is "upgrade").

## Design

### Principles

1. **Zero-config single-version.** An unversioned site works unchanged; versioning is opt-in on a designated collection. English/latest-only is the floor.
2. **Additive.** Turning on versioning adds a manifest and a config block; it does not change how existing pages render.
3. **Frozen means frozen.** Once cut, a version's content on disk is never hand-edited and its output does not change with framework upgrades (verified — see [Freeze integrity](#freeze-integrity)).
4. **Render-scoped version context, never module-global.** The active version is threaded context (mirroring {% ref "SPEC-035" /%}'s `LocaleContext` constraint), so a single build can emit N version subtrees without a process-global "current version."
5. **Version-independent page identity.** A page's cross-version identity is a stable slug, not its version-qualified URL, so the switcher and fallback logic work across trees.

### Version manifest and config

The version set is declared in a manifest (`versions.json`) that the snapshot CLI owns, plus a config block that sets policy:

```jsonc
// versions.json — CLI-maintained, ordered newest-first
{
  "collection": "docs",
  "latest": "2.0",          // which frozen/live version is canonical "latest"
  "versions": ["2.0", "1.0", "0.9"]
}
```

```ts
// refrakt.config.json → a `versions` block (net-new), analogous to `locale`
interface VersionsConfig {
  /** Collection this applies to (path prefix). Default: 'docs'. */
  collection?: string;
  /** Route style for the latest version: 'root' (/docs/) or 'labelled' (/docs/v2/). Default: 'root'. */
  latestAt?: 'root' | 'labelled';
  /** Per-version display label overrides. Default: the version key. */
  labels?: Record<string, string>;
  /** Show the outdated-version banner on non-latest versions. Default: true. */
  banner?: boolean;
}
```

The live/authored tree is the **development version** ("next"). Whether "next" is publicly routed (`/docs/next/`) or hidden until cut is a config toggle (see [Open Questions](#open-questions)).

### Snapshot workflow — CLI

The `refrakt docs` command group drives the lifecycle:

- **`refrakt docs version <v>`** — copy the live collection into `versioned_docs/<v>/`, append `<v>` to `versions.json`, and (optionally) set it as `latest`. Idempotent-guarded (refuses to overwrite an existing frozen version without `--force`).
- **`refrakt docs list`** — print the manifest (versions, latest, route map).
- **`refrakt docs backport <path> --to <v>`** — apply a working-tree change to a frozen version (the mitigation for the freeze/backport tax), staged for review rather than silent.
- **MCP exposure** following the `refrakt.contracts` / `refrakt i18n extract` precedent, so an agent can cut or inspect versions with structured I/O.

The command is designed to hook into the release flow (`npm run version-packages`, see RELEASING.md), so cutting a docs version is a natural step of cutting a release rather than a separate ritual.

### Routing and the "latest" alias

- Latest routes at the collection root (`/docs/…`) by default (`latestAt: 'root'`); older versions route under a version segment (`/docs/v1.0/…`).
- The **unversioned URL is canonical for latest.** Frozen versions carry `rel=canonical` to their latest equivalent where one exists (see continuity), and are `noindex` by policy option, so search engines surface current docs.
- A missing/legacy version-qualified URL for the current release redirects to the root form.

### Version-scoped pipeline

This is the real engineering cost and the core of the spec. The cross-page phases in `packages/content/` (Phase 2 Register, Phase 3 Aggregate, Phase 4 Post-process) currently assume a **single** content tree. The site-wide `EntityRegistry`, and core's aggregated `pageTree`, `breadcrumbPaths`, `pagesByUrl`, and `headingIndex`, must become **version-partitioned** so navigation, breadcrumbs, prev/next, and search never bleed across versions.

Approach: run the aggregation phases **once per version root**, keyed by version, producing an isolated registry + aggregate bundle per version. Cross-version data (the switcher's peer list, continuity map) is the *only* structure computed across the partition boundary, and it is computed from stable page identity, not from the merged trees. This keeps the partition clean and makes "frozen version renders in isolation" true by construction.

### Cross-version page continuity

The current switcher matches peers by a shared `versionGroup` frontmatter key — brittle and manual. Replace it with **stable per-page identity**: each page has a version-independent slug (its collection-relative path, generalizing {% ref "SPEC-035" /%}'s `canonicalSlug` idea). The switcher for a page targets the *same* stable slug in each other version:

- If the target version has that page → switch to it.
- If it does not (page added/removed between versions) → **graceful fallback** to the target version's collection root (or nearest ancestor), rather than a dead link or 404. The switcher marks such options so the UI can hint "not available in v1.0."

Because identity is the path, not `versionGroup`, authors get correct switching for free from the snapshot copy — no per-page frontmatter bookkeeping.

### Outdated-version banner

Non-latest versions render a banner ("You're viewing v1.0. The latest is v2.0.") as computed content, linking to the continuity target in latest. This is standard docs UX and currently absent. Controlled by `versions.banner`; localizable via the {% ref "SPEC-035" /%} string table.

### Search scoping

Search is scoped to the active version's partition (the per-version `headingIndex` / search index from the version-scoped pipeline), so a reader on v1.0 searches v1.0. Cross-version search is a non-goal for v1.

### Freeze integrity

A frozen version must render identically regardless of framework changes. The spec requires a **freeze-integrity check**: a snapshot records enough (content hash, and optionally a rendered-output contract) that CI can flag when a framework change would alter a frozen version's output — turning silent drift into a caught error. The mechanism reuses the `contracts --check` pattern.

## Interaction with Multi-Language ({% ref "SPEC-035" /%})

Versioned docs and multi-language are two instances of the same **variant axis over a content tree**. {% ref "SPEC-035" /%}'s forward-compatibility constraints are load-bearing here and must be honoured symmetrically:

- **Render-scoped context, not globals** — a `VersionContext` slice mirrors `LocaleContext`; both are threaded, so a build can emit locale × version subtrees.
- **Stable, variant-independent identity** — `canonicalSlug` stabilizes both anchors-across-locales and pages-across-versions. This spec generalizes it from a plan/knownSections concern to the collection level.

The **locale × version cross-product** (a German v1.0 tree) is a **non-goal for v1** but must not be foreclosed: because both axes are threaded context keyed by stable identity, a future build can nest them. The spec explicitly forbids any design choice that assumes a single axis (e.g. a global "current version," or version-qualified slugs that would collide with locale-qualified ones).

## Implementation Zones and Priorities

| Priority | Zone / Item | Effort | Notes |
|----------|-------------|--------|-------|
| P0 | `versions.json` manifest + `VersionsConfig` + `VersionContext` threading | Medium | Foundation; mirrors {% ref "SPEC-035" /%} `LocaleContext` |
| P0 | Version-scoped pipeline (partition Register/Aggregate/Post-process per version) | Large | The core engineering; touches `packages/content/` |
| P1 | `refrakt docs version` / `list` snapshot CLI (+ MCP) | Medium | The author-facing entry point |
| P1 | Routing + latest-at-root + unversioned canonical | Medium | Per-adapter surface ({% ref "SPEC-058" /%}) |
| P1 | Cross-version continuity map + switcher targeting fix (replace `versionGroup` peer match) | Medium | Reuses existing switcher widget |
| P2 | Outdated-version banner (computed content, localizable) | Small | Standard UX |
| P2 | Search scoping to active version | Small | Falls out of the version-scoped index |
| P2 | SEO: `rel=canonical` / `noindex` policy + per-version sitemap | Small | `packages/content/src/sitemap.ts` |
| P3 | Freeze-integrity `--check` | Medium | Drift protection via `contracts` pattern |
| P3 | `refrakt docs backport` helper | Small | Backport-tax mitigation |
| P3 | Release-flow integration (snapshot on `version-packages`) | Small | Dogfood driver for the site |

## Non-Goals

- **Git-ref / branch-per-version builds** — deliberately rejected for v1 (see Source-Model Decision); may return as an opt-in advanced mode since the switcher/routing/banner layer is source-model-agnostic.
- **Locale × version cross-product** — deferred; the design keeps the door open but does not build it.
- **Cross-version search** — search is scoped to the active version.
- **Automatic content migration between versions** — cutting a version is a copy, not a transform; the framework does not rewrite content for a new version.
- **Versioning arbitrary non-collection pages** — versioning is a property of a designated collection (typically `docs`), not the whole site.
- **Per-version framework/theme pinning** — frozen content is rendered by the current engine; freeze integrity is protected by the check, not by pinning old `node_modules`.

## Forward Compatibility — Git-ref opt-in

Choosing snapshot does not permanently foreclose git-ref. Because routing, the switcher, continuity, banners, and SEO all operate on *resolved content roots* rather than on how those roots were produced, a future git-ref mode could populate the same per-version partitions from checked-out refs instead of frozen dirs, behind a config flag, without touching the presentation or continuity layers. The constraint the v1 design must hold: **nothing downstream of "a version is a content root" may assume the root came from `versioned_docs/`.**

## Open Questions

- **Is "next" publicly routed?** Options: always hidden until cut; routed at `/docs/next/`; or config toggle. Leaning toward a config toggle defaulting to hidden, so pre-release docs don't leak by default.
- **Route form for latest** — root (`/docs/`) vs labelled (`/docs/v2/`) with a root redirect. Spec defaults to root-for-latest; confirm SEO implications of the redirect during implementation.
- **Where does `versioned_docs/` live** relative to the collection, and does it belong in the same content root config or a sibling? Affects the loader and the ProjectFiles seam ({% ref "SPEC-113" /%}) for hosted/in-browser builds.
- **Granularity of freeze integrity** — content-hash only (cheap, catches content edits) vs rendered-output contract (catches framework drift, heavier). Possibly tiered.

{% /spec %}
