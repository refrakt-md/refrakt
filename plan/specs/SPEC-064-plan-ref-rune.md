{% spec id="SPEC-064" status="draft" tags="runes, plan, plugins, transclusion" source="SPEC-021" %}

# Plan-ref rune

A rune in `@refrakt-md/plan` that takes a plan ID (e.g. `SPEC-023`, `WORK-051`, `ADR-007`) and embeds the referenced plan entity into the host page. Architecturally, plan-ref is a **transclusion mechanism** — it resolves the ID to a plan file, hands that file's `{% spec %}` / `{% work %}` / etc. block to the host's transform pipeline, and lets the existing plan rune render itself exactly as it would on the canonical plan site. plan-ref adds only a thin wrapper and a canonical-link affordance; the substantive presentation (status badge, ID, title, structure) comes from the embedded rune itself, eliminating any second presentation layer that could drift from canonical.

The first concrete consumer of {% ref "SPEC-063" /%}'s namespaced partial roots: the plan plugin auto-registers a `plan:` partial root pointing at the configured plan directory, and plan-ref resolves IDs to filenames within it.

The headline composition: `{% plan-ref %}` inside `{% drawer %}` ({% ref "SPEC-060" /%}) for in-context spec previews. But the rune works on its own anywhere — a blog post discussing an architecture decision can embed the ADR inline.

## Problem

There's currently no mechanism for embedding plan content (specs, work items, decisions) within site content. Authors writing about a feature can link to the spec (`[SPEC-023](/plan/specs/SPEC-023)`) but that forces a navigation away and loses the context where the reference matters.

Cases this blocks:

- **Blog post discussing an architecture decision** — the natural read includes the ADR inline, not as a link the reader has to follow back-and-forth.
- **Documentation explaining a behavior driven by a spec** — quoting the spec's design principles section, or showing the acceptance criteria.
- **Drawer-style quick references** — a small trigger in the page opens a panel containing the referenced spec, letting the reader peek without leaving.
- **Marketing pages linking to internal planning** — a feature announcement page that wants to surface the spec it ships against.

Implementing this as a one-off rune-with-its-own-resolution would duplicate everything {% ref "SPEC-063" /%} sets up. The right shape is: plan plugin owns the *plan-specific* work (ID → filename mapping, status-badge rendering, canonical URL generation), and the *generic* work (file resolution from a named root) delegates to the shared partial-roots machinery.

-----

## Design Principles

**Plan plugin owns plan-specific concerns.** ID resolution, status badges, canonical-URL generation, plan-entity type awareness — all in the plugin. The plugin knows its own filename convention (`{ID}-{slug}.md`) and its own URL scheme.

**Resolution delegates to shared infrastructure.** The actual file read goes through the partial-roots resolver from {% ref "SPEC-063" /%} via an auto-registered `plan:` namespace. No parallel inclusion mechanism.

**Auto-registered namespace.** Users don't configure anything to make plan-ref work. Installing the plan plugin makes `plan:` available; the plugin reads the plan directory location from refrakt config and registers it.

**Renders body content, marked with provenance.** The output renders the substantive content of the referenced plan entity (the body inside the `{% spec %}` / `{% work %}` / `{% decision %}` tag) wrapped with a header that surfaces the ID, status, and a link to the canonical page. The reader always knows what they're looking at and how to find more.

**Type-agnostic.** The rune works for any plan entity type (spec, work, bug, decision, milestone). The plugin's ID-to-filename index handles routing; the rune itself doesn't care which type it's rendering.

-----

## Authoring Surface

### Syntax

```markdoc
{# Embed a spec inline #}
{% plan-ref id="SPEC-023" /%}

{# Embed in a drawer (the headline composition) #}
{% drawer title="SPEC-023 — Auth system" shortcut="s" %}
View spec

---

{% plan-ref id="SPEC-023" /%}
{% /drawer %}

{# Multiple types work the same way #}
{% plan-ref id="ADR-007" /%}
{% plan-ref id="BUG-012" /%}
```

