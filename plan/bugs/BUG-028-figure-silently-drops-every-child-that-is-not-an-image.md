{% bug id="BUG-028" status="fixed" severity="major" source="SPEC-106" tags="runes,figure,content-loss,composition" milestone="v0.39.0" pr="refrakt-md/refrakt#665" %}

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

## Decision

**Fix 1: `figure` is a general captioned container.** Decided when scheduling
v0.39.0. Non-media children are emitted in body order, and `imgs` stays the media
slot. Together with {% ref "WORK-615" /%}, which removes snippet's own figure
wrapper, this makes `{% figure %}` the documented way to give a snippet, table or
diagram a caption.

What the fix still has to settle, and record in its resolution:

- **The schema.org type.** `typeof="ImageObject"` cannot stay unconditional once a
  figure may hold a code fence. One option: keep `ImageObject` when the media slot is
  the figure's only content, and emit no type otherwise. That choice belongs in the
  schema table ({% ref "SPEC-130" /%}), and the baseline diff is reviewed, not
  regenerated silently.
- **Contracts and CSS.** The structure contract moves. Lumina's figure styles need to
  hold up for non-media bodies.
- **Docs.** The figure rune page states what it accepts, and SPEC-062's "reach for
  codegroup instead" advice is revisited.

## References

- {% ref "SPEC-106" /%} — image `src` scheme sugar; where `isMediaNode`'s admitted set comes from
- {% ref "SPEC-062" /%} — the snippet rune, whose standalone chrome this interacts with
- {% ref "SPEC-141" /%} — removes snippet's own figure wrapper, which makes this the recommended path

## Resolution

Completed: 2026-10-07

Branch: `claude/v039-bug-028-figure`
PR: refrakt-md/refrakt#665

### What was done
- `packages/runes/src/tags/figure.ts`: every body child is kept, in body order. Media standing alone, or alone in a paragraph, is the media slot and is unwrapped as before. Anything else is emitted as written. The caption comes from `caption=` or the first paragraph with no media in it, and renders last. The transform records `body: 'mixed'` (pure data, field bag only) when the body holds more than media.
- Schema type, decided in the table: the table could only select a row by attribute, so `SchemaTable` gains `byField`, which selects a row from the rune's field bag (`lib/schema-table.ts`; exclusive with `by`, validated). Figure's table is `byField: 'body'`, `rows: { mixed: {} }`, with fallback `ImageObject {image→contentUrl, caption→caption}`. A mixed figure publishes no type and no properties. The properties go with the type, because a caption stamped with no `typeof` would attach to the page's typed ancestor. `schema-row.ts`, `reference.ts` and `inspect` surface `byField`.
- CSS: figure's image rules in Lumina and the skeleton, and Lumina's figcaption rule, now target direct children only, so images inside a nested rune keep their own styling. Checked in a rendered Chromium page: fence, table and nested card render in order with the caption below.
- Docs: `runes/figure.md` (what it accepts, a code/table example, structured data), `runes/snippet.md` (caption with figure *or* title with codegroup; codegroup kept as an option), and the plugin-authoring table reference (`byField`). Catalog description and VS Code snippet updated.
- Tests: 6 inline snapshots of image-only figures recorded against the old code (commit edc0608) and unchanged by the fix, which shows the output is byte-identical. 6 behaviour tests, 5 of which fail on the old code (fence + table + nested rune in order with caption, interleaved media, spare paragraph, caption fallback, no type when mixed). `byField` unit tests in runes and cli.

### Reviewed baseline / contract diff
- The new fixtures `figure.code` and `figure.mixed` were recorded pre-fix in edc0608 (both `ImageObject`, children dropped). After the fix both are `jsonLd: []` with no rendered annotations. That is the intended change: a captioned code block is not an image. The canonical `figure` fixture and every other fixture are unchanged. `SILENT_FIXTURES` in `scripts/generate-seo-baseline.mjs` records these two as deliberately silent rows of an emitting rune.
- Structure contracts (both copies): figure's `schemaOrg` gains `"byField": "body"`. Nothing else moved.

### Notes / follow-ups (not done here)
- `packages/lumina/styles/runes/snippet.css`'s header comment and SPEC-062 §"Post-transform wrap" still say labelled chrome is delegated to codegroup. I left them alone because the snippet CSS belongs to WORK-615 (`claude/v039-tree-order-preprocess`), which removes snippet's figure wrapper. Until WORK-615 lands, a snippet in a figure renders `figure > figure.rf-snippet > pre`.
- Pre-existing and kept: a figure with no media and only a caption paragraph still publishes a bare `ImageObject {caption}`. It could map to the empty row too; that is left as a separate decision.
- Old quirk removed: a paragraph holding two images used to qualify as the caption fallback, so the images were duplicated into the figcaption. Media-only paragraphs are no longer caption candidates.

{% /bug %}
