{% spec id="SPEC-078" status="shipped" tags="file-ref, xref, drawer, snippet, expand, preview, docs, runes" released-in="v0.16.1" %}

# `file-ref` rune + shared `preview` attribute on reference runes

A path-based reference rune (`file-ref`) that points at a project file from
prose with an auto-resolved GitHub URL, plus a shared `preview="…"`
attribute on both `file-ref` and the existing `xref` rune that hoists a
drawer (or future popover / details / sidenote) containing the referenced
content — the common case for "preview a file or entity behind a link."
Adds a `footer` slot to the drawer rune for the canonical "View source on
GitHub →" / "View full page" link, plus an always-visible flex-column
chrome so the footer stays one tap away regardless of body scroll depth.

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
- A **drawer footer slot + always-visible flex-column chrome** so the
  hoist's GitHub / page link stays one tap away regardless of body
  scroll depth.

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
`"https://github.com/refrakt-md/refrakt"`) and an optional `repoBranch`.
`repoBranch` accepts any git ref — a branch name (default `"main"`), a
tag, or a commit SHA. Use a SHA for archival URLs that won't drift when
the file is edited later.

**When `repoUrl` is absent.** `file-ref` still works without it. With no
`preview`, the inline link has no `href` (or, when a snippet of the same
path already exists on the page, falls back to that in-page anchor) and
a one-time build warning fires. With `preview="drawer"`, the drawer body
embeds fine, the GitHub footer link silently hides, and the same warning
fires.

**Label default.** The filename default (`token-contract.ts`) is
intentionally conservative — when the author is referring to a *symbol*
that lives in the file (the usual case), they'll want to pass an explicit
`label`. The forthcoming `symbol="…"` extension will default `label` to
the symbol name automatically; until then, `label` is the official knob
the docs should call out loudly.

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
  resolved page URL) so readers can navigate to the full page. For
  entities with no `sourceUrl` (heading entities, drawer-target
  entities), the footer link hides — drawer body still renders, footer
  zone stays empty.

The chrome footer is a new drawer slot — `sections: { header, body,
footer }` in the engine config — rendered outside the body so per-rune
body styling stays clean. It carries its own small padding so the link
doesn't kiss the drawer edge.

### Drawer chrome behavior — always-visible footer

The drawer becomes a flex column so the **header (when present) and
footer pin while the body scrolls**. For long entity bodies or long file
snippets, `View source on GitHub →` and the page-link stay one tap away
regardless of scroll position. The CSS shape:

```css
.rf-drawer { display: flex; flex-direction: column; max-height: 100vh; }
.rf-drawer__header,
.rf-drawer__footer { flex: 0 0 auto; }
.rf-drawer__body   { flex: 1 1 auto; overflow-y: auto; }
```

### Standalone drawers — opt-in footer via body zones

The new `footer` slot serves both: `preview="drawer"` hoist injects
content into it automatically, and **standalone authors fill it via the
body-zone convention** — split the drawer body on top-level `---` into
body + footer, the same shape `{% card %}` already uses:

```markdoc
{% drawer id="auth" title="Auth system" %}
The auth system uses JWTs with refresh tokens.

---

[View on GitHub →](https://github.com/example/auth)
{% /drawer %}
```

No auto-derivation from embedded `{% expand %}` runes for the standalone
case — even for a single-expand drawer it's ambiguous (the author may
not *want* the canonical URL there, the expand may be decorative inside
richer chrome), and multi-expand is truly ambiguous (which entity's URL
wins?). Author opt-in keeps semantics predictable.

The footer zone is just markdoc rendered in a chrome region — any inline
content goes there, not only hardcoded URLs. The canonical case is an
`{% ref %}` pointing at the same entity that was just expanded:

```markdoc
{% drawer id="aggregate" title="Aggregate rune" %}
{% expand "SPEC-076" /%}

---

See {% ref "SPEC-076" /%}
{% /drawer %}
```

The xref resolves the URL from the registry, so the link stays correct
as the entity moves and the author doesn't memorise URLs. The
xref-patterns mechanism ({% ref "SPEC-065" /%}) works too — external
issue refs or custom URL templates populate the footer the same way.
Plain markdown links, `{% file-ref %}` (without preview), inline
`{% humanize(…) %}` calls, anything that resolves to inline content
works. The hoist mechanism is just one specific path to populate the
footer slot; manual composition is the general case.

**Nested previews in the footer.** A `{% ref "X" preview="drawer" /%}`
inside a drawer footer would hoist another drawer for entity X —
drawer-from-within-a-drawer. The mechanism doesn't prevent it and
`<dialog>` stacking handles it on modern browsers, but it's a slightly
awkward shape. Supported but discouraged; the build emits an info-level
note if it's detected. (The alternative — blocking it — would require
rune-aware validation that isn't worth the complexity for an edge use.)

### Why this and not "extend `expand`"

`expand`'s contract is *replace the call site with the entity body in
flow* — block-level, one-time substitution. `xref preview="drawer"` is
*keep the inline link, reveal on demand* — paragraph-safe, deduplicated
across mentions. Different intents; the runes stay separate.

## Capability 3 — single-block drawer styling (deferred)

When a drawer body contains only a single code block (the canonical layout
for `preview="drawer"`), the drawer's body padding and the code block's
rounded corners look redundant — they make the code feel "boxed inside a
box." A drawer-side `:has(> single-code-block:only-child)` selector that
zeros padding looks attractive but **couples the drawer to specific rune
class names** — every fillable rune (snippet, codegroup, chart, sandbox,
plus future third-party runes) would need a hard-coded entry. Each rune
also has different fill semantics (snippets scroll, charts fit,
codegroups pin tabs, sandboxes own their iframe scroll), so a
one-size-fits-all CSS shape on the drawer can't handle them.