### Attributes

| Attribute | Type | Default | Meaning |
|-----------|------|---------|---------|
| `id` | string | required | Plan ID — `SPEC-023`, `WORK-051`, `ADR-007`, `BUG-012`, or a milestone name (`v1.0.0`). |

-----

## Output Contract

The embedded entity renders **exactly as it would on the canonical plan site**: plan-ref hands the file's content to the host page's transform pipeline, the existing plan rune (`{% spec %}`, `{% work %}`, etc.) produces its normal output, and plan-ref wraps that output in a thin container plus a canonical-link affordance. No duplicate header construction; the plan rune is the single source of truth for status badge, title, ID display, and structure.

```html
<section class="rf-plan-ref"
         data-rune="plan-ref"
         data-plan-id="SPEC-023"
         data-plan-type="spec"
         data-canonical-href="https://plan.example.com/specs/SPEC-023">

  <!-- The full rendered output of {% spec id="SPEC-023" status="accepted" %}...{% /spec %} -->
  <!-- (or {% work %}, {% decision %}, etc. for other entity types) -->
  <section class="rf-spec" data-status="accepted">
    <header class="rf-spec__header">…</header>
    <div class="rf-spec__body">…</div>
  </section>

  <a class="rf-plan-ref__canonical-link" href="https://plan.example.com/specs/SPEC-023">
    View on plan site
  </a>
</section>
```

BEM:
- `.rf-plan-ref` — wrapper, contains the embedded entity's full rendered output plus the canonical-link affordance
- `.rf-plan-ref__canonical-link` — link to the entity's canonical page (resolution via {% ref "SPEC-065" /%})

Data attributes (all on the wrapper):
- `data-rune="plan-ref"`
- `data-plan-id` — the referenced ID
- `data-plan-type` — the entity type (`spec`, `work`, `bug`, `decision`, `milestone`)
- `data-canonical-href` — the resolved canonical URL, mirroring the `href` of the link element

The inner element (`.rf-spec`, `.rf-work`, etc.) and everything below it is produced by the plan plugin's own rune transforms — not re-implemented here. Themes that want to style embedded entities differently from standalone entities target `.rf-plan-ref .rf-spec` (or equivalent) for embed-specific overrides.

-----

## Resolution

### ID-to-filename index

The plan plugin builds an index at content-load time:

1. Scan the configured plan directory (subdirectories: `specs/`, `work/`, `bugs/`, `decisions/`, `milestones/`).
2. For each `.md` file, parse the filename to extract the ID:
   - Auto-ID convention: `{ID}-{slug}.md` → ID is the prefix before the first `-` that follows the ID pattern (`SPEC-\d+`, `WORK-\d+`, etc.).
   - Milestones use semver naming (`v1.0.0.md`) → ID is the filename without `.md`.
3. Index entry: `{ id: "SPEC-023", type: "spec", filename: "SPEC-023-auth-system.md", filepath: "specs/SPEC-023-auth-system.md" }`.
4. Duplicate IDs are already rejected by the plan CLI's `create` command; the indexer additionally errors on any duplicate it finds (catches manually-created collisions).

### Lookup

`{% plan-ref id="SPEC-023" /%}` triggers:

