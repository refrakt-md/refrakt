{% spec id="SPEC-071" status="draft" tags="plan, scaffolding, entity-routes, collection, dogfood, deprecation" %}

# Plan site scaffolding

Turn a project's `plan/` directory into an ordinary refrakt **site** — built by the standard content pipeline, using `entityRoutes` (SPEC-069) for per-entity detail pages and `collection` (SPEC-070) for dashboards and listings — and retire the bespoke `plan build` / `plan serve` commands. Ship it as a `create-refrakt` scaffold, and prove it by converting **refrakt's own** `plan/` into a site.

This spec is the concrete realization of SPEC-069's *Replacing plan-serve* section. It is deliberately a **proof-of-practice**: if entityRoutes + collection can fully replace the hand-rolled plan SSG, the two specs are validated against a real, demanding consumer, and we delete code rather than add it.

## Problem

The plan plugin ships its own miniature static-site generator. `plan build` (`plugins/plan/src/commands/build.ts`) and `plan serve` (`plugins/plan/src/commands/serve.ts`) call a bespoke `runPipeline()` that **bypasses `loadContent`**, builds its own three-family router (entity pages, per-status filter pages, grouped "view" pages), wraps output in a private `planLayout` HTML shell, runs its own `pagefind` index, and — for `serve` — stands up a separate HTTP server on port 3000 with a file watcher and SSE live-reload.

This predates the cross-page pipeline. Everything it does by hand is now a first-class capability:

- **Per-entity pages** → `entityRoutes` rules (SPEC-069), one route per spec/work/bug/decision/milestone, body `{% expand $item.id /%}`.
- **Status / grouped listings & dashboards** → `collection` / `backlog` (SPEC-070) on authored dashboard pages.
- **Search** → the standard site search (the `docs` layout already wires a search behavior); contributed pages are in the search index per SPEC-069.
- **Dev server + reload** → the chosen adapter's dev server (`refrakt dev`).
- **Layout** → the `docsLayout` preset + a plan `_layout.md` with sidebar nav.

So the plan plugin carries a parallel rendering stack that the framework now supersedes. Keeping it means maintaining two SSGs; replacing it means the plan site becomes "just a refrakt site," and the bespoke commands can go.

The plan plugin already does the hard part: its `register` hook (`plugins/plan/src/pipeline.ts`) indexes every plan entity with a rich `data` payload (status, priority, severity, title, source, tags, milestone, checkbox progress) and sets `sourceUrl`. The aggregation runes (`plan-progress`, `plan-activity`, `plan-history`, `decision-log`, `backlog`) already exist. What's missing is the *routing* and the *embeddability* — both of which SPEC-069/070 now provide.

## Design Principles

**Reuse the registry, don't re-scan.** The plan plugin already scans `plan/` and registers entities. The plan site is built on that registry — entity files are **registry sources, not content pages**. This is the model that proves SPEC-069: routes are *generated* from registered entities, exactly as they would be for an external (Jira/Notion) source.

**entityRoutes for detail, collection for listings.** One page *per* entity is `entityRoutes`' job (1:1, `{% expand %}`). Many entities *on* a page (dashboards, by-status, by-milestone) is `collection`'s job (N:1). The plan site uses both, which is precisely why it's a good joint proof.

**Keep the authoring CLI; retire only the renderer.** `plan create` / `next` / `update` / `validate` / `status` / `migrate` / `next-id` / `history` are authoring and management tools — they stay. Only the *rendering* commands (`plan build`, `plan serve`) are deprecated, because rendering is now the standard site's job.

**The scaffold is the product.** Most users won't hand-write the `entityRoutes` config and dashboard pages. `create-refrakt` ships a `plan-site` scaffold with a working config, layout, dashboards, and seed content — the same artifact refrakt uses for its own plan site.

## What the replacement must match

Inventory of the current commands' user-facing surface, and where each lands:

| `plan build`/`serve` feature | Replacement |
|------------------------------|-------------|
| One page per spec/work/bug/decision/milestone | `entityRoutes` rule per type, body `{% expand $item.id /%}` |
| Dashboard (`index.html`): progress, recent activity, milestones, blockers, decisions | Authored `index.md` using `plan-progress`, `plan-activity`, `backlog`, `decision-log` runes |
| Per-status filter pages (`/work/ready/`, `/bug/confirmed/`) | `collection`/`backlog` listings on authored pages (or filterable dashboard); see *Open Questions* |
| Grouped "view" pages (by tag / assignee / milestone) | `collection group="…"` on authored pages |
| Relationships + history tabs on entity pages | `expand`-embedded entity body already carries these; `plan-history` rune for the timeline |
| Full-text search (pagefind) | Standard site search (docs layout) |
| Dev server + file watcher + SSE reload | Adapter dev server (`refrakt dev`); see *Open Questions* for plan-file HMR |
| `theme.css` + `behaviors.js` emission | Standard adapter asset pipeline |
| Sidebar nav + plan layout shell | `docsLayout` preset + plan `_layout.md` |

