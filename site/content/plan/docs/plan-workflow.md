---
title: Workflow
description: The day-to-day cycle of creating, prioritizing, and completing plan entities
---

# Workflow

Plan follows a straightforward cycle: create entities, find the next thing to work on, track progress through acceptance criteria, and mark items done with a resolution summary.

## 1. Create entities

```shell
# Scaffold a new spec (ID auto-assigned)
npx refrakt plan create spec --title "Authentication system"

# Create a work item linked to a spec
npx refrakt plan create work --title "Implement login flow" --source SPEC-001 --priority high

# Report a bug
npx refrakt plan create bug --title "Login crashes on empty password" --severity major

# Record a decision
npx refrakt plan create decision --title "Use JWT for auth tokens"

# Define a milestone (requires explicit ID)
npx refrakt plan create milestone --id v1.0.0 --title "Initial release"
```

Each command creates a `.md` file in the appropriate `plan/` subdirectory with the correct frontmatter and boilerplate sections. Edit the file to add detail — acceptance criteria, approach notes, context.

## Writing acceptance criteria

Acceptance criteria must use Markdown checkbox syntax (`- [ ]`) to be trackable by the CLI. When you use `--check`, the text must match the criterion exactly (excluding the checkbox prefix).

```markdown
## Acceptance Criteria

- [ ] Login form validates email format
- [ ] Error message shown on invalid credentials
- [ ] JWT token stored in httpOnly cookie
```

Plain-text bullet points without checkboxes are ignored by `--check` / `--uncheck`.

## Declaring dependencies

List dependencies in a `## Dependencies` section using entity ID references. Each dependency is a bullet point starting with the entity ID:

```markdown
## Dependencies

- WORK-003 — Auth API endpoint must exist
- SPEC-001 — Auth spec must be accepted
```

The CLI resolves these references during `plan next` — an item is only actionable when all dependencies have reached a terminal status (`done` for work, `fixed` for bugs, `accepted` for specs/decisions, `complete` for milestones). `plan validate` catches broken references (IDs that don't match any entity).

## Setting complexity

Work items support a `complexity` attribute to help with estimation and prioritization:

```shell
npx refrakt plan create work --title "Add search" --complexity moderate
npx refrakt plan update WORK-042 --complexity complex
```

**Values:** `trivial`, `simple`, `moderate`, `complex`, `unknown` (default: `unknown`). `plan next` does not factor complexity into ordering, but it can be useful for filtering and reporting.

## 2. Find the next work item

```shell
npx refrakt plan next
```

This returns the highest-priority actionable item. An item is actionable when:
- Its status is `ready` (work) or `confirmed` (bug)
- All items listed in its `## Dependencies` section are complete

Filter by milestone, tag, or assignee:

```shell
npx refrakt plan next --milestone v1.0.0
npx refrakt plan next --tag auth
npx refrakt plan next --count 5    # show top 5
```

## 3. Start working

```shell
npx refrakt plan update WORK-042 --status in-progress
```

Optionally assign it:

```shell
npx refrakt plan update WORK-042 --status in-progress --assignee "alice"
```

## 4. Check off acceptance criteria

As you complete each criterion, check it off individually:

```shell
npx refrakt plan update WORK-042 --check "Login form validates email format"
npx refrakt plan update WORK-042 --check "Error message shown on invalid credentials"
```

The criterion text must match exactly what's in the `## Acceptance Criteria` section.

## 5. Mark it done

When all criteria are met, mark the item done with a resolution summary:

```shell
# Inline resolution
npx refrakt plan update WORK-042 --status done --resolve "Implemented in PR #123"

# Multi-line resolution from heredoc
npx refrakt plan update WORK-042 --status done --resolve "$(cat <<'EOF'
Completed: 2026-04-15
Branch: feature/login-flow
PR: #123

- Added login form component with email validation
- Integrated JWT auth endpoint
- Added error handling for invalid credentials
EOF
)"

# Resolution from file (useful for longer summaries)
npx refrakt plan update WORK-042 --status done --resolve-file resolution.md
```

The resolution summary is appended as a `## Resolution` section in the entity file, preserving implementation context for future reference. You can include structured metadata lines like `Completed:`, `Branch:`, and `PR:` at the top of the resolution for easy scanning.

## 6. Check project status

```shell
npx refrakt plan status
```

This shows a terminal dashboard with:
- Status counts by entity type
- Blocked items and their blockers
- Ready items sorted by priority
- Recently completed items
- Warnings (broken references, stale in-progress items)

Filter to a specific milestone:

```shell
npx refrakt plan status --milestone v1.0.0
```

## 7. Validate

```shell
npx refrakt plan validate
```

Checks for duplicate IDs, broken cross-references, invalid attribute values, and filename format issues. Use `--strict` to treat warnings as errors — useful in CI:

```shell
npx refrakt plan validate --strict
```

## Viewing history

Plan tracks changes through git. View the history of any entity:

```shell
npx refrakt plan history WORK-042
```

Or see recent activity across the whole plan:

```shell
npx refrakt plan history --since 7d
```

## Tips

- **Always use the CLI** to update plan files — it validates attribute values and keeps formatting consistent
- **Write acceptance criteria early** — they define "done" and are checkable from the CLI
- **Link entities** with the `source` attribute — work items reference specs, decisions reference specs
- **Commit plan changes** alongside code — the git history becomes your project timeline
- **Use `--format json`** on any command for scripting and CI integration

## Troubleshooting

**`plan next` returns nothing**
All work items are either `draft`, `in-progress`, `done`, or blocked by unfinished dependencies. Run `plan status` to see what's blocked, then either resolve blockers or move a `draft` item to `ready`.

**`--check` doesn't match any criterion**
The text must match the criterion exactly, including punctuation and casing. Run `plan update <id>` without `--check` to see the current criteria text.

**`plan validate` reports broken references**
An entity references an ID that doesn't exist (e.g., a dependency on `WORK-999`). Either create the missing entity or remove the stale reference.

**Invalid status error**
Each entity type has its own allowed statuses. See [Entities](/plan/docs/plan-entities) for the full list per type. Status transitions are not enforced in order — you can jump from `draft` to `done` — but the value itself must be valid.
