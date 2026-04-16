import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { runCreate } from './create.js';

export const EXIT_SUCCESS = 0;
export const EXIT_ALREADY_EXISTS = 1;

export type AgentTarget = 'claude' | 'cursor' | 'copilot' | 'windsurf' | 'cline' | 'none';

/** Map of agent tool names to their instruction file paths (relative to project root). */
export const AGENT_FILES: Record<string, string> = {
	claude: 'CLAUDE.md',
	cursor: '.cursorrules',
	copilot: '.github/copilot-instructions.md',
	windsurf: '.windsurfrules',
	cline: '.clinerules',
};

export interface InitOptions {
	dir: string;
	/** Path to the project root (for agent instruction files). Defaults to '.' */
	projectRoot?: string;
	/** Which AI tool instruction file(s) to update. Auto-detects when omitted. */
	agent?: AgentTarget;
}

export interface InitResult {
	dir: string;
	created: string[];
	agentFilesUpdated: string[];
}

/** Short pointer appended to agent instruction files. */
const POINTER_SECTION = `
## Plan

Project planning content lives in \`plan/\` using \`@refrakt-md/plan\`. See \`plan/INSTRUCTIONS.md\` for the full workflow guide.

Quick start: \`refrakt plan next\` | \`refrakt plan status\` | \`refrakt plan create work --title "..."\`
`;

/** Full tool-agnostic workflow guide written to plan/INSTRUCTIONS.md. */
const INSTRUCTIONS_CONTENT = `# Plan — Workflow Guide

This directory contains project planning content using the \`@refrakt-md/plan\` runes package. All files are Markdoc (\`.md\` with \`{% %}\` tags).

## Directory Layout

\`\`\`
plan/
  specs/      — Specifications (what to build)
  work/       — Work items and bugs (how to build it)
  decisions/  — Architecture decision records (why it's built this way)
  milestones/ — Named release targets with scope and goals
\`\`\`

## Workflow

1. Find next work item: \`refrakt plan next\`
2. Start working: \`refrakt plan update <id> --status in-progress\`
3. Read referenced specs and decisions before implementing
4. Check off criteria: \`refrakt plan update <id> --check "criterion text"\`
5. Mark complete with resolution: \`refrakt plan update <id> --status done --resolve "summary of what was done"\`
6. Check project status: \`refrakt plan status\`

When marking a work item done, always provide a \`--resolve\` summary unless the change is trivial. This captures implementation context (files changed, decisions made, branch/PR) for future reference.

## ID Conventions

| Type | Prefix | Example |
|------|--------|---------|
| Spec | \`SPEC-\` | \`SPEC-023\` |
| Work | \`WORK-\` | \`WORK-051\` |
| Decision | \`ADR-\` | \`ADR-005\` |
| Bug | \`BUG-\` | \`BUG-001\` |
| Milestone | \`v\`+semver | \`v1.0.0\` |

IDs are auto-assigned when you omit \`--id\` from \`refrakt plan create\`.

## Valid Statuses

- **spec**: \`draft\` → \`review\` → \`accepted\` → \`superseded\` | \`deprecated\`
- **work**: \`draft\` → \`ready\` → \`in-progress\` → \`review\` → \`done\` (also: \`blocked\`)
- **bug**: \`reported\` → \`confirmed\` → \`in-progress\` → \`fixed\` (also: \`wontfix\`, \`duplicate\`)
- **decision**: \`proposed\` → \`accepted\` → \`superseded\` | \`deprecated\`
- **milestone**: \`planning\` → \`active\` → \`complete\`

## Creating Items

\`\`\`bash
refrakt plan create work --title "Description"
refrakt plan create bug --title "Description"
refrakt plan create spec --title "Description"
refrakt plan create decision --title "Description"
refrakt plan create milestone --id v1.0 --title "Description"
\`\`\`

## When to Create Each Type

- **Spec**: A new feature idea, design proposal, or system description. Source of truth for *what* to build.
- **Work item**: A discrete, implementable piece of work with acceptance criteria.
- **Bug**: A defect report. Use instead of a work item when something is broken rather than missing.
- **Decision**: An architectural choice that needs to be recorded for future reference.

## JSON Output

All commands support \`--format json\` for machine-readable output. This is useful for scripting, CI pipelines, and programmatic integration.
`;

