---
"@refrakt-md/media": minor
"@refrakt-md/runes": patch
---

Accept `{% track %}` children in `{% playlist %}` (WORK-569 part, BUG-016)

A `{% track %}` written inside a `{% playlist %}` is now one of that playlist's
tracks — in the listing, in the HTML, and in the structured data. It used to
fall through to the greedy `body` field: rendered as an `<li>` outside any list,
published as a detached top-level entity, and recommended by the docs the whole
time.

The bar is equivalence — a nested track with no explicit `type` produces the
same schema as the same content written as a list item — asserted directly
rather than assumed. An explicit child type that contradicts its container is
honoured: a `{% track type="song" %}` inside a podcast stays a song, because the
author said so.

**Two defects fixed to get there:**

- The sequence resolver could not handle a greedy `itemModel` field. With
  `greedy`, the resolved value is an array, and the extraction guarded on
  `'type' in node` — so making `tracks` greedy silently disabled its own
  extraction and broke the list form outright. It now concatenates
  `resolveListItems` across the collected lists in document order.
- `track` was dropping two of its own fields. `artistMeta` and `durationMeta`
  were declared but never pushed into `children`, so they were stamped onto
  nodes that were not in the tree: a standalone
  `{% track artist="Radiohead" duration="4:01" %}` published its name and
  nothing else. `rootAttrs` was likewise assembled and never applied, so `src`
  reached nothing.

**If you have a `{% track %}` nested inside a `{% playlist %}`**, its rendered
position and its structured data both change — the track moves into the
playlist's `<ol>` and its entity nests under the playlist's `track` property
instead of standing alone at the top level. That is the shape the docs always
described.
