{% spec id="SPEC-066" status="draft" tags="runes, transclusion, registry, core" %}

# Expand rune

A core rune that takes a registered entity ID and substitutes the entity's source content inline. Generic over entity types — works for plan specs, characters, organizations, events, or anything else a plugin registers with embeddable content. Symmetric with xref: same registry, same lookup chain, different output mode (inline content rather than a link).

The motivating use case is in-context plan-content previews via `{% drawer %}{% expand "SPEC-023" /%}{% /drawer %}`, but the same machinery serves any plugin that registers entities with extractor information. The accompanying plan-plugin work to scan and register plan entities unconditionally is captured in {% ref "SPEC-064" /%}.

Lives in `@refrakt-md/runes` alongside xref. The name `expand` avoids collision with the existing `{% embed %}` rune for media URLs.

## Problem

Authors writing about a domain entity often want to *show* it in context, not just link to it. A blog post about an architecture decision reads better with the ADR inline; a worldbuilding companion site benefits from rendering a character's full description next to the prose mentioning them; a docs page can illustrate a spec it implements by embedding the spec directly.

The existing primitives don't cover this:

- **xref / `{% ref %}`** produces a link. Reader navigates away to see content.
- **partial / `{% partial %}`** transcludes a file by path. Authoring requires knowing the exact file path; doesn't compose with the registry; doesn't carry the entity's identity into the output.
- **Hand-copying** the content drifts the moment the canonical version is edited.

Every refrakt plugin that registers entities into the `EntityRegistry` already has the data structure that would support inline embedding — title, status, source location, type. What's missing is a generic transclusion mechanism that consults the registry, fetches the source, and substitutes it inline with cross-cutting affordances (TOC isolation, heading-ID namespacing, cycle detection, canonical-link).

The architecture mirrors xref exactly: `xref` resolves an ID to a **URL**; `expand` resolves the same ID to **content**. They share the registry as the lookup substrate but diverge on what they need from the entity record.

-----

## Design Principles

**Symmetric with xref.** Same registry lookup chain (exact ID → name match → fail). Same entity-type-hint disambiguation. Different output: xref renders an anchor, expand substitutes the entity's source AST. Authors who know xref already know how expand resolves.

**Plugin-owned extraction.** Plugins know their own entity shapes — a plan rune is one file with one top-level entity; a character rune might be one of several siblings in a definition file. The plugin provides the extractor (`extract(parsedAst) → embeddable subtree`); expand calls it. The rune itself stays type-agnostic.

**Implicit embeddability.** If a registration includes `sourceFile` + `extract`, the entity is embeddable. If not, expand fails with a clear "type does not support embedding" error. No separate `embeddable: true` flag; the presence of extraction information *is* the signal.

**Local files only.** expand reads from the file system, sandboxed to the project root (same security boundary as code-file from {% ref "SPEC-062" /%}). No remote source fetching at build time. Users embedding plan content hosted externally on a third-party service (trace, etc.) need the source files locally; xref handles the external-URL case for refs without requiring local source.

**Canonical-link via the xref resolver.** The `.rf-expand` wrapper includes a canonical-link affordance pointing at the entity's authoritative URL. That URL is resolved via the same chain as xref: registry `sourceUrl` → SPEC-065 patterns → unresolved. So an entity embedded inline with `expand` and linked elsewhere with `ref` produces a consistent canonical URL.

**One source of truth for presentation.** expand wraps the substituted content but does not construct its own header. The embedded rune (plan rune, character rune, etc.) renders itself exactly as it would standalone, plus expand's thin wrapper. Status badges, titles, structure — all come from the embedded rune's own output. No second presentation layer to drift.

-----

## Authoring Surface

### Syntax

```markdoc
{# Basic embed — substitutes the entity inline #}
{% expand "SPEC-023" /%}

{# Optional explicit demotion — embed is meant to act as a sub-section
   of the host page rather than a peer document. Rare; advanced use. #}
{% expand "SPEC-023" level=3 /%}

{# Type-hint disambiguation when the same string matches multiple types #}
{% expand "Veshra" type="character" /%}

{# Show a visible "View canonical" link — useful when the embed is a peek
   and the canonical lives elsewhere (e.g. on trace) #}
{% expand "SPEC-023" canonical=true /%}

{# Headline composition — in-context preview in a drawer, with
   canonical link to bridge back to the full view #}
{% drawer title="SPEC-023" shortcut="s" %}
View spec

---

{% expand "SPEC-023" canonical=true /%}
{% /drawer %}
```

