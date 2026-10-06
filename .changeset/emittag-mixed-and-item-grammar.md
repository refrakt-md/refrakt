---
'@refrakt-md/runes': patch
---

Keep authored tags in a mixed `emitTag` field, and show the list-item grammar in `refrakt reference` (WORK-604, WORK-606)

- **Fixes silent content loss.** A field declared `match: 'list|tag:x'` with
  `emitTag` converted the list items and dropped every tag the author wrote
  (BUG-030). Authored tags now keep their place, so the field resolves to one
  document-ordered array of tags. A `list`-only field behaves as before. No
  built-in rune declared this combination, so rendered output is unchanged.
- **`refrakt reference` now shows how a list item is read** (BUG-031). A field
  with an `itemModel` lists each item field: bold, italic, a link and its `href`,
  text matching a pattern, the remaining text, a nested list. Where a field has
  them, it also shows the `template` snippet ("Written as") and the tag each item
  becomes (`emitTag`). A pattern with a non-ASCII character names it, so
  playlist's date field now says its `—` is U+2014 and a typed `-` will not
  match.
- `SerializedContentField` gains an `itemModel` projection: regex source and
  flags as strings, `'remainder'` as a literal.
