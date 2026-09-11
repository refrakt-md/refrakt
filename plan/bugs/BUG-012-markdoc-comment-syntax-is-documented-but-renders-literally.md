{% bug id="BUG-012" status="confirmed" severity="minor" tags="content,authoring,docs" %}

# Markdoc comment syntax is documented but renders literally

`{# … #}` appears in two doc pages as the way to comment out content. It is not
enabled: `Markdoc.parse` leaves the braces and the text between them as an
ordinary text node, so an author copying the example gets `{# … #}` printed on
the page.

Worse, **anything tag-shaped inside the "comment" is parsed as a real tag.**

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
- [ ] `{# … #}` either works as a comment, or is not shown in the docs as though it does
- [ ] If enabled: content inside a comment is not parsed — a `{% data %}` in a comment stays inert
- [ ] If enabled: a test covers the tag-shaped-content case specifically, since that is the damaging one
- [ ] The two documented examples agree with whichever answer is chosen
- [ ] An alternative is documented either way — HTML comments work today and are what the shared block now uses

## Approach

**Enabling it is the better answer** if it is genuinely one tokenizer option:
the docs already promise it, comments in content are useful, and the failure
mode without them (tag-shaped prose going live) is sharp. Confirm the option
actually suppresses tag parsing rather than only hiding the delimiters — the
measurement above suggests the naive wiring does neither.

If it turns out to cost more than that, correct the two examples to use HTML
comments and say plainly that `{# … #}` is not supported.

## References

- {% ref "WORK-548" /%} — where this surfaced

{% /bug %}
