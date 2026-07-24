{% spec id="SPEC-072" status="shipped" tags="collection, relationships, registry, ordering, pipeline, plan" source="SPEC-070" released-in="v0.16.0" %}

# Entity relationship graph and domain-aware collection ordering

Three core capabilities that {% ref "ADR-011" /%} and {% ref "ADR-012" /%} depend on, lifted out of the plan plugin into reusable framework primitives: a **relationship graph** in the entity registry (with a generic `relationships` rune over it), **domain-aware ordering** for `collection` sort/group, and a public **`humanize`** formatter. The throughline is the same one {% ref "SPEC-070" /%} drew: the *rune/engine is generic; the domain contributes the data and semantics*. Today both relationships and enum ordering are private, hardcoded plan-plugin constructs; this spec makes them registry/collection capabilities that any plugin (plan, storytelling, …) feeds.

## Problem

**Relationships are a private plan construct.** `buildRelationships` (`plugins/plan/src/relationships.ts`) builds a typed, bidirectional edge graph from `source=` attributes, `## Dependencies` sections, and prose ID references, with a hardcoded `kind` union. It lives entirely in the plan plugin's `aggregate` hook as module-level maps. The core `EntityRegistry` has **no edge concept** (`packages/types/src/pipeline.ts` — only `register`/`getAll`/`getByUrl`/`getById`/`getTypes`). Meanwhile storytelling's `bond` rune expresses the *same idea* (typed `from`/`to`/`type` connections) but is purely presentational — it registers nothing and can't answer "all bonds touching this character." So the concept is cross-domain; only plan built a graph, and built it privately.

**Collection can't order enum fields.** `collection` sort/group are generic lexical/numeric (`packages/runes/src/collection-resolve.ts`). The plan plugin keeps a *second* `sortEntities`/`groupEntities` (`plugins/plan/src/filter.ts`) carrying `PRIORITY_ORDER = { critical:0, high:1, medium:2, low:3 }` and a per-type status group order (`pipeline.ts`). So `{% collection sort="priority" %}` would sort *alphabetically* (critical, high, low, medium — wrong), and status groups would appear in encounter order, not a meaningful one. This is the one true parity gap blocking {% ref "ADR-012" /%} (collapsing `backlog`/`decision-log` onto `collection`).

**`humanize` is trapped.** The label helper (`collection-resolve.ts:44`) that produces `fields` table headers is private, so the `relationships` rune would otherwise need a bespoke plan-specific label function for edge kinds.

## Goals

- A generic, directed, typed **relationship graph** in the `EntityRegistry`, contributed to by plugins during aggregate, queryable by `getRelated(id)`.
- A generic core **`relationships` rune** modeled on `collection`, rendering an entity's edges grouped by `kind`, with arbitrary string kinds.
- **Domain-aware `(type, field)` ordering** for `collection` sort/group, defaulting to each rune's schema `matches`, overridable, with lexical/numeric fallback and a defined mixed-type rule.
- Promote **`humanize`** to a public shared formatter.
- The plan plugin becomes a *contributor* (edges + ordering overrides) and **deletes** its duplicate `filter.ts` sort/group.

## Non-goals

- The generic `history` rune / refrakt diff package (separate future spec; `plan-history` is reused as-is per ADR-011).
- A shadow-stable page-entity alias (`$entity`) — deferred; entity templates pass `$item.id` explicitly (ADR-011).
- The consumer-side template/rune changes in ADR-011 (template composition, milestone→collection) and ADR-012 (backlog/decision-log sugar) — those are tracked by their own work items that *depend on* this spec.

## Capability 1 — Relationship graph in the registry

### Edge model

A directed, typed edge:

```ts
interface EntityEdge {
  fromId: string;
  toId: string;
  kind: string;          // arbitrary, domain-defined (not a union)
  fromType?: string;     // convenience, resolvable from the registry
  toType?: string;
}
```

Edges are **directed**; a contributor that wants a bidirectional relationship adds both directions (with its own forward/reverse `kind` labels — exactly what plan already does). `getRelated(id)` returns the edges whose `fromId === id`, so "every edge touching X" is just X's outgoing edges, which is why reverse edges are added explicitly.

### Registry surface

`EntityRegistry` gains:

```ts
relate(edge: EntityEdge): void;                 // contribute an edge
getRelated(id: string, opts?: {
  kind?: string | string[];                     // filter by edge kind
  type?: string | string[];                     // filter by target entity type
}): ResolvedEdge[];                             // edge + resolved target EntityRegistration
```

