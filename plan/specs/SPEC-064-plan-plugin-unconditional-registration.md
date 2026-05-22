{% spec id="SPEC-064" status="draft" tags="plan, plugins, registry, pipeline" source="SPEC-021" %}

# Plan plugin — unconditional entity registration

Extend the plan plugin's pipeline register hook to scan the configured plan directory at content-load time and register every plan entity into the `EntityRegistry`, regardless of whether plan files are part of the site content tree. Each registration includes the source file path and an extractor function — enough information for both xref (linking) and expand (inline substitution, see {% ref "SPEC-066" /%}) to operate uniformly via the registry.

This is the companion implementation work for the expand rune ({% ref "SPEC-066" /%}). expand needs every embeddable entity to be in the registry; for plan content that lives outside the site's content tree, the registry is empty today, so without this change expand can't function for plan IDs in projects that don't publish plan to their site.

## Problem

The plan plugin's existing `register` pipeline hook fires only for pages loaded into a site's content tree (`plugins/plan/src/pipeline.ts:208`). For each loaded plan page (e.g. a `.md` file inside `site/content/plan/specs/`), the hook reads the top-level plan rune and registers an entity.

This works for projects that publish plan content as part of their site — refrakt's docs site setup is *not* one of those; refrakt's own plan content lives in `plan/` at the project root, outside any site's content directory. As a result, refrakt's site registry contains zero plan entities, and `{% ref "SPEC-058" /%}` only works because we explicitly publish certain plan content separately. Most users of the plan plugin face the same gap.

Three concrete consequences:

- **xref to plan content from non-plan pages fails or falls through to patterns.** Without registry entries, refs go straight to the SPEC-065 pattern layer or render as unresolved. The registry can't help even when it logically could.
- **`{% expand "SPEC-023" /%}` from {% ref "SPEC-066" /%} can't function** — expand's primary lookup is the registry, and without registrations there's nothing to find.
- **Tooling that consults the registry** (the inspect machinery, future graph views, etc.) sees a partial picture.

The plan plugin already knows the answer to "what plan entities exist?" — it scans `plan.dir` from the top-level refrakt config (via `_planDir` plumbing at `plugins/plan/src/pipeline.ts:156`). The fix is to wire that scan into the register hook unconditionally.

-----

## Design Principles

**Plan content always registers, regardless of site membership.** The plan corpus is project-scoped data. Whether or not a particular site within the project happens to publish plan pages doesn't change the fact that the entities exist. The registry should reflect them either way.

**Site-published plan content still wins.** If a plan file *is* part of a site's content tree, the existing register-on-page-load path takes precedence — that registration has a real `sourceUrl` (the page's URL), enabling xref to produce a working local link. The unconditional-scan path provides registrations only for plan content that *isn't* otherwise registered.

**Registrations include both linking and embedding info.** Each registered plan entity gets:
- `sourceUrl` — set when plan content is also site content; undefined otherwise (xref falls through to SPEC-065 patterns).
- `sourceFile` — always set (project-root-relative path to the plan file).
- `extract` — always set (function returning the top-level plan rune AST node).

This means a single registration serves both xref (via `sourceUrl`-or-patterns) and expand (via `sourceFile` + `extract`).

**Silent no-op when no plan content exists.** Projects without a `plan/` directory shouldn't see any errors at content load. The plugin's scan returns empty; nothing is registered; xref and expand for plan IDs behave as if the plan plugin weren't installed at all (refs unresolved, expand fails with "entity not found").

**Light-touch on existing pipeline.** The scan happens once per content-load. Existing tests of the register hook (pages loaded as site content) continue to pass; new tests cover the unconditional-scan path.

-----

## Scan and Register

### When the scan runs

The plan plugin's `register` pipeline hook receives the host site's `pages` array. The hook now does two things:

