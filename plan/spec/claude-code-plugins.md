{% spec id="SPEC-036" status="draft" version="1.0" tags="plan, cli, ai-workflow, claude-code" %}

# Claude Code Skills and Hooks for Plan Workflow

> Replace procedural CLAUDE.md instructions with Claude Code skills (custom slash commands) and hooks (automated enforcement) to make the plan workflow invocable, context-efficient, and enforceable.

## Problem

The plan workflow currently lives as ~80 lines of prose instructions in the project's `CLAUDE.md`. This has three problems:

**Always loaded, rarely needed.** The plan workflow instructions consume tokens on every session, even when the user is asking about CSS or debugging a test. Skills load on demand — their context cost is zero until invoked.

**Guidance without enforcement.** `CLAUDE.md` instructions are suggestions. The agent can skip steps, forget to check off acceptance criteria, or mark a work item done without a `--resolve` summary. There is no mechanism to catch these omissions. Hooks are deterministic shell scripts that run automatically at lifecycle events — they cannot be skipped.

**Not invocable.** The user has no structured way to say "start the plan workflow." They rely on the agent having read and internalized the instructions. Skills are explicit entry points: `/plan-next` starts the workflow, `/plan-done` completes it.

-----

## Design Principles

**Skills for guidance, hooks for enforcement.** Skills are playbooks that teach the agent how to do something well. Hooks are guardrails that prevent the agent from doing something wrong. The two layers complement each other — skills make the happy path easy, hooks make the failure path visible.

**Trim CLAUDE.md, don't duplicate.** When a workflow moves to a skill, remove it from `CLAUDE.md`. The plan command reference stays in `plan/CLAUDE.md` (the plan-specific instructions file) where it provides contextual guidance. The procedural workflow steps move to skills.

**Minimal hook surface.** Hooks should check quickly and exit. A `Stop` hook that runs `npx refrakt plan status --format json` and parses JSON is fine. A hook that runs a full build is not. Keep hook execution under 5 seconds.

**Progressive adoption.** Each skill and hook is independently useful. Ship `/plan-next` first without the `Stop` hook and it's already an improvement. Add enforcement later. Don't create a monolithic system that must be adopted all-at-once.

-----

## Skills

Skills are Markdown files in `.claude/skills/<name>/SKILL.md` with YAML frontmatter. They become slash commands the user can invoke and/or playbooks Claude auto-loads when the task matches.

### `/plan-next` — Find and start the next work item

**Purpose:** The primary entry point for plan-driven work. Replaces the "Workflow" section of `CLAUDE.md`.

**Trigger:** User types `/plan-next`, or Claude detects a task that involves implementing a work item.

**Sequence:**

1. Run `npx refrakt plan next --format json` to find the highest-priority ready item with satisfied dependencies
2. Run `npx refrakt plan update <id> --status in-progress` to claim it
3. Read the work item file for full context (acceptance criteria, approach, references)
4. Follow `source` attribute — read linked specs from `plan/spec/` and decisions from `plan/decision/`
5. Check that dependency work items (referenced in the file) are `done`
6. Present a summary to the user: what the item is, what specs inform it, what the acceptance criteria are
7. Begin implementation

**Frontmatter:**

```yaml
---
name: plan-next
description: Find and implement the next refrakt plan work item
allowed-tools: Bash(npx refrakt plan *), Read, Glob, Grep
---
```

**Supporting files:** The skill directory may include a `reference.md` with the plan CLI command reference (the content currently in `plan/CLAUDE.md`). This loads only when the skill is invoked.

### `/plan-done` — Complete a work item

**Purpose:** The completion checklist, enforced as a sequence. Replaces the "MANDATORY: Work Item Completion Checklist" section of `CLAUDE.md`.

**Trigger:** User types `/plan-done` or `/plan-done WORK-XXX`. If no ID is given, auto-detects the in-progress item.

**Sequence:**

