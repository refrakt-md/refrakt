{% work id="WORK-278" status="done" priority="high" complexity="complex" source="SPEC-072" tags="relationships,runes,lumina,collection" milestone="v0.16.0" %}

# Generic relationships rune

Add a generic, domain-agnostic `relationships` rune to `@refrakt-md/runes`. It is `collection` whose source set is `getRelated(of)` rather than a registry type-query; each item is a related entity carrying its edge `kind`. Groups arbitrary string kinds, so it serves plan (`implements`/`blocks`/…), storytelling (`ally`/`rival`/…), or any domain.

## Acceptance Criteria
- [x] A `relationships` rune ships in `@refrakt-md/runes` with a config entry and catalog entry.
- [x] `of` is **required** and explicit (an id or bound entity; `of=$item.id` in entity templates) — no implicit page-entity default.
- [x] Attributes mirror `collection`: `kind`, `type`, `group` (default `kind`; also `type`/`none`), `sort`, `limit`, `fields`, `item-template`, and a per-edge body.
- [x] Inside the body, `$item` binds the related entity (same contract as `collection`) and `$kind` binds the edge kind string.
- [x] Zero-config (no body) groups edges by kind with `humanize`d headings and a title link per related entity.
- [x] Output matches the SPEC-072 contract (`section.rf-relationships` → `__group[data-kind]` → `__group-title` + `__items` → `__title`); Lumina CSS added and CSS-coverage updated.
- [x] Resolution reuses the shared helpers (WORK-274) fed the resolved edge set + `$kind`.
- [x] Tests cover zero-config grouping, a body template with `$item`/`$kind`, `kind`/`type` filtering, and `humanize`d labels.

## Approach
Schema in `packages/runes/src/tags/relationships.ts` + engine config in `config.ts` + catalog entry in `index.ts`. Resolve in the pipeline like `collection` (needs the aggregated graph): call `registry.getRelated(of, { kind, type })`, then feed the shared render helpers (WORK-274) the resolved edges, binding `$item` to each target and `$kind` to the edge kind. Default `group="kind"`; labels via `humanize` (WORK-277). CSS in `packages/lumina/styles/runes/relationships.css`, imported in `index.css`.

## Dependencies
WORK-274 (shared helpers), WORK-275 (relationship graph / `getRelated`), WORK-277 (`humanize`).

## References
- {% ref "SPEC-072" /%} — Capability 2 (bindings, attributes, output contract).
- {% ref "ADR-011" /%} — relationships at the template level.

## Resolution

Completed: 2026-05-26

Branch: `claude/v0.16.0`

### What was done
- `packages/runes/src/tags/relationships.ts` — the `relationships` rune schema (deferBody), emitting a sentinel + `relationships-*` metas. `of` accepts an id string or a bound entity (`{id}`) and is stored as the id.
- `packages/runes/src/relationships-resolve.ts` — `resolveRelationships` postProcess pass: reads the query, calls `registry.getRelated(of, { kind, type })`, sorts edges by related-entity field (honoring the WORK-276 `Ordering`), caps by limit, groups by kind (default) / type / none, and renders the built-in (title link + `fields`) or the per-edge body via the shared `renderItemTemplate` with `{ item: projectItem(target), kind }` bound. Reuses WORK-274 helpers.
- `packages/runes/src/config.ts` — `Relationships: { block: 'relationships' }`; wired `resolveRelationships` into the sentinel pass right after `resolveCollections` (before xref).
- `packages/runes/src/index.ts` — catalog `defineRune`, exports of the resolver + sentinel.
- `packages/lumina/styles/runes/relationships.css` + import; CSS coverage now 103/110.
- `packages/lumina/contracts/structures.json` — regenerated (additive `Relationships` entry).
- `packages/runes/test/relationships.test.ts` — zero-config grouping + humanized headings + title links, kind filter, `$item`/`$kind` body, group=type, limit.

### Notes
- "Attributes mirror collection" — collection's own schema has no distinct `item-template` attr; reusable per-edge templates work the same way (a `{% partial %}` inside the body), so no separate attr was added, keeping the two runes' surfaces aligned.
- `of` has no implicit page-entity default; the resolver warns when it's missing. The plan plugin's edge contribution that makes this render real data is WORK-279.

{% /work %}
