import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { runCreate } from './create.js';
import { STATUS_PAGES, renderStatusPage, renderTypeIndexPage } from './templates.js';

export const EXIT_SUCCESS = 0;
export const EXIT_ALREADY_EXISTS = 1;

export interface InitOptions {
	dir: string;
	/** Path to the project root (for CLAUDE.md). Defaults to '.' */
	projectRoot?: string;
}

export interface InitResult {
	dir: string;
	created: string[];
	claudeMdUpdated: boolean;
}

const WORKFLOW_SECTION = `
## Plan

Project planning content lives in \`plan/\` as Markdoc files using the \`@refrakt-md/plan\` runes package.

### Structure

\`\`\`
plan/
  spec/      — Specifications (source of truth for what to build)
  work/      — Work items and bugs (what to implement)
  decision/  — Architecture decision records (why it's built this way)
  milestone/ — Named release targets with scope and goals
\`\`\`

### Rune syntax

- \`{% spec id="SPEC-001" status="accepted" %}\` — specification document
- \`{% work id="WORK-001" status="ready" priority="high" source="SPEC-001" %}\` — work item (\`source\` links to parent spec/decision)
- \`{% bug id="BUG-001" status="confirmed" severity="major" source="SPEC-001" %}\` — bug report
- \`{% decision id="ADR-001" status="accepted" source="SPEC-001" %}\` — architecture decision record (\`source\` links to spec it informs)
- \`{% milestone name="v0.5.0" status="active" %}\` — release target

### Workflow

\`\`\`bash
# 1. Find the next work item
npx refrakt plan next

# 2. Start working on it
npx refrakt plan update <id> --status in-progress
\`\`\`

3. Before implementing, read:
   - The work item's referenced specs in \`plan/spec/\` (follow ID references)
   - Related decision records in \`plan/decision/\` (check tags)
   - Any dependency work items (ensure they're done)

\`\`\`bash
# 4. Check off acceptance criteria as you complete them
npx refrakt plan update <id> --check "criterion text"

# 5. When all criteria are met, mark it done with a resolution summary
npx refrakt plan update <id> --status done --resolve "$(cat <<'EOF'
Branch: \\\`feature-branch\\\`

### What was done
- List of concrete changes

### Notes
- Implementation decisions and tradeoffs
EOF
)"
\`\`\`

When marking a work item done, always provide a \`--resolve\` summary unless the change is trivial. This captures implementation context (files changed, decisions made, branch/PR) for future reference.

### MANDATORY: Work Item Completion Checklist

**When you finish implementing a work item, you MUST do ALL of the following before considering the task complete. Do NOT skip any step. Do NOT manually edit work item files — always use the CLI.**

1. **Check off each acceptance criterion** individually using the CLI:
   \`\`\`bash
   npx refrakt plan update <id> --check "exact criterion text"
   \`\`\`
   Run this for EVERY criterion that was satisfied. Copy the criterion text exactly from the work item.

2. **Mark the item as done with a \`--resolve\` summary**:
   \`\`\`bash
   npx refrakt plan update <id> --status done --resolve "$(cat <<'EOF'
   ### What was done
   - Concrete list of files changed and what was done in each

   ### Notes
   - Any implementation decisions or tradeoffs worth recording
   EOF
   )"
   \`\`\`

3. **Commit the updated work item file** along with your implementation changes.

Never mark a work item done without checking off criteria first. Never skip the \`--resolve\` summary. These are the project's historical record of what was built and why.

### Creating plan content

\`\`\`bash
# Scaffold new items (IDs auto-assigned by scanning existing files)
npx refrakt plan create work --title "Description"
npx refrakt plan create bug --title "Description"
npx refrakt plan create decision --title "Description"
npx refrakt plan create spec --title "Description"
npx refrakt plan create milestone --id v1.0 --title "Description"  # milestones require explicit ID

# See the next available ID without creating anything
npx refrakt plan next-id work
\`\`\`

- IDs are auto-assigned when \`--id\` is omitted; duplicate IDs are rejected at create time
- Use H2 sections for structure (Acceptance Criteria, Approach, Context, etc.)
- Use \`--format json\` on any command for machine-readable output
`;

