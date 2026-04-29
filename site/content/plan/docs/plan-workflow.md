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
npx refrakt plan update WORK-042 --status done --resolve "$(cat <<'EOF'
Branch: `feature/login-flow`

### What was done
- Added login form component with email validation
- Integrated JWT auth endpoint
- Added error handling for invalid credentials

### Notes
- Used existing form validation library rather than rolling our own
EOF
)"
```

The resolution summary is appended to the entity file, preserving implementation context for future reference.

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
