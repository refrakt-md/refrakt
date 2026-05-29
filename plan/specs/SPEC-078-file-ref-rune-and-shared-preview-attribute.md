{% spec id="SPEC-078" status="draft" tags="file-ref, xref, drawer, snippet, expand, preview, docs, runes" %}

# `file-ref` rune + shared `preview` attribute on reference runes

A path-based reference rune (`file-ref`) that points at a project file from
prose with an auto-resolved GitHub URL, plus a shared `preview="…"`
attribute on both `file-ref` and the existing `xref` rune that hoists a
drawer (or future popover / details / sidenote) containing the referenced
content. Bundles a small drawer styling refinement so a single-code-block
drawer body fills edge-to-edge instead of sitting inside the default
padded chrome — the common case for "preview a file or entity behind a
link."

## Problem

Doc pages routinely want to **mention something in prose with the contents
available on demand** — a TypeScript interface (`ThemeTokensConfig`), a
config file, a registered entity (`SPEC-076`). Today the only ways to surface
the contents are:

1. **`{% snippet %}`** — embeds the file as a block-level code listing.
   Breaks prose flow; not addressable from inline.
2. **`{% expand %}`** — inlines an entity's content in flow. Same flow
   break, and limited to registered entities (not arbitrary files).
3. **Manual `{% drawer %}` + `{% snippet %}` + `{% ref %}` triplet** —
   declare the drawer block-level somewhere, embed a snippet inside it, and
   xref it inline. Works today but is verbose enough that nobody reaches
   for it on a per-mention basis.

Two specific gaps surface from this:

- **No rune references an arbitrary file path.** `xref` resolves entity ids
  from the registry; `expand` does the same. Nothing pairs a path with a
  link (the way `xref` pairs an id with a link), let alone with a
  pre-resolved GitHub URL.
- **No "mention now, expand on demand" pattern.** Authors mentioning
  `ThemeTokensConfig` in prose either leave it as bare code text (reader
  has to leave the page to find it) or paste a snippet (heavy, breaks flow).
  The drawer + snippet + xref triplet exists but the boilerplate kills
  adoption.

## Goals

- A new **`file-ref`** rune — inline, path-based, resolves to a project file
  (with line-anchored GitHub URL when a `repoUrl` is configured).
- A shared **`preview="drawer"`** attribute on both `file-ref` and `xref`
  that **hoists a drawer** containing the referenced content (a snippet for
  `file-ref`, an `expand`-equivalent for `xref`) and leaves only an inline
  link at the call site so the surrounding paragraph isn't broken.
- A **single preview vocabulary** across both reference runes — same
  attribute name, same target enum, same hoist mechanism. Authors learn one
  concept whether they're pointing at an entity id or a file path.
- A **drawer styling refinement** for the common case where the drawer body
  is a single code block: drop the body padding and the code block's own
  rounded corners so it fills the drawer edge-to-edge.

## Non-goals

- **Symbol resolution** (`{% file-ref path=… symbol="ThemeTokensConfig" /%}`
  → auto-derive line range by parsing the file). Per-language complexity
  (TS exports, Python classes, Rust impls) and not needed for v1. Held as
  a future extension; authors supply explicit `lines="42-58"` in the
  meantime.
- **Line-tracking on edit.** Hard-coded line ranges go stale when the
  source file is edited. Same problem `snippet` has today; not a new tax.
  Solved by `symbol` resolution when that lands.
- **`popover` / `details` / `sidenote`** preview targets. The enum is
  reserved by the `preview="…"` shape; v1 ships only `drawer`.
- **Replacing `expand`.** `expand` stays as the in-flow content-inlining
  rune. `xref preview="drawer"` is the on-demand reveal — different intent.

## Capability 1 — `file-ref` rune

```markdoc
See {% file-ref path="packages/types/src/token-contract.ts" lines="42-58" label="ThemeTokensConfig" /%} for the full shape.
```

Renders an inline `<a>` whose `href` is the resolved GitHub URL:

```
https://github.com/refrakt-md/refrakt/blob/main/packages/types/src/token-contract.ts#L42-L58
```

