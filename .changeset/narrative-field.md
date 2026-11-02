---
'@refrakt-md/runes': minor
'@refrakt-md/cli': minor
---

A composition's narrative field is checked when its definition loads (ADR-047). A content-model field whose `match` names only the editorial runes (`tag:textblock`, `tag:mediatext`) is the rune's narrative field: the story a template can place between the rune's own parts. Two rules are now enforced:

- **One per rune.** A definition with two narrative fields is rejected (`narrative-field-twice`).
- **Never structured data.** A schema table that maps the narrative field is rejected (`narrative-field-mapped`).

A field that mixes editorial runes with other matches is not a narrative field. `refrakt inspect` and `refrakt reference` name the narrative field. The rune-authoring patterns guide and the composed-runes guide document it.
