{% spec id=“SPEC-022” status=“draft” version=“1.0” tags=“plan,cli” %}

# Plan CLI

> Plan management subcommands for the refrakt CLI. Package: `@refrakt-md/plan`.

## Problem

Developers using spec-driven workflows have Markdown planning files in their repos but no way to browse them as a cohesive project view. The files are readable individually but the relationships between them — which specs have work items, which work items are blocked, what the milestone progress looks like — are invisible without opening every file and tracing references manually.

Existing tools (Spec Kit, CCPM, planning-with-files) provide no visual interface. The planning content is raw files that never render into anything browsable.

-----

## Design Principles

**Part of the refrakt CLI.** The plan commands live under `refrakt plan` alongside the existing `refrakt dev`, `refrakt build`, and `refrakt inspect` commands. One CLI, one ecosystem.

**Plugin architecture.** The `@refrakt-md/plan` package registers its subcommands when installed. Without it, `refrakt plan` prompts to install the package. This follows the same pattern as rune packages — `@refrakt-md/storytelling` adds runes, `@refrakt-md/plan` adds runes and CLI commands.

**Zero friction.** `refrakt plan serve` works immediately. No config file, no signup, no hosting. Point it at a directory and get a dashboard.

**Read from the repo, write to the repo.** The CLI reads Markdoc files and renders them. The `create` command writes new Markdoc files. The source of truth is always the files in the repo — the CLI is a lens, not a database.

**CI-friendly.** The `validate` command exits with appropriate codes. Add it to GitHub Actions in one line.

-----

## Plugin Registration

When `@refrakt-md/plan` is installed, it registers its subcommands under `refrakt plan`:

```bash
refrakt plan serve      # Browse the plan dashboard
refrakt plan status     # Terminal status summary
refrakt plan create     # Scaffold new items
refrakt plan validate   # Check structure and references
refrakt plan build      # Generate static HTML site
refrakt plan init       # Scaffold plan structure
refrakt plan update     # Update plan item attributes
refrakt plan next       # Find next work item to pick up
```

When the package is not installed:

```
$ refrakt plan serve

  The plan commands require @refrakt-md/plan.
  Install it: npm install @refrakt-md/plan
```

The package exports a CLI plugin that the refrakt CLI discovers:

```typescript
// @refrakt-md/plan/cli-plugin.ts
export const commands = {
  namespace: 'plan',
  commands: [
    { name: 'serve', handler: serveHandler, description: 'Browse the plan dashboard' },
    { name: 'status', handler: statusHandler, description: 'Terminal status summary' },
    { name: 'create', handler: createHandler, description: 'Scaffold new plan items' },
    { name: 'validate', handler: validateHandler, description: 'Validate plan structure' },
    { name: 'build', handler: buildHandler, description: 'Build static plan site' },
    { name: 'init', handler: initHandler, description: 'Scaffold plan structure' },
    { name: 'update', handler: updateHandler, description: 'Update plan item attributes' },
    { name: 'next', handler: nextHandler, description: 'Find next work item' },
  ],
};
```

The refrakt CLI discovers installed packages that export a `cli-plugin` entry and registers their commands under the declared namespace. This same pattern could be used by other packages in the future — `@refrakt-md/docs` could register `refrakt docs` commands, `@refrakt-md/storytelling` could register `refrakt story` commands.

For users without the refrakt CLI installed globally, `npx` works:

```bash
npx refrakt plan serve
```

-----

## Commands

### `serve`

Starts a local dev server that renders the plan dashboard from planning files.

```bash
refrakt plan serve [directory]
```

**Arguments:**

|Argument   |Default     |Description                         |
|-----------|------------|------------------------------------|
|`directory`|`./plan`|Root directory containing plan files|

**Options:**

|Option   |Default  |Description                                                  |
|---------|---------|-------------------------------------------------------------|
|`--port` |`3000`   |Dev server port                                              |
|`--specs`|`./plan/spec`|Directory containing spec files                              |
|`--theme`|`default`|Dashboard theme (`default`, `minimal`, or path to custom CSS)|
|`--open` |`false`  |Open the dashboard in the default browser                    |

**Behaviour:**

