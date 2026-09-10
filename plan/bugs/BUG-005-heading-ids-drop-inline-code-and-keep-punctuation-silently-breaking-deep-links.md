{% bug id="BUG-005" status="fixed" severity="minor" milestone="v0.33.0" tags="content,headings,docs" %}

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

## Resolution

Completed: 2026-09-10

Branch: `claude/content-author-docs-org-vps1un`

### What was done

**One slug implementation, shared.** `packages/runes/src/util.ts` gains
`headingSlug()` and `headingText()`; both `extractHeadings` and the `heading`
node transform in `nodes.ts` now call them.

They were two near-copies that had already drifted — `extractHeadings` stripped
`?`, the node transform stripped `?{}%` — so a heading containing `{`, `}` or
`%` was *indexed under one id and rendered under another*. The doc comment on
`extractHeadings` claimed they used "the same algorithm". That second defect was
not in this bug's original report; it fell out of unifying them.

New rules: lowercase, drop everything that is not a letter/number/space/hyphen
(Unicode-aware, so non-ASCII headings keep their words), collapse separator runs
to one `-`, trim. Dropping punctuation subsumes the reason `%` was stripped —
a literal `%` without a hex pair used to crash SvelteKit's prerender crawler.

**Inline code is included.** `headingText` walks `code` nodes as well as `text`,
concatenating rather than joining with a space (the AST's text nodes carry their
own spacing). The worst case in this bug is fixed and verified in the built
HTML: `` ### `fileRoots` — named directories … `` was
`id="-—-named-directories-for-file-reading-runes"` — subject dropped, dangling
prefix — and is now `id="fileroots-named-directories-for-file-reading-runes"`.
It also fixes the *displayed* heading text, which had the same hole.

**A guard, so this cannot silently accumulate again.**
`scripts/check-content-links.mjs` reports internal links whose `#fragment`
matches no heading on the target page, reading ids from `extractHeadings` rather
than reimplementing the rules — a reimplementation is what let the original
twelve through. Colocated `check-content-links.test.mjs` follows the
`check-rune-docs.mjs` shape: unit tests over the pure computation plus one live
check over the real content tree. `npm run content:check-links`.

**Broken links fixed.** The scheme change repaired 6 of the 12 on its own — the
authors had written the intuitive anchor all along, and it is now the real one.
The remaining 6 were corrected by looking up the actual ids.

### Decision — existing anchors break, and that is accepted

This bug left open whether to alias old ids. Not doing so. The ids being
replaced are the ones nobody could write by hand — that is the bug — so an
external link into one is unlikely, and carrying a hidden alias element per
heading would add permanent markup to every page to preserve anchors that were
broken in practice. In-repo links are all fixed and now guarded.

### Notes

- Full suite 4263 passing (16 new). No test asserted a punctuation-bearing id,
  so nothing else had to change.
- Site build verified, not just the test suite: `id="spacing-and-inset"`,
  `id="body-zones-preamble-template-fallback"` and the `fileroots` case above
  all confirmed in `site/build`.

{% /bug %}
