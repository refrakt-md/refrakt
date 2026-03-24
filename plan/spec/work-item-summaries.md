{% spec id="SPEC-027" status="draft" version="1.0" tags="plan, cli, ai-workflow" %}

# Work Item Resolution Summaries

> When a work item or bug is completed, append a structured Resolution section capturing what was done, linking to branches/PRs, and recording implementation notes. Designed for agent workflows where the completing agent's context is lost after the session ends.

## Problem

When an AI agent completes a work item, the session ends and the context is gone. The work item file records *what was requested* (acceptance criteria, approach) but not *what actually happened*. A future agent picking up a related task has no way to know:

- Which files were changed
- What branch or PR contains the work
- What design decisions were made during implementation
- What tradeoffs or caveats exist
- Whether the approach diverged from what was planned

This information currently lives nowhere — it evaporates when the session closes.

Human developers face the same gap. A PR description captures some of this, but PRs get merged and buried. The work item is the natural long-term home for resolution context because it's already the canonical record of the task.

-----

## Design Principles

**Append-only.** The resolution section is added when the work item is completed. It does not modify existing sections (Summary, Acceptance Criteria, Approach). The original intent is preserved alongside the actual outcome.

**Narrative over structured data.** The primary value is prose context that a future agent or human can read and understand. Branch and PR links are useful but secondary — the "What was done" and "Notes" subsections carry the most signal.

**Minimal schema.** Resist the temptation to make branch/PR into formal typed attributes on the rune tag. The value is narrative context for future readers, not structured querying. If querying becomes important later, the scanner can parse the section.

**Automatic timestamp.** The CLI injects a completion date automatically. This provides useful signal when multiple work items are completed in a burst, without requiring the agent to supply it.

**Optional but encouraged.** The resolution section is not required to mark an item as `done`. Some items are trivial and don't warrant a summary. But for any non-trivial work, the completing agent should provide one.

-----

## Resolution Section Format

The resolution is appended as a `## Resolution` H2 section before the closing `{% /work %}` or `{% /bug %}` tag. It uses a consistent structure with optional subsections:

```markdown
## Resolution

Completed: 2026-03-24

Branch: `claude/feature-name-abc123`
PR: refrakt-md/refrakt#142

### What was done
- Added `createFoo()` utility in `packages/runes/src/foo.ts`
- Updated config in `packages/runes/src/config.ts` to register new block
- CSS coverage tests passing

### Notes
- Chose approach X over Y because of Z
- Left `legacyFoo` in place — still referenced by the docs package
```

### Field definitions

| Field | Required | Description |
|-------|----------|-------------|
| `Completed` | Auto-injected | ISO date when the resolution was recorded. Injected by the CLI, not supplied by the user. |
| `Branch` | Optional | Git branch name, formatted as inline code. |
| `PR` | Optional | Pull request reference in `owner/repo#number` format. |
| `### What was done` | Recommended | Bullet list of concrete changes. Files modified, features added, tests written. |
| `### Notes` | Optional | Implementation decisions, tradeoffs, caveats, deviations from the planned approach. |

### Flexibility

The format above is a convention, not a rigid schema. Agents and humans may include additional subsections or omit optional ones. The scanner extracts what it can and ignores the rest. A minimal resolution might be just:

```markdown
## Resolution

Completed: 2026-03-24

Trivial config fix — added missing `block` field to the `hint` rune config.
```

-----

## CLI Integration

### `--resolve` flag on `update`

Extend `refrakt plan update` with a `--resolve` option that appends the Resolution section:

```bash
refrakt plan update WORK-070 --status done --resolve "$(cat <<'EOF'
Branch: `claude/feature-xyz`
PR: refrakt-md/refrakt#142

### What was done
- Implemented X, Y, Z

### Notes
- Chose A over B for performance reasons
EOF
)"
```

**Behaviour:**

1. Accepts a string containing the resolution body (everything after `## Resolution` and the timestamp)
2. Automatically prepends `Completed: <today's date>` as the first line
3. Inserts the full `## Resolution` block before the closing rune tag (`{% /work %}` or `{% /bug %}`)
4. If a `## Resolution` section already exists, appends to it with a separator (`---`) rather than replacing — supports incremental updates
5. Can be combined with other flags: `--status done --resolve "..."` performs both the status change and the resolution append atomically

