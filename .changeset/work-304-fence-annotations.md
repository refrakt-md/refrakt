---
"@refrakt-md/runes": patch
"@refrakt-md/highlight": patch
"@refrakt-md/types": patch
"@refrakt-md/transform": patch
"@refrakt-md/lumina": patch
---

Fence-level annotations: `source`, `lines`, `linenumbers`, `highlight`, `label` (SPEC-062, WORK-304).

The Markdoc fence node schema gains five optional attributes that work uniformly on hand-authored fences and snippet-derived ones:

- `source` / `lines` — provenance metadata. Snippet's preprocess now writes these unprefixed names instead of the internal `data-snippet-source` / `data-snippet-lines`. The fence transform renders them as `data-source` / `data-lines` on the output `<pre>` and `<code>`.
- `linenumbers` (boolean) — opt into a numbered gutter rendered in pure CSS via `counter()`. The start number is seeded from `data-lines` so the gutter reflects the file's real offsets.
- `highlight` (range string) — emphasize specific lines without cropping. Shiki-style format (`"74-78"`, `"74-78,82,90-92"`); file coordinates so it composes naturally with `lines=`. The highlight transform stamps `data-line-status="highlight"` on matching `span.line` rows post-Shiki.
- `label` — per-fence tab label hint consumed by `codegroup`.

Consumer runes:

- **codegroup**: tab labels now fall back through a precedence chain — `labels=` → per-fence `label` annotation → derived from `source` (basename + `:lines`) → prettified language name. The composition story propagates through fence attributes so codegroup doesn't care whether a panel came from `{% snippet %}` or a hand-authored fence.
- **diff**: the header derives from each panel's `source` (matching paths collapse to one label; differing paths render as `before → after`). Each panel's gutter honors its own `lines=` start, so a diff between two slices of the same file shows real file line numbers per side. The `highlight` annotation is silently ignored inside diff — the add/remove channel is the primary line-level signal.

CSS: diff's `[data-line-status]` row template grows a third `highlight` value with a neutral tint (`--rf-color-line-highlight`) and primary-accent left rail. Snippet and codegroup share the same row primitive for the new highlight state. New tokens: `--rf-color-line-highlight`, `--rf-color-line-highlight-rail`, `--rf-color-line-number`.

**Internal protocol changes** (no user-facing API broken; only CSS targeting the previous internal `data-*` names needs updating):

- The internal `data-snippet-source` / `data-snippet-lines` attributes emitted by the snippet rune are renamed to `data-source` / `data-lines`. These were documented as internal protocol when snippet shipped in v0.16 (SPEC-062).
- Diff's per-line `data-type` attribute is renamed to `data-line-status` to share one CSS row primitive across snippet / codegroup / diff with the three states `add | remove | highlight`.
- Diff's `<pre>` output now wraps its line spans in an inner `<div data-name="rows">` (`.rf-diff__rows`) — mirrors the codeblock's `<pre><code>` shape so the row tint extends across horizontal scroll. Themes targeting `.rf-diff__code > .rf-diff__line` directly need to update the selector.

