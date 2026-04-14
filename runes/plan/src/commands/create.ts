import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { renderTemplate, VALID_TYPES, type PlanItemType } from './templates.js';
import { nextId, idExists, isAutoIdType } from './next-id.js';

export const EXIT_SUCCESS = 0;
export const EXIT_ALREADY_EXISTS = 1;
export const EXIT_INVALID_ARGS = 2;
export const EXIT_DUPLICATE_ID = 3;

/** Directory name for each type */
const TYPE_DIRS: Record<PlanItemType, string> = {
	work: 'work',
	bug: 'work', // bugs live alongside work items
	decision: 'decisions',
	spec: 'specs',
	milestone: 'milestones',
};

export interface CreateOptions {
	dir: string;
	type: PlanItemType;
	id?: string;
	title: string;
	attrs?: Record<string, string>;
}

export interface CreateResult {
	file: string;
	type: PlanItemType;
	id: string;
}

/**
 * Scaffold a new plan item from a template.
 * When id is omitted, auto-assigns the next available ID by scanning existing files.
 */
export function runCreate(options: CreateOptions): CreateResult {
	const { dir, type, title, attrs } = options;
	let { id } = options;

	if (!VALID_TYPES.includes(type)) {
		const err = new Error(`Invalid type "${type}". Valid types: ${VALID_TYPES.join(', ')}`) as any;
		err.exitCode = EXIT_INVALID_ARGS;
		throw err;
	}

	if (!title) {
		const err = new Error('--title is required') as any;
		err.exitCode = EXIT_INVALID_ARGS;
		throw err;
	}

	// Auto-assign ID if not provided
	if (!id) {
		if (!isAutoIdType(type)) {
			const err = new Error(`--id is required for type "${type}" (milestones use semver names)`) as any;
			err.exitCode = EXIT_INVALID_ARGS;
			throw err;
		}
		id = nextId(dir, type);
	}

	// Check for duplicate IDs
	const existingFile = idExists(dir, id);
	if (existingFile) {
		const err = new Error(`ID "${id}" already exists in ${existingFile}`) as any;
		err.exitCode = EXIT_DUPLICATE_ID;
		throw err;
	}

	const subDir = join(dir, TYPE_DIRS[type]);
	mkdirSync(subDir, { recursive: true });

	// Generate a filename from the title
	const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
	const fileName = `${slug}.md`;
	const filePath = join(subDir, fileName);

	if (existsSync(filePath)) {
		const err = new Error(`File already exists: ${filePath}`) as any;
		err.exitCode = EXIT_ALREADY_EXISTS;
		throw err;
	}

	const content = renderTemplate(type, { id, title, attrs });
	writeFileSync(filePath, content);

	return { file: filePath, type, id };
}