1. Look up `"SPEC-023"` in the ID index. If missing, build error with closest-match suggestions.
2. Construct the namespaced partial reference: `plan:{filepath}` (e.g. `plan:specs/SPEC-023-auth-system.md`).
3. Resolve via the shared partial-roots machinery from {% ref "SPEC-063" /%} — reads the file, parses it as Markdoc, returns the AST.
4. Locate the top-level plan entity tag (`{% spec %}`, `{% work %}`, `{% bug %}`, `{% decision %}`, or `{% milestone %}`) within the parsed AST. Build error if no plan rune found at the top level, or if multiple plan runes exist in one file.
5. Substitute the plan entity tag (with its attributes and children intact) into the host page's renderable tree at the plan-ref's position, wrapped in the `.rf-plan-ref` container.
6. Resolve the canonical URL (via the host's xref resolver chain — see {% ref "SPEC-065" /%}) and set it on the wrapper's `data-canonical-href` and the `.rf-plan-ref__canonical-link` `href`.

The host page's transform pipeline then renders the embedded plan rune normally — exactly as if the author had written it inline. The plan rune's existing schema and theme produce the header, status, title, and structure; plan-ref does not duplicate any of that work.

### Auto-registered `plan:` namespace

The plan plugin's `Plugin.partialRoots` includes:

```ts
{
  plan: <configured-plan-dir>
}
```

The plan directory location is already known to the plugin (from `refrakt.config.json`'s plan plugin config, or the default `plan/`). The registration is auto-emitted from the plugin's load function — no user configuration needed.

If the plan directory doesn't exist (project hasn't initialized plan content), the registration is a silent no-op. A build error only surfaces when someone actually writes `{% plan-ref %}` referencing a missing ID.

### Cycle detection

A `plan-ref` pointing to a plan file that itself contains a `plan-ref` to a third file (and so on, eventually back to a previously-embedded ID) → potential infinite expansion. Maintain a per-render path stack of `[id1, id2, ...]`; if the current ID appears in the stack, fail with a build error showing the cycle (`SPEC-023 → WORK-051 → SPEC-023`).

**Note on `{% ref %}` inside embedded content**: refs are *links*, not *expansions*. SPEC-023's body can contain `{% ref "ADR-007" /%}` and ADR-007's body can contain `{% ref "SPEC-023" /%}` without any cycle concern — both render as anchors during the postProcess xref pass, neither inlines content. Cycle detection applies only to `plan-ref` recursion.

### Ref resolution inside embedded content

Refs (`{% xref %}` / `{% ref %}`) appearing inside an embedded plan entity participate in the host page's regular xref postProcess pass — they're part of the host page's renderable tree after the embed substitutes content in. Resolution behavior:

- If the host site publishes plan content (e.g. via {% ref "SPEC-014" /%}'s plan-html-adapter, or plan files inside `site/content/`), plan entities are registered in the `EntityRegistry` → refs resolve to local URLs naturally.
- If the host site has a configured xref pattern matching the ID (see {% ref "SPEC-065" /%}), refs resolve via the pattern's URL template. This is the path users take when their plan content lives externally — refrakt trace, self-hosted CLI, third-party plan hosts.
- Otherwise refs render as `rf-xref--unresolved` spans (default xref behavior; styled-but-inert cross-references).

`plan-ref` itself does not register the embedded entity into the registry. The host page's resolver chain is the sole authority — plan-ref's job is to render content; cross-references in that content go through the standard resolver.

### Error formats

**Unknown ID:**

```
Error: plan-ref id "SPEC-23" cannot be resolved.

No plan entity found with ID "SPEC-23".

Closest matches:
  - SPEC-023 (specs/SPEC-023-auth-system.md)
  - SPEC-024 (specs/SPEC-024-metadata-system.md)

Referenced from: site/content/blog/auth.md:18
```

**Cycle detected:**

```
Error: plan-ref cycle detected.

Cycle:
  SPEC-023 → WORK-051 → SPEC-023

Referenced from: site/content/blog/auth.md:18
```

-----

## Engine Changes

### Plan plugin

- New rune schema in `plugins/plan/src/tags/plan-ref.ts`
- `Plugin.partialRoots` declaration with the auto-registered `plan` namespace
- Pipeline `register` hook: build the ID-to-filename index from the plan directory contents
- Resolution at transform time (or postProcess for canonical-URL resolution): locate the top-level plan rune within the referenced file's AST and substitute it into the host page's renderable tree, wrapped in the `.rf-plan-ref` container
- CSS in `plugins/plan/styles/plan-ref.css` — minimal, since the embedded plan rune brings its own styling. The plan-ref CSS covers only the wrapper, the canonical-link affordance, and any "embedded entity" theme adjustments (e.g. slightly reduced visual prominence to signal the entity isn't this page's primary content)

### Cross-plugin coordination

The plan-ref rune produces a Markdoc AST as part of the host page's render. That AST may include plan-plugin runes (`{% spec %}`, `{% work %}`, etc.) and arbitrary Markdoc content. The host page's transform pipeline must include the plan plugin's rune schemas — otherwise the embedded content fails to render.

**Resolution:** if the plan plugin is installed (which it must be for plan-ref to exist as a rune), its rune schemas are already in the pipeline. No additional coordination needed. The case "user has plan-ref but doesn't have plan-rune schemas" is impossible by construction.

-----

## Acceptance Criteria

- [ ] `{% plan-ref id="SPEC-023" /%}` substitutes the referenced spec's full plan-rune output into the host page
- [ ] The embedded entity renders identically to its standalone presentation on the plan site — no duplicate header construction in plan-ref itself
- [ ] Plan plugin auto-registers a `plan:` partial root via `Plugin.partialRoots`
- [ ] Registered path is the configured plan directory (default `plan/`, configurable per refrakt config)
- [ ] If the plan directory doesn't exist, registration is silent (no build error at load time)
- [ ] ID-to-filename index is built at content-load time by scanning the plan directory
- [ ] Index handles all plan entity types: spec, work, bug, decision, milestone
- [ ] Filename convention `{ID}-{slug}.md` is parsed for IDs
- [ ] Milestone semver filenames (`v1.0.0.md`) are indexed by their semver name
- [ ] Duplicate IDs in the plan directory fail the index build with both filenames named
- [ ] A referenced file with no top-level plan rune fails the build with a clear error
- [ ] A referenced file with multiple top-level plan runes fails the build with a clear error
- [ ] `data-plan-id`, `data-plan-type`, and `data-canonical-href` set on the `.rf-plan-ref` wrapper
- [ ] `.rf-plan-ref__canonical-link` href resolves via the xref resolver chain ({% ref "SPEC-065" /%})
- [ ] Unknown ID fails the build with closest-match suggestions (Levenshtein ≤ 2)
- [ ] Cycle detection: a plan-ref pointing to a file that transitively re-embeds a previously-embedded ID fails the build with the cycle shown
- [ ] `{% ref %}` cross-references inside embedded content go through the standard host-page xref resolver ({% ref "SPEC-065" /%}); plan-ref does not pre-register the embedded entity into the host registry
- [ ] Plan-ref works in any host context (blog post, layout, drawer body, etc.) — not coupled to plan-section pages
- [ ] Composes with drawer (the motivating use case) — `{% drawer %}{% plan-ref %}{% /drawer %}` works end-to-end
- [ ] Plan-rune schemas are available when rendering embedded plan content (provided implicitly by the plan plugin being installed)
- [ ] CSS covers `.rf-plan-ref` wrapper and `.rf-plan-ref__canonical-link`; embedded plan-rune CSS handles the substantive content
- [ ] Authoring docs document the rune, the auto-registered `plan:` namespace, the delegation-to-embedded-rune model, and the composition with drawer

-----

## Out of Scope

- **Derived sections** ("implemented by", "informs", "bugs against", relationship graphs, status rollups). These are the plan site's job — the static plan site (built via `refrakt plan build` / the plan-html-adapter) computes cross-corpus relationships and aggregates over the full registry to render derived views. plan-ref renders what the *author* wrote in a single entity file. The canonical-link affordance bridges the two: readers wanting the derived view click through to the plan site. Conflating these would force plan-ref to consume the full plan registry at embed time (which the host site may not have loaded) and would duplicate logic that already lives in the plan plugin's site adapter. **Clean rule: plan-ref shows what was written; the plan site shows what the corpus implies.**
- **Constructing a separate header in plan-ref itself** — the embedded plan rune already renders its own status, ID, title, and structure. plan-ref delegates entirely to the embedded rune's output and adds only the wrapper plus the canonical-link affordance. A second header layer would be drift-prone and architecturally redundant.
- **Density / level modes** (`level="summary"` etc.) — would require the plan runes themselves to support a summary rendering mode. That's a plan-rune feature, not a plan-ref feature, and not in this spec's scope. If demand surfaces later, add a density attribute to the plan runes; plan-ref can pass it through.
- **Cherry-picking sections of a plan entity** (e.g. "render only the Acceptance Criteria from SPEC-023"). Render full entity or link to a section anchor. Section-level extraction adds attribute surface for a use case that hasn't materialized.
- **Multi-entity refs** (`id="SPEC-023,SPEC-024"`). Use multiple `plan-ref` runes. Composable.
- **Backlinks / "where is this referenced?"** — showing all the places a plan entity is referenced from. Different concern; could be a future site-graph rune. Not in scope here.
- **Inline editing of referenced plan content** — the embedded view is read-only. Editing happens in the canonical plan file.
- **Rendering plan-ref content without the plan plugin runes** — if plan-ref is available, plan rune schemas are too (plan-ref ships in the plan plugin). No way to use one without the other.
- **Custom render templates per entity type** — type-specific rendering is the plan runes' responsibility, not plan-ref's. plan-ref is type-agnostic.
- **Search / discovery UI for finding the right ID** — that's tooling around plan content, not a concern of this rune.
- **Caching: dedup rendering when the same ID is referenced multiple times on one page** — the file read is already memoized by the partial-roots resolver (per {% ref "SPEC-063" /%} caching). Re-parsing the same file twice in one page render is wasteful but not incorrect; defer optimization until profiling shows it matters.

-----

## Open Questions

**Should the wrapper visually differentiate embedded entities from their standalone presentation?** Recommend yes, subtly — themes target `.rf-plan-ref .rf-spec` (etc.) and apply mild de-emphasis (lighter borders, reduced spacing, subtle "embedded" marker) so readers understand the entity isn't the host page's primary content. Default lumina styling provides this baseline; themes can adjust.

**Plan-ref in plan content itself: should a spec be allowed to plan-ref another spec?** Recommend yes, with cycle detection. Cross-referencing inside the plan corpus is exactly the kind of thing this rune is good at, and the existing `{% ref %}` rune already does a lightweight version of it.

**What does the canonical link in the plan-ref header look like for entities that aren't published to the site?** Some projects use the plan corpus for internal planning without publishing it. The header link is generated via the same xref resolution chain as inline refs (registry → patterns → unresolved per {% ref "SPEC-065" /%}). If the user has a trace (or other external host) pattern configured, the header link points there. If not, and plan isn't published locally, the link falls back to the unresolved state — still informative (the ID is visible) but not clickable.

**Cross-entity references in `source=` attributes** — should plan-ref also surface the `source` chain (e.g. "this spec sources from SPEC-001 → ADR-005")? Tempting but creeping scope. Keep v1 just to header + body; future enhancement can add source-chain rendering as an opt-in.

**Multi-site projects: does each site get its own `plan:` namespace, or one global?** Recommend one global — `plan/` lives at project root, not per-site. If a multi-site setup needs per-site plan dirs, that's a different (unusual) configuration; revisit then.

**Rendering performance: plan files can be long (200+ lines). Rendering all of them inline if a docs page has many plan-refs could be slow.** Worth benchmarking once implemented. If it's a problem, `level="summary"` is the escape hatch; lazy-load is a v2 possibility.

-----

## References

- {% ref "SPEC-021" /%} — plan runes (parent context: spec/work/bug/decision/milestone rune definitions)
- {% ref "SPEC-060" /%} — drawer rune (primary composition target)
- {% ref "SPEC-063" /%} — configurable partial roots (resolution mechanism)
- {% ref "SPEC-065" /%} — configurable xref resolution (governs how refs inside embedded content resolve when plan content isn't locally published)
- {% ref "SPEC-022" /%} — plan CLI (filename conventions this rune's indexer parses)
- `plugins/plan/` — the plugin this rune ships in

{% /spec %}