## Authoring Surface

### The plan-site config

A plan site is an ordinary `SiteConfig` with `@refrakt-md/plan` in `plugins` and an `entityRoutes` block:

```json
{
  "contentDir": "./plan-site",
  "theme": "lumina",
  "plugins": ["@refrakt-md/plan"],
  "entityRoutes": [
    { "type": "spec",      "url": "/specs/{id}/",      "title": "{title}",         "render": "{% expand $item.id /%}" },
    { "type": "work",      "url": "/work/{id}/",       "title": "{id} — {title}",  "render": "{% expand $item.id /%}" },
    { "type": "bug",       "url": "/bugs/{id}/",       "title": "{id} — {title}",  "render": "{% expand $item.id /%}" },
    { "type": "decision",  "url": "/decisions/{id}/",  "title": "{title}",         "render": "{% expand $item.id /%}" },
    { "type": "milestone", "url": "/milestones/{name}/","title": "{name}",         "render": "{% expand $item.name /%}" }
  ]
}
```

`contentDir` holds **only** the layout and the authored dashboard pages — not the entity files (those live in `plan/` and are reached through the registry). The route rules generate the detail pages; the dashboards list them.

### Dashboard pages (the `collection`/`backlog` side)

The scaffold's `contentDir` ships authored pages, e.g.:

- `index.md` — overview: `{% plan-progress /%}`, `{% plan-activity /%}`, a "ready work" `{% backlog filter="status:ready" sort="priority" /%}`, `{% decision-log /%}`.
- `work.md` — `{% collection type="work" group="status" sort="priority" /%}` (replaces per-status filter pages with one grouped, filterable view).
- `milestones.md` — `{% collection type="milestone" %}` plus per-milestone work via `{% collection type="work" filter="milestone:{id}" /%}` inside a milestone route's template (the SPEC-069 grouping pattern).
- `_layout.md` — `{% layout %}` using the `docsLayout` preset with a plan sidebar (`{% region %}` for nav listing the entity-type sections).

### The `create-refrakt` scaffold

`create-refrakt` selects output by `--type` (today: the adapter projects). Add a **`plan` project type** (orthogonal to the adapter `--target`) that scaffolds:

- `refrakt.config.json` with `@refrakt-md/plan` + the `entityRoutes` block above.
- A `plan/` seed (one example spec + work item + decision + milestone) so `refrakt dev` shows a populated site immediately.
- A `plan-site/` content dir with `_layout.md` + the dashboard pages above.
- The adapter scaffold for the chosen `--target` (so `create-refrakt --type plan --target sveltekit` is a complete, runnable plan site).

Dependency versions derive from `create-refrakt`'s own `package.json` at runtime, as the other templates do.

## Prerequisite — plan entity embeddability