1. **Existing behavior**: walk `pages` for plan runes and register those entities (with `sourceUrl` set to the page's URL).
2. **New behavior**: independently scan `plan.dir` (resolved via `_planDir`). For each `.md` file found:
   - If the file's resolved path corresponds to a page already processed in step 1 (the same plan file is *also* part of the site content), skip — step 1 already registered it.
   - Otherwise, parse the file, locate the top-level plan rune, extract metadata (ID, type, title, status, source, etc.), and register the entity with `sourceUrl: undefined`, `sourceFile: <relative-to-project-root>`, `extract: <function>`.

### Directory scan

`plan.dir` is resolved from the top-level refrakt config. The scan recursively walks the directory, picking up `.md` files in known subdirectories:

- `specs/` → entity type `spec`
- `work/` → entity type `work`
- `bug/` → entity type `bug`
- `decisions/` → entity type `decision`
- `milestones/` → entity type `milestone`

Filename convention from {% ref "SPEC-022" /%}:
- Auto-ID files: `{ID}-{slug}.md` (e.g. `SPEC-023-auth-system.md`)
- Milestone semver files: `v1.0.0.md`

Files that don't match either convention are skipped with a debug-level warning (not an error — accommodates user-authored auxiliary content in the plan directory).

### Extractor signature

```ts
const extract = (parsed: Markdoc.Node): Markdoc.Node | null => {
  // Locate the top-level plan rune node (Tag with name in
  // ["spec", "work", "bug", "decision", "milestone"]).
  // Return the tag itself (so expand substitutes the whole rune).
  // Return null if the file's structure has been edited away
  // from the expected shape.
};
```

The extractor is generated by the plan plugin per registration, closing over the entity's expected ID and type. Cached and reused if the same source file's extractor is called multiple times (unlikely for plan's 1:1 file-to-entity convention, but the caching is general from {% ref "SPEC-066" /%}).

### Conflict resolution

If both paths (site-load and unconditional-scan) would register the same `(type, id)`:

- **Same content**: the site-load registration is the canonical one. The unconditional-scan path detects via path comparison that the file is already represented and skips.
- **Different content** (same ID in two different files — which shouldn't happen but might if a user accidentally creates a duplicate): the plan plugin's existing duplicate-detection error fires at scan time, naming both file paths.

### Metadata population

Registration `data` field receives the plan entity's attributes from its rune declaration:

```ts
registry.register({
  id: 'SPEC-023',
  type: 'spec',
  sourceUrl: undefined,                                  // pattern fallback
  sourceFile: 'plan/specs/SPEC-023-auth-system.md',
  extract: <generated function>,
  data: {
    title: 'Auth system',                                // from H1
    status: 'accepted',                                  // from rune attribute
    tags: ['frameworks', 'adapters'],                    // from rune attribute (parsed)
    source: 'SPEC-058',                                  // from rune attribute
    created: '2026-01-15',                               // from $file.created
    modified: '2026-05-19',                              // from $file.modified
  },
});
```

`title` extraction uses the same first-H1 walk introduced in {% ref "SPEC-061" /%}.

-----

## Engine Changes

### `plugins/plan/src/pipeline.ts`

- Extend the `register` hook to perform the unconditional scan after processing site-loaded pages
- Add path-comparison logic to skip already-registered entities
- Generate per-entity extractor functions
- Wire `sourceFile` and `extract` fields into the registration call site

### `plugins/plan/src/scanner.ts` (or scanner-core.ts)

The existing scanner already enumerates plan files for other tooling (MCP resources, CLI). Likely the right place to extend with metadata-parsing for registration purposes, sharing parse work with whatever currently happens.

### `EntityRegistration` interface

If not already extended by {% ref "SPEC-066" /%}, add optional `sourceFile: string` and `extract: (parsed) => Markdoc.Node | null` fields. The plan plugin populates them; consumers (xref, expand) reach for them.

### Dev / HMR

When `plan.dir` changes during dev (file added/modified/removed), the content pipeline already re-runs (per existing plan-aware HMR). Confirm the unconditional-scan integrates cleanly: new plan files appear in the registry after the rebuild; deleted ones drop out.

-----

## Acceptance Criteria

- [ ] Plan plugin's `register` hook performs an unconditional scan of `plan.dir` after processing site-loaded pages
- [ ] All plan entities (spec, work, bug, decision, milestone) found in `plan.dir` are registered into the `EntityRegistry`
- [ ] Registrations include `sourceFile` (project-root-relative path) and `extract` (function returning the top-level plan rune AST or null)
- [ ] Registrations include the standard `data` fields (title, status, tags, source, created, modified)
- [ ] When a plan file is both in `plan.dir` and part of a site's content tree, the site-load registration wins (with real `sourceUrl`); the unconditional scan skips to avoid duplicate registration
- [ ] When `plan.dir` doesn't exist or is empty, the scan is a silent no-op (no error)
- [ ] Duplicate IDs across different plan files fail content load with both file paths named
- [ ] Files in `plan.dir` that don't match known subdirectories or filename conventions are skipped with a debug-level warning
- [ ] Existing register-hook tests for site-loaded plan content continue to pass
- [ ] New tests cover: unconditional scan registers entities; duplicate detection across paths; missing-directory silence
- [ ] `xref` for plan IDs in non-plan-publishing sites finds the entity in the registry; falls through to {% ref "SPEC-065" /%} patterns when `sourceUrl` is undefined
- [ ] `expand` ({% ref "SPEC-066" /%}) for plan IDs in non-plan-publishing sites finds the entity in the registry and substitutes its content
- [ ] Plan-rune schemas are unchanged — the registration path is the only change

-----

## Out of Scope

- **Scanning plan content from external sources** (HTTP, git submodules in different repos, third-party hosts like trace). File system scan of the local `plan.dir` only.
- **Custom plan-content directories per site** in a multi-site monorepo. One project-level `plan.dir`; if separate sites need separate plan corpora, that's a future configuration option.
- **The `expand` rune itself.** This spec covers the registration work; the rune lives in {% ref "SPEC-066" /%}.
- **Synthetic / virtual entity registrations** (entities defined inline in refrakt config rather than backed by files). Out of scope; if needed, separate spec.
- **Live cross-host registration** (e.g. fetching the registry from a remote refrakt project). File-system scan only.
- **Persistence across builds** (caching the parse results to disk). Per-build re-scan; the existing plan-history cache is a precedent for if we ever want this, but not in scope here.

-----

## Open Questions

**Should the unconditional scan run for every site in a multi-site project, or once globally?** Recommend once globally — the plan corpus is project-scoped, not site-scoped. Each site's pipeline gets the same registry contributions for plan entities. Implementation: the plan plugin's pipeline hook is per-site today; the scan would either dedup across sites or move out of the per-site hook into a project-load phase. Defer the implementation detail until we're building.

**What happens to a plan file with no valid top-level plan rune** (e.g. someone authored a `.md` file in `plan/specs/` with just prose, no `{% spec %}` wrapper)? Recommend: skip with a content-load warning naming the file. Not a fatal error because the file might be intentional auxiliary content (a README, an index page).

**Cross-plugin coordination — does this work make plan entities visible to other plugins** that might consume the registry? Yes, by construction. If a future plugin wants to "show all plan entities that mention this character," it consults the registry the same way everything else does. Good outcome.

**Heading-extraction caching.** The unconditional scan parses every plan file at content load. The expand resolver in {% ref "SPEC-066" /%} also parses files (cached per build). Can we share the cache? Probably yes — the scan parses to extract title and metadata; expand parses to extract the rune subtree. Same parse output; we can deposit it in the shared file-content cache.

**What about plan files added during a watch session?** HMR should pick up the new file via the standard content-pipeline watcher. Worth confirming during implementation that `plan.dir` is watched (it probably is via `_planDir` already, but check the SvelteKit Vite plugin and Eleventy adapter paths).

**Should `extract` errors be surfaced eagerly** (at scan time) or lazily (when something tries to expand)? Recommend lazy — scan-time errors would block content load for files that nothing actually references. Lazy means a malformed plan file is silently registered but fails when first expanded. The expand error message is clear enough to debug from.

-----

## References

- {% ref "SPEC-021" /%} — plan runes (the rune definitions whose entities this spec registers)
- {% ref "SPEC-022" /%} — plan CLI (filename conventions parsed by the scanner)
- {% ref "SPEC-066" /%} — expand rune (primary consumer of the `sourceFile` + `extract` registration fields)
- {% ref "SPEC-065" /%} — configurable xref resolution (used when `sourceUrl` is undefined)
- {% ref "SPEC-061" /%} — page variables ($file.created / $file.modified, source of the entity timestamps)
- `plugins/plan/src/pipeline.ts:156` — `_planDir` plumbing
- `plugins/plan/src/pipeline.ts:208` — existing `register` hook to extend
- `plugins/plan/src/scanner.ts` — existing file enumeration logic to share

{% /spec %}
