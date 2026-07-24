{% spec id="SPEC-092" status="shipped" source="ADR-016" tags="registry,pipeline,frontmatter,content,collection,aggregate" released-in="v0.21.0" %}

# Frontmatter-declared registry entities

Let content pages contribute to the entity registry through their **frontmatter**:
index arbitrary frontmatter fields onto the `page` entity, and let a page declare
a first-class registry **type** so `collection` / `aggregate` can query it. The
catalogue is open-world — assembled from pages that self-declare, not from a code
catalogue. Realises {% ref "ADR-016" /%}; builds on the SPEC-070 query grammar and
complements {% ref "SPEC-069" /%} (`entityRoutes`, the inverse mapping).

Target: next minor (post-v0.20.1).

## Overview

Three pieces, layered so each is independently shippable:

1. **Frontmatter indexing** — merge a page's frontmatter onto the `page` entity's
   `data`, minus a reserved set of layout-control keys.
2. **Typed page entities** — a page declares `type` (and optional `id`) and is
   additionally registered as that entity type.
3. **Config url-pattern → type** — set the discriminator by convention instead of
   per-page frontmatter.

## Layer 1 — frontmatter indexing onto `page`

Today core registers each page with a fixed `data` subset (`title`, `url`,
`parentUrl`, `draft`, `description`, `date`, `order`, `icon`;
`packages/runes/src/config.ts` register hook). Extend it to merge the rest of the
page's frontmatter onto `data`, so any field is reachable by the field-match
grammar (`packages/runes/src/field-match.ts`, which already normalises arrays via
`candidates()`).

- The existing curated fields remain set explicitly (they have defaults /
  normalisation) and **win** over a same-named raw frontmatter value.
- **Reserved keys are excluded** from the merge so layout plumbing never leaks into
  queries. Initial exclusion set: `layout`, `tint-mode`, `tint-lock`, `region`,
  `regions`, plus anything already promoted to a curated field. This list is the
  main correctness risk and is pinned here; additions require updating it.
- Arrays pass through unchanged (`tags: [docs, registry]` → `data.tags` is an
  array) and match member-wise.

After Layer 1, with no further work:

```markdoc
{% aggregate type="page" filter="url:/runes/*" group="category" layout="chart" /%}
{% collection type="page" filter="url:/blog/* tags:release" sort="-date" layout="grid" %}
{% card href=$item.url %}### {% $item.data.title %}{% /card %}
{% /collection %}
```

## Layer 2 — typed page entities

A page MAY declare a registry type in frontmatter:

```yaml
---
title: Card
type: rune          # registry entity type
id: card            # optional; defaults to the page URL
category: Content
plugin: core
status: stable
tags: [container, media-zone]
---
```

Behaviour:

- The page is **still** registered as a `page` entity (nav, breadcrumbs, pagination
  depend on it). It is **additionally** registered under `type`, with the same
  reserved-filtered frontmatter as `data` and `sourceUrl` = the page URL.
- **`id`** defaults to the page URL when omitted; an explicit `id` (e.g. `card`)
  gives stable, human-addressable ids for `ref` / `xref`.
- **Scope** is `site` by default (globally addressable), matching how plan entities
  register; a page may set `scope: page` if needed.
- **Collision**: two pages declaring the same `(type, id)` at `site` scope collide
  (last wins) and emit a pipeline warning, exactly as the existing page/heading
  registration already warns on duplicate ids.

Then queries read by domain type:

```markdoc
{% aggregate type="rune" /%}                                <!-- inline count -->
{% aggregate type="rune" group="plugin" layout="chart" /%}  <!-- runes per plugin -->
{% collection type="rune" group="category" layout="table" fields="title,description" /%}
```

## Layer 3 — config url-pattern → type

To avoid `type:` in a hundred frontmatters, allow the type to be assigned by URL
pattern in `refrakt.config.json`, mirroring `routeRules` / `entityRoutes`:

```jsonc
"entityRules": [
  { "pattern": "runes/**", "type": "rune" }
]
```

- Pages matching the pattern register under `type` even without frontmatter `type`.
- Explicit frontmatter `type` on a page **overrides** the rule.
- Pages matching no rule and declaring no `type` are `page`-only (today's behaviour).
- Reuses the existing glob-matching used by `routeRules`.

## Showcase — the generated rune catalogue (refrakt's own site)

- Each `/runes/<name>` page carries `category`, `plugin`, `status`, `tags`
  frontmatter; `entityRules` maps `runes/**` → `rune` (so no per-page `type:`).
- `rune-catalog.md` becomes a `collection type="rune" group="category"` table —
  always correct, browsable, generated.
- The index gains live `aggregate type="rune"` stats ("N runes across M plugins").
- **Open-world payoff:** a third-party plugin that ships rune docs with the same
  frontmatter joins the catalogue with zero changes to refrakt.

## Drift guardrail

A page can lag the code (new `defineRune` without a doc page → absent from the
catalogue). Treat the catalogue as "documented entities" and make completeness a
build signal: a `refrakt inspect` mode / test that asserts every core `defineRune`
and plugin `Plugin.runes` entry has a `/runes/<name>` page (and vice-versa).
Refrakt-specific guardrail over a general capability; not part of the core feature.

## Non-goals

- Auto-deriving rune metadata from the engine config (`interactive`, plugin name)
  — would re-introduce the closed-world coupling {% ref "ADR-016" /%} rejected;
  may be offered later as *optional* plugin-side enrichment.
- Relationship edges from frontmatter (`related: [...]`) — a natural follow-up
  (SPEC-072 edges) but out of scope here.
- Changing the field-match grammar — it already covers the needed queries.

## Acceptance Criteria

- [ ] Page frontmatter (minus the reserved key set) is merged onto the `page`
  entity `data`; curated fields still win; arrays pass through. Filtering/grouping
  `page` entities by a frontmatter field (incl. `tags`) works with no resolver
  change.
- [ ] A page with frontmatter `type` registers as that entity type in addition to
  `page`, with `id` defaulting to the URL and explicit `id` honoured; duplicate
  `(type, id)` warns.
- [ ] An `entityRules` config maps url patterns → entity type; explicit frontmatter
  `type` overrides; unmatched pages stay `page`-only.
- [ ] The reserved-key exclusion list is documented and unit-tested (layout plumbing
  never appears in query `data`).
- [ ] Docs: a content-authoring page on declaring entities + querying them; the
  rune catalogue rebuilt as a generated `collection`, with the index stats.
- [ ] Drift check asserts code-runes ↔ doc-pages parity (warning or test).

## References

- {% ref "ADR-016" /%} — the decision and open-world rationale.
- SPEC-070 — `collection`/`aggregate` and the field-match grammar.
- {% ref "SPEC-069" /%} — `entityRoutes` (the inverse, entity → page).
- `packages/runes/src/config.ts` (register hook), `packages/runes/src/field-match.ts`.

{% /spec %}
