{% spec id="SPEC-038" status="draft" version="1.0" tags="plan, cli, git, history, site" %}

# Git-Native Entity History

> Derive structured lifecycle timelines for plan entities from git history — attribute transitions, criteria progress, and resolution events — surfaced through the CLI and as a site rune.

-----

## Problem

Plan entities live as Markdown files in git. Every status transition, priority change, and checked criterion is a commit. But the system doesn't expose this history. The `plan-activity` rune shows when files were last modified. The `plan status` CLI shows current state. Neither answers the questions people actually ask:

- When did this item move from ready to in-progress?
- Who changed the priority, and in what commit?
- Which acceptance criteria were checked off last, and when?
- What happened across the project this week?

Other issue trackers (Jira, Linear, GitHub Issues) maintain activity logs, but theirs are opaque database records — you can't verify them, you can't see what else changed in the same operation, and you can't correlate changes across entities that moved together. Git history is richer: every change has a commit hash, an author, a message explaining why, and a full diff showing what else happened alongside it.

The data is already there. The system just doesn't read it.

-----

## Design Principles

**Git is the source of truth.** No separate activity log, no event table, no additional state to maintain or sync. History is derived from git commits by diffing consecutive versions of each entity file. If git says it happened, it happened. If git doesn't, it didn't.

**Structured events, not raw diffs.** A `git log -p` dump is not useful to anyone. The system parses diffs into typed events: "status changed from draft to ready", "criterion 'Unit tests passing' checked", "resolution recorded with branch claude/feature-x". The output is a timeline of meaningful project events.

**Commit messages are first-class context.** In most trackers, the "why" behind a change is lost or buried in a comment. Here, the commit message is directly associated with every event. "Accept SPEC-037 and break into work items" tells you why the status changed — no separate annotation needed.

**Cross-entity correlation is natural.** When a single commit touches 5 work items and a spec, that's visible. The global history feed groups events by commit, showing atomic operations as atomic operations. This is information that database-backed trackers structurally cannot surface.

-----

## Event Model

### Event types

Every history event has a commit hash, date, author, and commit message. The `kind` field distinguishes what changed:

| Kind | Meaning | Example |
|------|---------|---------|
| `created` | Entity file first appeared | File added in commit |
| `attributes` | One or more tag attributes changed | `status: draft → ready`, `priority: medium → high` |
| `criteria` | Acceptance criteria checkboxes changed | `☑ "Unit tests passing"`, `☐ "API endpoint created"` (unchecked) |
| `resolution` | A `## Resolution` section was added or modified | Resolution recorded with branch and PR metadata |
| `content` | File changed but no attribute/criteria/resolution diff detected | Body text edited, sections added |

### Attribute changes

Extracted by parsing the opening Markdoc tag (always line 1) at consecutive commits and diffing the attribute maps:

```typescript
interface AttributeChange {
  field: string;        // "status", "priority", "source", "assignee", etc.
  from: string | null;  // null = attribute was added
  to: string | null;    // null = attribute was removed
}
```

All plan entity attributes are on a single line, making extraction reliable — a simple regex parse of line 1 at each commit version.

### Criteria changes

Extracted by collecting `- [ ]` and `- [x]` lines from consecutive commits and diffing them:

```typescript
interface CriteriaChange {
  text: string;                                     // criterion text (trimmed)
  action: 'checked' | 'unchecked' | 'added' | 'removed';
}
```

Text matching is used to correlate criteria across commits. If criterion text is reworded, it appears as a remove + add pair — acceptable since rewording criteria is a meaningful change.

### Resolution events

Detected by the appearance or modification of a `## Resolution` section. The existing scanner already parses `Completed:`, `Branch:`, and `PR:` metadata lines from resolution sections — the same parser is reused.

### Content events

A fallback for commits that changed the file but produced no attribute, criteria, or resolution diffs. These are body edits — added sections, rewritten descriptions, ref tag conversions. The event is recorded with the commit metadata but no structured diff detail. The commit message provides the context.

-----

## Data Extraction

### Per-entity extraction

For a single entity file, the extraction algorithm:

1. Run `git log --follow --format="%H %aI %aN" -- <filepath>` to get the ordered commit list
2. For each commit hash, run `git show <hash>:<filepath>` to get the file contents at that point
3. From each version, extract:
   - Opening tag attributes (line 1 regex parse)
   - Checkbox lines (`- [ ] text` and `- [x] text`)
   - Whether a `## Resolution` section exists (and its metadata if so)
4. Walk commits from oldest to newest, diffing consecutive snapshots
5. Emit typed `HistoryEvent` objects

This is the approach used by the CLI `plan history` command. For a file with N commits, it requires 1 `git log` call + N `git show` calls. At typical scales (2–10 commits per file), this completes in well under a second.

### Batch extraction

For the site build and global CLI feeds, extracting history for all entities:

1. Run `git log --format="%H %aI %aN %s" --name-only -- <plan-dir>` to get all commits with affected file lists in a single call
2. Group commits by file path
3. For files with more than one commit, run the per-entity extraction
4. For files with exactly one commit, emit a single `created` event
5. Merge all events into a unified timeline, sorted by date