`relate()` is callable during the **aggregate** phase (the phase that already builds cross-page indexes). Core dedups exact `(fromId, toId, kind)` duplicates; any richer precedence (e.g. "a `source=` edge suppresses a duplicate prose `related` edge") is the contributor's responsibility — it decides which edges to emit.

### Contribution

Plugins contribute edges from their `aggregate` hook via the registry handle they already receive. The plan plugin's `buildRelationships` is rewritten to call `registry.relate(...)` instead of populating private maps; its derivation logic (reverse-edge synthesis, dedup precedence, status-dependent kind) is unchanged. Storytelling's `bond` rune becomes a contributor too (emitting `ally`/`rival`/`mentor`/… edges from its `from`/`to`/`type`), in addition to its presentational rendering.

### Reusability

The graph is a general primitive: `collection` and `ref`/`expand` may later consult it (e.g. "work related to X"). This spec only requires `getRelated` for the `relationships` rune; broader consumers are out of scope here.

## Capability 2 — The `relationships` rune (core)

A generic rune in `@refrakt-md/runes` (not the plan plugin). It is `collection` whose source set is `getRelated(of)` rather than a registry type-query; each rendered item is a related entity carrying its edge `kind`.

### Bindings

- **`$item`** — the related entity, identical contract to `collection` (`id`/`type`/`url`/`data`). Reusing `$item` makes the same card partials (e.g. `work-card.md`) work across `collection` and `relationships`.
- **`$kind`** — the edge kind string for the current edge (the one new binding this spec introduces). Bound only inside the `relationships` body.

### Attributes (mirror `collection`)

| Attribute | Meaning |
|-----------|---------|
| `of` | **Required.** The entity to describe — an id or a bound entity, passed explicitly (`of=$item.id` in an entity template, matching `{% expand $item.id /%}`). No implicit page-entity default. |
| `kind` | Edge kinds to include, comma-separated (e.g. `kind="blocks,blocked-by"`). Omitted → all kinds. |
| `type` | Restrict *related* entity types. |
| `group` | Group-by; **defaults to `kind`**; also `type` or `none`. |
| `sort` | Sort the related entities (uses Capability 3 ordering). |
| `limit` | Cap after sort. |
| `fields` | No-body projection on the related entity (the `collection` shorthand). |
| `item-template` | Reusable per-edge partial. |
| *body* | Per-edge template, with `$item` + `$kind` bound. |

### Zero-config default