### Attributes

| Attribute | Type | Required | Default | Meaning |
|-----------|------|----------|---------|---------|
| `primary` | string | yes | — | Entity ID or name to expand. Same shape as xref's primary. |
| `level` | number | no | unset | Opt-in heading demotion. When unset (default), embedded headings keep their natural levels — the embed renders as its own document. When set to N, demote all headings by `N - 1` so the top heading becomes `Hn`. Rarely needed; useful only when the embed is genuinely meant to act as a sub-section of the host. |
| `type` | string | no | — | Entity type hint for disambiguation. Constrains both registry lookup and (informally) extractor selection. |
| `canonical` | boolean | no | `false` | When `true`, render a visible `.rf-expand__canonical-link` linking to the entity's canonical URL (resolved via the xref chain). When `false`, no visible affordance — but `data-canonical-href` on the wrapper is still populated for themes and tooling. |

-----

## Output Contract

```html
<!-- Default — canonical=false, no visible link, data attribute populated -->
<section class="rf-expand"
         data-rune="expand"
         data-entity-id="SPEC-023"
         data-entity-type="spec"
         data-canonical-href="https://trace.refrakt.md/user/repo/specs/SPEC-023">

  <!-- The full rendered output of the embedded plan rune,
       with heading levels demoted by (level - 1). -->
  <section class="rf-spec" data-status="accepted">
    <header class="rf-spec__header">…</header>
    <div class="rf-spec__body">…</div>
  </section>
</section>

<!-- With canonical=true — visible link appended after the embedded content -->
<section class="rf-expand"
         data-rune="expand"
         data-entity-id="SPEC-023"
         data-entity-type="spec"
         data-canonical-href="https://trace.refrakt.md/user/repo/specs/SPEC-023">

  <section class="rf-spec" data-status="accepted">
    <header class="rf-spec__header">…</header>
    <div class="rf-spec__body">…</div>
  </section>

  <a class="rf-expand__canonical-link"
     href="https://trace.refrakt.md/user/repo/specs/SPEC-023">
    View canonical
  </a>
</section>
```

BEM:

- `.rf-expand` — wrapper around the embedded entity
- `.rf-expand__canonical-link` — optional affordance linking to the entity's canonical URL (rendered only when `canonical=true`)

Data attributes (all on the wrapper):

- `data-rune="expand"`
- `data-entity-id` — the resolved entity's ID
- `data-entity-type` — the entity type (`spec`, `character`, etc.)
- `data-canonical-href` — mirrors the canonical link's `href` for tooling
- `data-source` — `"registry"` (entity was found in registry) — same convention as xref

The inner content (`.rf-spec`, `.rf-character`, etc.) is whatever the embedded entity's rune produces. Themes can target embedded-specific styling via `.rf-expand .rf-spec` (etc.) without affecting standalone rendering.

-----

## Resolution

For each `{% expand %}` placeholder found during postProcess:

1. **Registry exact-ID match**: `registry.getById(typeHint?, primary)`. Optionally filtered by `type` hint.
2. **Registry name fallback**: case-insensitive match against entity `name`/`title`. Same algorithm as xref.
3. **Embeddability check**: the resolved entity must have both `sourceFile` and `extract` in its registration. If not, fail the build:
   ```
   Error: expand "SPEC-023" — entity type "spec" does not support embedding.

   The entity exists in the registry but has no embeddable source. Likely
   causes: the plugin that owns this entity type doesn't provide expand
   support, or the registration omitted sourceFile/extract.

   Referenced from: site/content/blog/auth.md:24
   ```
4. **Source read** (cached per build): read `sourceFile` from the project root. Sandbox rules from {% ref "SPEC-062" /%} apply — no traversal, no symlink escape.
5. **Parse** (cached per build): `Markdoc.parse(source)`.
6. **Extract**: call the entity's registered `extract(parsedAst) → Markdoc.Node | null`. If it returns null, fail the build:
   ```
   Error: expand "SPEC-023" — extractor returned no content.

   The source file (plan/specs/SPEC-023-foo.md) was read but the plugin's
   extractor couldn't locate the entity's content in the parsed AST. The
   file may have been edited out-of-sync with the registry.
   ```
