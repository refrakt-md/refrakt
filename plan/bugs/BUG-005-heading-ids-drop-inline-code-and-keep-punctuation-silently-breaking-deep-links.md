{% bug id="BUG-005" status="confirmed" severity="minor" milestone="v0.32.0" tags="content,headings,docs" %}

# Heading IDs drop inline code and keep punctuation, silently breaking deep links

`extractHeadings` in `packages/runes/src/util.ts` builds a heading's `id` by joining only the **text** child nodes, stripping `?`, collapsing whitespace runs to `-`, and lowercasing. It does not strip any other punctuation, and inline code inside a heading contributes nothing at all — a `code` node is not a `text` node, so it is skipped.

The result is ids that nobody writing a link would guess:

| Heading | Generated id |
|---|---|
| `### Body zones — preamble, template, fallback` | `body-zones-—-preamble,-template,-fallback` |
| `` ### `fileRoots` — named directories for file-reading runes `` | `-—-named-directories-for-file-reading-runes` |
| `### Phase 2.5 — contributePages` | `phase-2.5-—-contributepages` |

The second one is the worst case: the heading's actual subject is dropped, and the id begins with a dangling `-—-`.

## Expected

Heading IDs follow the convention authors already assume when writing anchors — the GitHub/CommonMark-adjacent one: include inline code text, drop punctuation, collapse runs of separators. `### Body zones — preamble, template, fallback` → `body-zones-preamble-template-fallback`.

## Actual

Em-dashes, commas, and dots survive into the id; inline code disappears. Authors write the anchor they expect, the link resolves to the page but not the section, and nothing warns — a fragment that doesn't match an element is not an error in any browser.

## Impact

Twelve deep links in `site/content` are silently broken today, spread across `runes/aggregate.md`, `runes/relationships.md`, `runes/media-guests.md`, `runes/sandbox.md`, `runes/business/cast.md`, `runes/marketing/feature.md`, and `extend/rune-authoring/content-models.md`. Every one points at a real page, so nothing 404s — the reader just lands at the top and has to hunt.

Found while verifying the docs reorganization in WORK-540. The two anchors that work relies on were only caught by checking ids in the built HTML; a reimplementation of the slug rules would have agreed with the author's intuition and missed them.

## Steps to reproduce

1. Write `## Body zones — preamble, template, fallback` on a page.
2. Link to it as `[…](/that/page#body-zones--preamble-template-fallback)`.
3. Build and follow the link — it lands at the top of the page.

## Approach

Two parts, and the second is the reason this is filed rather than fixed in passing:

1. **Fix the slug function** — walk `code` nodes' content into the text, and strip punctuation before collapsing separators.
2. **Decide what happens to existing anchors.** Changing the scheme changes every generated id, so any external link or bookmark into a heading whose id contains punctuation breaks. Options: accept it (the current ids are barely linkable by hand anyway), or emit both the new id and a hidden alias element carrying the old one.

Worth pairing with a build-time check that reports intra-site fragments matching no heading id — the class of bug is invisible without one, which is how twelve accumulated.

{% /bug %}