1. Identify the work item (from argument or by finding the in-progress item)
2. Read the work item file to get acceptance criteria
3. For each criterion, verify it's actually satisfied (check the code, run relevant tests)
4. Check off each criterion individually: `npx refrakt plan update <id> --check "criterion text"`
5. Build a `--resolve` summary from the session's actual changes (files modified, decisions made, branch name)
6. Mark done: `npx refrakt plan update <id> --status done --resolve "..."`
7. Stage and commit the updated work item file with the implementation changes

**Frontmatter:**

```yaml
---
name: plan-done
description: Complete a work item with criteria verification and resolution summary
allowed-tools: Bash(npx refrakt plan *), Bash(git *), Read, Glob, Grep
---
```

### `/plan-create` — Scaffold new plan items

**Purpose:** Context-aware creation of specs, work items, decisions, and bugs. Provides guidance on structure and conventions that currently lives in `plan/CLAUDE.md`.

**Trigger:** User types `/plan-create work "title"`, `/plan-create spec`, `/plan-create decision`, etc.

**Behaviour by type:**

- **spec**: Scaffold with `npx refrakt plan create spec --title "..."`. Open the file and populate Problem, Design Principles, and body sections.
- **work**: Scaffold with `npx refrakt plan create work --title "..." --priority <p>`. Prompt for `source` (which spec does this implement?), `milestone`, `complexity`. Populate Acceptance Criteria section with checkboxes.
- **decision**: Scaffold with `npx refrakt plan create decision --title "..."`. Populate Context, Options Considered, Decision, Rationale, Consequences sections.
- **bug**: Scaffold with `npx refrakt plan create bug --title "..."`. Populate Steps to Reproduce, Expected, Actual sections.

**Frontmatter:**

```yaml
---
name: plan-create
description: Scaffold new plan items (specs, work items, decisions, bugs)
allowed-tools: Bash(npx refrakt plan *), Read, Edit, Write
---
```

**Supporting files:** A `templates.md` reference with the canonical section structures for each item type (drawn from `plan/CLAUDE.md`).

### `/plan-refine` — Review and improve plan content

**Purpose:** Iterate on specs and decisions before implementation begins. Validate cross-references, identify gaps, suggest improvements.

**Trigger:** User types `/plan-refine` (reviews all draft/review items) or `/plan-refine SPEC-XXX` (reviews a specific item).

**Sequence:**

1. Run `npx refrakt plan validate --format json` to find structural issues
2. Find specs in `draft` or `review` status
3. Check for work items missing acceptance criteria or approach sections
4. Verify cross-references resolve (specs referenced by work items exist, decisions link to specs)
5. Present findings and suggest improvements

**Frontmatter:**

```yaml
---
name: plan-refine
description: Review plan content for gaps, missing criteria, and structural issues
allowed-tools: Bash(npx refrakt plan *), Read, Glob, Grep
---
```

### `/plan-status` — Quick overview

**Purpose:** Surface plan state without the user needing to remember the CLI command.

**Trigger:** User types `/plan-status`.

**Sequence:**

1. Run `npx refrakt plan status`
2. Present a focused summary: in-progress items, blocked items, next ready items, milestone progress

**Frontmatter:**

```yaml
---
name: plan-status
description: Show plan status overview
allowed-tools: Bash(npx refrakt plan *)
---
```

-----

## Hooks

Hooks are shell commands configured in `.claude/settings.json` that run automatically at lifecycle events. They provide enforcement that skills alone cannot.

### `SessionStart` — Inject plan context

**Event:** Fires when a Claude Code session begins.

**Purpose:** Give the agent immediate awareness of plan state. Currently the `SessionStart` hook runs `npm run build`. Add a second hook to surface active work.

