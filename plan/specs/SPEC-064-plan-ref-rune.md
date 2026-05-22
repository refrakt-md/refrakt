{% spec id="SPEC-064" status="draft" tags="runes, plan, plugins, transclusion" source="SPEC-021" %}

# Plan-ref rune

A rune in `@refrakt-md/plan` that takes a plan ID (e.g. `SPEC-023`, `WORK-051`, `ADR-007`) and renders the referenced plan entity as inline content with plan-aware affordances — status badge, ID label, link to the canonical page. The first concrete consumer of {% ref "SPEC-063" /%}'s namespaced partial roots: the plan plugin auto-registers a `plan:` partial root pointing at the configured plan directory, and `plan-ref` resolves IDs to filenames within it.

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

{# Summary mode — just the header, no body #}
{% plan-ref id="WORK-051" level="summary" /%}

{# Multiple types work the same way #}
{% plan-ref id="ADR-007" /%}
{% plan-ref id="BUG-012" /%}
```

### Attributes

| Attribute | Type | Default | Meaning |
|-----------|------|---------|---------|
| `id` | string | required | Plan ID — `SPEC-023`, `WORK-051`, `ADR-007`, `BUG-012`, or a milestone name (`v1.0.0`). |
| `level` | `"full"` \| `"summary"` | `"full"` | What to render — full body with header, or header only (status + ID + link). |

-----

## Output Contract

```html
<section class="rf-plan-ref" data-rune="plan-ref" data-plan-id="SPEC-023" data-plan-type="spec">
  <header class="rf-plan-ref__header">
    <span class="rf-plan-ref__badge" data-status="accepted">accepted</span>
    <span class="rf-plan-ref__id">SPEC-023</span>
    <a class="rf-plan-ref__link" href="/plan/specs/SPEC-023">View canonical page</a>
  </header>
  <div class="rf-plan-ref__body">
    <!-- rendered plan entity body content -->
  </div>
</section>
```

BEM:
- `.rf-plan-ref` — wrapper
- `.rf-plan-ref__header` — status + ID + link row
- `.rf-plan-ref__badge` — status pill (`data-status=` for variant styling)
- `.rf-plan-ref__id` — plan ID text
- `.rf-plan-ref__link` — canonical-page link
- `.rf-plan-ref__body` — rendered body (omitted when `level="summary"`)
- `.rf-plan-ref--level-summary` — modifier when body is omitted

Data attributes:
- `data-rune="plan-ref"`
- `data-plan-id` — the referenced ID
- `data-plan-type` — the entity type (`spec`, `work`, `bug`, `decision`, `milestone`)
- `data-status` on the badge — for variant styling per status value

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
4. Extract the plan-rune body (everything inside `{% spec %}...{% /spec %}` or `{% work %}...{% /work %}` etc.), discarding the outer tag.
5. Extract metadata from the outer tag's attributes (`status`, `tags`, `source`, etc.) for the header.
6. Compute the canonical URL from the file path.

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

- New rune schema in `plugins/plan/src/runes/plan-ref.ts`
- `Plugin.partialRoots` declaration with the auto-registered `plan` namespace
- Pipeline `register` hook: build the ID-to-filename index from the loaded plan files
- Pipeline `postProcess` hook (or transform-time resolution): replace `plan-ref` placeholders with rendered content
- CSS in `plugins/plan/styles/plan-ref.css`
- Status-badge styling per entity status (accepted, draft, in-progress, done, etc.) — palette aligns with the existing plan-runes status display

### Cross-plugin coordination

The plan-ref rune produces a Markdoc AST as part of the host page's render. That AST may include plan-plugin runes (`{% spec %}`, `{% work %}`, etc.) and arbitrary Markdoc content. The host page's transform pipeline must include the plan plugin's rune schemas — otherwise the embedded content fails to render.

**Resolution:** if the plan plugin is installed (which it must be for plan-ref to exist as a rune), its rune schemas are already in the pipeline. No additional coordination needed. The case "user has plan-ref but doesn't have plan-rune schemas" is impossible by construction.

-----

## Acceptance Criteria

- [ ] `{% plan-ref id="SPEC-023" /%}` renders the referenced spec's body content
- [ ] Plan plugin auto-registers a `plan:` partial root via `Plugin.partialRoots`
- [ ] Registered path is the configured plan directory (default `plan/`, configurable per refrakt config)
- [ ] If the plan directory doesn't exist, registration is silent (no build error at load time)
- [ ] ID-to-filename index is built at content-load time by scanning the plan directory
- [ ] Index handles all plan entity types: spec, work, bug, decision, milestone
- [ ] Filename convention `{ID}-{slug}.md` is parsed for IDs
- [ ] Milestone semver filenames (`v1.0.0.md`) are indexed by their semver name
- [ ] Duplicate IDs in the plan directory fail the index build with both filenames named
- [ ] Status badge in output reflects the entity's `status` attribute
- [ ] `data-status` on the badge enables per-status variant styling
- [ ] Canonical link points to the entity's site URL (`/plan/specs/SPEC-023` etc.)
- [ ] `data-plan-type` set on the wrapper reflects the entity type
- [ ] `level="full"` renders header + body
- [ ] `level="summary"` renders header only, applies `--level-summary` modifier
- [ ] Unknown ID fails the build with closest-match suggestions (Levenshtein ≤ 2)
- [ ] Cycle detection: a plan-ref pointing to a file that transitively re-embeds a previously-embedded ID fails the build with the cycle shown
- [ ] `{% ref %}` cross-references inside embedded content go through the standard host-page xref resolver ({% ref "SPEC-065" /%}); plan-ref does not pre-register the embedded entity into the host registry
- [ ] Plan-ref works in any host context (blog post, layout, drawer body, etc.) — not coupled to plan-section pages
- [ ] Composes with drawer (the motivating use case) — `{% drawer %}{% plan-ref %}{% /drawer %}` works end-to-end
- [ ] Plan-rune schemas are available when rendering embedded plan content (provided implicitly by the plan plugin being installed)
- [ ] CSS covers `.rf-plan-ref*` selectors with status-badge styling for each status value
- [ ] Authoring docs document the rune, the auto-registered `plan:` namespace, and the composition with drawer

-----

## Out of Scope

- **Cherry-picking sections of a plan entity** (e.g. "render only the Acceptance Criteria from SPEC-023"). Render full body or use `level="summary"`. Section-level extraction adds attribute surface for a use case that hasn't materialized.
- **Multi-entity refs** (`id="SPEC-023,SPEC-024"`). Use multiple `plan-ref` runes. Composable.
- **Backlinks / "where is this referenced?"** — showing all the places a plan entity is referenced from. Different concern; could be a future site-graph rune. Not in scope here.
- **Inline editing of referenced plan content** — the embedded view is read-only. Editing happens in the canonical plan file.
- **Rendering plan-ref content without the plan plugin runes** — if plan-ref is available, plan rune schemas are too (plan-ref ships in the plan plugin). No way to use one without the other.
- **Custom render templates per entity type** — header layout is the same regardless of type. Status semantics differ (a spec's `accepted` vs. a work item's `done`) but that's captured in the `data-status` attribute and styled per status, not per type.
- **Search / discovery UI for finding the right ID** — that's tooling around plan content, not a concern of this rune.
- **Caching: dedup rendering when the same ID is referenced multiple times on one page** — the file read is already memoized by the partial-roots resolver (per {% ref "SPEC-063" /%} caching). Re-parsing the same file twice in one page render is wasteful but not incorrect; defer optimization until profiling shows it matters.

-----

## Open Questions

**Should `level="summary"` use a different visual treatment than `level="full"`, or just omit the body?** Recommend just omit — same header, no body, smaller overall footprint. Visual differentiation comes from the absence of the body, not a different header style.

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
