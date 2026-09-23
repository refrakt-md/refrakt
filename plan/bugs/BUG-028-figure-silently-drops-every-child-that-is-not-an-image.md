{% bug id="BUG-028" status="confirmed" severity="major" source="SPEC-106" tags="runes,figure,content-loss,composition" %}

# `figure` silently drops every child that is not an image

`figure`'s transform builds its children from `imgs` — the nodes passing
`isMediaNode` — plus an optional `figcaption`
(`packages/runes/src/tags/figure.ts:82-87`):

```ts
const childNodes: any[] = [...imgs];
if (captionTag) childNodes.push(captionTag);
```

`isMediaNode` admits `<img>`, `<video>`, and a scheme-resolved `<svg>`
(`tags/common.ts:200`). Everything else an author puts inside `{% figure %}` —
a code fence, a table, a nested rune, a paragraph that isn't consumed as the
caption — is resolved, transformed, and then **discarded with no warning**.

The content model advertises the opposite: `body` is `match: 'any'`, `greedy`.
So the rune accepts anything and emits almost none of it.

## Steps to Reproduce

```md
{% figure caption="My file" %}
{% snippet path="a.ts" /%}
{% /figure %}
```

## Expected

Either the fence appears inside the figure, or the rune says it cannot hold one.

## Actual

```json
{ "name": "figure",
  "attributes": { "data-rune": "figure", "typeof": "ImageObject" },
  "children": [
    { "name": "figcaption", "attributes": { "data-name": "caption" },
      "children": ["My file"] } ] }
```

The `<pre>` is gone. No error, no warning, no build diagnostic. The page renders
a caption floating under nothing.

## Notes

- Reproduced with a `{% snippet %}` because that is the case that surfaced it,
  but the cause has nothing to do with snippet — any non-media child is dropped
  the same way. A fenced code block written directly in the body behaves
  identically.
- `typeof="ImageObject"` is emitted unconditionally, so a figure holding
  anything other than an image also publishes a wrong schema.org type. That part
  is {% ref "SPEC-130" /%}'s channel, but the trigger is the same assumption.
- This blocks the composition {% ref "SPEC-062" /%} recommends. Its CSS comment
  tells authors wanting labelled chrome to reach for `{% codegroup title="…" %}`
  precisely because figure cannot serve — but nothing says so at the point of
  use, and the content model implies it can.
- Severity is `major` rather than `minor` because the failure mode is silent
  content loss. A rune that refused the child would be a smaller problem.
- Two defensible fixes, and they are not equivalent:
  1. **Emit the non-media children** in body order, keeping `imgs` as the media
     slot. Makes `{% figure %}` a general captioned-container and unblocks
     `figure`-wrapped snippets, tables and diagrams.
  2. **Warn and drop**, keeping figure image-only. Preserves the current
     contract and the `ImageObject` type, and makes the limit visible.
  The choice is a product decision about what `figure` *is*, so it belongs in a
  spec rather than being settled in the fix.

## References

- {% ref "SPEC-106" /%} — image `src` scheme sugar; where `isMediaNode`'s admitted set comes from
- {% ref "SPEC-062" /%} — the snippet rune, whose standalone chrome this interacts with
- {% ref "SPEC-141" /%} — removes snippet's own figure wrapper, which makes this the recommended path

{% /bug %}
