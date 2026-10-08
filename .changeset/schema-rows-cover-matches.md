---
'@refrakt-md/runes': minor
---

A `by` schema table's `rows` must now match its attribute's `matches` exactly, both ways (SPEC-145 D27 (c), WORK-632). Until now `validateSchemaTable` checked only that `by` named a declared attribute and that a `fallback` existed. A misspelt row (`podcasts:`) or a newly added enum value would silently select the fallback, so `{% playlist type="podcast" %}` could publish `MusicAlbum`.

The table is rejected when the rune is built, with the selecting attribute named in the error, if:

- a row key is not among the attribute's `matches`. The error names the key and the declared values;
- a value in `matches` has no row. This is an error, not a fall-through to `fallback`. `fallback` covers an author who stated no value. A value the rune declares needs its own row, even when that row repeats the fallback;
- the attribute has no `matches` list, so its rows cannot be checked.

`validateSchemaTable` now accepts the attribute definitions as well as a list of names. With names only, it skips the coverage check. Every shipped table already passes (`playlist`, `track`, `organization`), so existing output is unchanged. A third-party plugin whose table leaves a declared value uncovered will now fail to build until it adds the row.