| Attribute | Type | Description |
|-----------|------|-------------|
| `path` | string (required) | Project-root-relative file path. |
| `lines` | string | Line range (`42-58` or `42`). Drives both the GitHub anchor and the snippet preview range. |
| `label` | string | Display text. Defaults to the filename if absent (e.g. `token-contract.ts`); falls back to `path` if no filename can be inferred. |
| `preview` | enum | One of `drawer` (v1). Reserved values: `popover`, `details`, `sidenote`. Absent → no preview, just the inline link. |

GitHub URL resolution requires a site-config `repoUrl` (string, e.g.
`"https://github.com/refrakt-md/refrakt"`) and an optional `repoBranch`
(default `"main"`). When `repoUrl` is absent the link renders without an
`href` (or as an in-page anchor when `preview` is set) and a build warning
notes the missing config.

## Capability 2 — shared `preview="…"` attribute

Both `file-ref` and `xref` accept `preview="drawer"`. The call site renders
only the inline link; the drawer body is **hoisted to page level** via the
existing drawer-registration pipeline (`registerDrawers` /
`<dialog>`-emit), so the surrounding paragraph stays intact.

```markdoc
The {% ref "SPEC-076" preview="drawer" /%} aggregate spec defines a third
post-process query rune that pairs with collection and relationships.
```

| Use | Today | With `preview="drawer"` |
|-----|-------|-----|
| Link to an entity | `{% ref "SPEC-076" /%}` | `{% ref "SPEC-076" preview="drawer" /%}` → inline link + drawer containing the entity's expanded content |
| Link to a file | (none) | `{% file-ref path=… preview="drawer" /%}` → inline link + drawer containing the file's snippet |
| Inline an entity in flow | `{% expand "SPEC-076" /%}` | (unchanged) |

Per-page **dedup**: N mentions of the same target id within one page
collapse to one drawer (each xref points at the same `id`), so a heavily
referenced interface doesn't multiply drawers.

### Drawer body contents per source

- **`file-ref preview="drawer"`** — drawer body is a `{% snippet path=…
  lines=… /%}` only. A `View source on GitHub →` link with the line-range
  anchor sits in the **drawer chrome footer** (`__footer` — new region
  alongside the existing `__header` / `__body`), not in the body itself,
  so the single-block edge-to-edge styling in Capability 3 still triggers.
- **`xref preview="drawer"`** — drawer body is the `expand`-equivalent of
  the referenced entity (same resolver path `{% expand "id" /%}` uses).
  Chrome footer: a link to the entity's `sourceUrl` (or the registry's
  resolved page URL) so readers can navigate to the full page.

The chrome footer is a new drawer slot — `sections: { header, body,
footer }` in the engine config — rendered outside the body so per-rune
body styling stays clean. It carries its own small padding so the link
doesn't kiss the drawer edge.

### Why this and not "extend `expand`"

`expand`'s contract is *replace the call site with the entity body in
flow* — block-level, one-time substitution. `xref preview="drawer"` is
*keep the inline link, reveal on demand* — paragraph-safe, deduplicated
across mentions. Different intents; the runes stay separate.

## Capability 3 — single-block drawer styling

When a drawer body contains only a single code block (the canonical layout
for `preview="drawer"`), the drawer's body padding and the code block's
rounded corners look redundant — they make the code feel "boxed inside a
box." Lumina applies an edge-to-edge treatment when the body has exactly
one code-block child:

```css
/* Pseudo-shape — exact selector follows from the snippet rune's wrapper
 * (figure.rf-snippet) plus bare-pre fallback. */
.rf-drawer__body:has(> figure.rf-snippet:only-child),
.rf-drawer__body:has(> pre:only-child) {
  padding: 0;
}
.rf-drawer__body:has(> figure.rf-snippet:only-child) > figure.rf-snippet,
.rf-drawer__body:has(> pre:only-child) > pre {
  border-radius: 0;
  border: 0;
  margin: 0;
}
```

The drawer's own rounded corners then shape the code block; the result
reads as one unified surface. A figcaption inside the snippet figure (the
"source label") keeps its own small padding so it doesn't kiss the drawer
edge.

Critical interaction: the `:only-child` test holds because the chrome
footer (Capability 2) sits *outside* `__body`, not inside it. If the
GitHub link sat in the body the body would have two children (snippet +
footer link) and the selector would fail. Keeping chrome separate from
body content is what makes both capabilities co-exist cleanly.

