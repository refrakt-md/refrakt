{% work id="WORK-263" status="pending" priority="high" complexity="complex" source="SPEC-070" tags="runes, registry, collection" milestone="v0.16.0" %}

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

{% /work %}
