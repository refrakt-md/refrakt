{% bug id="BUG-047" status="confirmed" severity="major" source="ADR-046" tags="marketing, hero, feature, content-model, eyebrow" %}

# Hero and feature drop a second leading heading and everything after it

Found while settling {% ref "ADR-046" /%}'s open question about heading eyebrows. The page-sections
guide documents two leading headings as an eyebrow and a headline. `cta` renders that. `hero` and
`feature` take the first heading as the headline and silently discard the second heading and the
blurb after it.

`hero`'s content zone is a sequence of `eyebrow` (a paragraph), `headline` (a heading), `blurb`
(a paragraph) and `actions` (a list or fence) (`plugins/marketing/src/tags/hero.ts:73-78`).
With two leading headings the eyebrow is skipped, the first heading fills `headline`, and the
second heading matches nothing. It is dropped, with everything after it, before
`pageSectionProperties` runs, so that function's two-heading rule is never reached. `feature`
does the same.

## Steps to Reproduce

1. Render each rune with this body:

   ```markdoc
   ## What's new in v2

   # Build with refrakt.md

   A content framework.
   ```

2. Compare the header each one emits.

## Expected

The author's content is either rendered or reported. ADR-046 decides that a heading is never an
eyebrow, so the second heading need not be an eyebrow, but it must not disappear without a word.

## Actual

| Rune | Output |
|---|---|
| `cta` | `<h2 data-name="eyebrow">`, `<h1 data-name="headline">`, `<p data-name="blurb">` |
| `hero` | `<h2 data-name="headline">What's new in v2</h2>`; "Build with refrakt.md" and the blurb are gone |
| `feature` | the same as `hero` |

No warning is emitted.

## Fix sketch

The lasting fix is {% ref "SPEC-160" /%} D7: a composed `hero` over `section` reads its header
with `section`'s grammar, and content past the header is body, not discarded. `feature` follows
when it is composed ({% ref "SPEC-161" /%}).

If that is more than one milestone away, an interim warning in `hero` and `feature` when the
content zone leaves nodes unmatched would make the loss visible. The documented example goes in
{% ref "WORK-660" /%} either way.

## Environment

- `main` after v0.42.0 (a554ab9)

{% /bug %}
