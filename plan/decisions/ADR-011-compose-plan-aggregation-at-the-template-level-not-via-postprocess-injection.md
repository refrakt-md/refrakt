{% decision id="ADR-011" status="proposed" date="2026-05-26" source="SPEC-070" tags="plan, collection, relationships, runes, pipeline" %}

# Compose plan aggregation at the template level, not via postProcess injection

## Context

With {% ref "SPEC-070" /%} (the `collection` rune + per-item `card` templates) and SPEC-069 (plugin-contributed `entityRoutes`) landed, the plan plugin now has two overlapping ways to put aggregated content on a page, and the older one is the bespoke path we just argued against.

Today the `@refrakt-md/plan` `postProcess` hook (`plugins/plan/src/pipeline.ts`) reaches into already-rendered entity runes and **injects** content the author never wrote:

- **Milestone backlog** — `buildMilestoneBacklog(name, planData)` (pipeline.ts:681) appends a status-grouped, priority-sorted set of work/bug cards to every `milestone` rune's body. The selection is a *plain forward field match*: `e.data.milestone === milestoneName` (pipeline.ts:686).
- **Relationships / History tabs** — every plan entity rune is wrapped in a tab-group whose Overview panel is the entity's own body, with computed Relationships and History panels added (pipeline.ts:558+).

This injection is the same anti-pattern we removed from `collection`: the rune dictates chrome and aggregation that should belong to the author/template. Concretely:

- **The milestone backlog duplicates `collection`, less flexibly.** Because the link is a forward self-field, `{% collection type="work,bug" filter="milestone:<name>" group="status" sort="priority" %}` reproduces the exact selection. The plan-site dogfood (`plan-site/content/work.md`) already renders work this way with a `card` partial — so the injected backlog now competes with the page-level collection pattern.
- **The tabs couple *placement and presentation* to the rune.** Authors get tabs whether or not they want them, positioned wherever the rune sits. In the downstream Trace product, tabs were replaced with an accordion, which exposed the real problem: hand-authored supplementary content lands at the bottom of a long article in source order and loses its meaning. Placement needs to be a template/layout decision, not baked into the hook.
- **Relationships and History are *not* collection-shaped.** Relationships is a bidirectional, typed graph built from three sources — `source=` fields, `## Dependencies` sections (scanner), and prose ID mentions (regex over body text) — with reverse edges synthesized and edge `kind` computed from cross-entity state (`relationships.ts`). Half the edges have no backing field, so a field-match `collection` can't express the panel. History is `git log` per file — not registry data at all.

The result is a plugin that both authors aggregation *and* owns presentation, while the generic machinery (`collection`, `entityRoutes`, partials) can now express the same things in a way the author controls.

## Options Considered

### 1. Status quo — keep postProcess injection

Leave `buildMilestoneBacklog` and the tab-wrapping in place.

**Pros:**
- Zero-config: a milestone/entity page "just works" with no template wiring.
- No migration of existing plan content or downstream consumers.

**Cons:**
- Two aggregation paths (rune injection vs `collection`) for the same job; the injected one is less flexible and can't be restyled or repositioned.
- Presentation (tabs, card chrome, grouping) is hardcoded in the plugin — exactly the coupling `collection` was designed to remove.
- The long-article placement problem (Trace's accordion) is unsolvable while placement lives in the hook.

### 2. Author the panels inside each entity's content

Have authors add `{% collection %}` / supplementary runes into each entity's markdown body.

**Pros:**
- Full author control; no injection.

**Cons:**
- Forces presentational concerns into plan *content*, which agents and humans write — content should stay pure data.
- Requires migrating large amounts of existing plan content, and is a headache for third-party tools (Trace) that own their content.

### 3. Compose at the template level — **chosen**

Slim the entity runes to pure renderers, drop the `postProcess` injection, and compose aggregation/supplementary panels in the **entityRoutes render template** (authored once per type, via SPEC-069) — never in per-entity content. Express:

- **milestone → work** with `collection` (`filter="milestone:<name>"`),
- **relationships / history** with dedicated `$entity`-fed runes,

and let the template (and later the layout) decide placement.

**Pros:**
- One mental model: aggregation and chrome are always the author/template's job (`collection`'s philosophy), whether the source is a registry query or an entity's edges.
- **No content migration** — entity files stay pure; the panels are composed in the site's render template, not the markdown. Third-party content (Trace) is untouched.
- Placement is decoupled from source order: the static plan site can place panels at the end under real markdown headings (so `toc` references them and "skip to Relationships" works), and a theme can *later* reposition that trailing section into a sticky rail purely in CSS/layout — no content or template change.
- Reuses infrastructure we already built: the deferred-body reparse, the field-match grammar, and the per-item rendering helpers in `collection-resolve.ts`.

