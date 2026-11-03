---
'@refrakt-md/types': minor
'@refrakt-md/runes': minor
---

A content model can say "these together" and "this one last" (SPEC-186 D1, D3).

- **Groups.** A field may be a `group` of member fields that match as one: in order, when every required member matches, or not at all, leaving the nodes for the field after it. Members may be optional or groups themselves. Each resolves to its own name, and the group's name resolves to `true` when it matched.
- **`position: last`.** A field with `position: last` reserves the container's last node when it matches that node, and the fields before it read the rest. A greedy body therefore no longer swallows a trailing attribution line.
- **Load-time checks.** Composition definitions accept both and reject misuse when they load: `content-group-invalid`, `content-field-duplicate` and `content-position-invalid`.
- **Reference.** `refrakt reference` and `inspect` show groups and the anchored field.