/**
 * Detect which agent instruction files already exist in the project root.
 * Returns the relative file paths of existing files.
 */
function detectAgentFiles(projectRoot: string): string[] {
	const found: string[] = [];
	for (const relPath of Object.values(AGENT_FILES)) {
		if (existsSync(join(projectRoot, relPath))) {
			found.push(relPath);
		}
	}
	return found;
}

/**
 * Append the plan pointer section to an agent instruction file.
 * Creates the file (and parent directories) if it doesn't exist.
 * Returns true if the file was updated.
 */
function appendPointer(projectRoot: string, relPath: string): boolean {
	const filePath = join(projectRoot, relPath);
	if (existsSync(filePath)) {
		const content = readFileSync(filePath, 'utf-8');
		if (content.includes('plan/INSTRUCTIONS.md') || content.includes('refrakt plan next')) {
			return false;
		}
		appendFileSync(filePath, POINTER_SECTION);
		return true;
	}
	const dir = dirname(filePath);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	writeFileSync(filePath, POINTER_SECTION.trimStart());
	return true;
}

/**
 * Initialize a plan directory structure with example files.
 */
export function runInit(options: InitOptions): InitResult {
	const { dir, projectRoot = '.', agent } = options;
	const created: string[] = [];

	// Create directories
	const dirs = ['work', 'specs', 'decisions', 'milestones'];
	for (const sub of dirs) {
		const path = join(dir, sub);
		if (!existsSync(path)) {
			mkdirSync(path, { recursive: true });
			created.push(path + '/');
		}
	}

	// Create example files — use runCreate which generates slug-based filenames
	const examples: { type: 'spec' | 'work' | 'decision' | 'milestone'; id: string; title: string; subDir: string; slug: string; attrs?: Record<string, string> }[] = [
		{ type: 'spec', id: 'SPEC-001', title: 'Example Spec', subDir: 'specs', slug: 'example-spec.md' },
		{ type: 'work', id: 'WORK-001', title: 'Example Work Item', subDir: 'work', slug: 'example-work-item.md', attrs: { priority: 'medium', complexity: 'simple', tags: '' } },
		{ type: 'decision', id: 'ADR-001', title: 'Example Decision', subDir: 'decisions', slug: 'example-decision.md' },
		{ type: 'milestone', id: 'v0.1.0', title: 'First Release', subDir: 'milestones', slug: 'first-release.md' },
	];

	for (const ex of examples) {
		const filePath = join(dir, ex.subDir, ex.slug);
		if (!existsSync(filePath)) {
			runCreate({ dir, type: ex.type, id: ex.id, title: ex.title, attrs: ex.attrs });
			created.push(filePath);
		}
	}

	// Create INSTRUCTIONS.md
	const instructionsFile = join(dir, 'INSTRUCTIONS.md');
	if (!existsSync(instructionsFile)) {
		writeFileSync(instructionsFile, INSTRUCTIONS_CONTENT);
		created.push(instructionsFile);
	}

	// Update agent instruction files
	const agentFilesUpdated: string[] = [];

	if (agent === 'none') {
		// Skip — user explicitly opted out
	} else if (agent) {
		// Specific agent requested
		const relPath = AGENT_FILES[agent];
		if (relPath && appendPointer(projectRoot, relPath)) {
			agentFilesUpdated.push(relPath);
		}
	} else {
		// Auto-detect: append to all existing agent files, fallback to CLAUDE.md
		const existing = detectAgentFiles(projectRoot);
		if (existing.length > 0) {
			for (const relPath of existing) {
				if (appendPointer(projectRoot, relPath)) {
					agentFilesUpdated.push(relPath);
				}
			}
		} else {
			if (appendPointer(projectRoot, AGENT_FILES.claude)) {
				agentFilesUpdated.push(AGENT_FILES.claude);
			}
		}
	}

	return { dir, created, agentFilesUpdated };
}
