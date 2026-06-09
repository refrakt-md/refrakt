{% work id="WORK-344" status="done" priority="low" complexity="simple" source="SPEC-070" milestone="v0.19.0" tags="aggregation,collection,runes" %}

# Expose group metadata in collection item templates

When `collection` groups results, the per-item template can't see which group
it belongs to or that group's size — so authors drop to `aggregate` for
anything group-aware. Expose the group key (and count) on `$item` so grouped
collections can render group context inline.

## Acceptance Criteria
- [x] In a grouped `collection`, the per-item template can read the item's group key (e.g. `$item.group`).
- [x] The group's size is available to the template (e.g. `$item.groupCount`).
- [x] Ungrouped collections are unaffected; existing templates keep working.
- [x] Tests cover a grouped template reading the group key and count.

## Approach
In `collection-resolve.ts`, when grouping, bind the group key/count into the
`$item` scope passed to `transformDeferredTemplate` for each item. Reuse the
`groupEntities` output which already knows group membership.

## References
- `packages/runes/src/collection-resolve.ts`, `collection-helpers.ts`
- {% ref "SPEC-070" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/v0.19.0-rollups-2`

### What was done
- `packages/runes/src/collection-resolve.ts`: `renderGroupOrFlat` passes each group's `{ group: key, groupCount: size }` to the render callback (both the headings and accordion displays); the two template closures merge it into `itemOpts`.
- `packages/runes/src/collection-helpers.ts`: `projectItem` projects `$item.group` / `$item.groupCount` (defaults `''` / `0`).
- `packages/runes/test/collection-zones.test.ts`: 3 tests — group key+count per item, ungrouped → empty/0, and the accordion display.
- `site/content/runes/collection.md`: documented `$item.group` / `$item.groupCount` (and the WORK-342 `identifier` / `sentiment` / `mixed` fields) in the `$item` table.

### Notes
- Reuses the existing `groupEntities` output and the `itemOpts` plumbing added in WORK-342, so this was a small thread-through. Ungrouped collections and the built-in/table-of-fields layouts are unaffected.

{% /work %}
