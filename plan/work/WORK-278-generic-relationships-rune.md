{% work id="WORK-278" status="ready" priority="high" complexity="complex" source="SPEC-072" tags="relationships,runes,lumina,collection" milestone="v0.16.0" %}

# Generic relationships rune

Add a generic, domain-agnostic `relationships` rune to `@refrakt-md/runes`. It is `collection` whose source set is `getRelated(of)` rather than a registry type-query; each item is a related entity carrying its edge `kind`. Groups arbitrary string kinds, so it serves plan (`implements`/`blocks`/…), storytelling (`ally`/`rival`/…), or any domain.

## Acceptance Criteria
- [ ] A `relationships` rune ships in `@refrakt-md/runes` with a config entry and catalog entry.
- [ ] `of` is **required** and explicit (an id or bound entity; `of=$item.id` in entity templates) — no implicit page-entity default.
- [ ] Attributes mirror `collection`: `kind`, `type`, `group` (default `kind`; also `type`/`none`), `sort`, `limit`, `fields`, `item-template`, and a per-edge body.
- [ ] Inside the body, `$item` binds the related entity (same contract as `collection`) and `$kind` binds the edge kind string.
- [ ] Zero-config (no body) groups edges by kind with `humanize`d headings and a title link per related entity.
- [ ] Output matches the SPEC-072 contract (`section.rf-relationships` → `__group[data-kind]` → `__group-title` + `__items` → `__title`); Lumina CSS added and CSS-coverage updated.
- [ ] Resolution reuses the shared helpers (WORK-274) fed the resolved edge set + `$kind`.
- [ ] Tests cover zero-config grouping, a body template with `$item`/`$kind`, `kind`/`type` filtering, and `humanize`d labels.

## Approach
Schema in `packages/runes/src/tags/relationships.ts` + engine config in `config.ts` + catalog entry in `index.ts`. Resolve in the pipeline like `collection` (needs the aggregated graph): call `registry.getRelated(of, { kind, type })`, then feed the shared render helpers (WORK-274) the resolved edges, binding `$item` to each target and `$kind` to the edge kind. Default `group="kind"`; labels via `humanize` (WORK-277). CSS in `packages/lumina/styles/runes/relationships.css`, imported in `index.css`.

## Dependencies
WORK-274 (shared helpers), WORK-275 (relationship graph / `getRelated`), WORK-277 (`humanize`).

## References
- {% ref "SPEC-072" /%} — Capability 2 (bindings, attributes, output contract).
- {% ref "ADR-011" /%} — relationships at the template level.

{% /work %}