1. Scans `directory` recursively for `.md` files containing plan runes (`work`, `bug`, `decision`, `milestone`, `spec`)
1. Scans `--specs` directory for spec rune files
1. Builds the entity registry from all discovered runes
1. Runs the cross-page pipeline (phases 2–4) to resolve references, compute spec coverage, and build dependency graphs
1. Generates a dashboard index page if none exists
1. Starts a dev server with hot reload — editing a file triggers re-scan and browser refresh

**Auto-generated dashboard:** If the directory doesn’t contain an `index.md` with a dashboard layout, the CLI generates one in memory (not written to disk):

````markdoc
# Plan Dashboard

## Active Milestone
{% milestone name="[most recent active milestone]" %}

## Ready for Work
{% backlog filter="status:ready" sort="priority" %}

## In Progress
{% backlog filter="status:in-progress" sort="priority" %}

## Recent Decisions
{% decision-log sort="date" %}
````

If the directory does contain an `index.md`, it’s used as-is. This lets the developer customise their dashboard layout while providing a sensible default for projects that haven’t set one up.

**Example:**

```bash
# Serve from default locations
refrakt plan serve

# Serve from custom directories
refrakt plan serve ./project/plan --specs ./project/plan/spec --port 4000

# Open in browser automatically
refrakt plan serve --open
```

**What the dashboard shows:**

The dev server renders all plan runes as themed HTML pages. The navigation structure is derived from the file system:

```
Dashboard (index)
├── Milestones
│   ├── v0.5.0
│   └── v0.4.0
├── Work Items
│   ├── RF-142 Tint dark mode support
│   ├── RF-215 Alignment migration
│   └── ...
├── Bugs
│   ├── RF-201 Showcase bleed overflow
│   └── ...
├── Specs
│   ├── SPEC-008 Tint Rune
│   ├── SPEC-009 Layout System
│   └── ...
└── Decisions
    ├── ADR-007 CSS custom properties
    └── ...
```

Each entity page shows the full rendered content with status badges, cross-reference links, and checklist progress. The dashboard page shows aggregate views via `backlog` and `milestone` runes.

-----

### `status`

Prints a plan status summary to the terminal. Quick overview without opening a browser.

```bash
refrakt plan status [directory]
```

**Arguments:**

|Argument   |Default     |Description                         |
|-----------|------------|------------------------------------|
|`directory`|`./plan`|Root directory containing plan files|

**Options:**

|Option       |Default  |Description                         |
|-------------|---------|------------------------------------|
|`--specs`    |`./plan/spec`|Directory containing spec files     |
|`--milestone`|(active) |Show status for a specific milestone|
|`--format`   |`text`   |Output format: `text`, `json`       |

**Text output:**

```
refrakt.md — v0.5.0 (active, target: 2026-03-29)

  Specs      12 total    8 accepted  2 review  1 draft  1 deprecated
  Work       18 total    4 done  3 in-progress  6 ready  5 draft
  Bugs        3 total    1 fixed  1 in-progress  1 confirmed
  Decisions   9 total    7 accepted  1 proposed  1 superseded

  Milestone v0.5.0    ████████░░░░  4/11 items

  Blocked:
    RF-142  Tint dark mode             → blocked by RF-138

  Ready (highest priority):
    RF-220  Add bg rune                high      moderate
    RF-221  Showcase bleed presets     medium    simple
    RF-222  Section spacing            low       simple

  Warnings:
    RF-215 references SPEC-099 — not found
    RF-201 has no milestone assigned
```

**JSON output** (for scripting and CI integration):

```bash
refrakt plan status --format json
```

```json
{
  "milestone": {
    "name": "v0.5.0",
    "status": "active",
    "target": "2026-03-29",
    "progress": { "done": 4, "total": 11 }
  },
  "counts": {
    "specs": { "total": 12, "accepted": 8, "review": 2, "draft": 1, "deprecated": 1 },
    "work": { "total": 18, "done": 4, "in-progress": 3, "ready": 6, "draft": 5 },
    "bugs": { "total": 3, "fixed": 1, "in-progress": 1, "confirmed": 1 },
    "decisions": { "total": 9, "accepted": 7, "proposed": 1, "superseded": 1 }
  },
  "blocked": [
    { "id": "RF-142", "title": "Tint dark mode", "blockedBy": "RF-138" }
  ],
  "ready": [
    { "id": "RF-220", "title": "Add bg rune", "priority": "high", "complexity": "moderate" }
  ],
  "warnings": [
    { "type": "broken-ref", "source": "RF-215", "target": "SPEC-099" },
    { "type": "no-milestone", "source": "RF-201" }
  ]
}
```

