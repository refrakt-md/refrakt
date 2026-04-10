import { readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { scanPlanFiles } from '../scanner.js';
import type { PlanEntity, PlanRuneType } from '../types.js';

// --- Valid attribute values by rune type ---

const VALID_STATUS: Record<PlanRuneType, readonly string[]> = {
	work: ['draft', 'ready', 'in-progress', 'review', 'done', 'blocked'],
	spec: ['draft', 'review', 'accepted', 'superseded', 'deprecated'],
	bug: ['reported', 'confirmed', 'in-progress', 'fixed', 'wontfix', 'duplicate'],
	decision: ['proposed', 'accepted', 'superseded', 'deprecated'],
	milestone: ['planning', 'active', 'complete'],
};

const VALID_PRIORITY: readonly string[] = ['critical', 'high', 'medium', 'low'];
const VALID_COMPLEXITY: readonly string[] = ['trivial', 'simple', 'moderate', 'complex', 'unknown'];
const VALID_SEVERITY: readonly string[] = ['critical', 'major', 'minor', 'cosmetic'];

/** Attributes with constrained value sets, by rune type */
function getEnumAttrs(type: PlanRuneType): Record<string, readonly string[]> {
	const attrs: Record<string, readonly string[]> = {
		status: VALID_STATUS[type],
	};
	if (type === 'work') {
		attrs.priority = VALID_PRIORITY;
		attrs.complexity = VALID_COMPLEXITY;
	}
	if (type === 'bug') {
		attrs.severity = VALID_SEVERITY;
	}
	return attrs;
}

/** Attributes allowed per rune type (all of them, not just enums) */
const ALLOWED_ATTRS: Record<PlanRuneType, readonly string[]> = {
	work: ['id', 'status', 'priority', 'complexity', 'assignee', 'milestone', 'source', 'tags'],
	spec: ['id', 'status', 'version', 'supersedes', 'tags'],
	bug: ['id', 'status', 'severity', 'assignee', 'milestone', 'source', 'tags'],
	decision: ['id', 'status', 'date', 'supersedes', 'tags'],
	milestone: ['name', 'status', 'target'],
};

// --- Exit codes ---

export const EXIT_SUCCESS = 0;
export const EXIT_VALIDATION_ERROR = 1;
export const EXIT_NOT_FOUND = 2;

export interface UpdateOptions {
	id: string;
	dir: string;
	attrs: Record<string, string>;
	check?: string;
	uncheck?: string;
	resolve?: string;
	resolveFile?: string;
	formatJson?: boolean;
}

export interface UpdateResult {
	file: string;
	type: PlanRuneType;
	changes: { field: string; old: string; new: string }[];
}

/**
 * Find a plan entity by ID.
 * Scans all .md files under dir and returns the entity plus its absolute file path.
 */
function findEntity(id: string, dir: string): { entity: PlanEntity; absPath: string } | null {
	const entities = scanPlanFiles(dir);
	const entity = entities.find(e => e.attributes.id === id || e.attributes.name === id);
	if (!entity) return null;
	return { entity, absPath: resolve(join(dir, entity.file)) };
}

/**
 * Replace an attribute value in a rune opening tag line.
 * Handles both `attr="value"` and `attr='value'` styles.
 */
function replaceAttr(line: string, attr: string, newValue: string): { line: string; oldValue: string | null } {
	// Match attr="value" or attr='value'
	const regex = new RegExp(`(${attr})=(["'])([^"']*?)\\2`);
	const match = line.match(regex);
	if (match) {
		const oldValue = match[3];
		const quote = match[2];
		const newLine = line.replace(regex, `${attr}=${quote}${newValue}${quote}`);
		return { line: newLine, oldValue };
	}
	return { line, oldValue: null };
}

/**
 * Add an attribute to a rune opening tag line (before the closing %}).
 */
function addAttr(line: string, attr: string, value: string): string {
	// Insert before the closing %}
	return line.replace(/%\}/, `${attr}="${value}" %}`);
}

/**
 * Execute the plan update command.
 * Returns the result on success, or throws with an error message.
 */