### Caching

The `.plan-cache.json` file already stores per-entity data keyed by file mtime. History extraction results can be cached alongside this data, keyed by the latest commit hash for each file. Cache invalidation is exact: if the latest commit hash hasn't changed, the history hasn't changed.

Cache structure per entity:

```typescript
interface HistoryCacheEntry {
  latestCommit: string;            // hash of most recent commit touching this file
  events: HistoryEvent[];          // extracted events, oldest first
}
```

The cache is populated lazily (CLI: on first `plan history` call) or eagerly (site build: during the aggregate phase). Subsequent runs skip files whose latest commit hash matches the cache.

### Shallow clone handling

The existing `getGitTimestamps()` utility in `@refrakt-md/content` already detects shallow clones via `git rev-parse --is-shallow-repository`. History extraction should follow the same pattern: in shallow clones, emit only events for available commits and mark the timeline as potentially incomplete. The CLI should warn; the site rune should display a note.

-----

## CLI: `plan history`

### Single-entity mode

```bash
npx refrakt plan history WORK-024
```

Output:

```
WORK-024: Add knownSections to content model framework

Apr 12  status: ready → done                              a295513
        ☑ knownSections supported in the content model framework
        ☑ Work rune declares known sections with aliases
        ☑ Bug rune declares known sections with aliases
        ☑ Decision rune declares known sections with aliases
        ☑ Alias matching is case-insensitive
        ☑ Unknown sections still pass through via sectionModel fallback
        ☑ Validation warns on missing required sections
        ☑ Tests for alias resolution and fallback behaviour
Apr 12  status: blocked → ready                            1676387
        priority: low → medium
        source: +SPEC-037
Apr 10  source: +SPEC-003, +SPEC-021                       f262d7b
Apr 08  Created (blocked, low, moderate)                   da12420
```

Events are displayed newest-first (reverse chronological). Each event shows the date, the structured changes, and the short commit hash. Sub-changes within an event (multiple attributes changed, multiple criteria checked) are indented under the date line.

### Global mode

```bash
npx refrakt plan history --limit 20
```

Shows recent events across all entities, grouped by commit when multiple entities change in the same commit:

```
Apr 12  a295513  Mark all SPEC-037 work items done
        WORK-024  status: ready → done  (☑ 8/8 criteria)
        WORK-127  status: ready → done  (☑ 3/3 criteria)
        WORK-128  status: ready → done  (☑ 4/4 criteria)
        WORK-129  status: ready → done  (☑ 3/3 criteria)
        WORK-130  status: ready → done  (☑ 2/2 criteria)
        WORK-131  status: ready → done  (☑ 5/5 criteria)

Apr 12  1676387  Accept SPEC-037 and break into work items
        SPEC-037  status: draft → accepted
        WORK-024  status: blocked → ready, priority: low → medium
        WORK-127  Created (ready, high, simple)
        WORK-128  Created (ready, medium, simple)
        WORK-129  Created (ready, medium, moderate)
        WORK-130  Created (ready, low, trivial)
        WORK-131  Created (ready, medium, simple)
```

The commit-grouped format shows atomic operations as single entries. This is a direct advantage of the git-native approach — you can see that a spec was accepted and 5 work items were created in one operation, because that's how it actually happened.

### Filters

```bash
# Filter by time
npx refrakt plan history --since 7d
npx refrakt plan history --since 2026-04-01

# Filter by entity type
npx refrakt plan history --type work
npx refrakt plan history --type spec,decision

# Filter by author
npx refrakt plan history --author claude

# Filter by specific status transitions
npx refrakt plan history --status done          # show items that became "done"

# Combine filters
npx refrakt plan history --since 7d --type work --status done --limit 50

# JSON output
npx refrakt plan history WORK-024 --format json
npx refrakt plan history --since 7d --format json
```

The `--since` filter maps directly to `git log --since`, so it's efficient — git does the filtering, not the application. The `--type`, `--author`, and `--status` filters are applied post-extraction.

-----

## Site Rune: `plan-history`

### Per-entity mode

```markdoc
{% plan-history id="WORK-024" /%}
```

Renders a vertical timeline for a single entity. Each event is a list item showing the date, change summary, and commit hash (linked if a repository URL is configured). Criteria changes are rendered as a compact checklist diff. Attribute changes show `field: old → new` with appropriate styling.

### Global feed mode

```markdoc
{% plan-history limit=20 /%}
{% plan-history limit=10 type="work" /%}
{% plan-history since="7d" /%}
```

Renders a commit-grouped activity feed. Each commit is a section showing the date, commit message, and a list of entity changes within that commit. Entities that changed together are visually grouped.

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | String | — | Entity ID for single-entity mode. Omit for global feed. |
| `limit` | Number | `20` | Maximum number of events (per-entity) or commits (global) to show |
| `type` | String | `"all"` | Entity type filter: `work`, `bug`, `spec`, `decision`, or comma-separated |
| `since` | String | — | Time filter: `"7d"`, `"30d"`, or ISO date. Maps to git `--since`. |
| `group` | String | `"commit"` | Global mode grouping: `commit` (group by commit) or `entity` (group by entity) |

