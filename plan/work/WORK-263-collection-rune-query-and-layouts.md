{% work id="WORK-263" status="done" priority="high" complexity="complex" source="SPEC-070" tags="runes, registry, collection" milestone="v0.16.0" %}

# Collection rune: query engine and built-in layouts

The `collection` rune core — a sentinel-emitting schema plus a postProcess resolver that queries the registry (filter/sort/group/limit) and renders the built-in layouts, with the pinned `$item` bound-variable contract and the per-layout body interpretation.

## Acceptance Criteria
- [ ] `{% collection type filter sort group limit show %}` emits a sentinel; the resolver runs in postProcess after expand + xref so item links resolve through the same chain
- [ ] Resolver queries `registry.getAll(type)` and applies the shared field-match parser (WORK-261), sort, group, and limit
- [ ] Built-in layouts `list` (default), `cards`, `grid`, `table`; `fields` projects named `data` fields with humanized headers and default per-type rendering (no `key=Label`)
- [ ] Box-layout body renders per entity with `$item` bound (WORK-262); `$item` shape per the pinned contract (id/type/url guaranteed; payload under `data.*`, no hoisting; `url` empty-string not undefined; read-only)
- [ ] Inline body and `item-template` partial both supported; both set → build error naming both
- [ ] Output carries `data-rune="collection"`, `data-type`, `data-layout`, `data-entity-id`, `data-field`; CSS in `packages/lumina/styles/runes/collection.css` covers list/cards/grid/table + grouping
- [ ] `refrakt inspect collection` shows expected HTML; authoring docs cover the display levels and the `$item` contract

## Dependencies
- WORK-261 (shared field-match parser)
- WORK-262 (deferred-body capture)

## References

- {% ref "SPEC-070" /%}

## Resolution

Completed: 2026-05-25

Branch: `claude/v0.16.0`

### What was done
- `packages/runes/src/tags/collection.ts`: sentinel-emitting schema (`deferBody: true`); attributes type/show/filter/sort/group/limit/fields/layout; emits `data-field` metas + `__collection-sentinel` + captured `collection-body` source + placeholder, wrapped `section[data-rune="collection"]`.
- `packages/runes/src/collection-resolve.ts`: `resolveCollections` walks the serialized tree, reads the sentinel metas, queries `registry.getAll(type)` per comma-split type, filters via the shared field-match grammar, sorts (numeric/string, `-`/`-desc` descending), limits, groups; renders built-in `list`/`cards`/`grid`/`table` (with `fields` projection + humanized headers) or a per-entity body template via `transformDeferredTemplate` with `$item = { id, type, url, data }` (`url = sourceUrl ?? data.url`).
- Config: added `Collection: { block: 'collection' }`; wired `resolveCollections` into `corePipelineHooks.postProcess` after `resolveExpands` and before `resolveXrefs` (so item-template refs resolve through the same xref pass).
- Catalog: `collection` `defineRune` entry; exported `resolveCollections`/`COLLECTION_SENTINEL`.
- CSS `packages/lumina/styles/runes/collection.css` (+ index import): block, items, card, title, field, group, table; grid/cards via `[data-layout]`.
- Tests: `packages/runes/test/collection.test.ts` (5) — cards+fields, filter, table, grouping, body template with `$item`. Full runes suite 609 green; CSS coverage green.

### Notes
- Heading-delimited table columns are WORK-264 (this ships `fields` projection for tables; body templates are box-layout only so far).
- `inspect` shows only the sentinel (collection resolves in postProcess like backlog), so resolver tests are the meaningful verification.
- Contracts file regeneration deferred to a milestone-wide cleanup pass.
- **Post-review (layout vocabulary):** the `cards` layout was dropped — `layout` is now *arrangement only* (`list` / `grid` / `table`); item *chrome* comes from the item (no-body built-in, or a `{% card %}` in the body template). A card gallery is `grid` + `{% card %}` items. This resolves the cards/grid redundancy and avoids auto-wrapping the body (which would double-wrap an explicit `{% card %}`). See SPEC-070 *Built-in layouts* and the WORK-266 card rune.

{% /work %}
