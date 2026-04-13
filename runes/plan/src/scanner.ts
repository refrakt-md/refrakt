import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve } from 'path';
import { getGitTimestamps } from '@refrakt-md/content';
import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
import { escapeFenceTags } from '@refrakt-md/runes';
import type { PlanEntity, PlanRuneType, Criterion, Resolution, ScopedRef, ScanCache, ScanCacheEntry, ScanOptions, FileSource } from './types.js';

const PLAN_RUNE_TYPES = new Set<string>(['spec', 'work', 'bug', 'decision', 'milestone']);
const REF_TAG_NAMES = new Set<string>(['ref', 'xref']);

/** Known sections per rune type: canonical name → lowercase aliases */
const KNOWN_SECTIONS: Record<string, Record<string, string[]>> = {
	work: {
		'Acceptance Criteria': ['criteria', 'ac', 'done when'],
		'Dependencies': ['deps', 'depends on', 'blocked by', 'requires'],
		'Approach': ['technical notes', 'implementation notes', 'how'],
		'References': ['refs', 'related', 'context'],
		'Edge Cases': ['exceptions', 'corner cases'],
		'Verification': ['test cases', 'tests'],
	},
	bug: {
		'Steps to Reproduce': ['reproduction', 'steps', 'repro'],
		'Expected': ['expected behaviour'],
		'Actual': ['actual behaviour'],
		'Environment': ['env'],
	},
	decision: {
		'Context': ['background'],
		'Options Considered': ['options', 'alternatives'],
		'Decision': [],
		'Rationale': ['reasoning'],
		'Consequences': ['impact', 'trade-offs'],
	},
};

/** Match a heading text to a canonical known section name for a given rune type */
function matchKnownSection(runeType: string, headingText: string): string | undefined {
	const sections = KNOWN_SECTIONS[runeType];
	if (!sections) return undefined;
	const normalized = headingText.toLowerCase().trim();
	for (const [canonical, aliases] of Object.entries(sections)) {
		if (canonical.toLowerCase() === normalized) return canonical;
		if (aliases.some(a => a === normalized)) return canonical;
	}
	return undefined;
}
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

/** Extract heading text from an AST heading node */
function extractHeadingText(node: Node): string {
	const texts: string[] = [];
	walkNodes(node, n => {
		if (n.type === 'text' && n.attributes.content) {
			texts.push(n.attributes.content as string);
		}
		return false;
	});
	return texts.join('').trim();
}

/**
 * Extract section-scoped refs and known section presence from the AST.
 * Walks the plan tag's children, tracking which H2 section each ref falls in.
 */
function extractScopedRefs(planTag: Node, runeType: string): { scopedRefs: ScopedRef[]; knownSectionsPresent: string[] } {
	const scopedRefs: ScopedRef[] = [];
	const knownSectionsPresent: string[] = [];
	let currentSection: string | undefined;

	for (const child of planTag.children ?? []) {
		if (child.type === 'heading' && child.attributes?.level === 2) {
			const headingText = extractHeadingText(child);
			const canonical = matchKnownSection(runeType, headingText);
			currentSection = canonical;
			if (canonical && !knownSectionsPresent.includes(canonical)) {
				knownSectionsPresent.push(canonical);
			}
		}

		// Find refs in this node (including deeply nested ones)
		const refNodes = walkNodes(child, n => n.type === 'tag' && REF_TAG_NAMES.has(n.tag as string));
		for (const refNode of refNodes) {
			const id = refNode.attributes.primary as string | undefined;
			if (id) {
				scopedRefs.push({ id, section: currentSection });
			}
		}
	}

	// Deduplicate scopedRefs by id+section
	const seen = new Set<string>();
	const deduped: ScopedRef[] = [];
	for (const ref of scopedRefs) {
		const key = `${ref.id}:${ref.section ?? ''}`;
		if (!seen.has(key)) {
			seen.add(key);
			deduped.push(ref);
		}
	}

	return { scopedRefs: deduped, knownSectionsPresent };
}

/** Parse plan content from a string and return PlanEntity if it contains a plan rune, or null */
export function parseFileContent(source: string, relPath: string): PlanEntity | null {
	const ast = Markdoc.parse(escapeFenceTags(source));

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
	const { scopedRefs, knownSectionsPresent } = extractScopedRefs(planTag, runeType);
	const resolution = extractResolution(source, startLine, endLine);

	return { file: relPath, type: runeType, attributes, title, criteria, refs, scopedRefs, knownSectionsPresent, resolution };
}

/** Parse a single file from disk and return PlanEntity if it contains a plan rune, or null */
export function parseFile(filePath: string, relPath: string): PlanEntity | null {
	const source = readFileSync(filePath, 'utf8');
	return parseFileContent(source, relPath);
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
 * Adapter: convert the shared git timestamp utility output to the legacy
 * Map<absolutePath, milliseconds> format used by the scanner.
 */
function getGitMtimes(dir: string): Map<string, number> {
	const timestamps = getGitTimestamps(dir);
	const mtimes = new Map<string, number>();
	for (const [relPath, ts] of timestamps) {
		if (ts.modified) {
			const absPath = resolve(dir, relPath);
			// Convert ISO date string back to ms for compatibility
			mtimes.set(absPath, new Date(ts.modified + 'T00:00:00Z').getTime());
		}
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

/**
 * Scan plan entities from pre-fetched file contents.
 * Use this when files come from an external source (e.g. GitHub API)
 * rather than the local filesystem.
 */
export function scanPlanSources(sources: FileSource[]): PlanEntity[] {
	const entities: PlanEntity[] = [];
	for (const source of sources) {
		const entity = parseFileContent(source.content, source.path);
		if (entity) {
			entity.mtime = source.mtime;
			entities.push(entity);
		}
	}
	return entities;
}
