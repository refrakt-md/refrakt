---
"@refrakt-md/runes": minor
---

Expose group metadata on `$item` in a grouped `collection` (SPEC-070 / WORK-344):
the per-item template can now read `$item.group` (its group key) and
`$item.groupCount` (the group's size), so a grouped collection can render group
context inline without dropping to `aggregate`. Ungrouped collections are
unaffected (`group` empty, `groupCount` 0).