export function runUpdate(options: UpdateOptions): UpdateResult {
	const { id, dir, attrs, check, uncheck } = options;

	const found = findEntity(id, dir);
	if (!found) {
		const err = new Error(`Entity not found: ${id}`);
		(err as any).exitCode = EXIT_NOT_FOUND;
		throw err;
	}

	const { entity, absPath } = found;
	const changes: UpdateResult['changes'] = [];

	// --- Validate attributes ---
	const enumAttrs = getEnumAttrs(entity.type);
	const allowed = ALLOWED_ATTRS[entity.type];

	for (const [attr, value] of Object.entries(attrs)) {
		if (attr === 'id' || attr === 'name') {
			const err = new Error(`Cannot change the "${attr}" attribute`);
			(err as any).exitCode = EXIT_VALIDATION_ERROR;
			throw err;
		}
		if (!allowed.includes(attr)) {
			const err = new Error(`Unknown attribute "${attr}" for ${entity.type} rune. Valid: ${allowed.join(', ')}`);
			(err as any).exitCode = EXIT_VALIDATION_ERROR;
			throw err;
		}
		if (enumAttrs[attr]) {
			const valid = enumAttrs[attr];
			if (!valid.includes(value)) {
				const err = new Error(`Invalid ${attr} "${value}" for ${entity.type} rune. Valid: ${valid.join(', ')}`);
				(err as any).exitCode = EXIT_VALIDATION_ERROR;
				throw err;
			}
		}
	}

	let content = readFileSync(absPath, 'utf8');
	const lines = content.split('\n');

	// --- Find the rune opening tag line ---
	const tagPattern = new RegExp(`^\\{%\\s+${entity.type}\\s`);
	const tagLineIdx = lines.findIndex(l => tagPattern.test(l));
	if (tagLineIdx === -1) {
		const err = new Error(`Could not find ${entity.type} tag in ${entity.file}`);
		(err as any).exitCode = EXIT_VALIDATION_ERROR;
		throw err;
	}

	// --- Apply attribute changes ---
	let tagLine = lines[tagLineIdx];
	for (const [attr, value] of Object.entries(attrs)) {
		const result = replaceAttr(tagLine, attr, value);
		if (result.oldValue !== null) {
			changes.push({ field: attr, old: result.oldValue, new: value });
			tagLine = result.line;
		} else {
			// Attribute doesn't exist yet — add it
			tagLine = addAttr(tagLine, attr, value);
			changes.push({ field: attr, old: '', new: value });
		}
	}
	lines[tagLineIdx] = tagLine;

	// --- Apply checkbox toggling ---
	if (check) {
		const matches: number[] = [];
		const checkboxUnchecked = /^([\s]*-\s+)\[ \](\s+.+)/;
		for (let i = 0; i < lines.length; i++) {
			if (checkboxUnchecked.test(lines[i]) && lines[i].includes(check)) {
				matches.push(i);
			}
		}
		if (matches.length === 0) {
			const err = new Error(`No unchecked criterion matching "${check}"`);
			(err as any).exitCode = EXIT_VALIDATION_ERROR;
			throw err;
		}
		if (matches.length > 1) {
			const err = new Error(`Ambiguous: ${matches.length} unchecked criteria match "${check}"`);
			(err as any).exitCode = EXIT_VALIDATION_ERROR;
			throw err;
		}
		const idx = matches[0];
		const old = lines[idx];
		lines[idx] = old.replace('[ ]', '[x]');
		const text = old.replace(/^[\s]*-\s+\[ \]\s+/, '').trim();
		changes.push({ field: 'criterion', old: '[ ] ' + text, new: '[x] ' + text });
	}

	if (uncheck) {
		const matches: number[] = [];
		const checkboxChecked = /^([\s]*-\s+)\[[xX]\](\s+.+)/;
		for (let i = 0; i < lines.length; i++) {
			if (checkboxChecked.test(lines[i]) && lines[i].includes(uncheck)) {
				matches.push(i);
			}
		}
		if (matches.length === 0) {
			const err = new Error(`No checked criterion matching "${uncheck}"`);
			(err as any).exitCode = EXIT_VALIDATION_ERROR;
			throw err;
		}
		if (matches.length > 1) {
			const err = new Error(`Ambiguous: ${matches.length} checked criteria match "${uncheck}"`);
			(err as any).exitCode = EXIT_VALIDATION_ERROR;
			throw err;
		}
		const idx = matches[0];
		const old = lines[idx];
		lines[idx] = old.replace(/\[[xX]\]/, '[ ]');
		const text = old.replace(/^[\s]*-\s+\[[xX]\]\s+/, '').trim();
		changes.push({ field: 'criterion', old: '[x] ' + text, new: '[ ] ' + text });
	}

	// --- Apply resolution ---
	let resolveBody = options.resolve;
	if (options.resolveFile) {
		resolveBody = readFileSync(resolve(options.resolveFile), 'utf8');
	}

	if (resolveBody !== undefined) {
		// Only allow on work and bug types
		if (entity.type !== 'work' && entity.type !== 'bug') {
			const err = new Error(`Resolution sections are only supported on work and bug items, not ${entity.type}`);
			(err as any).exitCode = EXIT_VALIDATION_ERROR;
			throw err;
		}

		const today = new Date().toISOString().slice(0, 10);
		const resolutionContent = `Completed: ${today}\n\n${resolveBody}`.trimEnd();

		// Check if a ## Resolution section already exists
		const resolutionHeadingIdx = lines.findIndex(l => /^##\s+Resolution\s*$/.test(l));

		if (resolutionHeadingIdx !== -1) {
			// Find the closing rune tag or next H2 heading to know where to insert the append
			let insertIdx = resolutionHeadingIdx + 1;
			for (let i = resolutionHeadingIdx + 1; i < lines.length; i++) {
				const closingTag = new RegExp(`^\\{%\\s+/${entity.type}\\s+%\\}`);
				if (closingTag.test(lines[i]) || /^##\s+[^#]/.test(lines[i])) {
					insertIdx = i;
					break;
				}
				insertIdx = i + 1;
			}
			// Append with separator
			const appendBlock = `\n---\n\n${resolutionContent}\n`;
			lines.splice(insertIdx, 0, appendBlock);
			changes.push({ field: 'resolution', old: '(appended)', new: 'updated' });
		} else {
			// Insert new ## Resolution section before the closing rune tag
			const closingTag = new RegExp(`^\\{%\\s+/${entity.type}\\s+%\\}`);
			const closingIdx = lines.findIndex(l => closingTag.test(l));
			if (closingIdx === -1) {
				// No closing tag — append at end
				lines.push('', '## Resolution', '', resolutionContent, '');
			} else {
				lines.splice(closingIdx, 0, '## Resolution', '', resolutionContent, '');
			}
			changes.push({ field: 'resolution', old: '', new: 'added' });
		}
	}

	// --- Write back ---
	if (changes.length > 0) {
		writeFileSync(absPath, lines.join('\n'));
	}

	return { file: entity.file, type: entity.type, changes };
}