The JSON format enables integration with other tools — a GitHub Actions step could post the status summary as a PR comment, or a Slack webhook could send a daily digest.

-----

### `create`

Scaffolds a new plan file from the content model template.

```bash
refrakt plan create <type> [options]
```

**Types:** `work`, `bug`, `decision`, `spec`, `milestone`

**Options:**

|Option       |Required|Description                                        |
|-------------|--------|---------------------------------------------------|
|`--id`       |Yes     |Entity identifier                                  |
|`--title`    |No      |Title (prompted interactively if omitted)          |
|`--milestone`|No      |Milestone assignment (work/bug only)               |
|`--priority` |No      |Priority level (work only)                         |
|`--severity` |No      |Severity level (bug only)                          |
|`--dir`      |No      |Output directory (default: type-based subdirectory)|

**Behaviour:**

1. Generates a filename from the ID and title: `RF-143-add-bg-rune.md`
1. Fills the template with provided options and placeholder text for missing sections
1. Writes the file to the appropriate subdirectory
1. Prints the file path and a summary

**Examples:**

```bash
# Create a work item
refrakt plan create work --id RF-143 --title "Add bg rune" --milestone v0.5.0 --priority high

# Create a bug report
refrakt plan create bug --id RF-202 --title "Tint bridge missing in minimal theme" --severity minor

# Create a decision record
refrakt plan create decision --id ADR-008 --title "Use declarative content models"

# Create a spec
refrakt plan create spec --id SPEC-012 --title "Media Runes"

# Create a milestone
refrakt plan create milestone --id v0.6.0 --title "Media & Audio"
```

**Generated work item** (`plan/work/RF-143-add-bg-rune.md`):

````markdoc
{% work id="RF-143" status="draft" priority="high" milestone="v0.5.0" %}

# Add bg rune

Description of what needs to change and why.

## Acceptance Criteria
- [ ] First criterion

## Edge Cases
- Edge case one

## Approach
Technical notes on implementation.

## References
- {% ref "SPEC-XXX" /%}

{% /work %}
````

**Interactive mode:** When `--title` is omitted, the CLI prompts interactively:

```
$ refrakt plan create work --id RF-143

Title: Add bg rune to layout system
Milestone (optional): v0.5.0
Priority (critical/high/medium/low): high
Tags (comma-separated, optional): layout,bg

Created plan/work/RF-143-add-bg-rune.md
```

-----

### `validate`

Checks all plan files for structural issues, broken references, and consistency problems.

```bash
refrakt plan validate [directory]
```

**Arguments:**

|Argument   |Default     |Description                         |
|-----------|------------|------------------------------------|
|`directory`|`./plan`|Root directory containing plan files|

**Options:**

|Option    |Default  |Description                             |
|----------|---------|----------------------------------------|
|`--specs` |`./plan/spec`|Directory containing spec files         |
|`--strict`|`false`  |Treat warnings as errors (useful for CI)|
|`--format`|`text`   |Output format: `text`, `json`           |

**What it checks:**

|Check                              |Severity|Description                                                                |
|-----------------------------------|--------|---------------------------------------------------------------------------|
|Broken `ref` links                 |Error   |A `{% ref "RF-999" /%}` that doesn’t match any entity                      |
|Missing required sections          |Error   |A work item without Acceptance Criteria                                    |
|Duplicate IDs                      |Error   |Two entities with the same ID                                              |
|Invalid status values              |Error   |`status="working"` instead of a valid enum value                           |
|Invalid priority/severity          |Warning |Unknown priority or severity value                                         |
|Orphaned work items                |Warning |Work item with no milestone assigned                                       |
|Completed milestone with open items|Warning |Milestone marked `complete` but has unfinished work                        |
|Spec with no work items            |Info    |A spec that has no referencing work items                                  |
|Circular dependencies              |Error   |RF-142 depends on RF-143 depends on RF-142                                 |
|Stale in-progress                  |Warning |Work item `in-progress` with no checklist changes in 7+ days (requires git)|