Scope to `drawer` for v1. The same `:has()` pattern generalises to
`{% details %}` and `{% card %}` later if usage warrants — or as a shared
`[data-fill]` utility set by the engine when an only-child block is
detected.

## Implementation note

The hoist mechanism reuses the existing drawer pipeline. The rune's
transform emits two parts:

1. **Inline** — an `<a>` with `href="#drawer-{id}"` (and the GitHub URL
   for `file-ref` without preview), keeping the call site paragraph-safe.
2. **Sentinel** — a meta tag carrying the drawer registration (`id`,
   `source`, `path` or `entity-id`, etc.). The page-level `registerDrawers`
   pass collects these from anywhere in the tree, dedups by `id`, and
   emits the actual `<dialog>` markup at the page's drawer area.

The `id` for hoisted drawers is derived deterministically from the
reference — for `file-ref`, a slug of the path + lines (`packages-types-src-token-contract-ts-L42-L58`);
for `xref`, the entity id (`SPEC-076`). This is what enables per-page
dedup: same reference = same id = one drawer.

## Future extensions

Not in scope for v1, but reserved by the rune's shape:

- **`symbol="…"`** on `file-ref` — auto-derive line range by parsing the
  file for the named export / interface / function. Per-language; needs a
  separate strategy (tree-sitter, language plugins, or a generic
  ctags-style indexer). Solves the line-staleness problem at the same time.
- **`preview="popover"`** — anchored floating panel for short previews
  where a full drawer is overkill. Refrakt doesn't have a popover primitive
  yet; this lands when it does.
- **`preview="details"`** — inline expandable section using the existing
  `{% details %}` rune; opens below the paragraph rather than as overlay
  chrome.
- **`preview="sidenote"`** — float the snippet to the margin via the
  `sidenote` rune.
- **Auto-recognition of bare code-span identifiers** — detect TypeScript
  interface / type names in code spans (`` `ThemeTokensConfig` ``) and
  resolve them to `xref preview="drawer"` automatically via a site-wide
  symbol registry. Hairy (false positives, ambiguity, registry maintenance)
  — defer until the explicit-call pattern proves out.

## Acceptance Criteria

- [ ] `file-ref` rune accepts `path` (required), `lines`, `label`,
  `preview` attributes.
- [ ] Without `preview`, `file-ref` renders an inline `<a>` with the
  resolved GitHub URL when `repoUrl` is configured, or a no-href / in-page
  anchor otherwise (with a build warning).
- [ ] With `preview="drawer"`, `file-ref` renders an inline `<a>` linking
  to the hoisted drawer; the drawer body is a `{% snippet %}` and a
  `View source on GitHub →` link sits in the drawer chrome footer (not in
  the body).
- [ ] `xref` accepts `preview="drawer"`; renders an inline `<a>` linking
  to the hoisted drawer; the drawer body is the entity's expanded content
  and a link to the entity's resolved page URL sits in the drawer chrome
  footer.
- [ ] The drawer rune gains a `footer` section alongside the existing
  `header` / `body` (engine config + Lumina styling), rendered outside
  `__body` so per-rune body styling stays clean.
- [ ] Per-page dedup: N mentions of the same `preview` target collapse to
  one hoisted drawer.
- [ ] `repoUrl` and `repoBranch` (default `"main"`) are accepted at the
  site level of `refrakt.config.json` (typed in `SiteConfig` and present
  in the JSON Schema).
- [ ] Lumina drawer CSS applies edge-to-edge styling when the body
  contains exactly one code-block child (snippet figure or bare pre).
  Padding zeroed, inner border-radius / border removed so the drawer's
  own corners shape the code.
- [ ] Inline use in prose does not break the surrounding paragraph.
- [ ] Authors can override the inferred `label`; default is the filename
  for `file-ref` and the entity title for `xref` (unchanged today).

## References

- {% ref "SPEC-060" /%} — the drawer rune itself; the hoist mechanism this
  spec reuses.
- {% ref "SPEC-062" /%} — `snippet`; the drawer body for `file-ref`.
- {% ref "SPEC-065" /%} — `xref` patterns; same registry the
  `preview="drawer"` mode reads from.
- {% ref "SPEC-066" /%} — `expand`; the in-flow counterpart that
  `xref preview="drawer"` complements rather than replaces.

{% /spec %}
