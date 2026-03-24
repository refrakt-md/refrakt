import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve } from 'path';
import { execSync } from 'child_process';
import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
import type { PlanEntity, PlanRuneType, Criterion, Resolution, ScanCache, ScanCacheEntry, ScanOptions } from './types.js';

const PLAN_RUNE_TYPES = new Set<string>(['spec', 'work', 'bug', 'decision', 'milestone']);
const REF_TAG_NAMES = new Set<string>(['ref', 'xref']);
const CACHE_FILENAME = '.plan-cache.json';

/** Recursively collect all .md file paths under a directory */
function collectMdFiles(dir: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			files.push(...collectMdFiles(full));
		} else if (entry.endsWith('.md')) {
			files.push(full);
		}
	}
	return files;
}

/** Walk the AST and collect all nodes matching a predicate */
function walkNodes(node: Node, predicate: (n: Node) => boolean): Node[] {
	const results: Node[] = [];
	if (predicate(node)) results.push(node);
	if (node.children) {
		for (const child of node.children) {
			results.push(...walkNodes(child, predicate));
		}
	}
	return results;
}

/** Extract the title from the first H1 heading's text content */
function extractTitle(ast: Node): string | undefined {
	const headings = walkNodes(ast, n => n.type === 'heading' && n.attributes.level === 1);
	if (headings.length === 0) return undefined;

	const texts: string[] = [];
	walkNodes(headings[0], n => {
		if (n.type === 'text' && n.attributes.content) {
			texts.push(n.attributes.content as string);
		}
		return false;
	});
	return texts.join('').trim() || undefined;
}

/** Extract acceptance criteria checkboxes from the raw source lines within a plan rune */
function extractCriteria(source: string, runeStartLine: number, runeEndLine: number): Criterion[] {
	const lines = source.split('\n');
	const criteria: Criterion[] = [];
	for (let i = runeStartLine; i < runeEndLine && i < lines.length; i++) {
		const match = lines[i].match(/^[\s]*-\s+\[([ xX])\]\s+(.+)/);
		if (match) {
			criteria.push({
				text: match[2].trim(),
				checked: match[1] !== ' ',
			});
		}
	}
	return criteria;
}