**Output:**

```
$ refrakt plan validate

  Scanned: 42 files (18 work, 3 bugs, 12 specs, 9 decisions)

  ✗ error   RF-215 references SPEC-099 — entity not found
  ✗ error   RF-300 duplicate ID — also defined in plan/work/RF-300-old.md
  ⚠ warn    RF-201 has no milestone assigned
  ⚠ warn    v0.4.0 marked complete but RF-130 is still in-progress
  ℹ info    SPEC-012 has no referencing work items

  Result: 2 errors, 2 warnings, 1 info
```

**Exit codes:**

|Code|Meaning                                     |
|----|--------------------------------------------|
|`0` |No errors (warnings and info are acceptable)|
|`1` |One or more errors found                    |
|`2` |Invalid arguments or directory not found    |

With `--strict`, warnings are promoted to errors — exit code 1 for any warning.

**CI integration:**

```yaml
# .github/workflows/validate.yml
name: Validate Plan
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npx refrakt plan validate --strict
```

-----

### `build`

Generates a static HTML site from the plan files. For sharing plan status with stakeholders who don’t run the dev server.

```bash
refrakt plan build [directory]
```

**Arguments:**

|Argument   |Default     |Description                         |
|-----------|------------|------------------------------------|
|`directory`|`./plan`|Root directory containing plan files|

**Options:**

|Option      |Default      |Description                                                              |
|------------|-------------|-------------------------------------------------------------------------|
|`--specs`   |`./plan/spec`|Directory containing spec files                                          |
|`--out`     |`./plan-site`|Output directory for generated HTML                                      |
|`--theme`   |`default`    |Dashboard theme                                                          |
|`--base-url`|`/`          |Base URL for deployment (e.g., `/project/` for GitHub Pages subdirectory)|

**Behaviour:**

1. Runs the same pipeline as `serve` but writes static HTML instead of starting a server
1. Generates an `index.html` dashboard, individual pages for every entity, and navigation
1. Includes the theme CSS and any necessary assets
1. Output is a self-contained static site — deploy anywhere

**Example:**

```bash
# Build to default location
refrakt plan build

# Build for GitHub Pages deployment
refrakt plan build --out ./docs/project --base-url /refrakt/plan/

# Build with minimal theme
refrakt plan build --theme minimal
```

**GitHub Pages deployment:**

```yaml
# .github/workflows/plan-site.yml
name: Deploy Plan Dashboard
on:
  push:
    branches: [main]
    paths: ['plan/**', 'specs/**']
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npx refrakt plan build --out ./plan-site --base-url /refrakt-md/plan/
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./plan-site
```

The dashboard rebuilds and deploys automatically when planning files change. Team members visit the GitHub Pages URL for a read-only plan overview.

-----

### `init`

Scaffolds the plan structure in an existing repo.

```bash
refrakt plan init [directory]
```

**Arguments:**

|Argument   |Default|Description |
|-----------|-------|------------|
|`directory`|`.`    |Project root|

**Behaviour:**

1. Creates the directory structure:
   
   ```
   plan/
   ├── work/
   ├── spec/
   ├── decision/
   └── index.md
   ```
1. Generates a starter `plan/index.md` dashboard
1. Creates a sample milestone, work item, and decision as examples
1. If a `claude.md` or `CLAUDE.md` exists, appends the plan workflow section. If not, creates one with the full template. The workflow section documents the `next` / `update` / `status` command loop for AI agents and human developers
1. Prints a getting-started guide

**Example:**

```
$ refrakt plan init

  Created plan/
  Created plan/work/
  Created plan/spec/
  Created plan/decision/
  Created plan/index.md (dashboard)
  Created plan/work/PROJ-001-example.md (example work item)
  Created plan/decision/ADR-001-example.md (example decision)
  Created plan/spec/SPEC-001-example.md (example spec)
  Updated CLAUDE.md with plan workflow section (includes next/update/status commands)

  Get started:
    1. Edit the example files to match your project
    2. Run: refrakt plan serve
    3. Open: http://localhost:3000
    4. Or find your next task: refrakt plan next
```

-----

### `update`

Modifies a plan file's attributes or acceptance criteria in place.

```bash
refrakt plan update <id> [options]
```

**Arguments:**

