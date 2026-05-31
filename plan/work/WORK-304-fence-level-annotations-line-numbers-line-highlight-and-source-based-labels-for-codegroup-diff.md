{% work id="WORK-304" status="done" priority="medium" complexity="moderate" source="SPEC-062" tags="snippet,codegroup,diff,fence,highlight,linenumbers,css" milestone="v0.17.0" %}

# Fence-level annotations: line numbers, line highlight, and source-based labels for codegroup/diff

Extends {% ref "SPEC-062" /%}'s fence-annotation contract so any
fence — snippet-produced or hand-authored — can carry presentation
metadata. Four threads:

1. Promote snippet's currently-internal `data-snippet-source` /
   `data-snippet-lines` to first-class Markdoc fence attributes
   (`source`, `lines`) rendered as `data-source` / `data-lines`.
   Hand-authored fences can set them via Markdoc annotations.
2. Add two new fence attributes: `linenumbers` (boolean) and
   `highlight` (range string, file-coordinate-relative).
3. Teach `codegroup` and `diff` to read `source` (tab labels / diff
   header), so neither has to know whether a panel originated as a
   snippet or as a hand-authored fence with annotations.
4. Render line numbers + line highlighting in shared CSS that
   borrows diff's existing row template — one "annotated line"
   primitive across snippet / codegroup / diff with three states
   (`add`, `remove`, `highlight`) sharing one row shape.

## Acceptance Criteria