/** Extract the Resolution section from the raw source within the rune's line range */
function extractResolution(source: string, runeStartLine: number, runeEndLine: number): Resolution | undefined {
	const lines = source.split('\n');
	// Find the first ## Resolution heading within the rune range
	let resolutionStart = -1;
	for (let i = runeStartLine; i < runeEndLine && i < lines.length; i++) {
		if (/^##\s+Resolution\s*$/.test(lines[i])) {
			resolutionStart = i;
			break;
		}
	}
	if (resolutionStart === -1) return undefined;

	// Collect all lines from after the heading to the end of the rune (or next ## heading)
	const contentLines: string[] = [];
	for (let i = resolutionStart + 1; i < runeEndLine && i < lines.length; i++) {
		// Stop at the next H2 heading (but not H3+)
		if (/^##\s+[^#]/.test(lines[i])) break;
		contentLines.push(lines[i]);
	}

	const content = contentLines.join('\n').trim();

	// Parse metadata lines
	let date: string | undefined;
	let branch: string | undefined;
	let pr: string | undefined;
	const bodyLines: string[] = [];

	for (const line of contentLines) {
		const dateMatch = line.match(/^Completed:\s*(.+)$/);
		if (dateMatch) { date = dateMatch[1].trim(); continue; }

		const branchMatch = line.match(/^Branch:\s*(.+)$/);
		if (branchMatch) { branch = branchMatch[1].trim().replace(/^`|`$/g, ''); continue; }

		const prMatch = line.match(/^PR:\s*(.+)$/);
		if (prMatch) { pr = prMatch[1].trim(); continue; }

		bodyLines.push(line);
	}

	const body = bodyLines.join('\n').trim();

	return { date, branch, pr, body };
}

/** Extract all referenced entity IDs from ref/xref tag nodes in the AST */
function extractRefs(ast: Node): string[] {
	const refNodes = walkNodes(ast, n => n.type === 'tag' && REF_TAG_NAMES.has(n.tag as string));
	const ids: string[] = [];
	for (const node of refNodes) {
		const primary = node.attributes.primary as string | undefined;
		if (primary) ids.push(primary);
	}
	// Deduplicate while preserving order
	return [...new Set(ids)];
}

/** Parse a single file and return PlanEntity if it contains a plan rune, or null */
export function parseFile(filePath: string, relPath: string): PlanEntity | null {
	const source = readFileSync(filePath, 'utf8');
	const ast = Markdoc.parse(source);

	// Find the first plan rune tag at the top level
	const planTag = ast.children.find(
		(n: Node) => n.type === 'tag' && PLAN_RUNE_TYPES.has(n.tag as string)
	);
	if (!planTag) return null;

	const runeType = planTag.tag as PlanRuneType;
	const attributes: Record<string, string> = {};
	for (const [key, value] of Object.entries(planTag.attributes)) {
		attributes[key] = String(value);
	}

	const title = extractTitle(planTag);

	const startLine = planTag.lines?.[0] ?? 0;
	const endLine = planTag.lines?.[planTag.lines.length - 1] ?? source.split('\n').length;
	const criteria = extractCriteria(source, startLine, endLine);

	const refs = extractRefs(planTag);
	const resolution = extractResolution(source, startLine, endLine);

	return { file: relPath, type: runeType, attributes, title, criteria, refs, resolution };
}

/** Read the cache file, returning an empty cache if it doesn't exist or is invalid */
function readCache(dir: string): ScanCache {
	const cachePath = join(dir, CACHE_FILENAME);
	if (!existsSync(cachePath)) return {};
	try {
		return JSON.parse(readFileSync(cachePath, 'utf8'));
	} catch {
		return {};
	}
}

/** Write the cache file */
function writeCache(dir: string, cache: ScanCache): void {
	writeFileSync(join(dir, CACHE_FILENAME), JSON.stringify(cache, null, '\t') + '\n');
}

/**
 * Get the git commit timestamps (in ms) for all files under a directory.
 * Uses a single `git log` call for efficiency. Returns a map of absolute path → ms timestamp.
 * Falls back gracefully to an empty map if git is unavailable or the dir is not a repo.
 */
function getGitMtimes(dir: string): Map<string, number> {
	const mtimes = new Map<string, number>();
	try {
		// Get the last commit timestamp for each file in one pass
		// Output: <unix-seconds>\t<file-path> per line
		const output = execSync(
			'git log --format="%at" --name-only --diff-filter=ACMR HEAD',
			{ cwd: dir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] },
		);

		let currentTimestamp = 0;
		for (const line of output.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			// Lines that are purely numeric are commit timestamps
			if (/^\d+$/.test(trimmed)) {
				currentTimestamp = parseInt(trimmed, 10);
				continue;
			}
			// Otherwise it's a file path — only record the first (most recent) timestamp per file
			if (currentTimestamp > 0 && trimmed.endsWith('.md') && !mtimes.has(trimmed)) {
				const absPath = resolve(dir, trimmed);
				mtimes.set(absPath, currentTimestamp * 1000);
			}
		}
	} catch {
		// Not a git repo or git not available — fall back to stat mtime
	}
	return mtimes;
}

/**
 * Scan a directory recursively for .md files containing plan runes.
 * Returns typed PlanEntity objects for each discovered entity.
 */
export function scanPlanFiles(dir: string, options: ScanOptions = {}): PlanEntity[] {
	const files = collectMdFiles(dir);
	const useCache = options.cache === true;
	const cache = useCache ? readCache(dir) : {};
	const newCache: ScanCache = {};
	const entities: PlanEntity[] = [];

	// Prefer git commit dates over filesystem mtime (git doesn't preserve file mtimes)
	const gitMtimes = getGitMtimes(dir);

	for (const filePath of files) {
		const relPath = relative(dir, filePath);
		const stat = statSync(filePath);
		const cached = cache[relPath];

		// Use git commit date when available, fall back to stat mtime
		const mtime = gitMtimes.get(resolve(dir, relPath)) ?? stat.mtimeMs;

		// Check cache validity (still keyed on stat mtime for content freshness)
		if (useCache && cached && cached.mtime === stat.mtimeMs && cached.size === stat.size) {
			cached.entity.mtime = mtime;
			entities.push(cached.entity);
			newCache[relPath] = cached;
			continue;
		}

		const entity = parseFile(filePath, relPath);
		if (entity) {
			entity.mtime = mtime;
			entities.push(entity);
			if (useCache) {
				newCache[relPath] = { mtime: stat.mtimeMs, size: stat.size, entity };
			}
		}
	}

	if (useCache) {
		writeCache(dir, newCache);
	}

	return entities;
}