`{% expand $item.id /%}` requires each plan entity to be embeddable. SPEC-069's embeddability contract is *either* `embed()` *or* `sourceFile` + `extract`. The plan plugin's `register` hook currently sets `sourceUrl` but **not** `sourceFile`/`extract` (the "WORK-251" gap). This spec includes filling it: the register/scan sets `sourceFile` (the entity's source `.md` path) and an `extract` that returns the entity rune's transformed body, so `{% expand %}` renders the spec/work/bug/etc. inline. Without this, the entity routes produce empty pages.

## refrakt's own plan site (the dogfood)

Add a second site to refrakt's root `refrakt.config.json`:

```json
{
  "sites": {
    "main": { /* unchanged */ },
    "plan": {
      "contentDir": "./plan-site",
      "theme": "lumina",
      "plugins": ["@refrakt-md/plan"],
      "entityRoutes": [ /* the rules above */ ]
    }
  }
}
```

refrakt's existing `plan/` entity files are unchanged (they remain the registry sources). A new `plan-site/` dir holds the layout + dashboards. Building the `plan` site renders refrakt's real specs/work/decisions/milestones through the standard pipeline. When this site builds and matches what `plan serve` produced, the proof is complete.

The two sites build independently (per-site pipeline). The `plan` site can be served at its own base path or as a separate output, decoupled from the docs site.

## Deprecation of `plan build` / `plan serve`

1. **Same release** that ships entityRoutes + collection + the plan-site scaffold: mark `plan build` and `plan serve` **deprecated**. On invocation they print a deprecation notice pointing at `create-refrakt --type plan` (for new projects) and the `entityRoutes` config (for existing ones), then still run.
2. The authoring CLI (`create`/`next`/`update`/`validate`/`status`/`migrate`/`next-id`/`history`) is **unaffected**.
3. **A later release** removes `build`/`serve` and the bespoke render stack (`render-pipeline.ts`'s router, `planLayout`, the private dev server, the pagefind invocation). The plan plugin keeps its runes, register/aggregate hooks, and authoring CLI.

## Output Contract

- The plan site produces the same `SitePage` shape as any refrakt site; entity-detail pages carry `source.type === "contributed"` (SPEC-069), dashboards are file-backed.
- Per-entity routes resolve via `{% ref %}` and appear in the sitemap, search index, and nav (SPEC-069 guarantees).
- The plan plugin's aggregation runes render inside authored dashboard pages exactly as they do today.

## Engine / Package Changes

- **`@refrakt-md/plan`** — register hook sets `sourceFile` + an `extract` (embeddability); no rune changes. `build`/`serve` commands gain deprecation notices, scheduled for removal.
- **`@refrakt-md/create-refrakt`** — new `plan` project type: config + `plan/` seed + `plan-site/` content dir + adapter scaffold. New template dir(s) under `packages/create-refrakt/`.
- **refrakt root** — new `sites.plan` entry + a `plan-site/` content dir committed to the repo.
- **No new engine primitives** — this spec consumes SPEC-069 (entityRoutes, contributePages, embeddability) and SPEC-070 (collection, field-match grammar, `$item`, formatter functions) as-built. If it needs a primitive neither provides, that's a finding to feed back into those specs.

## Acceptance Criteria

- [ ] Plan entities are embeddable: the register hook sets `sourceFile` + `extract`, and `{% expand $item.id /%}` renders a spec/work/bug/decision/milestone body inline
- [ ] An `entityRoutes` block generates one detail page per plan entity type at the templated URLs; pages resolve via `{% ref %}`, appear in sitemap + search
- [ ] Authored dashboard pages reproduce the current dashboard (progress, activity, ready-work backlog, decisions) using existing plan runes + `collection`
- [ ] Per-status and grouped views are expressed as `collection`/`backlog` listings (no bespoke per-status route generation)
- [ ] `create-refrakt --type plan [--target <adapter>]` scaffolds a complete, runnable plan site (config + seed `plan/` + `plan-site/` dashboards + layout)
- [ ] refrakt's root `refrakt.config.json` declares a `plan` site; `refrakt build` produces a browsable plan site from refrakt's own `plan/`
- [ ] The generated plan site is feature-comparable to `plan serve` output (entity pages, dashboards, listings, search, sidebar nav) — gaps documented
- [ ] `plan build` and `plan serve` print deprecation notices pointing at the site approach; the authoring CLI is unchanged
- [ ] Docs cover: configuring a plan site, the `entityRoutes` rules, dashboard authoring with `collection`, and the migration from `plan build`/`serve`

## Out of Scope

- **Removing `plan build`/`serve` in this release.** Deprecate now, remove later, so existing users aren't broken.
- **Changing the plan authoring CLI or rune schemas.** Only embeddability is added.
- **A general external-source dogfood** (GitHub issues, typedoc). Valuable separate proofs of SPEC-069's *external* path, but the plan site is the in-repo one.
- **Multi-theme plan sites.** The scaffold ships `lumina`; theming is the standard site concern.

## Open Questions

**Dev-server HMR for plan-entity edits.** `plan serve` watches `plan/*.md` and live-reloads. Standard adapter HMR watches the *content dir* — but plan entity files are registry sources outside it, and SPEC-069 scoped contributed-page HMR out. So editing `plan/work/WORK-1.md` may need a full rebuild to update its generated route. Options: (a) accept rebuild-on-edit for plan entities in dev (document it); (b) the plan plugin registers a watcher that invalidates affected routes. Recommend (a) for v1, revisit if painful.

**Per-status pages: generate or filter?** `plan build` emits discrete `/work/ready/` pages. The collection model favors *one* grouped/filterable view (`{% collection type="work" group="status" /%}`). Discrete per-status URLs would need either many authored pages or an entityRoutes-style "page per status value" (the deferred `groupBy` from SPEC-069's Out of Scope). Recommend: one grouped dashboard view in v1; if discrete status URLs matter, promote status to an entity or author the handful of pages.

**Does refrakt's plan site live at a sub-path of the docs site or as its own deployment?** A `sites.plan` with its own base path vs. a nested section of `main`. Recommend its own site (clean separation, independent build), surfaced from the docs site via a link.

**Search parity.** Confirm the standard site search indexes `entityRoutes`-generated detail pages (SPEC-069 says contributed pages are indexed) and that it's an adequate replacement for the plan-specific pagefind UI.

## References

- {% ref "SPEC-069" /%} — plugin-contributed routes; `entityRoutes`, embeddability, the *Replacing plan-serve* migration this spec realizes
- {% ref "SPEC-070" /%} — collection rune; dashboards, listings, the field-match grammar and `$item` contract
- {% ref "SPEC-064" /%} — plan plugin registration (the registry this site builds on)
- `plugins/plan/src/commands/build.ts` + `serve.ts` — the bespoke SSG being retired
- `plugins/plan/src/pipeline.ts` — register/aggregate hooks; where `sourceFile`+`extract` get added
- `packages/create-refrakt/` — scaffold mechanics; where the `plan` type lands

{% /spec %}
