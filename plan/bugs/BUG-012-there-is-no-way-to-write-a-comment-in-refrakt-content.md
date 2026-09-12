{% bug id="BUG-012" status="confirmed" severity="minor" tags="content,authoring,docs" %}

# There is no way to write a comment in refrakt content

**Neither comment form is a comment.** Both render as visible text, for
different reasons, and there is no third option:

- `{# … #}` is not enabled. `Markdoc.parse` leaves the braces and the text
  between them as an ordinary text node — and **anything tag-shaped inside is
  parsed as a real tag**.
- `<!-- … -->` is not passed through as an HTML comment either. Markdoc parses
  it into a **paragraph**, so the reader sees the delimiters:

```
Markdoc.transform(Markdoc.parse('<!--\n  a note\n-->'))
  → <p>&lt;!-- a note --&gt;</p>
```

`{# … #}` appears in two doc pages as the way to comment out content, so an
author following the docs gets braces on the page.

## Expected

A note in a content file that the reader never sees — the thing every other
markup language has.

## Actual

Both candidate forms render as visible text. There is no third option, so a
shared block cannot carry an explanation of itself.

## Steps to reproduce

```markdoc
{# Subdirectories within a file root work too #}
{% partial file="shared:hero/welcome.md" /%}
```

The first line renders verbatim. Measured directly:

```
Markdoc.parse('{# hidden #}\n\nVisible.')
  → text nodes: ['{# hidden #}', 'Visible.']
```

## Where it is documented

- `site/content/docs/authoring/partials.md` — in the file-roots example
- `site/content/runes/file-ref.md` — twice, in the `label` example

Both are inside fenced code blocks, so they render as intended *on those pages*.
The problem is that they teach syntax that does not work.

## How it was found

Writing a header comment for {% ref "WORK-548" /%}'s shared attribute block. The
comment described the block and quoted `{% data %}` and `{% include %}` in its
prose — and both were parsed as real tags, on all 94 pages that include the
block. The site build went from 0 errors to **226**.

That is the part that makes this worth more than a docs typo: a "comment" is a
natural place to write example markup, and here doing so silently activates it.

## Root cause

`Markdoc.parse(content)` is called with no tokenizer (`packages/content/src/site.ts`,
and the three sibling call sites). Markdoc's comment support is a tokenizer
option; without a tokenizer configured for it, `{#` is not special.

## Acceptance Criteria
- [ ] Content has *some* way to carry a note that the reader never sees
- [ ] `{# … #}` either works as a comment, or is not shown in the docs as though it does
- [ ] If enabled: content inside a comment is not parsed — a `{% data %}` in a comment stays inert
- [ ] If enabled: a test covers the tag-shaped-content case specifically, since that is the damaging one
- [ ] The two documented examples agree with whichever answer is chosen
- [ ] The docs say plainly which forms do not work, since both of the obvious ones fail
- [ ] `scripts/check-content-links.mjs`'s `findComments` guard stays, or is retired deliberately if the syntax starts working

## Approach

**Enabling it is the better answer** if it is genuinely one tokenizer option:
the docs already promise it, comments in content are useful, and the failure
mode without them (tag-shaped prose going live) is sharp. Confirm the option
actually suppresses tag parsing rather than only hiding the delimiters — the
measurement above suggests the naive wiring does neither.

If it turns out to cost more than that, correct the two examples and say plainly
that neither form works — but note that leaves content with no comment
mechanism at all, which is a gap worth naming rather than papering over.

**A guard already exists.** `findComments` in `scripts/check-content-links.mjs`
fails the build on either form outside code fences, which is how this stopped
being a recurring mistake. It was added after an HTML comment in the shared
attribute block reached the rendered pages.

## References

- {% ref "WORK-548" /%} — where this surfaced

{% /bug %}