const PLAN_CLAUDE_MD = `# Plan — Claude Code Guide

This directory contains project planning content using the \`@refrakt-md/plan\` runes package. All files are Markdoc (\`.md\` with \`{% %}\` tags).

## Directory Layout

\`\`\`
plan/
  spec/      — Specifications (what to build)
  work/      — Work items and bugs (how to build it)
  decision/  — Architecture decision records (why it's built this way)
  milestone/ — Named release targets with scope and goals
\`\`\`

## ID Conventions

Each rune type uses a unique prefix with zero-padded 3-digit numbers (except milestones, which use semver names like \`v0.9.0\`).

| Type | Prefix | Example |
|------|--------|---------|
| Spec | \`SPEC-\` | \`SPEC-023\` |
| Work | \`WORK-\` | \`WORK-051\` |
| Decision | \`ADR-\` | \`ADR-005\` |
| Bug | \`BUG-\` | \`BUG-001\` |
| Milestone | \`v\`+semver | \`v1.0.0\` |

**IDs are auto-assigned.** When you omit \`--id\` from \`npx refrakt plan create\`, the CLI scans existing files and assigns the next available ID. Duplicate IDs are rejected at create time.

\`\`\`bash
# See the next available ID for a type
refrakt plan next-id work

# Create with auto-assigned ID (recommended)
refrakt plan create work --title "My Task"

# Or specify an explicit ID if needed
refrakt plan create work --id WORK-080 --title "My Task"
\`\`\`

## Valid Statuses

### spec
\`draft\` → \`review\` → \`accepted\` → \`superseded\` | \`deprecated\`

### work
\`draft\` → \`ready\` → \`in-progress\` → \`review\` → \`done\`
Also: \`blocked\` (waiting on a dependency) and \`pending\` (acknowledged but not yet ready)

### bug
\`reported\` → \`confirmed\` → \`in-progress\` → \`fixed\`
Also: \`wontfix\`, \`duplicate\`

### decision
\`proposed\` → \`accepted\` → \`superseded\` | \`deprecated\`

### milestone
\`planning\` → \`active\` → \`complete\`

## When to Create Each Type

- **Spec**: A new feature idea, design proposal, or system description. Specs are the source of truth for *what* to build. They can be any length — from a short proposal to a full design document.
- **Work item**: A discrete, implementable piece of work. Created by breaking a spec into concrete tasks. Every work item should have acceptance criteria.
- **Bug**: A defect report. Use instead of a work item when something is broken rather than missing.
- **Decision**: An architectural choice that needs to be recorded. Create one *before* implementing when you face a non-obvious design choice, so future sessions understand *why* something was built a certain way.

## Required Content Structure

### spec

\`\`\`markdoc
{% spec id="SPEC-XXX" status="draft" tags="area1, area2" %}

# Title

Brief summary of scope and purpose.

## Section headings as needed
Body content — prose, tables, code, diagrams. Freeform.

{% /spec %}
\`\`\`

Optional attributes: \`version\`, \`supersedes\` (ID of replaced spec).

### work

\`\`\`markdoc
{% work id="WORK-XXX" status="ready" priority="high" complexity="moderate" source="SPEC-XXX" tags="area" %}

# What needs to be done

Description of the change and why it's needed.

## Acceptance Criteria
- [ ] First criterion
- [ ] Second criterion
- [ ] Third criterion

## Dependencies
- {% ref "WORK-YYY" /%} — needs the config interface it introduces

## Approach
Technical notes on how to implement.

## References
- {% ref "SPEC-XXX" /%} (relevant spec)

{% /work %}
\`\`\`

**Acceptance Criteria is the most important section.** Every work item must have it. Use checkboxes (\`- [ ]\`) so progress is trackable. Check them off (\`- [x]\`) as you complete each one.

**Dependencies vs References.** Use \`## Dependencies\` for blocking prerequisites — the \`next\` command checks their status and excludes items with unfinished dependencies. Use \`## References\` for informational context that doesn't block. Always use \`{% ref "ID" /%}\` tags (not plain text IDs) so the system can resolve them.

**Known sections** (with aliases) for work items: Acceptance Criteria (AC, Criteria, Done When), Dependencies (Deps, Depends On, Blocked By, Requires), Approach (Technical Notes, Implementation Notes, How), References (Refs, Related, Context), Edge Cases (Exceptions, Corner Cases), Verification (Test Cases, Tests).

Optional attributes: \`assignee\`, \`milestone\`, \`complexity\` (\`trivial\`/\`simple\`/\`moderate\`/\`complex\`/\`unknown\`), \`source\` (comma-separated IDs of specs/decisions this implements, e.g. \`SPEC-001,ADR-002\`).

### bug

\`\`\`markdoc
{% bug id="BUG-XXX" status="reported" severity="major" source="SPEC-XXX" tags="area" %}

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
\`\`\`

Optional attributes: \`assignee\`, \`milestone\`, \`source\` (comma-separated IDs of related specs/decisions).

**Known sections** for bugs: Steps to Reproduce (Reproduction, Steps, Repro), Expected (Expected Behaviour), Actual (Actual Behaviour), Environment (Env). Steps to Reproduce, Expected, and Actual are required for \`confirmed\`+ status.

### decision

\`\`\`markdoc
{% decision id="ADR-XXX" status="proposed" date="YYYY-MM-DD" source="SPEC-XXX" tags="area" %}

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
\`\`\`

Optional attributes: \`supersedes\` (ID of replaced decision), \`source\` (comma-separated IDs of specs/entities this decision informs, e.g. \`SPEC-001\`).

**Known sections** for decisions: Context (Background), Options Considered (Options, Alternatives), Decision, Rationale (Reasoning), Consequences (Impact, Trade-offs). Context and Decision are required for \`accepted\` status.

### milestone

\`\`\`markdoc
{% milestone name="v1.0.0" status="active" target="YYYY-MM-DD" %}

# v1.0.0 — Milestone Title

- Goal one
- Goal two
- Goal three

Optional notes or context.

{% /milestone %}
\`\`\`

## Working with Plan Content

### Implementing a work item

\`\`\`bash
# 1. Find the next ready work item (considers priority and dependencies)
npx refrakt plan next

# 2. Start working on it
npx refrakt plan update WORK-XXX --status in-progress
\`\`\`

3. Before implementing, read referenced specs and decisions (check tags and ID references in the file). Ensure dependency work items are \`done\`.

4. Implement the changes in the codebase.

\`\`\`bash
# 5. Check off acceptance criteria as you complete each one
npx refrakt plan update WORK-XXX --check "criterion text"

# 6. When all criteria pass, mark it done with a --resolve summary
npx refrakt plan update WORK-XXX --status done --resolve "$(cat <<'EOF'
Branch: \\\`feature-branch\\\`

### What was done
- Concrete list of changes

### Notes
- Implementation decisions or tradeoffs
EOF
)"
\`\`\`

Additional \`update\` options: \`--priority\`, \`--milestone\`, \`--assignee\`, \`--complexity\`, \`--uncheck\`. Use \`--format json\` for machine-readable output. Multiple flags can be combined in a single call. To clear an attribute, pass an empty string: \`--assignee ""\` removes the assignee, \`--milestone ""\` removes the milestone.

**IMPORTANT: When finishing a work item, you MUST:**
1. Check off EVERY satisfied acceptance criterion with \`npx refrakt plan update <id> --check "exact criterion text"\` — do not skip any
2. Always include \`--resolve\` with a summary when marking done — this is the project's historical record
3. Never manually edit work item \`.md\` files — always use the CLI
4. Commit the updated work item file with your implementation changes

### Creating a work item from a spec

1. Read the spec thoroughly
2. Identify discrete, independently implementable pieces

\`\`\`bash
# 3. Scaffold one work item per piece (ID auto-assigned)
npx refrakt plan create work --title "Description" --priority high

# Other types work the same way
npx refrakt plan create bug --title "Description"
npx refrakt plan create decision --title "Description"
npx refrakt plan create spec --title "Description"
npx refrakt plan create milestone --id v1.0 --title "Description"  # milestones require explicit ID
\`\`\`

4. Reference the spec ID in the work item's References section
5. Set \`priority\` based on dependencies and importance
6. Set \`complexity\` based on scope (see Complexity guide below)

### Recording a decision during implementation

If you encounter a non-obvious design choice:

\`\`\`bash
npx refrakt plan create decision --title "Decision title"
\`\`\`

1. Document the context, options, and your recommendation in the generated file
2. Set \`source="SPEC-XXX"\` to link the decision to the spec it informs
3. Proceed with implementation using the chosen approach
4. The decision record preserves the reasoning for future sessions

### Complexity guide

| Value | Signal |
|-------|--------|
| \`trivial\` | Single file change, obvious implementation |
| \`simple\` | One package, clear approach, few edge cases |
| \`moderate\` | Multiple files/packages, some design decisions needed |
| \`complex\` | Cross-cutting change, architectural implications, many edge cases |
| \`unknown\` | Needs investigation before complexity can be assessed |
`;

