---
'@refrakt-md/runes': patch
'@refrakt-md/plan': patch
---

Grouping by a multi-value field puts an entity in one group per value (BUG-025)

`collection`, `aggregate` and `backlog` all accept `group="<field>"`. For a
field holding several comma-separated values, such as `tags`, `source` or `pr`,
the group key used to be the whole string, so an entity tagged
`runes, data, csv` landed in a group called `runes, data, csv`. Against this
repository's own plan, `group="tags"` gave 719 groups for 803 entities, and
counting work items per spec read SPEC-008 as 16 when it has 19.

Grouping now splits the value the same way `filter` already did. The value is
split on commas, each member is trimmed, empty members are ignored, and an
array is split by element. The entity joins every group whose value it carries.
A group's size now means "entities carrying this value", so per-group counts
can add up to more than the entity count. `aggregate`'s `total` still counts
each entity once. Grouping by a single-valued field such as `status` or
`priority` is unchanged, and an entity with no value still groups under
`(none)`.

`sort` on a multi-value field no longer orders by the joined string either. An
entity sorts by its smallest value ascending and its largest descending. With a
declared order, it sorts by its best-ranked value ascending and its
worst-ranked value descending. Sorting by a single-valued field is unchanged.

`@refrakt-md/runes` also exports `fieldMembers` and `groupKeys`, the split used
for grouping, next to the display helper `fieldValue`.