**Implementation:**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "npm run build 2>&1 | tail -5",
        "timeout": 120000
      },
      {
        "type": "command",
        "command": "npx refrakt plan status 2>/dev/null || true",
        "timeout": 15000
      }
    ]
  }
}
```

**Output:** The agent sees active/in-progress work items at the start of every session. This provides context without the user needing to ask.

**Failure handling:** The `|| true` ensures a build failure in the plan package doesn't block session start. The plan status is informational, not critical.

### `Stop` — Verify work item completion

**Event:** Fires when the agent is about to stop responding (end of turn or session).

**Purpose:** Catch the scenario where the agent implements changes but forgets to update the work item. This is the most common workflow failure today.

**Implementation:**

A shell script at `.claude/hooks/check-plan-completion.sh`:

```bash
#!/bin/bash
# Check if any in-progress work items have unchecked acceptance criteria

status=$(npx refrakt plan next --type all --format json 2>/dev/null) || exit 0

# Find in-progress items
in_progress=$(echo "$status" | jq -r '.[] | select(.status == "in-progress")')
[ -z "$in_progress" ] && exit 0

# Check for unchecked criteria
unchecked=$(echo "$in_progress" | jq -r '
  select(.criteria | map(select(.checked == false)) | length > 0) |
  "\(.id): \(.criteria | map(select(.checked == false)) | length) unchecked criteria"
')

if [ -n "$unchecked" ]; then
  echo "⚠ In-progress work items with unchecked criteria:"
  echo "$unchecked"
  echo ""
  echo "Consider running /plan-done before ending the session."
  exit 0  # Warn but don't block
fi
```

**Hook config:**

```json
{
  "Stop": [
    {
      "type": "command",
      "command": ".claude/hooks/check-plan-completion.sh",
      "timeout": 10000
    }
  ]
}
```

**Exit behaviour:**
- `exit 0` — warning only, session can end. The agent sees the warning and may choose to address it.
- `exit 2` — block the session from ending. Reserved for future use if stricter enforcement is desired.

The initial implementation should use `exit 0` (warn). Blocking session end is aggressive and may frustrate users who intentionally want to pause work mid-item.

-----

## Platform Compatibility

Skills and hooks are only available on Claude Code environments that have local filesystem and shell access:

| Feature | CLI | Desktop | VS Code | JetBrains | Web (claude.ai/code) | Mobile |
|---------|-----|---------|---------|-----------|----------------------|--------|
| Custom skills | Yes | Yes | Yes | Yes | No | No |
| Hooks | Yes | Yes | Yes | Yes | No | No |
| `CLAUDE.md` | Yes | Yes | Yes | Yes | Yes | Yes |
| `plan/CLAUDE.md` | Yes | Yes | Yes | Yes | Yes | Yes |

The web and mobile versions run on Anthropic's managed cloud infrastructure without access to `.claude/skills/` or hook configurations. `CLAUDE.md` is the only extension mechanism available there.

### Fallback strategy

**Don't remove `plan/CLAUDE.md`.** The plan-specific instructions file (`plan/CLAUDE.md`) serves as the fallback for web/mobile sessions. It contains the command reference, status progressions, content structure templates, and workflow steps — everything the agent needs to follow the plan workflow without skills or hooks.

The root `CLAUDE.md` plan section can be trimmed to a pointer:

```markdown
## Plan

Project planning uses `@refrakt-md/plan`. See `plan/CLAUDE.md` for workflow
details. On CLI/desktop, use `/plan-next` and `/plan-done` skills instead.
```

This means:
- **CLI/desktop sessions**: Skills load on demand, hooks enforce completion, `plan/CLAUDE.md` provides reference if needed. The root `CLAUDE.md` is minimal.
- **Web/mobile sessions**: `plan/CLAUDE.md` loads when working in the `plan/` directory or when plan commands are relevant. No enforcement, but the workflow instructions are available.

The tradeoff is maintaining two representations — skills and `plan/CLAUDE.md` — but `plan/CLAUDE.md` already exists and is the authoritative reference. The skills are thin wrappers that encode the *sequence* (what to do in what order), while `plan/CLAUDE.md` provides the *reference* (command syntax, valid statuses, content templates). There's minimal duplication because they serve different purposes.

-----

## CLAUDE.md Changes

### Root `CLAUDE.md`

Replace the `## Plan` section (~80 lines of workflow instructions, completion checklist, and command reference) with a short pointer:

```markdown
## Plan

Project planning uses `@refrakt-md/plan`. See `plan/CLAUDE.md` for workflow
details and command reference. On CLI/desktop, use `/plan-next` and `/plan-done`
skills instead.
```

Everything else in root `CLAUDE.md` stays: build commands, architecture, conventions, release process, monorepo structure.

### `plan/CLAUDE.md`

**Keep as-is.** This file is the authoritative reference for the plan system and the fallback for web/mobile sessions. It contains:

- ID conventions and valid statuses
- Required content structure and templates for each item type
- The full workflow steps (find next → implement → check criteria → mark done)
- Command reference with all flags
- Complexity guide and tag conventions

On CLI/desktop, this file provides reference material that the skills can lean on. On web/mobile, it's the entire workflow — no skills or hooks, but all the information the agent needs to follow the process.

-----

## File Layout

```
.claude/
  settings.json                         # Hook configuration
  hooks/
    check-plan-completion.sh            # Stop hook script
  skills/
    plan-next/
      SKILL.md                          # Find and start next work item
    plan-done/
      SKILL.md                          # Complete a work item
    plan-create/
      SKILL.md                          # Scaffold new plan items
      templates.md                      # Section templates for each item type
    plan-refine/
      SKILL.md                          # Review and improve plan content
    plan-status/
      SKILL.md                          # Quick status overview
```

-----

## Implementation Order

1. **`/plan-next` skill + `SessionStart` hook** — highest impact, replaces the most CLAUDE.md content
2. **`/plan-done` skill** — enforces the completion checklist
3. **`Stop` hook** — catches forgotten work item updates
4. **`/plan-create` skill** — convenience, lower priority
5. **`/plan-refine` and `/plan-status` skills** — nice-to-have
6. **CLAUDE.md trimming** — remove migrated sections after skills are verified

Each step is independently shippable. Step 1 alone is a meaningful improvement.

-----

## Distribution

Once the skills and hooks are proven in this project, they should be packaged as a Claude Code plugin so that anyone using `@refrakt-md/plan` can install the workflow tooling.

### Plugin structure

A Claude Code plugin is a directory with a `.claude-plugin/plugin.json` manifest that bundles skills, hooks, and configuration:

```
refrakt-plan-workflow/
  .claude-plugin/
    plugin.json                         # Manifest
  skills/
    plan-next/SKILL.md                  # Find and start next work item
    plan-done/SKILL.md                  # Complete a work item
    plan-create/SKILL.md                # Scaffold new plan items
    plan-create/templates.md            # Section templates reference
    plan-refine/SKILL.md                # Review plan content
    plan-status/SKILL.md                # Quick status overview
  hooks/
    hooks.json                          # Hook definitions (SessionStart, Stop)
    check-plan-completion.sh            # Stop hook script
```

**Manifest (`plugin.json`):**

```json
{
  "name": "refrakt-plan-workflow",
  "description": "Claude Code skills and hooks for @refrakt-md/plan workflows",
  "version": "1.0.0",
  "author": {
    "name": "refrakt-md"
  },
  "repository": "https://github.com/refrakt-md/refrakt",
  "license": "MIT",
  "skills": "./skills/",
  "hooks": "./hooks/hooks.json"
}
```

Skills inside plugins are namespaced to avoid conflicts. The slash commands become `/refrakt-plan-workflow:plan-next`, `/refrakt-plan-workflow:plan-done`, etc. — or shorter aliases if Claude Code supports them.

### Distribution channels

Claude Code plugins are distributed through **marketplaces** — curated catalogs that users subscribe to. There are three paths to get the plugin to users:

**1. Official Anthropic marketplace (widest reach)**

Submit the plugin for inclusion in the official marketplace. Users install with:

```bash
/plugin install refrakt-plan-workflow@claude-plugins-official
```

This is the best option for community visibility but requires Anthropic review and approval.

**2. Refrakt marketplace (self-hosted)**

Host a `marketplace.json` in a refrakt-md GitHub repo (e.g. `refrakt-md/claude-plugins`) that catalogs refrakt-specific plugins:

```json
{
  "name": "refrakt-plugins",
  "description": "Claude Code plugins for the refrakt ecosystem",
  "entries": [
    {
      "name": "refrakt-plan-workflow",
      "description": "Skills and hooks for @refrakt-md/plan workflows",
      "source": "github",
      "github": {
        "owner": "refrakt-md",
        "repo": "claude-plugins",
        "path": "plugins/plan-workflow"
      }
    }
  ]
}
```

Users add the marketplace once, then install:

```bash
/plugin marketplace add refrakt-md/claude-plugins
/plugin install refrakt-plan-workflow@refrakt-plugins
```

This gives us full control over the catalog without waiting for Anthropic review.

**3. npm package (piggyback on existing distribution)**

Since `@refrakt-md/plan` is already an npm package, the plugin could be distributed as a companion npm package (`@refrakt-md/claude-plan-workflow`) or bundled inside `@refrakt-md/plan` itself. A marketplace entry can reference an npm source:

```json
{
  "name": "refrakt-plan-workflow",
  "source": "npm",
  "npm": {
    "package": "@refrakt-md/claude-plan-workflow",
    "version": "^1.0.0"
  }
}
```

Users still install via `/plugin install`, not `npm install` — the npm package is just the delivery mechanism.

### Recommended path

Start with option 2 (self-hosted marketplace). It's the fastest to set up, gives us full control, and doesn't depend on Anthropic's review process. Once the plugin is stable and has users, submit to the official marketplace (option 1) for broader discovery.

The npm option (3) is worth considering later if we want the plugin version to stay in sync with `@refrakt-md/plan` releases — same changeset, same version bump, same publish step.

### What users need

A refrakt user adopting the plan workflow would:

1. Install `@refrakt-md/plan` (the npm package — runes, CLI commands, scanner)
2. Run `npx refrakt plan init` (scaffolds `plan/` directory and `plan/CLAUDE.md`)
3. Add the plugin marketplace: `/plugin marketplace add refrakt-md/claude-plugins`
4. Install the plugin: `/plugin install refrakt-plan-workflow@refrakt-plugins`
5. Type `/plan-next` to start working

Steps 3-4 are the new addition. The plugin gives them the skills and hooks; `plan/CLAUDE.md` (generated by `plan init`) gives them the fallback for web/mobile.

### Installation scopes

Plugins can be installed at different scopes:

- **Project scope** (`.claude/settings.json`, committed): The team agrees to use the plugin. New contributors get it automatically when they clone the repo.
- **User scope** (`~/.claude/settings.json`): Personal preference, applies to all projects.
- **Local scope** (`.claude/settings.local.json`, gitignored): Trying it out without affecting the team.

For a team adopting the plan workflow, project scope is the right default — commit the plugin reference so everyone on the team gets the skills and hooks.

-----

## Future Considerations

### Stricter enforcement

The `Stop` hook initially warns (`exit 0`). If experience shows that warnings are insufficient, it could be changed to block (`exit 2`). This should be a deliberate decision after living with the warning-only mode.

### `PreToolUse` hook for git push

A `PreToolUse` hook on `Bash(git push*)` could verify plan consistency before pushing. This is more aggressive than the `Stop` hook and should only be added if the softer enforcement proves insufficient.

### `plan init` integration

Once the plugin exists, `npx refrakt plan init` could prompt the user to install it — or at minimum print instructions. This closes the loop between the npm package (CLI + runes) and the Claude Code plugin (skills + hooks).

-----

## References

- {% ref "SPEC-022" /%} — Plan CLI (the commands these skills wrap)
- {% ref "SPEC-027" /%} — Work Item Resolution Summaries (the `--resolve` workflow that `/plan-done` enforces)

{% /spec %}
