---
'@refrakt-md/runes': minor
'@refrakt-md/plan': minor
'@refrakt-md/lumina': minor
---

**`content-unmatched` is now an error.** Content inside a rune that no field of its content model matches was reported as a warning since it was introduced; it is now reported at error severity, so `refrakt validate` exits non-zero and the build summary lists it as an error.

**This is a behaviour change for any project whose content trips the check.** Each finding names the rune, the dropped node and its line. That content is not rendered — it never was — so the fix is in the rune, not the page:

- add a field that takes it, for example a catch-all `{ name: 'body', match: 'any', optional: true, greedy: true }` at the end of the position where authors write it;
- or, for a rune whose transform reads its body as raw source rather than through the content model, set `rawBody: true` on `createContentModelSchema`.

To unblock a build while you fix a rune, add `"content-unmatched"` to `validation.disableIds` in the site config, which demotes the finding to info.

**The plan runes keep everything authors write.** They were the reason the check shipped as a warning — 800 nodes dropped over this repository's own `plan/` directory:

- `milestone` keeps its `##` sections. Everything after the lead paragraphs — the goals list, notes and every section — renders in the body, in authored order.
- `work`, `bug` and `decision` keep preamble content that is not a paragraph: a `> Ref:` blockquote, a list, a fence, a table or a `---` before the first `##`. It renders in a new `intro` region between the metadata and the sections, omitted when empty. Their layout gains the `intro` slot, and Lumina styles it like the body.