**Cons:**
- Loses the zero-config "milestone just shows its work." Mitigated by shipping a milestone-page partial/template so it stays a one-liner for authors.
- Requires two new bound primitives (`$entity`, `$kind`), a new generic `relationships` rune, and a core relationship-graph capability (the latter is its own follow-up spec).
- The progress rollup currently computed inside `buildMilestoneBacklog` needs a new home.
- History generalization is gated on a separate refrakt diff package; until then `plan-history` stays plan-specific.

## Decision

Adopt option 3. Specifically:

1. **Slim the plan entity runes to pure renderers** and remove the `postProcess` injection: drop `buildMilestoneBacklog` and the automatic tab-wrapping of entity bodies. Compose aggregation and supplementary panels at the entityRoutes render-template level.

2. **Milestone work → `collection`.** The milestone→work link is a forward field (`work.data.milestone`), so the milestone-page template uses `{% collection type="work,bug" filter="milestone:<name>" group="status" sort="priority" %}` with a `card` partial. The aggregate **progress rollup** (checked/total criteria) is *not* collection-expressible and moves to `plan-progress` (or a small formatter) rather than staying inside milestone.

3. **New generic core `relationships` rune** (in `@refrakt-md/runes`, not the plan plugin — the rune is domain-agnostic; only the *edge derivation* is plan-specific). It is `collection` whose source set is the edges of an entity rather than a registry query, and each item carries its edge `kind`:
   - **Generic over kind.** The edge `kind` is an arbitrary **`string`**, not the plan-specific union it is today (relationships.ts:14). The rune groups by whatever kinds the graph contains and labels them via `humanize` — so it works for storytelling (`ally`/`rival`/`mentor`), plan (`implements`/`blocks`/`depends-on`), or any domain. There is no per-domain `relationships` rune; there is one rune and many edge contributors.
   - **Backed by a core relationship graph.** This requires lifting relationships out of the plan plugin into a core capability: the `EntityRegistry` (which today has no edge concept — pipeline.ts:90) gains an edge store `{ fromId, toId, kind: string }`, a plugin contribution path during aggregate, and a `getRelated(id)` query. Plan's `buildRelationships` becomes a *contributor* (keeping all its plan-isms — reverse-edge synthesis, dedup precedence, status-dependent kind — in the contributor, not the rune). Storytelling's `bond` rune (today purely presentational, registering nothing) can likewise contribute `ally`/`rival`/… edges. This graph is a reusable primitive — `collection`/`ref` could later query it too — so it warrants its **own follow-up spec**.
   - **Binding:** the related entity binds to **`$item`** (identical contract to `collection`: `id`/`type`/`url`/`data`), and the edge kind binds to **`$kind`**. Using `$item` makes the same card partials (e.g. `work-card.md`) reusable across `collection` and `relationships`. Tradeoff accepted: when `relationships` is nested inside a `collection` body, the inner `$item` shadows the outer one (rare).
   - **Attributes mirror `collection`:** `of` (entity to describe; defaults to `$entity`; accepts an id or a bound entity), `kind` (edge kinds, comma-separated), `type` (restrict related entity types), `group` (defaults to `kind`; also `type`/`none`), `sort`, `limit`, `fields` (no-body projection), `item-template`, and a per-edge body template.
   - **Zero-config default:** no body → edges grouped by kind, each a title link to the related entity (the analog of `collection`'s `fields` shorthand). Labels via the generic `humanize` formatter below — no plan-specific label function.
   - **Implementation:** refactor the per-item render helpers (built-in item, grouping, sort, deferred-body reparse) in `collection-resolve.ts` into a shared module, and feed `relationships` the resolved edge set plus the `$kind` binding.

4. **History: reuse `plan-history` + `$entity` now; generalize later.** The per-entity history rune already exists as `plan-history` (`plan-history.ts`) — it supports per-entity (`id=`) and global modes and resolves from aggregated git data via a sentinel in `postProcess`, which is the correct pattern (author-placed rune, filled from aggregated data), *not* the injection anti-pattern. The only gap is the `$entity` binding so `{% plan-history /%}` on an entity page targets the page entity without repeating `id=`. **No new `history` rune is introduced now.** `plan-history` is plan-specific only because its events are a *semantic* changelog (created / attribute-change / criteria-check / resolution / content — `HistoryEvent`, history.ts:28), reconstructed by understanding the plan rune format. Long term, once a generic refrakt **diff package** can diff any entity's attributes/content across revisions, a generic core `history` rune renders those events (mirroring `relationships`), and `plan-history` collapses into a thin plan-flavored layer. That generalization is **gated on the diff package** and tracked as future work, not part of this ADR.

5. **New `$entity` bound variable** — the page's primary entity, the page-level analog of `$item`/`$page`/`$file`. `relationships`/`history` default `of=$entity`.

6. **Promote `humanize()` to a generic formatter.** The private `humanize()` in `collection-resolve.ts:44` (currently used for `fields` table headers) becomes a public shared formatter function alongside `currency`/`date`/`number`/`join`, usable anywhere markdoc runs. This removes any need for a plan-specific `relationshipLabel` — `{% humanize($kind) %}` covers the kind labels losslessly because the kinds are kebab-named (`blocked-by` → "Blocked By", `depends-on` → "Depends On"). Decisions on its behavior:
   - **Casing: Title Case** ("Blocked By", "In Progress"), keeping existing `collection` `fields` headers unchanged.
   - **camelCase split:** add a camelCase word boundary (`/([a-z])([A-Z])/ → "$1 $2"`) so `prepTime` → "Prep Time"; strictly better for both headers and labels.

7. **Static-site placement:** the plan-site entity templates place `relationships`/`history` at the end of the page under real markdown headings (`## Relationships`, `## History`) so `toc` indexes them. A sidebar/rail treatment is left to the theme as a future, non-breaking enhancement.

## Rationale

The milestone backlog and the relationships/history tabs converge on one move: **the rune should render its own entity; aggregation and supplementary presentation belong to the template.** This is the same boundary `collection` drew (layout/chrome from the item, not the rune), now applied to the plan plugin's injection hook.

Composing at the *entityRoutes template* level (not in per-entity content) is what makes this viable without migration: content stays pure, downstream tools are unaffected, and the template is authored once per type. The end-of-page + TOC placement is the pragmatic answer to the long-article problem that tabs/accordion couldn't solve, and because the panels are standalone runes under headings, the eventual sidebar treatment is a pure layout/CSS change.

Keeping relationships and history as dedicated runes (rather than forcing them into `collection`) respects the data's actual shape — a typed bidirectional graph and a semantic changelog — neither of which is a field-match over self-owned data. But the *rune* is generic and the *data derivation* is domain-specific: the `relationships` rune lives in core and groups arbitrary string kinds, while plan (and later storytelling's `bond`) contribute the edges — the same split refrakt already draws between the generic identity transform and per-plugin rune config. Binding the related entity to `$item` maximizes template/partial reuse, the strongest argument for the small nesting-shadow tradeoff. Promoting `humanize` keeps the formatter family generic and domain-agnostic, the rule established with `collection`.

