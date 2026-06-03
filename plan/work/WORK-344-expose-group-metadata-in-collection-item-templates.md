{% work id="WORK-344" status="ready" priority="low" complexity="simple" source="SPEC-070" milestone="v0.19.0" tags="aggregation,collection,runes" %}

# Expose group metadata in collection item templates

When `collection` groups results, the per-item template can't see which group
it belongs to or that group's size — so authors drop to `aggregate` for
anything group-aware. Expose the group key (and count) on `$item` so grouped
collections can render group context inline.

## Acceptance Criteria
- [ ] In a grouped `collection`, the per-item template can read the item's group key (e.g. `$item.group`).
- [ ] The group's size is available to the template (e.g. `$item.groupCount`).
- [ ] Ungrouped collections are unaffected; existing templates keep working.
- [ ] Tests cover a grouped template reading the group key and count.

## Approach
In `collection-resolve.ts`, when grouping, bind the group key/count into the
`$item` scope passed to `transformDeferredTemplate` for each item. Reuse the
`groupEntities` output which already knows group membership.

## References
- `packages/runes/src/collection-resolve.ts`, `collection-helpers.ts`
- {% ref "SPEC-070" /%}

{% /work %}