|Argument|Required|Description                                                       |
|--------|--------|------------------------------------------------------------------|
|`id`    |Yes     |Entity identifier to update (e.g., `WORK-026`, `BUG-001`, `SPEC-012`)|

**Options:**

|Option                |Description                                                  |
|----------------------|-------------------------------------------------------------|
|`--status <status>`   |Change the entity's status attribute                         |
|`--check "text"`      |Check off a matching acceptance criterion (`- [ ]` to `- [x]`)|
|`--uncheck "text"`    |Uncheck a matching acceptance criterion (`- [x]` to `- [ ]`)|
|`--priority <priority>`|Change priority (work items only)                           |
|`--milestone <name>`  |Assign or change milestone                                   |
|`--assignee <name>`   |Assign person or agent                                       |
|`--severity <severity>`|Change severity (bugs only)                                 |
|`--dir <directory>`   |Directory to scan (default: `./plan`)                        |
|`--format <format>`   |Output format: `text`, `json` (default: `text`)              |

**Behaviour:**

1. Scans `--dir` recursively for `.md` files containing a rune tag whose `id` attribute matches `<id>`
1. If no match is found, exits with error code 2 and prints the ID and directories scanned
1. If found, reads the file and modifies the Markdoc rune tag's attributes in place — editing only the opening tag line, preserving all other content
1. For `--check` / `--uncheck`, performs a substring match against acceptance criteria lines (`- [ ] ...` / `- [x] ...`) and toggles the checkbox. If the text matches multiple lines, reports an error and requires a more specific match string
1. Validates attribute values against the rune schema (e.g., rejects `--status working` for a work item since that is not a valid status)
1. Writes the modified file back to disk
1. Prints the change summary (file path, attribute changed, old value, new value)

**Multiple updates in a single call:** Options can be combined to make several changes at once:

```bash
refrakt plan update WORK-026 --status in-progress --assignee claude --milestone v0.5.0
```

**Examples:**

```bash
# Move a work item to in-progress
refrakt plan update WORK-026 --status in-progress

# Check off an acceptance criterion
refrakt plan update WORK-026 --check "Schema validates all attributes"

# Assign a milestone and priority
refrakt plan update WORK-026 --milestone v0.5.0 --priority high

# Change a bug's severity
refrakt plan update BUG-001 --severity critical

# Assign to an agent
refrakt plan update WORK-026 --assignee claude

# JSON output for scripting
refrakt plan update WORK-026 --status done --format json
```

**JSON output:**

```json
{
  "id": "WORK-026",
  "file": "plan/work/build-video-rune.md",
  "changes": [
    { "field": "status", "from": "ready", "to": "in-progress" }
  ]
}
```

**Exit codes:**

|Code|Meaning                                                               |
|----|----------------------------------------------------------------------|
|`0` |Update applied successfully                                           |
|`1` |Validation error (invalid status, ambiguous criterion match, etc.)    |
|`2` |Entity not found or invalid arguments                                 |

-----

### `next`

Finds the highest-priority work item that is ready to be picked up. Considers dependencies, status, and priority to recommend the next item.

```bash
refrakt plan next [options]
```

**Options:**

|Option                |Description                                                        |
|----------------------|-------------------------------------------------------------------|
|`--milestone <name>`  |Scope to a specific milestone                                      |
|`--tag <tag>`         |Filter by tag                                                      |
|`--assignee <name>`   |Filter by assignee (or `unassigned` for items with no assignee)    |
|`--type <type>`       |Entity type filter: `work`, `bug`, or `all` (default: `all`)      |
|`--count <n>`         |Number of items to return (default: `1`)                           |
|`--dir <directory>`   |Directory to scan (default: `./plan`)                              |
|`--format <format>`   |Output format: `text`, `json` (default: `text`)                    |

**Behaviour:**

1. Scans `--dir` recursively for work items and bugs
1. Filters to items with `status="ready"` (or `status="confirmed"` for bugs)
1. Excludes items whose dependencies (referenced work item IDs in a "References" or "Dependencies" section) are not yet `done` or `fixed`
1. Sorts remaining items by priority (critical > high > medium > low), then by complexity (simpler items first as tiebreaker)
1. Returns the top `--count` items

**Text output:**

