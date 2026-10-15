{% spec id="SPEC-172" status="draft" tags="git, history, plugins, data-source, plan, architecture" %}

# Repository history as a data source, and a repository plugin

## Summary

A direction, recorded so it is not lost; not a plan to build. `plan-history` was written quickly
for one purpose, and whether it should exist long-term is open. Looking at what it does showed
that most of it is not plan-specific: it reads repository history and describes how a page
changed. This spec separates the parts, says where each belongs, and names what would have to
happen before any of it is built.

## What exists

**Three git readers.** Each runs its own `execSync`, with its own shallow-clone check:

| Reader | Purpose |
|---|---|
| `packages/content/src/timestamps.ts` | `created` and `modified` dates for every page |
| `packages/content/src/edges/git-scan.ts` | {% ref "SPEC-136" /%}'s stale-content detection |
| `plugins/plan/src/history.ts` (460 lines) | `plan-history`'s per-file commit lists and snapshots |

**What `plan-history` does.** The rune (`plugins/plan/src/tags/plan-history.ts`) only places a
marker. The work is elsewhere:

1. **Reading:** one `git log` over the plan directory, cached in the plan cache file, then
   `git show <hash>:<file>` for each commit that touched an entity file.
2. **Interpreting:** each version is compared with the previous one, producing typed events:
   `created`, `attributes` (the rune tag's attributes on the file's first line, such as
   `status`), `criteria` (acceptance-criteria checkboxes checked or unchecked), `resolution`
   (a `## Resolution` section appeared) and `content`.
3. **Rendering:** a post-process hook (`resolvePlanHistory`, `plugins/plan/src/pipeline.ts:910`)
   builds an `<ol>` with hard-coded `rf-plan-history__*` classes, per entity or as a
   site-wide feed grouped by commit, with commit links from `git remote get-url origin`.

Two of its attributes do nothing ({% ref "BUG-039" /%}).

**How much is plan-specific:**

| `plan-history` event | General form |
|---|---|
| attribute changes on the rune tag | changes to any registered entity's data, such as a `character`'s `status` or an `event`'s date |
| criteria checked or unchecked | checklist changes; task-list markers are core (the engine detects them on every `<li>`) |
| a `## Resolution` section appeared | a named section added or removed |
| `created`, `content` | plain commit facts |

What is left for plan alone is which entity types to show and plan's file layout.

## The direction

### 1. One history service in core

Core already depends on git for page timestamps and stale edges. One service in the content
pipeline would replace the three readers:

- per-file commit lists (hash, date, author name, message) and the repository URL;
- one cache for every consumer;
- an explicit result for "no history": no repository, a shallow clone, or a file not yet
  committed. Never an empty list that looks complete.

This is worth doing on its own, whatever happens to the rest.

### 2. A plugin for presenting history

The runes belong in an opt-in plugin, called `repository` rather than `git`, because links to
commits, "edit this page" and contributor profiles depend on the host (GitHub, GitLab, Forgejo)
and on configuration, which core should not carry. Installing it makes the dependency on a
repository checkout visible.

Following {% ref "ADR-044" /%}'s tiers:

**A data source, not a rune.** The plugin registers commits, per-page changes and authors as
records that core's `collection` can query, as plan's views already lower to `collection` and
`aggregate` ({% ref "SPEC-152" /%}). Change extraction (entity data, checklists, sections) lives
here, generalised from `plan-history`'s.

**Two primitives:**

- `{% commit sha="…" /%}`: an inline value element ({% ref "SPEC-166" /%}). The short hash
  links to the host, the full hash is kept as data, and an unknown hash reports
  `commit-invalid`. Changelogs and plan resolutions that cite commits as plain text could use it.
- `{% activity %}`: a commit-frequency heatmap or sparkline. The one new visual, so tier 3, with
  token-only CSS.

**Compositions** over `collection` and the shared vocabulary (`date`, `badge`, the ladder,
`deflist`):

| Rune | Shows |
|---|---|
| `last-updated` | inline: the page's `modified` date, a commit link, optionally "edit this page" |
| `page-history` | this page's changes, newest first |
| `recent-changes` | a site-wide feed, filtered by path or entity type, grouped by commit or by page |
| `contributors` | the authors of a page or of the site |
| `releases` | tags with dates, which `changelog` could read instead of hand-written version headings |

**`plan-history` would then not need to exist on its own.** It is `page-history` or
`recent-changes` filtered to plan entities: sugar in the plan plugin, like the other four plan
views, or nothing.

### 3. Rules any of this holds to

- **Build time only.** No host API calls by default (avatars, pull-request titles); they need
  network access and tokens. If added, they are opt-in and cached.
- **Honest absence.** Without history, the runes say so visibly and the build warns.
- **Privacy.** Author names only, never email addresses; `.mailmap` is respected.
- **Accepted non-reproducibility.** The same commit can build differently from two clones. That
  is already true of `modified`, so it is a known property, not a new one.

**Not proposed:** blame, diffs between arbitrary revisions (core's `diff` covers authored
diffs), branch lists. None is a content concern.

## What would trigger this

- **The core service** needs no trigger beyond a convenient moment: it removes duplication.
- **The plugin** waits for a second real consumer beyond plan. "Last updated" on documentation
  pages is the likely one, since core already computes `modified` for every page.
- **Until then**, `plan-history` gets only BUG-039's fix and no further investment.

This revisits {% ref "SPEC-152" /%} D5, which kept `plan-history` out of scope as
"domain-appropriate". It is still not a composition candidate, but most of it is a general
capability filed in the plan plugin.

## Acceptance Criteria

- [ ] One core history service replaces the readers in `timestamps.ts`, `edges/git-scan.ts` and `plugins/plan/src/history.ts`, with one cache and one shallow-clone check, and reports "no history" explicitly
- [ ] `created` and `modified` dates and the stale-edge scan produce the same results through the service, asserted against current fixtures
- [ ] A decision is recorded on whether to build the repository plugin, with the consumer that triggered it
- [ ] `plan-history`'s future is decided: kept as sugar over the plugin's runes, or removed

## References

- {% ref "BUG-039" /%}: `plan-history`'s dead attributes.
- {% ref "SPEC-152" /%} D3, D5: the plan views as sugar, and `plan-history` kept out of scope.
- {% ref "SPEC-136" /%}: stale-content edges, the second git reader.
- {% ref "SPEC-166" /%}: value elements, which `commit` would follow.
- {% ref "ADR-044" /%}: plugin tiers.

{% /spec %}