/**
 * Initialize a plan directory structure with example files.
 */
export function runInit(options: InitOptions): InitResult {
	const { dir, projectRoot = '.' } = options;
	const created: string[] = [];

	// Create directories
	const dirs = ['work', 'spec', 'decision', 'milestone'];
	for (const sub of dirs) {
		const path = join(dir, sub);
		if (!existsSync(path)) {
			mkdirSync(path, { recursive: true });
			created.push(path + '/');
		}
	}

	// Create example files — use runCreate which generates slug-based filenames
	const examples: { type: 'spec' | 'work' | 'decision' | 'milestone'; id: string; title: string; subDir: string; slug: string; attrs?: Record<string, string> }[] = [
		{ type: 'spec', id: 'SPEC-001', title: 'Example Spec', subDir: 'spec', slug: 'example-spec.md' },
		{ type: 'work', id: 'WORK-001', title: 'Example Work Item', subDir: 'work', slug: 'example-work-item.md', attrs: { priority: 'medium', complexity: 'simple', tags: '' } },
		{ type: 'decision', id: 'ADR-001', title: 'Example Decision', subDir: 'decision', slug: 'example-decision.md' },
		{ type: 'milestone', id: 'v0.1.0', title: 'First Release', subDir: 'milestone', slug: 'first-release.md' },
	];

	for (const ex of examples) {
		const filePath = join(dir, ex.subDir, ex.slug);
		if (!existsSync(filePath)) {
			runCreate({ dir, type: ex.type, id: ex.id, title: ex.title, attrs: ex.attrs });
			created.push(filePath);
		}
	}

	// Create status filter pages for each type
	for (const def of STATUS_PAGES) {
		const slug = `${def.status}.md`;
		const filePath = join(dir, def.typeDir, slug);
		if (!existsSync(filePath)) {
			writeFileSync(filePath, renderStatusPage(def));
			created.push(filePath);
		}
	}

	// Create type-level index pages with links to status filter pages
	const typeDirs = [...new Set(STATUS_PAGES.map(p => p.typeDir))];
	for (const typeDir of typeDirs) {
		const filePath = join(dir, typeDir, 'index.md');
		if (!existsSync(filePath)) {
			writeFileSync(filePath, renderTypeIndexPage(typeDir));
			created.push(filePath);
		}
	}

	// Create plan/CLAUDE.md reference guide
	const planClaudeMdFile = join(dir, 'CLAUDE.md');
	if (!existsSync(planClaudeMdFile)) {
		writeFileSync(planClaudeMdFile, PLAN_CLAUDE_MD);
		created.push(planClaudeMdFile);
	}

	// Create index.md
	const indexFile = join(dir, 'index.md');
	if (!existsSync(indexFile)) {
		writeFileSync(indexFile, `# Project Plan

This directory contains project planning content.

## Structure

- [Specifications](spec/) — What to build
- [Work Items](work/) — How to build it
- [Decisions](decision/) — Why it's built this way
- [Milestones](milestone/) — Named release targets

## Quick Start

\`\`\`bash
refrakt plan next          # Find next work item
refrakt plan status        # Project overview
refrakt plan create work --title "My task"
\`\`\`
`);
		created.push(indexFile);
	}

	// Update CLAUDE.md
	let claudeMdUpdated = false;
	const claudeMdPath = join(projectRoot, 'CLAUDE.md');
	if (existsSync(claudeMdPath)) {
		const content = readFileSync(claudeMdPath, 'utf-8');
		if (!content.includes('refrakt plan next')) {
			appendFileSync(claudeMdPath, WORKFLOW_SECTION);
			claudeMdUpdated = true;
		}
	} else {
		writeFileSync(claudeMdPath, `# CLAUDE.md\n${WORKFLOW_SECTION}`);
		claudeMdUpdated = true;
	}

	return { dir, created, claudeMdUpdated };
}
