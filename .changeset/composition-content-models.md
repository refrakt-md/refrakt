---
'@refrakt-md/runes': minor
'@refrakt-md/types': patch
'@refrakt-md/cli': minor
---

Composed runes can now say more in their content model (SPEC-169):

- **`type: delimited`** splits content on `---` into fixed, named zones. The slots are all the zones' fields together, and `primary` names the zone that receives content written with no `---`. A field name used in two zones, a delimiter other than `hr`, and `dynamicZones` are each construction errors (`zone-field-twice`, `delimiter-unsupported`, `dynamic-zones`).
- **`implicitSection`** on a sections model makes content with no section heading one item of `sections` rather than preamble. Its `attributes` supply `$each` and must give exactly the keys of `emitAttributes` (`implicit-section-mismatch`).
- **`each` over a list field** iterates the items of a non-greedy field that matches one list. Each item's content is the bare `{% slot /%}`, and `$each` binds nothing. `each` over a greedy list field is an error (`each-on-list-ambiguous`).
- **Fix (BUG-038):** an `itemModel` declared in YAML now compiles its `pattern` strings into regular expressions at every nesting level. Before this, every `$each` field it fed was silently empty. An invalid pattern is reported as `content-model-invalid`, naming the field.

`refrakt inspect` shows a composed rune's content model and template slots (`composition` in `--json`), and `refrakt reference` lists its template slots and marks a delimited model's `primary` zone.