7. **Heading processing**: walk the extracted subtree. For each `heading` node, namespace its `id` attribute with the `expand-{entityId}--` prefix. If `level=N` was set on the expand rune, also shift the heading level by `N - 1` (clamping at H6 with a build warning, see Heading Handling below).
8. **Cycle check**: if the resolved `(type, id)` is already in the current resolution stack, fail with the cycle path.
9. **Substitute**: replace the `expand` placeholder with the (heading-processed) extracted subtree, wrapped in `.rf-expand` markup. The `data-rune="expand"` attribute on the wrapper is the marker the TOC builder uses to skip embedded headings.
10. **Canonical-link resolution**: resolve the entity's canonical URL via the standard xref resolver chain ({% ref "SPEC-065" /%}: registry `sourceUrl` → patterns → unresolved). Set `data-canonical-href` on the wrapper regardless of the `canonical` attribute value — themes and tooling can always reach the URL. When `canonical=true`, additionally render a `.rf-expand__canonical-link` `<a>` element with the resolved `href`. When `canonical=true` *and* the URL resolves unresolved (no registry hit, no pattern match), render the link with `rf-xref--unresolved` styling (or omit the visible link — see Open Questions).

The substituted subtree is then re-processed by the host page's normal transform pipeline — embedded plan runes execute their own transforms, embedded refs resolve via the same xref chain, etc. expand doesn't pre-resolve any of that; it just provides the embedded AST as a peer of inline content.

-----

## Heading Handling

Embedded entities are *quoted documents*, not subsections of the host. An embedded spec keeps its own H1, its own structural hierarchy, its own anchor links. The host page's heading outline and TOC stay clean of the embed's structure. Three mechanisms cooperate to deliver this:

### 1. No demotion by default

Embedded headings retain their natural levels. A spec's H1 stays H1, its H2s stay H2s. This is structurally correct — HTML5 sectioning content (`<section>`, `<article>`, `<dialog>`) scopes headings to their containing element, so an H1 inside `.rf-expand` (or inside a drawer's `<dialog>`) represents the heading of *that section*, not the document root. Screen readers and the modern outline algorithm handle this correctly.

### 2. TOC builder filters expand contents

The host page's TOC walker (used by `{% toc %}` and similar tooling) skips any `heading` node descended from a `data-rune="expand"` wrapper. The host's TOC reflects only the host's structure; the embed's headings never appear in it.

This is a TOC-builder concern, not an expand concern per se — the filter is applied at TOC walk time. expand just sets up the marker (`data-rune="expand"` on the wrapper); the TOC machinery does the skipping.

### 3. Heading IDs are namespaced

Heading anchor IDs inside an expand wrapper are prefixed with `expand-{entityId}--`:

```html
<section class="rf-expand" data-entity-id="SPEC-023">
  <section class="rf-spec">
    <h1 id="expand-SPEC-023--auth-system">Auth system</h1>
    <h2 id="expand-SPEC-023--acceptance-criteria">Acceptance criteria</h2>
    …
  </section>
</section>
```

Two consequences:

- A host page with its own "Acceptance criteria" heading and an embedded spec with the same heading text don't collide on ID — host gets `#acceptance-criteria`, embed gets `#expand-SPEC-023--acceptance-criteria`.
- Deep links into embedded content are possible: `/host-page#expand-SPEC-023--acceptance-criteria` points at the specific heading within the embed.

ID normalization (kebab-case, ASCII slug, etc.) follows the standard heading-ID conventions for the suffix portion; the `expand-{entityId}--` prefix is added by expand during substitution.

### Optional explicit demotion (`level=`)

For the rare case where an embed is genuinely meant to act as a sub-section of the host — say, a layout file that embeds a shared "section template" entity that should be styled as a sub-section — the author can opt in with `level=N`. This demotes all headings in the embedded subtree by `N - 1`:

| `level=` | H1 → | H2 → | H3 → |
|----------|------|------|------|
| unset (default) | H1 | H2 | H3 |
| `1` | H1 | H2 | H3 |
| `2` | H2 | H3 | H4 |
| `3` | H3 | H4 | H5 |

When demotion is requested and would push headings past H6, clamp to H6 with a build warning:

```
Warning: expand "SPEC-023" at site/content/blog/example.md:24 — heading
demotion (level=4) would push 2 heading(s) past H6. Clamped to H6:
  - "Acceptance criteria" (was H4, would be H7)
  - "Out of scope" (was H4, would be H7)

Consider reducing level= or restructuring the source's heading depth.
```

Demotion still applies only to `heading` nodes in the Markdoc tree, not to rune-emitted custom elements styled as headings.

### Visual treatment is theme-owned

Two H1s on a page (the host's and the embed's) can look visually odd if a theme styles all H1s identically. Themes handle this by targeting `.rf-expand h1`, `.rf-expand h2`, etc. and applying an embedded-heading treatment (smaller scale, boxed, "quoted" styling). Lumina ships a default; theme authors can override. Critically, this is a *presentation* concern — the underlying markup keeps natural heading semantics, themes adjust the visual hierarchy.

-----

## Cycle Detection

Each resolution maintains a stack of `(type, id)` tuples. When entering an `expand` resolution, push the resolving entity's `(type, id)`. When finishing, pop. If pushing would create a duplicate, fail with the cycle path:

```
Error: expand cycle detected.

Cycle: SPEC-023 (spec) → WORK-051 (work) → SPEC-023 (spec)

Referenced from: site/content/blog/example.md:24
```

The stack is per-page-render, not global — embedding the same entity on two different pages is fine; embedding it inside itself transitively is the bug we catch.

Self-references (`{% expand "SPEC-023" /%}` inside `SPEC-023`) are caught the same way: pushing SPEC-023 when SPEC-023 is already at the top of the stack.

**Note on `{% ref %}` inside embedded content**: refs are *links*, not *expansions*. They don't push onto the resolution stack; they just resolve to a URL during postProcess. SPEC-023's body can `{% ref "ADR-007" /%}` and ADR-007's body can `{% ref "SPEC-023" /%}` back without any cycle concern. Only `expand` participates in cycle detection.

-----

## Plugin Extractor API

For an entity to be embeddable, its plugin must register the entity with two additional fields beyond the existing `EntityRegistration` shape:

```ts
interface EmbeddableEntityRegistration extends EntityRegistration {
  sourceFile: string;                              // project-root-relative path
  extract: (parsed: Markdoc.Node) => Markdoc.Node | null;
}
```

- **`sourceFile`** — project-root-relative path to the source file. Used by expand for the file read; sandbox rules apply.
- **`extract`** — given the parsed Markdoc AST of `sourceFile`, return the subtree to substitute. Returns null if the entity can't be located (treated as a build error by expand).

Both fields are optional from the existing `EntityRegistration` interface's perspective — entities without them are simply not embeddable. Pages (registered by core), headings (registered by core), and any other registry contributors that don't add these fields will fail expand with the standard "does not support embedding" error.

### Extractor patterns

- **One entity per file** (plan, certain worldbuilding plugins): extractor walks the parsed AST for the top-level rune tag matching the entity's type. Trivial.
- **Multiple entities per file** (e.g. a character-list page defining several characters): extractor walks for the rune tag whose `id` attribute matches the entity's ID. Plugin's job to manage uniqueness.
- **Composite entities**: a plugin can return an arbitrarily-shaped Markdoc subtree. expand doesn't constrain the structure.

-----

## Engine Changes

### Registry interface

`packages/types/src/registry.ts` (or `EntityRegistry` type definition): the `EntityRegistration` interface gains optional `sourceFile` and `extract` fields. Plugins that opt in supply both; plugins that don't continue to register entities as before.

### Resolver

New module `packages/runes/src/expand-resolve.ts`, structurally similar to `xref-resolve.ts`. Walks the page's renderable tree looking for `data-rune="expand"` placeholders, performs the resolution chain above, substitutes content.

### Rune schema

New file `packages/runes/src/tags/expand.ts`, following xref's two-phase pattern: transform emits a placeholder span; postProcess resolves and substitutes.

