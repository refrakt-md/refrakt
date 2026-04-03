# Plan — Claude Code Guide

This directory contains project planning content using the `@refrakt-md/plan` runes package. All files are Markdoc (`.md` with `{% %}` tags).

## Code Fences with Markdoc Tags

Markdoc parses `{% %}` tag syntax inside code fences. When a code fence contains an **unpaired** tag (e.g. `{% spec id="X" %}` without a matching `{% /spec %}`), the parser steals a closing tag from the outer document, breaking the page structure and causing truncation.

The content pipeline escapes tags inside fences automatically (`escapeFenceTags` in `@refrakt-md/runes`), so authors don't need to worry about this. But if you encounter truncation on the plan site, check for `{% %}` tags inside code fences as a first step.

## Directory Layout

```
plan/
  spec/      — Specifications (what to build)
  work/      — Work items and bugs (how to build it)
  decision/  — Architecture decision records (why it's built this way)
  milestone/ — Named release targets with scope and goals
```

## ID Conventions

Each rune type uses a unique prefix. To assign a new ID, scan existing files for the highest number and increment by 1.

| Type | Prefix | Example | Current highest |
|------|--------|---------|-----------------|
| Spec | `SPEC-` | `SPEC-023` | SPEC-034 |
| Work | `WORK-` | `WORK-051` | WORK-116 |
| Decision | `ADR-` | `ADR-005` | ADR-007 |
| Bug | `BUG-` | `BUG-001` | (none yet) |
| Milestone | `v`+semver | `v1.0.0` | v1.0.0 |

IDs are zero-padded to 3 digits (except milestones, which use version names). Always verify the next ID by scanning:
```bash
grep -rh 'id="SPEC-' plan/spec/ | sort
grep -rh 'id="WORK-' plan/work/ | sort
grep -rh 'id="ADR-' plan/decision/ | sort
```

## Valid Statuses

### spec
`draft` → `review` → `accepted` → `superseded` | `deprecated`

### work
`draft` → `ready` → `in-progress` → `review` → `done`
Also: `blocked` (waiting on a dependency) and `pending` (acknowledged but not yet ready)

### bug
`reported` → `confirmed` → `in-progress` → `fixed`
Also: `wontfix`, `duplicate`

### decision
`proposed` → `accepted` → `superseded` | `deprecated`

### milestone
`planning` → `active` → `complete`

## When to Create Each Type

- **Spec**: A new feature idea, design proposal, or system description. Specs are the source of truth for *what* to build. They can be any length — from a short proposal to a full design document.
- **Work item**: A discrete, implementable piece of work. Created by breaking a spec into concrete tasks. Every work item should have acceptance criteria.
- **Bug**: A defect report. Use instead of a work item when something is broken rather than missing.
- **Decision**: An architectural choice that needs to be recorded. Create one *before* implementing when you face a non-obvious design choice, so future sessions understand *why* something was built a certain way.

## Required Content Structure

### spec

```markdoc
{% spec id="SPEC-XXX" status="draft" tags="area1, area2" %}

# Title

> Brief summary of scope and purpose.

## Section headings as needed
Body content — prose, tables, code, diagrams. Freeform.

{% /spec %}
```

Optional attributes: `version`, `supersedes` (ID of replaced spec).

### work

```markdoc
{% work id="WORK-XXX" status="ready" priority="high" complexity="moderate" tags="area" %}

# What needs to be done

Description of the change and why it's needed.

## Acceptance Criteria
- [ ] First criterion
- [ ] Second criterion
- [ ] Third criterion

## Approach
Technical notes on how to implement.

## References
- SPEC-XXX (relevant spec)
- WORK-YYY (dependency)

{% /work %}
```

**Acceptance Criteria is the most important section.** Every work item must have it. Use checkboxes (`- [ ]`) so progress is trackable. Check them off (`- [x]`) as you complete each one.

Other useful sections: Edge Cases, Verification, Dependencies.

Optional attributes: `assignee`, `milestone`, `complexity` (`trivial`/`simple`/`moderate`/`complex`/`unknown`).

### bug

```markdoc
{% bug id="BUG-XXX" status="reported" severity="major" tags="area" %}

# Short description of the bug

## Steps to Reproduce
1. First step
2. Second step
3. Observe the problem

## Expected
What should happen.

## Actual
What actually happens.

## Environment
- Browser/runtime version
- OS
- Package versions

{% /bug %}
```