With no body: edges grouped by `kind`, each rendered as a title link to the related entity (the analog of `collection`'s `fields` shorthand). Group headings are the kinds, labelled via `humanize($kind)` (Capability 4) — no plan-specific label function.

### Output contract

```html
<section class="rf-relationships" data-rune="relationships" data-of="WORK-1">
  <div class="rf-relationships__group" data-kind="implements">
    <h3 class="rf-relationships__group-title">Implements</h3>
    <div class="rf-relationships__items">
      <a class="rf-relationships__title" href="/specs/SPEC-1/">SPEC-1 — Auth</a>
    </div>
  </div>
  <!-- …or, with a body template, each item is the template's own output -->
</section>
```

### Implementation

Extract the per-item render helpers (built-in item, grouping, sort, deferred-body reparse) from `collection-resolve.ts` into a shared module; `relationships` feeds it the resolved edge set plus the `$kind` binding. It resolves in the pipeline the same way `collection` does (it needs the aggregated graph).

## Capability 3 — Domain-aware ordering for `collection`

`collection` sort and group gain an ordering lookup keyed by **`(type, field)`**.

### Keying

Orderings are keyed `(type, field)`, **never `field` alone** — `work.status`, `spec.status`, and `milestone.status` are distinct enumerations, and a cross-domain `status` (e.g. storytelling) must not collide.

### Source of the order

1. **Default: the rune schema's `matches` array.** A rune attribute already declares its enum as an ordered list (e.g. work `priority` `matches: ["critical","high","medium","low"]`). For a given `(type, field)`, that array *is* the canonical order, derived automatically — zero registration for the common case.
2. **Explicit override.** A plugin may register an explicit `(type, field) → string[]` when the *presentation* order differs from the *declaration* order (e.g. a status dashboard wants actionable-first — `blocked, in-progress, review, ready, …, done` — not lifecycle order).
3. **Fallback.** No ordering registered for `(type, field)` → existing generic lexical/numeric sort (numeric values numerically, ISO dates chronologically, else lexically).

### Mixed-type queries — rank normalization

For a heterogeneous set (`type="work,bug"`, or backlog `show=all`), there is no single ordering. Resolve each entity's value to its **index within its own `(type, field)` ordering** (its rank), then:

- **sort** by that integer rank;
- **group** display order = each group's representative (minimum) rank.

Same-value groups across types merge; cross-type sets compose naturally (all earliest-stage items cluster regardless of type). Homogeneous queries are the degenerate case. Unranked values (no ordering, or value absent from the ordering) sort after ranked ones, then lexically.

### Applies everywhere collection sorts/groups

The same ordering serves `collection`, `relationships`, and (per ADR-012) the `backlog`/`decision-log` sugar.

### De-duplication

Delete the plan plugin's `filter.ts` `sortEntities`/`groupEntities`. The plan plugin registers ordering **overrides only where it diverges from `matches`** (notably the actionable-first status group order); everything else falls out of the schema automatically.

## Capability 4 — Promote `humanize`

Move `humanize()` from `collection-resolve.ts` into the shared markdoc functions module as a public formatter alongside `currency`/`date`/`number`/`join`, usable anywhere markdoc runs (`{% humanize($item.data.status) %}`, `{% humanize($kind) %}`).

- **Casing: Title Case** ("Blocked By", "In Progress") — keeps existing `collection` `fields` headers unchanged.
- **camelCase split:** add a camelCase word boundary (`/([a-z])([A-Z])/ → "$1 $2"`) so `prepTime` → "Prep Time" — strictly better for both headers and labels.
- `collection`'s header logic calls the promoted function (no behavior change beyond the camelCase improvement).

## Capability 5 — Body zones (preamble / template / fallback) + empty state

`collection` (and `relationships`) today render an empty `__items` when a query yields nothing — the author has no fallback, and a *preceding sibling* heading (`## Blocked` above the rune) is left stranded when the section is empty. Because emptiness is resolved at **build time**, `{% if %}` can't express it. Two surfaces fix this:

**Body zones (when there is a body).** Split the body on **top-level `hr` (`---`)** into positional zones, mirroring `card`/`recipe`:

- **1 zone** → per-item template (today's behavior, unchanged — zero-config preserved).
- **2 zones** → `preamble --- template`.
- **3 zones** → `preamble --- template --- fallback`.
- Lead with an empty zone (`--- template --- fallback`) to skip the preamble — the same escape hatch `card` uses for "no media."

Semantics:
- **preamble** — rendered **once, only when the result set is non-empty**, *above* the items. This is what lets the section heading live inside the rune so the whole section (heading + items) appears/disappears together. Transformed plainly (no `$item`/`$kind` binding).
- **template** — the per-item/per-edge deferred template, exactly as today (may be empty → the built-in items render).
- **fallback** — rendered **once, only when the result set is empty**, in place of items. Transformed plainly.
- **Split on top-level `hr` only:** a `---` *inside* a nested `{% card %}`/`{% recipe %}` is a child of that tag, not a sibling, so it is never mistaken for a zone delimiter. In `table` layout the template zone keeps its heading-delimited column semantics — zones split first, then the template zone is column-split.

**`empty` attribute (when there is no body).** The self-closing form (`{% collection … /%}` — the common dashboard) has no body to carry zones, so a string `empty="No results."` renders a muted empty state. Absent `empty` → render nothing (today's behavior preserved; an empty section may legitimately vanish).

**Output:** add `.rf-collection__preamble` (rendered when non-empty) and `.rf-collection__empty` (rendered when empty); same `__items` otherwise. `relationships` gets `.rf-relationships__preamble` / `__empty`.

**Scope note:** this controls only the rune's *own* output. "Hide a section heading that sits *outside* the rune" is solved by moving that heading into the **preamble** zone — there is no separate section-level wrapper.

## Acceptance Criteria

- [ ] A top-level-`hr` body split yields preamble / template / fallback zones (1/2/3-zone positional, empty-leading-zone to skip preamble); a single-zone body is unchanged; nested-rune `---` is not a delimiter.
- [ ] Preamble renders once above items only when non-empty; fallback renders once in place of items only when empty; both transform without `$item`/`$kind`.
- [ ] The self-closing (no-body) form supports a string `empty=` fallback; absent → render nothing. Applies to `collection` and `relationships`.
- [ ] `EntityRegistry` exposes `relate(edge)` and `getRelated(id, opts?)`; edges are directed, carry an arbitrary string `kind`, and exact duplicates are deduped by core.
- [ ] `getRelated` filters by `kind` and target `type`, and returns each edge with its resolved target `EntityRegistration`.
- [ ] The plan plugin contributes its existing edges via `relate()` from `aggregate`; its derivation behavior (reverse edges, precedence, status-dependent kind) is preserved; no private relationship maps remain.
- [ ] A generic `relationships` rune ships in `@refrakt-md/runes` with the attribute/binding contract above; `of` is required and explicit; `$item`/`$kind` bind as specified.
- [ ] `relationships` zero-config output groups edges by `kind` with `humanize`d headings and a title link per related entity; with a body it renders the per-edge template arranged by `layout`.
- [ ] `collection` sort/group consult a `(type, field)` ordering: schema-`matches` default, explicit override, lexical/numeric fallback.
- [ ] Mixed-type sort/group uses rank-normalization as specified.
- [ ] The plan plugin's `filter.ts` `sortEntities`/`groupEntities` are removed; plan registers only the status-order override; existing plan dashboards render in the same order as before.
- [ ] `humanize` is a public shared formatter (Title Case + camelCase split); `collection` `fields` headers are unchanged except the camelCase improvement.
- [ ] The shared per-item render helpers are extracted from `collection-resolve.ts` and used by both `collection` and `relationships`.
- [ ] `collection`/`relationships` accept `group-display` (`headings` default | `accordion`); accordion renders each group as a collapsed native `<details>` panel reusing the `accordion` rune's BEM classes, with a per-group count, independent (multiple-open) and JS-free.
- [ ] The preamble and fallback zones bind `$count` (matched, pre-limit) and `$shown` (rendered, post-limit) on both runes; in the fallback both are `0`.

## Out of scope / follow-ups

- Generic `history` rune + refrakt diff package (separate spec).
- A shadow-stable page-entity alias for nested back-references (deferred per ADR-011).
- Broader graph consumers (`collection`/`ref` querying relationships).
- **Computed / indirect relationships** (e.g. "posts sharing tags", "see also", "more like this"). These need *no new core capability*: a plugin's `aggregate` hook computes the similarity (tag overlap, etc.) and contributes edges via `relate()` with a `kind` like `related`/`similar`; the generic `relationships` rune renders them indistinguishably from authored edges, and the contributor emits them in similarity order + caps. (Contrast: a *static* set like "all posts tagged X" is a plain `collection filter="tags:X"` — no graph. The graph is for "related to *this* entity", which a static filter can't express.) If rune-side ranking by strength is later wanted, add an optional `weight` (or `data`) to `EntityEdge` for `relationships sort=` — a small additive extension, deferred under YAGNI.
- **Group chrome control — shipped form and the per-group template that was rejected.** *Shipped:* a `group-display` attribute (`headings` default, `accordion`) on both `collection` and `relationships`, plus `$count`/`$shown` variables in the preamble/fallback zones. `accordion` renders each group as a collapsed native `<details>` panel that reuses the `accordion` rune's BEM classes (`.rf-accordion` / `.rf-accordion-item` / `__header` / `__title` / `__body`) so it is styled identically — no JS, independent panels (multiple open), with the group's own count in the summary (the count earns its place because a collapsed panel hides its contents; list-scoped `$count`/`$shown` cover the whole-query totals). *Rejected:* a richer **per-group template** — a 4th top-level-`hr` zone for group chrome with a single `{% items /%}` slot marking where that group's items splice in. It is the principled generalization (it would also allow content *after* the item list, and the slot could disambiguate the zone roles by its mere presence, reusing the same sentinel-substitution the resolvers already do), but the per-group reparse + slot-splice is SPEC-sized machinery — markdoc has no loops, so the substitution is unavoidable regardless of surface — and it pushes authoring toward verbose constructs against refrakt's grain. Held until a concrete consumer (plan-site dashboards) justifies it. *Boundary, if it is ever built:* per-group **disclosure** is free (each group is an independent native `<details>`, no coordinating parent), which is exactly why `group-display="accordion"` works; a single **coordinated** accordion-of-groups (one widget, single-open across panels) is *not* expressible by zones, because the coordinating container would have to wrap the whole group loop — it would need either an outer-chrome zone (the group loop as *its* slot) or teaching `accordion` to consume a grouped `collection`. Out of scope. *Escape hatch for arbitrary per-group chrome today:* render one filtered `collection` per group value, stacked (group values hardcoded at authoring time).
- The ADR-011 template-composition and ADR-012 sugar changes — separate work items depending on this spec.

## References

- {% ref "ADR-011" /%} — compose plan aggregation at the template level (generic `relationships`, plan as contributor).
- {% ref "ADR-012" /%} — collapse `backlog`/`decision-log` onto `collection` (needs domain-aware ordering).
- {% ref "SPEC-070" /%} — the `collection` rune this extends.
- {% ref "SPEC-069" /%} — `entityRoutes`, which renders the entity pages that host `relationships`.

{% /spec %}