**Standalone usage** (resolve without changing status):

```bash
refrakt plan update WORK-070 --resolve "Added branch link: \`claude/feature-xyz\`"
```

This supports adding resolution details incrementally during `in-progress` work, not only at completion.

### `--resolve-file` alternative

For longer resolutions, accept a file path:

```bash
refrakt plan update WORK-070 --status done --resolve-file ./resolution.md
```

Reads the resolution body from the file. Useful when the resolution is generated programmatically or is too long for a shell argument.

-----

## Scanner Integration

Extend the `PlanEntity` interface to expose resolution data:

```typescript
interface PlanEntity {
  // ... existing fields ...
  resolution?: {
    date?: string;          // ISO date from "Completed:" line
    branch?: string;        // branch name from "Branch:" line
    pr?: string;            // PR reference from "PR:" line
    body: string;           // full resolution section content
  };
}
```

The scanner extracts these fields from the `## Resolution` section using simple line-prefix matching:
- `Completed: <date>` → `resolution.date`
- `Branch: <value>` → `resolution.branch` (strips backticks)
- `PR: <value>` → `resolution.pr`
- Everything else → `resolution.body`

This enables downstream tooling (dashboard, status command, JSON export) to display resolution metadata without parsing free-form text.

-----

## Display in Dashboard and Status

### `plan status`

Completed items with resolutions show a brief indicator:

```
  Done (recent):
    WORK-070  Add gallery rune          2026-03-24  → #142
    WORK-068  Fix tint bleed            2026-03-23  → #139
```

### `plan serve` / entity page

The Resolution section renders as a styled block below the Acceptance Criteria, visually distinct (muted background, timestamp badge). Branch and PR values render as links when recognisable patterns are detected.

-----

## Agent Workflow Integration

The recommended agent workflow from SPEC-022 gains one additional step:

```bash
# 1. Agent finds next item
refrakt plan next --format json

# 2. Agent starts work
refrakt plan update WORK-070 --status in-progress

# 3. Agent reads specs, implements changes, checks off criteria
refrakt plan update WORK-070 --check "Schema validates"

# 4. Agent commits and pushes to branch, optionally opens PR

# 5. Agent completes with resolution summary ← NEW
refrakt plan update WORK-070 --status done --resolve "$(cat <<'EOF'
Branch: `claude/gallery-rune-abc123`
PR: refrakt-md/refrakt#142

### What was done
- Added gallery schema in packages/runes/src/tags/gallery.ts
- Engine config with grid modifiers in packages/runes/src/config.ts
- CSS in packages/lumina/styles/runes/gallery.css
- 12 tests covering all layout variants

### Notes
- Used CSS grid instead of flexbox for the masonry variant
- Deferred lightbox behavior to a follow-up work item
EOF
)"
```

### CLAUDE.md update

The `plan init` command should include resolution guidance in the CLAUDE.md workflow section it generates. The key instruction: **when marking a work item done, always provide a `--resolve` summary unless the change is trivial.**

-----

## Validation

### `plan validate` checks

| Check | Severity | Description |
|-------|----------|-------------|
| Done without resolution | Info | Work item marked `done` with no Resolution section. Not an error, but surfaced as an informational note. |
| Resolution on non-terminal item | Warning | Resolution section exists but status is not `done`/`fixed`. May indicate forgotten status update. |
| Multiple Resolution sections | Warning | More than one `## Resolution` heading in the same file. |

-----

## What This Is Not

- **Not a changelog generator.** Resolution summaries are per-work-item context, not user-facing release notes. Changelogs are derived from changesets (see RELEASING.md).
- **Not a replacement for PR descriptions.** PRs serve a review function. Resolutions serve a historical context function. They may overlap in content but serve different audiences and timelines.
- **Not required for completion.** Trivial items can be marked `done` without a resolution. The system encourages but does not enforce.

-----

## References

- {% ref "SPEC-022" /%} — Plan CLI (update command, agent workflow)
- {% ref "WORK-030" /%} — `plan update` command implementation

{% /spec %}