### Core pipeline hooks

`packages/runes/src/index.ts` — `corePipelineHooks` gains an expand-resolution step in postProcess, ordered after xref (so embedded refs can be resolved within the substituted content) or before (so refs in the host page resolve first). **Open question** — see below.

### CSS

`packages/lumina/styles/runes/expand.css`: minimal styling for the wrapper and canonical-link affordance. The substantive content is styled by whichever rune is embedded (plan, character, etc.).

-----

## Acceptance Criteria

- [ ] `{% expand "SPEC-023" /%}` substitutes the referenced entity's source content into the host page
- [ ] Resolution chain: registry exact-ID → registry name → embeddability check → unresolved
- [ ] Unresolved IDs fail the build with closest-match suggestions (Levenshtein ≤ 2)
- [ ] Entities without `sourceFile` + `extract` produce a "does not support embedding" build error
- [ ] Page entities (registered by core) cannot be expanded — produce the not-embeddable error
- [ ] `type` attribute constrains registry lookup to the named type
- [ ] `sourceFile` is read with the same sandbox rules as code-file ({% ref "SPEC-062" /%}); traversal escape rejected
- [ ] Source-file content is cached per build (multiple expands of entities from the same file = one parse)
- [ ] Extractor returning null fails the build with "extractor returned no content"
- [ ] Embedded heading levels are preserved by default (no demotion when `level=` is unset)
- [ ] All headings inside `.rf-expand` get IDs prefixed with `expand-{entityId}--` (e.g., `expand-SPEC-023--acceptance-criteria`)
- [ ] Heading IDs use the standard slugifier for the suffix portion; the prefix is added by expand during substitution
- [ ] TOC builder (used by `{% toc %}` and similar tooling) skips headings descended from `data-rune="expand"` wrappers
- [ ] `level=N` attribute opts into explicit demotion: headings shift by `N - 1` while preserving relative hierarchy
- [ ] Demoted headings clamped at H6 emit a build warning naming source location and affected heading text
- [ ] Lumina ships a default heading treatment for `.rf-expand h1`/`h2`/etc. that visually distinguishes embedded headings without altering their semantic level
- [ ] Cycle detection: `(type, id)` stack tracks open expansions; duplicate push fails with cycle path
- [ ] Refs (`{% xref %}` / `{% ref %}`) inside embedded content do not participate in cycle detection
- [ ] Output wrapper has `.rf-expand` class with `data-rune`, `data-entity-id`, `data-entity-type`, `data-canonical-href`, `data-source="registry"`
- [ ] `data-canonical-href` on the wrapper is populated whenever the xref chain resolves, regardless of the `canonical` attribute value
- [ ] `canonical=true` renders a visible `.rf-expand__canonical-link` `<a>` element
- [ ] `canonical=false` (default) does not render a visible link element
- [ ] `.rf-expand__canonical-link` href resolves via the xref chain ({% ref "SPEC-065" /%})
- [ ] When `canonical=true` and the URL is unresolved, the link element renders with `rf-xref--unresolved` styling (preserving the affordance while signaling the resolution gap)
- [ ] Refs and other runes within the substituted content resolve normally via the host page's pipeline
- [ ] Composes with drawer ({% ref "SPEC-060" /%}) — `{% drawer %}{% expand %}{% /drawer %}` works end-to-end
- [ ] Composes with `{% expand %}` on its own (no drawer) in any host context
- [ ] Lumina ships baseline `.rf-expand` + `.rf-expand__canonical-link` CSS
- [ ] `EntityRegistration` interface gains optional `sourceFile` and `extract` fields with documented semantics
- [ ] Authoring docs cover the rune, the no-demotion default, heading ID namespacing, the optional `level=` opt-in, the TOC isolation behavior, and the relationship to xref / partial / embed

-----

## Out of Scope