- [x] **Fence node schema extended.** `packages/runes/src/nodes.ts`'s
  fence schema registers four additional attributes: `source: String`
  (renders as `data-source`), `lines: String` (renders as
  `data-lines`), `linenumbers: Boolean` (renders as
  `data-linenumbers`), `highlight: String` (renders as
  `data-highlight-lines`). All optional. Markdoc parses annotations
  natively, so ` ```ts {% source="theme.ts" lines="74-125" linenumbers=true highlight="80-85" %} ` works in prose.

- [x] **Snippet emits unprefixed attribute names.**
  `packages/runes/src/snippet-pipeline.ts` writes `source` and
  `lines` on the fence Ast.Node it produces, replacing
  `data-snippet-source` / `data-snippet-lines`. The rune's schema
  in `packages/runes/src/tags/snippet.ts` gains `linenumbers` and
  `highlight` attributes that propagate straight through to the
  fence. The breaking rename is fine — these attributes were
  documented as internal protocol when snippet shipped in v0.16
  and no downstream consumer should rely on the `data-snippet-*`
  selectors.

- [x] **Codegroup reads fence `source` for tab labels.**
  `packages/runes/src/tags/codegroup.ts`'s panel loop falls back to
  `basename(source)` (with line range suffix when `lines` is also
  set, e.g. `theme.ts:74-125`) when neither the group-level
  `labels=` nor a per-fence `label` annotation is present, before
  falling back to the prettified language name. Precedence chain:
  explicit `labels=` on codegroup → per-fence `label` annotation
  → derived from `source` → language name.

- [x] **Diff reads fence `source` for the diff header.**
  `packages/runes/src/tags/diff.ts` reads `source` from its child
  fences and surfaces it in the diff header. When both child fences
  share the same `source`, render as a single label; when they
  differ, show `before → after` form. Falls back to today's
  header shape when no `source` is set.

- [x] **Diff honors `linenumbers` per side.** When `linenumbers` is
  set on diff's child fences, each side's gutter starts at that
  fence's `lines` offset (instead of `1`), so the per-side gutters
  reflect the file's actual coordinates. Same `--rf-start-line`
  derivation as the standalone snippet case.

- [x] **Diff explicitly strips `highlight`.** A
  `{% highlight="…" %}` annotation on a diff child fence is a
  silent no-op — diff's +/- add/remove channel is the primary
  signal; an emphasis layer on top would muddy it. No build
  warning, just not honored.

- [x] **Line numbers render via pure CSS.** The fence-rendering CSS
  (probably `packages/lumina/styles/runes/codeblock.css` or
  similar) honors `pre[data-linenumbers]`: each `span.line` gets a
  number column via `counter-reset` / `counter-increment` /
  `::before { content: counter(line); }`. The starting counter is
  seeded from a `--rf-start-line` custom property, computed at
  render time from `data-lines` (e.g. `data-lines="74-125"` →
  `--rf-start-line: 73` so the first increment lands on 74).
  Default (no `data-lines`) is `--rf-start-line: 0`. No changes to
  the Shiki highlight transform needed for this thread.

- [x] **Line highlight renders via a small post-walk.** The
  highlight transform (`packages/highlight/src/highlight.ts`'s
  existing `walk`) gains a case for nodes carrying
  `data-highlight-lines`: parse the range, walk `span.line`
  children, stamp `data-line-status="highlight"` on the matching
  ones. Range parsing accepts Shiki-style format: `"3-5"`,
  `"3-5,8,12-14"`. Indices are **file coordinates** — if a fence
  has both `data-lines="50-100"` and `data-highlight-lines="74-78"`,
  the walker offsets by the slice start (50) before targeting child
  span indices.

- [x] **CSS shares diff's row primitive.** Diff's existing
  `[data-line-status="add"]` / `[data-line-status="remove"]` row
  template grows to admit `[data-line-status="highlight"]` as a
  third value with a neutral tint token
  (`--rf-color-line-highlight` → subtle surface tint, no `+`/`-`
  sigil in the gutter). Row shape, padding, gutter rail width are
  shared across all three states. New token lands in
  `packages/lumina/tokens/base.css`.

- [x] **Tests cover the contract.**
  Snippet tests verify it writes unprefixed attribute names and
  propagates author-set `linenumbers` / `highlight` through.
  Codegroup tests cover the tab-label fallback chain (`labels=` →
  per-fence `label` → `source` basename → language name).
  Diff tests cover: header surfaces `source`, `linenumbers`
  honored per side using `lines` start, `highlight` silently
  ignored.
  Highlight transform tests verify line-highlight class application
  and file-coordinate offset math (slice-relative indices would be
  a bug).

- [x] **Docs updated.** `site/content/runes/snippet.md` documents
  `linenumbers` + `highlight` attributes with live
  `{% preview source=true %}` examples. `site/content/runes/codegroup.md`
  gains a tab-label precedence section. `site/content/runes/diff.md`
  documents the header label behaviour, the `linenumbers`
  per-side example, and the explicit "`highlight` is ignored
  inside diff" note. Fence-level annotations on hand-authored
  fences also documented (canonical reference goes in snippet.md
  since fence-annotation authoring is universal).

## Approach

Three discrete chunks sharing the fence-annotation contract.

**1 — Fence schema + snippet rewrite.** Smallest of the three.
Register the four attributes on `nodes.fence` with `render`
mappings to `data-*` forms. Update `snippet-pipeline.ts` to write
`source` / `lines` directly instead of the `data-snippet-*` form.
Forward author-set `linenumbers` and `highlight` from the rune
attributes through to the fence node. Sweep any CSS selectors that
target `[data-snippet-source]` / `[data-snippet-lines]` in
`@refrakt-md/lumina` and update to `[data-source]` /
`[data-lines]`. Nothing else needs to change at this layer.

**2 — Consumer rune label/header propagation.** Codegroup adds the
tab-label fallback chain. Diff adds the header label and per-side
gutter offset. Both are local changes inside their respective
`transform()` functions reading from `child.attributes` (fence
attrs are visible to content-model-driven runes pre-Markdoc-
transform via `asNodes(resolved.…)`).

**3 — Line numbers + highlight rendering.** Line numbers are
CSS-only — `counter()` + `--rf-start-line` derived from
`data-lines`. The CSS just needs to expose
`--rf-start-line: calc(<start> - 1)` from the `data-lines`
attribute; trivial via a small attribute-to-style projection or
an inline `style="--rf-start-line: …"` injected by the highlight
transform when it sees `data-lines`. Highlight is a small walk
added to the existing Shiki post-pass that adds
`data-line-status="highlight"` to matching `span.line` children.
Visual styling reuses diff's row template with the neutral tint
as a new third state.

### Design notes (deferred from brainstorm)

- **File coordinates, not slice coordinates.** `highlight="74-78"`
  on a snippet with `lines="50-100"` means file lines 74-78, not
  the 74th-78th lines of the slice. Less surprising for authors
  citing line numbers from a source file.
- **Per-panel highlight in codegroup via fence annotation, not a
  group-level comma-list.** A panel's per-fence annotation
  (` ```ts {% highlight="3-5" %} `) composes cleanly whether the
  panel is a snippet rune or a hand-authored fence; a comma-list
  on the codegroup would only work for snippet-derived panels and
  is order-coupled.
- **Diff's three line states share one CSS primitive.** The
  payoff isn't just consistency — the row template, gutter rail,
  padding, etc. are written once. Adding a fourth state (e.g.
  `note` for a sidebar callout line) in the future would be a
  single token addition.

## Dependencies

None. Extends {% ref "SPEC-062" /%} but doesn't block on any
in-progress work.

## References

- {% ref "SPEC-062" /%} — snippet rune; the fence-annotation
  contract being extended.

## Resolution

Completed: 2026-05-30

Branch: `claude/work-304-fence-annotations`

### What was done

