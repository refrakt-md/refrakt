{% spec id=“SPEC-022” status=“draft” version=“1.0” tags=“plan,cli” %}

# Plan CLI

> Plan management subcommands for the refrakt CLI. Package: `@refrakt/plan`.

## Problem

Developers using spec-driven workflows have Markdown planning files in their repos but no way to browse them as a cohesive project view. The files are readable individually but the relationships between them — which specs have work items, which work items are blocked, what the milestone progress looks like — are invisible without opening every file and tracing references manually.

Existing tools (Spec Kit, CCPM, planning-with-files) provide no visual interface. The planning content is raw files that never render into anything browsable.

-----

## Design Principles

**Part of the refrakt CLI.** The plan commands live under `refrakt plan` alongside the existing `refrakt dev`, `refrakt build`, and `refrakt inspect` commands. One CLI, one ecosystem.

**Plugin architecture.** The `@refrakt/plan` package registers its subcommands when installed. Without it, `refrakt plan` prompts to install the package. This follows the same pattern as rune packages — `@refrakt/storytelling` adds runes, `@refrakt/plan` adds runes and CLI commands.

**Zero friction.** `refrakt plan serve` works immediately. No config file, no signup, no hosting. Point it at a directory and get a dashboard.

**Read from the repo, write to the repo.** The CLI reads Markdoc files and renders them. The `create` command writes new Markdoc files. The source of truth is always the files in the repo — the CLI is a lens, not a database.

**CI-friendly.** The `validate` command exits with appropriate codes. Add it to GitHub Actions in one line.

-----

## Plugin Registration

When `@refrakt/plan` is installed, it registers its subcommands under `refrakt plan`:

```bash
refrakt plan serve      # Browse the plan dashboard
refrakt plan status     # Terminal status summary
refrakt plan create     # Scaffold new items
refrakt plan validate   # Check structure and references
refrakt plan build      # Generate static HTML site
refrakt plan init       # Scaffold plan structure
```

When the package is not installed:

```
$ refrakt plan serve

  The plan commands require @refrakt/plan.
  Install it: npm install @refrakt/plan
```

The package exports a CLI plugin that the refrakt CLI discovers:

```typescript
// @refrakt/plan/cli-plugin.ts
export const commands = {
  namespace: 'plan',
  commands: [
    { name: 'serve', handler: serveHandler, description: 'Browse the plan dashboard' },
    { name: 'status', handler: statusHandler, description: 'Terminal status summary' },
    { name: 'create', handler: createHandler, description: 'Scaffold new plan items' },
    { name: 'validate', handler: validateHandler, description: 'Validate plan structure' },
    { name: 'build', handler: buildHandler, description: 'Build static plan site' },
    { name: 'init', handler: initHandler, description: 'Scaffold plan structure' },
  ],
};
```

The refrakt CLI discovers installed packages that export a `cli-plugin` entry and registers their commands under the declared namespace. This same pattern could be used by other packages in the future — `@refrakt/docs` could register `refrakt docs` commands, `@refrakt/storytelling` could register `refrakt story` commands.

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
|`directory`|`./planning`|Root directory containing plan files|

**Options:**

|Option   |Default  |Description                                                  |
|---------|---------|-------------------------------------------------------------|
|`--port` |`3000`   |Dev server port                                              |
|`--specs`|`./specs`|Directory containing spec files                              |
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

```markdoc
# Plan Dashboard

## Active Milestone
{% milestone name="[most recent active milestone]" %}

## Ready for Work
{% backlog filter="status:ready" sort="priority" %}

## In Progress
{% backlog filter="status:in-progress" sort="priority" %}

## Recent Decisions
{% decision-log sort="date" %}
```

If the directory does contain an `index.md`, it’s used as-is. This lets the developer customise their dashboard layout while providing a sensible default for projects that haven’t set one up.

**Example:**

```bash
# Serve from default locations
refrakt plan serve

# Serve from custom directories
refrakt plan serve ./project/plan --specs ./project/specs --port 4000

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
|`directory`|`./planning`|Root directory containing plan files|

**Options:**

|Option       |Default  |Description                         |
|-------------|---------|------------------------------------|
|`--specs`    |`./specs`|Directory containing spec files     |
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

```markdoc
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
```

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
|`directory`|`./planning`|Root directory containing plan files|

**Options:**

|Option    |Default  |Description                             |
|----------|---------|----------------------------------------|
|`--specs` |`./specs`|Directory containing spec files         |
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
|`directory`|`./planning`|Root directory containing plan files|

**Options:**

|Option      |Default      |Description                                                              |
|------------|-------------|-------------------------------------------------------------------------|
|`--specs`   |`./specs`    |Directory containing spec files                                          |
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
   ├── bugs/
   ├── decisions/
   ├── milestones/
   └── index.md
   specs/
   ```
1. Generates a starter `plan/index.md` dashboard
1. Creates a sample milestone, work item, and decision as examples
1. If a `claude.md` or `CLAUDE.md` exists, appends the plan workflow section. If not, creates one with the full template
1. Prints a getting-started guide

**Example:**

```
$ refrakt plan init

  Created plan/
  Created plan/work/
  Created plan/bugs/
  Created plan/decisions/
  Created plan/milestones/
  Created specs/
  Created plan/index.md (dashboard)
  Created plan/milestones/v0.1.0.md (example milestone)
  Created plan/work/PROJ-001-example.md (example work item)
  Created plan/decisions/ADR-001-example.md (example decision)
  Updated CLAUDE.md with plan workflow section

  Get started:
    1. Edit the example files to match your project
    2. Run: refrakt plan serve
    3. Open: http://localhost:3000
```

-----

## Directory Discovery

The CLI discovers plan files by scanning for Markdoc rune tags. A file is a project file if it contains `{% work`, `{% bug`, `{% decision`, `{% milestone`, or `{% spec` as a tag.

The default directory structure follows the convention from the plan runes spec:

```
plan/
├── work/          ← work items
├── bugs/          ← bug reports
├── decisions/     ← architecture decisions
├── milestones/    ← milestone definitions
└── index.md       ← dashboard

specs/             ← specification documents
```

But the CLI doesn’t require this structure. Files can be in any directory — the CLI finds plan runes by scanning content, not by path convention. A flat directory with all files in one folder works. A deeply nested structure with files organised by feature works. The entity registry doesn’t care where files live.

The `--specs` option tells the CLI where to find spec files separately. This is useful when specs live outside the planning directory (which is common — specs are documentation, planning is plan management).

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
@refrakt/plan
├── cli-plugin.ts             ← CLI plugin entry (discovered by refrakt CLI)
├── commands/
│   ├── serve.ts              ← dev server with hot reload
│   ├── create.ts             ← scaffold new items from templates
│   ├── status.ts             ← terminal status display
│   ├── validate.ts           ← structure and reference validation
│   ├── build.ts              ← static site generation
│   └── init.ts               ← plan structure scaffolding
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

The package serves double duty: it provides runes (registered in the transform pipeline like any rune package) and CLI commands (registered as a CLI plugin). Installing `@refrakt/plan` gives you both — plan runes in your content and `refrakt plan` commands in your terminal.

{% /spec %}