- **Page-entity embedding**. Falls out of the implicit-embeddability design: core doesn't register pages with extractors. If "embed a whole page" becomes a real need, address it with a different primitive (page-embed with explicit layout-region handling) rather than overloading expand.
- **Remote source fetching** (HTTP, github://, etc.). File system only. Heavy infrastructure (caching, network policy, build determinism) belongs in its own design.
- **Multi-entity expansion** (`{% expand "SPEC-023,SPEC-024" /%}`). Use multiple `{% expand %}` runes.
- **Cherry-picking sections** of an entity ("just the Acceptance Criteria of SPEC-023"). The extractor returns one subtree; partial extraction is a plugin-by-plugin concern, not a generic rune attribute.
- **Lazy / deferred expansion** at render time (vs. build time). Build-time only.
- **Inline editing** of embedded content. Read-only by construction.
- **Constructing a separate header / status display** in expand itself. The embedded rune renders its own header; expand adds only the wrapper + canonical-link.
- **Density modes / summary rendering**. Different presentation densities are a per-rune concern — if plan runes (or any other) want to support a summary mode, that's their feature, not expand's.
- **Backlinks / "where is this expanded from?"**. Out of scope; future site-graph concern.
- **Cross-site embedding** in multi-site monorepos. Each site sees its own registry. Future spec if demand surfaces.

-----

## Open Questions

**Should the postProcess hook run expand before or after xref resolution on the host page?** Two cases to consider:

- expand runs first → refs inside the substituted content are seen by xref's pass on the host page, so they resolve uniformly with everything else. Cleaner mental model.
- xref runs first → refs in the host page are resolved before any embeds happen, but embedded content's refs would need a second xref pass after expand to be resolved. Worse: now there are two resolution rounds.

Recommend **expand first, xref second**. Single resolution pass for refs, regardless of whether they live in original or substituted content.

**What should the `canonical=true` link show when the URL is unresolved?** Options: (a) omit the link entirely (treat as `canonical=false`); (b) render with `rf-xref--unresolved` styling (visible but not clickable); (c) show as plain text with the entity ID. Current recommendation is (b) — preserves the affordance's existence (reader knows there's a canonical somewhere) while signaling the resolution gap. Authors who'd rather suppress entirely can leave `canonical=false` for that entity.

**Should there be a project-level config to flip the `canonical` default?** A site that consistently wants canonical links visible might want to set it once rather than per-rune. Tempting but adds surface; first ship the per-instance attribute and revisit if real demand surfaces.

**Should the wrapper include a "back to host" affordance** when the embed lives in a drawer or other framing context? Tempting but couples expand to context (drawer-aware vs not). Recommend no — let the framing context (drawer) provide its own close affordance.

**How does expand interact with the `tint` cascade?** Embedded content might come from a plan file with no tint declaration; the host page has its own tint. Recommend: the embed inherits the host's tint at the substitution point. Plan-file authoring shouldn't need to think about tints; they're a presentation-layer concern of the consumer site.

**Should `expand` set `data-source="pattern"` or any indicator** when the entity was found via name-match rather than exact ID match? Symmetric with xref's source attribute. Recommend yes for parity.

**Performance: source-file caching across pages.** If one source file (`plan/specs/SPEC-023-foo.md`) is expanded on twenty different pages, we want to parse it once, not twenty times. Per-build cache keyed by `sourceFile` handles this — same as code-file's caching.

**Build-time vs. content-load-time extraction.** Could the plugin's `extract` be called once at content-load (when entities are registered) rather than per-expansion? It would let the registration store the pre-extracted AST and skip per-call extraction. Tradeoff: eager memory cost vs. lazy compute cost. Recommend lazy (per-expand call, but cached) — keeps memory bounded for projects with many registered entities that aren't all embedded.

**Should there be a `lookup` attribute** to constrain resolution to exact-ID only (skip the name-match fallback)? Tempting for "fail fast on typos" use cases. Defer — xref doesn't have it either; consistent surface.

-----

## References

- {% ref "SPEC-060" /%} — drawer rune (primary composition target)
- {% ref "SPEC-064" /%} — plan plugin unconditional entity registration (companion spec — the registration work that makes plan entities embeddable)
- {% ref "SPEC-065" /%} — configurable xref resolution (used for canonical-link affordance)
- {% ref "SPEC-062" /%} — code-file rune (shared sandbox + source-caching machinery)
- `packages/runes/src/tags/xref.ts` — symmetric existing rune; expand mirrors its two-phase structure
- `packages/runes/src/xref-resolve.ts` — postProcess resolver pattern this spec follows

{% /spec %}