**Deferred to a follow-up SPEC**: the `data-fill` opt-in contract sketched
under Future extensions below. WORK-298 ships the chrome (footer slot +
flex-column body scroll); the edge-to-edge story lands when the
cross-rune design is ready.

## Implementation note

The hoist mechanism reuses the existing drawer pipeline. The rune's
transform emits two parts:

1. **Inline** — an `<a>` with `href="#drawer-{id}"` (and the GitHub URL
   for `file-ref` without preview), keeping the call site paragraph-safe.
2. **Sentinel** — a meta tag carrying the drawer registration (`id`,
   `source`, `path` or `entity-id`, etc.). The page-level `registerDrawers`
   pass collects these from anywhere in the tree, dedups by `id`, and
   emits the actual `<dialog>` markup at the page's drawer area (same
   area as the existing drawer rune from {% ref "SPEC-060" /%}).

**Slug derivation.** The `id` for hoisted drawers is derived
deterministically from the reference. For `file-ref`, the slug encodes
both path and lines (`/` → `-`, range appended as `L{start}-L{end}` —
e.g. `packages-types-src-token-contract-ts-L42-L58`), so different paths
*or* different ranges of the same path get distinct drawer ids. For
`xref`, the slug is the entity id (`SPEC-076`). Same reference = same
id = one drawer; this is what enables per-page dedup.

**Collision with author-declared drawers.** If an author writes
`{% drawer id="…" %}…{% /drawer %}` block-level with the same id a
preview hoist would generate, the **author-declared drawer wins** — the
hoist defers, the inline preview link points at the existing drawer.
This lets authors customise the drawer body or footer for a specific
reference while keeping the inline-link ergonomics. The build emits an
info-level note so the customisation is visible in CI output.

**Accessibility and no-JS behaviour.** Inline preview links inherit the
trigger machinery from {% ref "SPEC-060" /%}. With JS, the link opens
the hoisted drawer via `dialog.showModal()`. Without JS,
`href="#drawer-{id}"` is a real in-page anchor that scrolls to the
drawer rendered as a visible block fallback (the existing drawer rune's
SSR fallback). The inline link carries `aria-controls="drawer-{id}"`,
and `aria-expanded` mirrors the dialog's open state — screen readers
announce the trigger ↔ disclosure relationship without any new a11y
plumbing.

**Path sandbox.** `file-ref`'s path resolution reuses `snippet`'s
`read-file.ts` sandbox: absolute paths rejected, traversal escapes
(`..`) rejected, symlinks escaping the project root rejected, missing
files error at build time. Same security boundary, same error messages.

## Future extensions

Not in scope for v1, but reserved by the rune's shape:

- **`data-fill` opt-in contract for single-block edge-to-edge** — the
  follow-up to the deferred Capability 3. The shape: a fillable rune
  (snippet, codegroup, chart, sandbox, plus third-party) declares
  `data-fill` on its root attributes. The rune's CSS targets
  `.rf-myrune[data-fill]:only-child` to author its own fill behaviour
  (own scroll container, internal chrome adjustments). Hosts that
  participate (drawer body, future `card` media zone, future `details`
  body) use a single generic selector `:has(> [data-fill]:only-child)`
  to zero their own padding — no per-rune awareness on the host side,
  so third-party runes participate without touching host code. Context
  modifiers stay available as a refinement for runes that want
  host-specific tweaks (`.rf-codegroup--in-drawer[data-fill]:only-child`
  for drawer-only behaviour). Symmetric contract: rune says *"I can
  fill if asked"*; host says *"I want fillable content to fill."* The
  combination triggers; either side alone is a no-op. Held out of v1
  because each fillable rune needs its own scroll-container CSS, and
  that's a cross-rune design exercise (snippets scroll, charts fit,
  codegroups pin tabs, sandboxes own their iframe scroll) that
  deserves its own scoped SPEC.
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
- [ ] Drawer renders as a flex column — header and footer pinned via
  `flex: 0 0 auto`, body scrolls via `flex: 1 1 auto; overflow-y: auto`.
- [ ] Standalone drawers can populate the footer via the body-zone
  convention (split on top-level `---` into body + footer), the same
  shape `{% card %}` uses. No auto-derivation from embedded `expand`
  runes; opt-in only.
- [ ] When `repoUrl` is absent: `file-ref` without preview emits a
  no-href link (or in-page anchor when a snippet of the same path
  exists), with a one-time build warning. `file-ref preview="drawer"`
  still renders the drawer body, footer GitHub link hides, same
  warning fires.
- [ ] `xref preview="drawer"` for entities without `sourceUrl` renders
  the drawer body normally; the footer link hides.
- [ ] `repoBranch` accepts any git ref (branch name, tag, or commit SHA).
- [ ] When an author-declared `{% drawer id="…" %}` collides with a
  hoist-generated id, the author drawer wins and the hoist defers to it.
- [ ] `file-ref` path resolution reuses `snippet`'s read-file sandbox
  (absolute paths / `..` escapes / out-of-root symlinks rejected;
  missing files error at build).
- [ ] Inline preview link carries `aria-controls` and reflects
  `aria-expanded` on the hoisted dialog's open state.
- [ ] Per-page dedup: N mentions of the same `preview` target collapse to
  one hoisted drawer.
- [ ] `repoUrl` and `repoBranch` (default `"main"`) are accepted at the
  site level of `refrakt.config.json` (typed in `SiteConfig` and present
  in the JSON Schema).
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