## Consequences

**For `@refrakt-md/plan`:**
- Remove `buildMilestoneBacklog` and the tab-wrapping branch from `postProcess` (pipeline.ts:546-…).
- Convert `buildRelationships` from a private aggregate map into an **edge contributor** to the core relationship graph (kinds stay plan's vocabulary; the derivation logic is unchanged).
- Add `$entity` support to `plan-history` so `id=` can be omitted on entity pages. No new history rune.
- Move the milestone progress rollup to `plan-progress` (or a formatter); decide as part of the follow-up work.
- Ship a milestone-page partial/template so milestone pages stay one-liners.

**For `@refrakt-md/runes` + `@refrakt-md/content` (core):**
- Add a relationship-graph capability to the `EntityRegistry`: an edge store `{ fromId, toId, kind: string }`, a plugin contribution path during aggregate, and a `getRelated(id)` query (pipeline.ts:90 currently has no edge concept).
- Add the generic `relationships` rune (groups arbitrary string kinds; `$item`/`$kind` bindings).
- Promote `humanize()` from `collection-resolve.ts` into the shared functions module as a public formatter; `collection`'s header logic calls the promoted function. Add the camelCase boundary.
- Refactor the per-item render helpers in `collection-resolve.ts` into a shared module consumable by `relationships`.
- Introduce the `$entity` bound variable (page-primary-entity), alongside the existing `$item`/`$page`/`$file` bindings.

**For the plan-site dogfood:**
- Entity route templates compose `{% collection … %}` (milestone work) and `{% relationships /%}` / `{% history /%}` under markdown headings at page end.
- `toc` picks up the headings; "skip to Relationships/History" works without a sidebar.

**For authors and third parties (Trace):**
- Plan content stays pure data — no migration. Presentation is opt-in at the template level.
- Downstream consumers compose (or omit) the panels in their own templates; nothing is force-injected.

**Open follow-up:**
- A **spec for the core relationship-graph capability** — registry edge store, the plugin contribution API, `getRelated` semantics, the generic `relationships` rune contract, and the `$entity` binding. Plan and storytelling (`bond`) are its first two contributors.
- A **future spec for a generic refrakt diff package**, on which a generic core `history` rune would ride; `plan-history` then becomes a thin layer. Out of scope here, recorded as direction.
- Decide the precise home and shape of the milestone progress rollup.
- Consider the responsive sidebar/rail theme treatment (rail on wide → accordion/section on narrow) as a separate, non-breaking layout enhancement.
- The auto-injected tabs removal is a behavior change for existing plan sites; note it in the v0.16.0 (or successor) milestone notes.

{% /decision %}
