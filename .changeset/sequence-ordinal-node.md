---
'@refrakt-md/transform': minor
'@refrakt-md/skeleton': minor
'@refrakt-md/lumina': minor
---

A numbered sequence's ordinal is a node, not a CSS counter (WORK-583). The engine puts each item's number first in the item, `<span data-name="ordinal" data-meta-type="quantity">3</span>` with the rune's element class (`rf-steps__ordinal`), so it can be selected, copied and read in order. An item's own position wins (a track's `number=`), the rest count on from it, and an `<ol start>` sets the first. `connected` and `plain` sequences are unchanged.

**For theme authors:** style the number with `[data-sequence="numbered"] > li > [data-name="ordinal"]`. A rule on `[data-sequence="numbered"] > li::before` no longer matches anything, and the `sequence` counter is gone. Lumina renders identically.
