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
  "latest": "live",         // the live tree is canonical "latest" (see Decision D2)
  "versions": [
    { "id": "2.0", "state": "supported" },  // frozen, in the switcher
    { "id": "1.0", "state": "supported" },  // frozen, in the switcher
    { "id": "0.9", "state": "archived" }    // frozen, out of the build (see Retention)
  ]
}
```

```ts
// refrakt.config.json → a `versions` block (net-new), analogous to `locale`
interface VersionsConfig {
  /** Collection this applies to (path prefix). Default: 'docs'. */
  collection?: string;
  /** Route style for the latest version: 'root' (/docs/) or 'labelled' (/docs/v2/). Default: 'root'. */
  latestAt?: 'root' | 'labelled';
  /** How many prior supported versions stay live-routed and in the switcher,
   *  beyond latest. Versions past the window are suggested for archival, never
   *  auto-removed (Decision D3). Default: 2. */
  supportWindow?: number;
  /** Route the live "next" tree publicly at /docs/next/. Default: false — hidden
   *  until cut, so pre-release docs don't leak (Decision D1). */
  routeNext?: boolean;
  /** Per-version display label overrides. Default: the version key. */
  labels?: Record<string, string>;
  /** Show the outdated-version banner on non-latest versions. Default: true. */
  banner?: boolean;
}
```

The live/authored tree is **latest** (Decision D2): it routes at the collection root, is edited freely, and corresponds to the current release line. `next`-style pre-release docs are simply the live tree between releases; it is not publicly routed unless `routeNext` is set.

### Snapshot workflow — CLI

The `refrakt docs` command group drives the lifecycle:

- **`refrakt docs version <v>`** — freeze the *outgoing* line: copy the live collection into `versioned_docs/<v>/` and record `<v>` as a `supported` frozen version in `versions.json`. Run this **when docs are about to diverge for the next line**, not on every release (see [Version Selection & Retention](#version-selection--retention)). Idempotent-guarded (refuses to overwrite an existing frozen version without `--force`).
- **`refrakt docs list`** — print the manifest (versions, states, latest, route map).
- **`refrakt docs archive <v>`** — move a frozen version to `archived` state: out of the build and the switcher, retained on disk (or in a branch/tag). Explicit and reversible — the trail is never destroyed.
- **`refrakt docs backport <path> --to <v>`** — apply a working-tree change to a frozen version (the mitigation for the freeze/backport tax), staged for review rather than silent.
- **MCP exposure** following the `refrakt.contracts` / `refrakt i18n extract` precedent, so an agent can cut or inspect versions with structured I/O.

The release flow (`npm run version-packages`, see RELEASING.md) **prompts** for a snapshot at minor/major boundaries — it does not snapshot automatically, because whether a release changes docs enough to fork is a judgment call (Decision D3). Cutting a docs version stays an intentional step.

### Version Selection & Retention

The number of versions is deliberately small — a handful over the project's life, not one per release. Three rules keep it that way.

**1. The snapshot unit is a support line, not a release.** Refrakt uses Changesets fixed mode, so every `@refrakt-md/*` package bumps together on every release, including patches. But a user on `2.0.3` reads the same docs as `2.0.0` — the patch changed no user-facing surface. Docs diverge at **minor (in 0.x) / major (post-1.0)** boundaries, so:

- **Patches never snapshot.** A doc fix shipped in a patch edits the current docs directly, or `backport`s into a frozen version if it applies to an old line.
- **Versions are labelled by line, not point release** — the switcher shows `2.x`, `1.x`, never `2.0.3`.

**2. Freeze on divergence, not on release.** Do not freeze the current version when it ships — freeze the *outgoing* version at the moment its docs are about to be rewritten for the next line:

```
live content/docs/  ─── always "latest", edited freely ──►
        │
        │ about to rewrite docs for 2.0's breaking changes?
        ▼
  refrakt docs version 1.0   ← freeze 1.0 FIRST, then diverge the live tree
```

This keeps the common path low-friction (virtually every edit lands on the freely-edited live tree, so the freeze/backport tax almost never bites) and means a release that doesn't change docs produces **no snapshot at all** — the live `2.x` tree simply keeps riding. You pay the snapshot cost only when docs genuinely fork.

**3. Retain a rolling window; archive rather than delete.** `supportWindow` (default 2) keeps *latest + N prior supported lines* live-routed and in the switcher. Versions past the window are surfaced by `refrakt docs list` as archival candidates and moved out with `refrakt docs archive` — never auto-removed, never deleted. The binding constraint is **switcher UX and build time, not disk**: frozen Markdown compresses well and diffs rarely, so keeping a few is cheap, but a 20-entry version dropdown is a real failure mode.

A realistic refrakt timeline: pre-1.0 → one live version, switcher hidden (only one version). Cut 1.0 → still just the live tree. Begin 2.0's breaking docs → freeze 1.0. Begin 3.0 → freeze 2.0. Begin 4.0 → freeze 3.0 and archive 1.0 as it leaves the window. Net: **~3 versions visible at once**, indefinitely.

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
| P1 | `refrakt docs version` / `list` / `archive` snapshot CLI (+ MCP) | Medium | The author-facing entry point; `supportWindow` retention |
| P1 | Routing + latest-at-root + unversioned canonical | Medium | Per-adapter surface ({% ref "SPEC-058" /%}) |
| P1 | Cross-version continuity map + switcher targeting fix (replace `versionGroup` peer match) | Medium | Reuses existing switcher widget |
| P2 | Outdated-version banner (computed content, localizable) | Small | Standard UX |
| P2 | Search scoping to active version | Small | Falls out of the version-scoped index |
| P2 | SEO: `rel=canonical` / `noindex` policy + per-version sitemap | Small | `packages/content/src/sitemap.ts` |
| P3 | Freeze-integrity `--check` | Medium | Drift protection via `contracts` pattern |
| P3 | `refrakt docs backport` helper | Small | Backport-tax mitigation |
| P3 | Release-flow snapshot **prompt** at minor/major boundaries | Small | Dogfood driver; intentional, not automatic (Decision D3) |

## Non-Goals

- **Git-ref / branch-per-version builds** — deliberately rejected for v1 (see Source-Model Decision); may return as an opt-in advanced mode since the switcher/routing/banner layer is source-model-agnostic.
- **Locale × version cross-product** — deferred; the design keeps the door open but does not build it.
- **Cross-version search** — search is scoped to the active version.
- **Automatic content migration between versions** — cutting a version is a copy, not a transform; the framework does not rewrite content for a new version.
- **Versioning arbitrary non-collection pages** — versioning is a property of a designated collection (typically `docs`), not the whole site.
- **Per-version framework/theme pinning** — frozen content is rendered by the current engine; freeze integrity is protected by the check, not by pinning old `node_modules`.

## Forward Compatibility — Git-ref opt-in

Choosing snapshot does not permanently foreclose git-ref. Because routing, the switcher, continuity, banners, and SEO all operate on *resolved content roots* rather than on how those roots were produced, a future git-ref mode could populate the same per-version partitions from checked-out refs instead of frozen dirs, behind a config flag, without touching the presentation or continuity layers. The constraint the v1 design must hold: **nothing downstream of "a version is a content root" may assume the root came from `versioned_docs/`.**

## Decisions

- **D1 — "next" routing**: The live tree is not publicly routed by default; pre-release docs are hidden until cut. A `routeNext` config flag opts into `/docs/next/` for projects that want to publish unreleased docs. *Rationale: a hidden default prevents pre-release docs from leaking or being indexed; the flag covers the minority that deliberately publish a "next."*
- **D2 — Latest is the live tree**: `latest` routes at the collection root and is the freely-edited live tree, not a frozen artifact. Frozen versions are always genuinely older lines. *Rationale: the alternative (latest = most recent frozen version, live tree = hidden "next") turns every current-docs fix into a backport into a frozen tree — constant friction on the most-edited docs. Live-is-latest keeps the common path frictionless; the freeze/backport tax only applies to rare edits on old lines.*
- **D3 — Selection & retention**: Snapshot per **docs-significant line** (minor in 0.x / major post-1.0), **freeze on divergence** (freeze the outgoing line when its docs are about to fork), and retain a **rolling window** (`supportWindow`, default 2) of supported lines with explicit `archive` beyond it — never auto-delete. The release flow **prompts** but does not auto-snapshot. *Rationale: decouples docs-versions from npm-versions (fixed-mode bumps everything on every patch); keeps the visible set to a handful; whether a release forks docs is a human judgment, so the trigger stays intentional.*

## Open Questions

- **Route form for latest** — root (`/docs/`) vs labelled (`/docs/v2/`) with a root redirect. Spec defaults to root-for-latest (`latestAt: 'root'`); confirm SEO implications of the redirect during implementation.
- **Where does `versioned_docs/` live** relative to the collection, and does it belong in the same content root config or a sibling? Affects the loader and the ProjectFiles seam ({% ref "SPEC-113" /%}) for hosted/in-browser builds.
- **Granularity of freeze integrity** — content-hash only (cheap, catches content edits) vs rendered-output contract (catches framework drift, heavier). Possibly tiered.

{% /spec %}