Optional attributes: `assignee`, `milestone`.

### decision

```markdoc
{% decision id="ADR-XXX" status="proposed" date="2026-03-22" tags="area" %}

# Decision title

## Context
Why this decision is needed. What problem or question prompted it.

## Options Considered
1. **Option A** — description, pros, cons
2. **Option B** — description, pros, cons
3. **Option C** — description, pros, cons

## Decision
Which option was chosen.

## Rationale
Why this option was chosen over the alternatives.

## Consequences
What follows from this decision — trade-offs, follow-up work, constraints imposed.

{% /decision %}
```

Optional attributes: `supersedes` (ID of replaced decision).

### milestone

```markdoc
{% milestone name="v1.0.0" status="active" target="2026-04-15" %}

# v1.0.0 — Milestone Title

- Goal one
- Goal two
- Goal three

Optional notes or context.

{% /milestone %}
```

## Working with Plan Content

### Implementing a work item

```bash
# 1. Find the next ready work item (considers priority and dependencies)
npx refrakt plan next

# 2. Start working on it
npx refrakt plan update WORK-XXX --status in-progress
```

3. Before implementing, read referenced specs and decisions (check tags and ID references in the file). Ensure dependency work items are `done`.

4. Implement the changes in the codebase.

```bash
# 5. Check off acceptance criteria as you complete each one
npx refrakt plan update WORK-XXX --check "criterion text"

# 6. When all criteria pass, mark it done with a --resolve summary
npx refrakt plan update WORK-XXX --status done --resolve "$(cat <<'EOF'
Branch: `claude/branch-name`

### What was done
- Concrete list of changes

### Notes
- Implementation decisions or tradeoffs
EOF
)"
```

Additional `update` options: `--priority`, `--milestone`, `--assignee`, `--uncheck`. Use `--format json` for machine-readable output. Multiple flags can be combined in a single call.

**IMPORTANT: When finishing a work item, you MUST:**
1. Check off EVERY satisfied acceptance criterion with `npx refrakt plan update <id> --check "exact criterion text"` — do not skip any
2. Always include `--resolve` with a summary when marking done — this is the project's historical record
3. Never manually edit work item `.md` files — always use the CLI
4. Commit the updated work item file with your implementation changes

### Creating a work item from a spec

1. Read the spec thoroughly
2. Identify discrete, independently implementable pieces

```bash
# 3. Scaffold one work item per piece
npx refrakt plan create work --id WORK-XXX --title "Description" --priority high

# Other types work the same way
npx refrakt plan create bug --id BUG-XXX --title "Description"
npx refrakt plan create decision --id ADR-XXX --title "Description"
npx refrakt plan create spec --id SPEC-XXX --title "Description"
npx refrakt plan create milestone --id v1.0 --title "Description"
```

4. Reference the spec ID in the work item's References section
5. Set `priority` based on dependencies and importance
6. Set `complexity` based on scope (see table below)

### Recording a decision during implementation

If you encounter a non-obvious design choice:

```bash
npx refrakt plan create decision --id ADR-XXX --title "Decision title"
```

1. Document the context, options, and your recommendation in the generated file
2. Proceed with implementation using the chosen approach
3. The decision record preserves the reasoning for future sessions

### Initializing plan structure in a new project

```bash
npx refrakt plan init
```

Creates `plan/work/`, `plan/spec/`, `plan/decision/` with example files and updates `CLAUDE.md` with workflow instructions.

### Complexity guide

| Value | Signal |
|-------|--------|
| `trivial` | Single file change, obvious implementation |
| `simple` | One package, clear approach, few edge cases |
| `moderate` | Multiple files/packages, some design decisions needed |
| `complex` | Cross-cutting change, architectural implications, many edge cases |
| `unknown` | Needs investigation before complexity can be assessed |

## Tags

Use lowercase, hyphenated tags. Common tags in this project:

- Package areas: `runes`, `transform`, `lumina`, `content`, `svelte`, `sveltekit`, `editor`, `cli`
- Feature areas: `css`, `layout`, `pipeline`, `content-model`, `themes`
- Rune names: `tint`, `nav`, `tabs`, etc.
- Cross-cutting: `architecture`, `tooling`, `docs`

Multiple tags are comma-separated in the attribute: `tags="runes, css, lumina"`.
