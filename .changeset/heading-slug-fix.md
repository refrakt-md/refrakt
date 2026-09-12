---
"@refrakt-md/runes": patch
---

Fix heading IDs dropping inline code and keeping punctuation (BUG-005)

A heading's `id` came from two near-copies of the same slug rules that had drifted apart — one stripped `?`, the other `?{}%` — so a heading containing `{`, `}` or `%` was indexed under one id and rendered under another. Both now share `headingSlug()`.

Inline code in a heading contributed nothing to the id, because a `code` node is not a `text` node: `` ### `fileRoots` — named directories for file-reading runes `` produced `-—-named-directories-for-file-reading-runes`, dropping the heading's actual subject. Code content is now included, in the displayed heading text as well as the id.

Punctuation is now stripped rather than carried through, so ids match what an author writing an anchor by hand would guess: `## Body zones — preamble, template, fallback` gives `body-zones-preamble-template-fallback`, not `body-zones-—-preamble,-template,-fallback`.

**This changes generated heading IDs.** Anchors into headings whose text contains punctuation or inline code will change; links using the intuitive spelling start working. IDs set explicitly via an `id` attribute are unaffected.
