import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { runCreate } from './create.js';

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

### Workflow

1. Find next work item: \`refrakt plan next\`
2. Start working: \`refrakt plan update <id> --status in-progress\`
3. Check off criteria: \`refrakt plan update <id> --check "criterion text"\`
4. Mark complete: \`refrakt plan update <id> --status done\`
5. Check project status: \`refrakt plan status\`
`;

/**
 * Initialize a plan directory structure with example files.
 */
export function runInit(options: InitOptions): InitResult {
	const { dir, projectRoot = '.' } = options;
	const created: string[] = [];

	// Create directories
	const dirs = ['work', 'spec', 'decision'];
	for (const sub of dirs) {
		const path = join(dir, sub);
		if (!existsSync(path)) {
			mkdirSync(path, { recursive: true });
			created.push(path + '/');
		}
	}

	// Create example files — use runCreate which generates slug-based filenames
	const examples: { type: 'spec' | 'work' | 'decision'; id: string; title: string; subDir: string; slug: string; attrs?: Record<string, string> }[] = [
		{ type: 'spec', id: 'SPEC-001', title: 'Example Spec', subDir: 'spec', slug: 'example-spec.md' },
		{ type: 'work', id: 'WORK-001', title: 'Example Work Item', subDir: 'work', slug: 'example-work-item.md', attrs: { priority: 'medium', complexity: 'simple', tags: '' } },
		{ type: 'decision', id: 'ADR-001', title: 'Example Decision', subDir: 'decision', slug: 'example-decision.md' },
	];

	for (const ex of examples) {
		const filePath = join(dir, ex.subDir, ex.slug);
		if (!existsSync(filePath)) {
			runCreate({ dir, type: ex.type, id: ex.id, title: ex.title, attrs: ex.attrs });
			created.push(filePath);
		}
	}

	// Create index.md
	const indexFile = join(dir, 'index.md');
	if (!existsSync(indexFile)) {
		writeFileSync(indexFile, `# Project Plan

This directory contains project planning content.

## Structure

- \`spec/\` — Specifications (what to build)
- \`work/\` — Work items (how to build it)
- \`decision/\` — Architecture decision records (why it's built this way)

## Quick Start

\`\`\`bash
refrakt plan next          # Find next work item
refrakt plan status        # Project overview
refrakt plan create work --id WORK-002 --title "My task"
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