- **`packages/runes/src/nodes.ts`** — extended the fence schema with five new attributes (`source`, `lines`, `linenumbers`, `highlight`, `label`). The transform renders them as `data-*` on both the output `<pre>` and the inner `<code>` (the latter so the highlight transform — which keys off `<code data-language>` with text children — sees them). `data-lines` is parsed to seed an inline `style="--rf-start-line: …"` on the `<pre>` so the CSS line-number counter starts at the file's real offset rather than 1. Legacy `data-*` forwarding kept for the snippet error-fence path (`data-snippet-error`).
- **`packages/runes/src/snippet-pipeline.ts`** — snippet preprocess now writes `source` / `lines` on the fence Ast.Node instead of `data-snippet-source` / `data-snippet-lines`. Author-set `linenumbers` and `highlight` from the rune attributes propagate through to the fence. The standalone wrap step (which looks up `<pre data-source>` to apply the snippet figure chrome) updated to the new attribute name. The rune's schema in `tags/snippet.ts` declares the two new attributes with file-coordinate semantics in the descriptions.
- **`packages/runes/src/tags/codegroup.ts`** — tab-label precedence chain: `labels=` → per-fence `label` annotation → derived from `source` (basename + optional `:lines` suffix) → prettified language name. The `basename()` and `labelFromSource()` helpers are local; no impact on the chrome-only single-panel path.
- **`packages/runes/src/tags/diff.ts`** — reads `source` from each child fence into the header (matching paths collapse to a single label; differing paths render as `before → after`; explicit `title=` always wins). `lines` on each fence drives a per-side `gutterOffsetFromLines()` so the gutter starts at the file's coordinates. `highlight` is intentionally not read — comment in the transform documents the silent no-op. Renamed per-line `data-type` to `data-line-status` to share the row primitive with the codeblock highlight case.
- **`packages/highlight/src/highlight.ts`** — extended `highlightNode` with a post-Shiki pass: when `data-highlight-lines` is set on the `<code>` (forwarded by the fence transform), parse the range (Shiki-style `"3-5,8,12-14"`), translate from file coordinates using `data-lines` start, and stamp `data-line-status="highlight"` on the matching `<span class="line">` rows in the highlighted HTML string. Multi-range, reversed-range rejection, missing-attr no-op all covered.
- **`packages/lumina/styles/elements/code.css`** — CSS counter() implementation of line numbers (`pre[data-linenumbers] code { counter-reset: rf-line var(--rf-start-line, 0) }` + `::before { content: counter(rf-line) }`). Line highlight rule shares diff's row template via `[data-line-status="highlight"]` selectors with the neutral tint token.
- **`packages/lumina/styles/runes/diff.css`** — renamed `[data-type]` selectors to `[data-line-status]`, added the third `"highlight"` state with the neutral tint + primary-accent rail tokens.
- **`packages/lumina/src/tokens.ts` + `packages/types/src/token-contract.ts` + `packages/transform/src/token-validate.ts`** — added `color.line` token group (`highlight`, `highlight-rail`, `number`) to the theme tokens contract, the validator shape, and Lumina's token export. The color-mix value adapts to dark mode automatically via `var(--rf-color-text)`.
- **Tests**: snippet propagates `linenumbers` + `highlight` (2 tests); codegroup tab label precedence (4 tests); diff header from `source`, `before → after` for differing sources, explicit `title=` wins, per-side gutter offsets, `highlight` silently ignored (5 tests); highlight transform line-highlight class application, file-coordinate offset math, multi-range, invalid-token rejection, absent-attr no-op (5 tests). All existing tests updated for the `data-snippet-*` → `data-*` and `data-type` → `data-line-status` renames.
- **Docs**: `site/content/runes/snippet.md` has live `linenumbers` and `highlight` demonstrations (snippet renders the lang-map.ts file with gutter starting at 15 and lines 18-22 emphasized in the second example). `site/content/runes/codegroup.md` has a live `{% codegroup %}` of two snippets producing `lang-map.ts:3-7` and `codegroup.ts:7-14` tabs derived from the fence `source` annotations. `site/content/runes/diff.md` has live examples of the source-derived header (`src/server.js`) and the per-side `linenumbers` example (theme.ts, gutter starts at 74 on both sides). Hint-block note that `highlight` is silently ignored inside diff.

### Notes
- The `data-snippet-source` → `data-source` rename is breaking but contained — these were documented as internal protocol when snippet shipped in v0.16 (SPEC-062). No CSS selectors outside of lumina referenced them. Captured in a changeset as a minor bump across `runes`, `highlight`, `types`, `transform`, `lumina`.
- The `data-type` → `data-line-status` rename in diff is also captured in the changeset. The motivation is sharing one CSS row primitive across snippet / codegroup / diff; the alternative (keeping both names) would have meant duplicated selectors and inconsistent vocabulary.
- File-coordinate semantics for `highlight=` are the key design decision: `highlight="74-78"` on a snippet with `lines="50-100"` means file lines 74-78, not the 74th-78th lines of the slice. Tests verify the offset math via the `data-lines` value. Authors cite line numbers from real files, so this matches how they'd talk about the highlighted region.
- The fence transform forwards both `data-lines` and `data-highlight-lines` to BOTH `<pre>` and `<code>` because the highlight walker keys off the `<code>` (where the data-language sits) while the line-number CSS keys off the `<pre>` (where `--rf-start-line` is inlined). Duplicating the attributes was simpler than rewriting the highlight walker to read from a parent.
- 1620 → 3035 tests passing across the workspaces touched (full repo suite). One pre-existing failure on `packages/create-refrakt/test/bin.test.ts` unrelated to this work.

{% /work %}