### Auto-injection

Like the auto-relationships-section in the existing `postProcess` hook, entity pages can optionally receive an auto-injected History section. This is controlled by a package-level configuration flag rather than a per-entity attribute — history is either on for all entities or off.

When enabled, the postProcess hook appends a "History" section after the existing auto-relationships section, using the per-entity timeline format. The section is omitted for entities with only a single commit (created and never modified) to avoid noise.

### Implementation pattern

The rune follows the established self-closing aggregation rune pattern:

1. **Tag definition** (`tags/plan-history.ts`): `selfClosing: true`, stores parameters as meta tags, emits a sentinel marker and empty placeholder
2. **Aggregate hook extension**: History data is extracted during the aggregate phase and included in `PlanAggregatedData`
3. **PostProcess resolution**: Detects the sentinel, reads parameters, builds the timeline HTML from cached history data, replaces the placeholder

-----

## Rendering

### Per-entity timeline

```
┌─ Apr 12 ─────────────────────────────────── a295513 ─┐
│  status: ready → done                                 │
│  ☑ knownSections supported in content model framework │
│  ☑ Work rune declares known sections with aliases     │
│  ☑ Bug rune declares known sections with aliases      │
│  … (+5 more criteria)                                 │
├─ Apr 12 ─────────────────────────────────── 1676387 ─┤
│  status: blocked → ready                              │
│  priority: low → medium                               │
│  source: +SPEC-037                                    │
├─ Apr 10 ─────────────────────────────────── f262d7b ─┤
│  source: +SPEC-003, +SPEC-021                         │
├─ Apr 08 ─────────────────────────────────── da12420 ─┤
│  Created (blocked, low, moderate)                     │
└───────────────────────────────────────────────────────┘
```

BEM structure: `.rf-plan-history`, `.rf-plan-history__event`, `.rf-plan-history__date`, `.rf-plan-history__hash`, `.rf-plan-history__change`, `.rf-plan-history__criteria`.

Status transition changes use the existing sentiment colour system — `done` gets positive styling, `blocked` gets negative, transitions show the "to" sentiment.

When more than 3 criteria change in a single event, the list is collapsed with a "+N more criteria" summary to keep timelines compact. The collapsed items are still present in the DOM for accessibility.

### Global feed (commit-grouped)

```
┌─ Apr 12 ─── a295513 ─────────────────────────────────┐
│  Mark all SPEC-037 work items done                    │
│                                                       │
│  WORK-024  status: ready → done  (☑ 8/8)             │
│  WORK-127  status: ready → done  (☑ 3/3)             │
│  WORK-128  status: ready → done  (☑ 4/4)             │
│  … (+3 more entities)                                 │
├─ Apr 12 ─── 1676387 ─────────────────────────────────┤
│  Accept SPEC-037 and break into work items            │
│                                                       │
│  SPEC-037  status: draft → accepted                   │
│  WORK-024  status: blocked → ready                    │
│  WORK-127  Created (ready, high, simple)              │
│  … (+3 more entities)                                 │
└───────────────────────────────────────────────────────┘
```

BEM structure: `.rf-plan-history--global`, `.rf-plan-history__commit`, `.rf-plan-history__commit-message`, `.rf-plan-history__entity-group`.

Entity IDs in the global feed link to the entity's page when source URLs are available.

-----

## Open Questions

### 1. Criteria collapse threshold

When an event checks off many criteria (e.g., 8 at once), how many should display before collapsing? Proposed: show first 3, collapse the rest with "+N more". But for entities with exactly 4–5 criteria total, collapsing feels wrong — all of them matter. Alternative: collapse at >5, or don't collapse at all in per-entity mode (only collapse in global feed where space is tighter).

### 2. Content-only event visibility

When a file changes but no attributes or criteria changed (body edits, ref tag conversions, section rewrites), should the `content` event appear in the timeline? Arguments for: completeness, every commit is visible. Arguments against: noise — "Backfill source attributes on all 123 work items" might produce 120 `content` events for files where only `source=` was added (which IS captured as an attribute change) plus others that only had body ref conversions.

Proposed: show `content` events in per-entity mode (where completeness matters) but omit them from the global feed (where they're noise). The `--all` CLI flag could override this.

### 3. Repository URL configuration

Commit hashes in the site rune should link to the commit on the hosting platform (e.g., `https://github.com/org/repo/commit/abc1234`). Where does the repository URL come from? Options:
- `git remote get-url origin` (parsed at build time)
- A `repository` field in `refrakt.config.json`
- A `repo` attribute on the `plan-history` rune itself

Proposed: parse from `git remote` with config override. This matches how most tools handle it.

### 4. Rename/move tracking

`git log --follow` tracks file renames. If a work item file is renamed (e.g., fixing a typo in the filename), should the history include pre-rename commits? Proposed: yes, always use `--follow`. The rename itself is not surfaced as an event — it's a filesystem concern, not a project management one.

{% /spec %}
