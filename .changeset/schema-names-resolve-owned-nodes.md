---
'@refrakt-md/runes': patch
---

A schema table can resolve a named node placed inside another rune on its behalf (WORK-610)

`findAllByName`, which resolves a schema row's node-sourced values (`properties`
from a node, `text`, and the node half of `entities`), used to stop at any nested
rune. It now keeps descending past that boundary but admits only nodes marked
`data-owner` for the resolving rune, the same rule `findChildren` follows. A
nested rune's own names stay out of reach, so a `character` is still not named
after its sections' headings.

Nothing sets the marker yet, so published output is unchanged. The SEO baseline
and structure contracts show no diff.