```
Next item:

  WORK-020  Build gallery rune          high    moderate
  plan/work/build-gallery-rune.md

  Specs:    SPEC-008
  Depends:  (none)

  Acceptance Criteria:
  - [ ] Schema accepts all gallery attributes
  - [ ] Identity transform produces correct BEM structure
  - [ ] CSS coverage test passes
```

**JSON output:**

```bash
refrakt plan next --format json
```

```json
{
  "items": [
    {
      "id": "WORK-020",
      "type": "work",
      "title": "Build gallery rune",
      "status": "ready",
      "priority": "high",
      "complexity": "moderate",
      "file": "plan/work/build-gallery-rune.md",
      "milestone": "v0.5.0",
      "specs": ["SPEC-008"],
      "dependencies": [],
      "criteria": [
        { "text": "Schema accepts all gallery attributes", "checked": false },
        { "text": "Identity transform produces correct BEM structure", "checked": false },
        { "text": "CSS coverage test passes", "checked": false }
      ]
    }
  ]
}
```

**Multiple items:**

```bash
# Get the top 5 ready items
refrakt plan next --count 5

# Get unassigned items in a milestone
refrakt plan next --milestone v0.5.0 --assignee unassigned --count 10
```

**Exit codes:**

|Code|Meaning                                  |
|----|-----------------------------------------|
|`0` |At least one item found                  |
|`1` |No items match the criteria              |
|`2` |Invalid arguments or directory not found |

-----

## Directory Discovery

The CLI discovers plan files by scanning for Markdoc rune tags. A file is a project file if it contains `{% work`, `{% bug`, `{% decision`, `{% milestone`, or `{% spec` as a tag.

The default directory structure follows the convention from the plan runes spec:

```
plan/
├── work/          ← work items and bug reports
├── spec/          ← specification documents
├── decision/      ← architecture decisions
└── index.md       ← dashboard
```

But the CLI doesn’t require this structure. Files can be in any directory — the CLI finds plan runes by scanning content, not by path convention. A flat directory with all files in one folder works. A deeply nested structure with files organised by feature works. The entity registry doesn’t care where files live.

The `--specs` option tells the CLI where to find spec files separately. This is useful when specs live in a different location from the default `plan/spec/` directory.

-----

## AI Agent Integration

The `plan` CLI commands are designed for consumption by AI coding agents (Claude Code, Copilot, Cursor, etc.) as well as human developers. The `--format json` option on `status`, `next`, and `update` enables structured output that agents can parse reliably.

**Typical agent workflow:**

```bash
# 1. Agent checks what's available
refrakt plan next --format json

# 2. Agent picks up the item
refrakt plan update WORK-020 --status in-progress --assignee claude

# 3. Agent reads the file for full context
cat plan/work/build-gallery-rune.md

# 4. Agent implements the changes (reads referenced specs, writes code)

# 5. Agent checks off criteria as it goes
refrakt plan update WORK-020 --check "Schema accepts all gallery attributes"
refrakt plan update WORK-020 --check "Identity transform produces correct BEM structure"

# 6. Agent marks the item done
refrakt plan update WORK-020 --status done
```

**CLAUDE.md integration:** The `init` command appends a workflow section to the project's `CLAUDE.md` that teaches agents this workflow. The section includes the available commands, the status lifecycle, and instructions for picking up work items. Any agent that reads `CLAUDE.md` (which Claude Code does automatically) learns how to interact with the plan system without additional prompting.

**Key design decisions for agent ergonomics:**

- **ID-based addressing.** All commands use the entity ID, not file paths. Agents don't need to know the file system layout.
- **Substring matching for criteria.** The `--check` flag matches by substring so agents don't need to reproduce the exact checkbox text — a unique fragment is sufficient.
- **Dependency awareness in `next`.** Agents don't need to manually check whether prerequisites are complete. The `next` command handles this automatically.
- **Atomic updates.** Multiple `--status`, `--assignee`, `--milestone` flags in a single `update` call avoid race conditions and reduce tool calls.

-----

## Default Theme

The CLI ships with a default dashboard theme optimised for plan management content. It’s functional, not decorative — clear typography, status badge colours, progress bars, and card layouts.

The theme provides styles for:

|Element              |Treatment                                                         |
|---------------------|------------------------------------------------------------------|
|Status badges        |Coloured pills (grey/blue/yellow/green/red/muted)                 |
|Priority badges      |Coloured text (critical=red, high=orange, medium=yellow, low=grey)|
|Complexity indicators|Dot indicators (● ○)                                              |
|Checklist progress   |Horizontal progress bar with fraction label                       |
|Entity cards         |Bordered cards with header, title, meta line                      |
|Dashboard grid       |Responsive column layout for backlog sections                     |
|Navigation           |Sidebar with entity type grouping                                 |
|Cross-reference links|Styled with entity type icon prefix                               |
|Decision status chain|Visual arrow connecting superseded → superseding                  |

A `minimal` theme is also included — no colour, no badges, just clean typography. Useful for printing or embedding in documentation.

Custom themes are supported via the `--theme` option pointing to a CSS file. The theme targets the same BEM classes as any refrakt.md theme — the plan runes go through the standard identity transform.

-----

## Package Structure

```
@refrakt-md/plan
├── cli-plugin.ts             ← CLI plugin entry (discovered by refrakt CLI)
├── commands/
│   ├── serve.ts              ← dev server with hot reload
│   ├── create.ts             ← scaffold new items from templates
│   ├── status.ts             ← terminal status display
│   ├── validate.ts           ← structure and reference validation
│   ├── build.ts              ← static site generation
│   ├── init.ts               ← plan structure scaffolding
│   ├── update.ts             ← in-place attribute and checkbox editing
│   └── next.ts               ← next-item selection with dependency awareness
├── runes/
│   ├── spec.ts               ← spec rune definition + content model
│   ├── work.ts               ← work item rune definition + content model
│   ├── bug.ts                ← bug rune definition + content model
│   ├── decision.ts           ← decision rune definition + content model
│   ├── milestone.ts          ← milestone rune definition + content model
│   ├── backlog.ts            ← backlog aggregation rune
│   └── decision-log.ts       ← decision log aggregation rune
├── pipeline/
│   ├── register.ts           ← entity registration for plan runes
│   ├── aggregate.ts          ← backlog queries, spec coverage, dependency graph
│   └── validate.ts           ← broken refs, missing sections, status consistency
├── theme/
│   ├── default.css           ← default plan dashboard theme
│   └── minimal.css           ← minimal theme for printing/embedding
└── templates/
    ├── work.md               ← work item template
    ├── bug.md                ← bug template
    ├── decision.md           ← decision template
    ├── spec.md               ← spec template
    ├── milestone.md          ← milestone template
    └── dashboard.md          ← plan dashboard template
```

The package serves double duty: it provides runes (registered in the transform pipeline like any rune package) and CLI commands (registered as a CLI plugin). Installing `@refrakt-md/plan` gives you both — plan runes in your content and `refrakt plan` commands in your terminal.

-----

## Future: Performance at Scale

As the number of plan files grows (hundreds of entities across specs, work items, bugs, and decisions), full directory scans become a bottleneck. The initial implementation includes mtime-based file caching ({% ref "WORK-028" /%}), but several additional strategies are worth considering for the future:

**Filtered scanning.** Most commands don't need every entity. `next` only cares about `status="ready"` work items; `validate` might target a single file. Adding type/status filters to `scanPlanFiles()` would let commands skip irrelevant files entirely when combined with the cache:

```typescript
scanPlanFiles(dir, { types?: RuneType[], status?: string[], ids?: string[] })
```

**Persistent index file.** A generated `plan/.index.json` that maps file paths to entity metadata. Rebuilt on demand (or via `refrakt plan build`). Commands read the index instead of scanning. Unlike the runtime cache, an index file is committable — useful when CI or external tools need plan data without running the scanner.

**Streaming/async API.** Switch from returning `PlanEntity[]` to an async generator. Doesn't reduce total work but lets commands like `next` bail early once they find a match without scanning the entire tree.

**Archive convention.** A `plan/archive/` directory (or `status="archived"` attribute) that the scanner skips by default. Completed milestones and their associated work items move here, reducing the active scan surface without losing history.

These strategies are complementary — caching reduces re-parse cost, filters reduce scan scope, an index eliminates scanning for read-only consumers, and archiving reduces the active file count. The right combination depends on how large plan directories actually get in practice.

{% /spec %}