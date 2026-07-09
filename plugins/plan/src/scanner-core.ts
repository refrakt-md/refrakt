import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
import { escapeFenceTags } from '@refrakt-md/runes';
import type { PlanEntity, PlanRuneType, Criterion, Resolution, ScopedRef, DependencyEdge, FileSource } from './types.js';

const PLAN_RUNE_TYPES = new Set<string>(['spec', 'work', 'bug', 'decision', 'milestone']);
const REF_TAG_NAMES = new Set<string>(['ref', 'xref']);

/** The two directed dependency sections (SPEC-114). `Blocked by` = this item
 *  waits for the ref; `Blocks` = the ref waits for this item. `Dependencies`
 *  is retained as a deprecated alias of `Blocked by` so legacy content parses. */
export const BLOCKED_BY_SECTION = 'Blocked by';
export const BLOCKS_SECTION = 'Blocks';

/** Known sections per rune type: canonical name → lowercase aliases */
const KNOWN_SECTIONS: Record<string, Record<string, string[]>> = {
	work: {
		'Acceptance Criteria': ['criteria', 'ac', 'done when'],
		[BLOCKED_BY_SECTION]: ['depends on', 'requires', 'deps', 'needs', 'dependencies'],
		[BLOCKS_SECTION]: ['unblocks', 'enables', 'required by'],
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
		[BLOCKED_BY_SECTION]: ['depends on', 'requires', 'deps', 'needs', 'dependencies'],
		[BLOCKS_SECTION]: ['unblocks', 'enables', 'required by'],
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

/** Extract the title from the first H1 heading's text content.
 *
 * Picks up both `text` nodes and `code` nodes' content — Markdoc represents
 * inline backticks as a `code` node whose value sits in `attributes.content`
 * rather than as nested text, so a heading like `# Build rune \`name\``
 * would otherwise drop the `name` segment entirely. Bold/italic/links work
 * unchanged because they wrap nested `text` children. The result is plain
 * text (no backticks), suitable for the `data.title` field which is
 * interpolated into headings and `<title>` as a literal string. */
function extractTitle(ast: Node): string | undefined {
	const headings = walkNodes(ast, n => n.type === 'heading' && n.attributes.level === 1);
	if (headings.length === 0) return undefined;

	const texts: string[] = [];
	walkNodes(headings[0], n => {
		if ((n.type === 'text' || n.type === 'code') && n.attributes.content) {
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

/** Derive typed, directed dependency edges from section-scoped refs. Only refs
 *  in the `Blocked by` / `Blocks` sections become edges (SPEC-114); everything
 *  else — prose, `References`, the source line — is excluded. */
function computeDependencies(scopedRefs: ScopedRef[]): DependencyEdge[] {
	const edges: DependencyEdge[] = [];
	const seen = new Set<string>();
	for (const ref of scopedRefs) {
		let direction: DependencyEdge['direction'] | undefined;
		if (ref.section === BLOCKED_BY_SECTION) direction = 'blocked-by';
		else if (ref.section === BLOCKS_SECTION) direction = 'blocks';
		if (!direction) continue;
		const key = `${ref.id}:${direction}`;
		if (seen.has(key)) continue;
		seen.add(key);
		edges.push({ id: ref.id, direction });
	}
	return edges;
}

/**
 * Build the canonical dependency adjacency from a set of entities: `id → ids it
 * is blocked by` (i.e. must wait for). Both section directions normalise into
 * this one orientation — a `Blocks` edge `E → D` is recorded as `D` blocked by
 * `E`. This is the single source of truth the validator's cycle check and the
 * pipeline's dependency rollups both consume (SPEC-114).
 */
export function buildBlockedByAdjacency(entities: PlanEntity[]): Map<string, string[]> {
	const adj = new Map<string, string[]>();
	const add = (from: string, to: string) => {
		if (!from || !to || from === to) return;
		if (!adj.has(from)) adj.set(from, []);
		const list = adj.get(from)!;
		if (!list.includes(to)) list.push(to);
	};
	for (const e of entities) {
		const id = e.attributes.id || e.attributes.name;
		if (!id) continue;
		for (const dep of e.dependencies ?? []) {
			if (dep.direction === 'blocked-by') add(id, dep.id); // id waits for dep.id
			else add(dep.id, id); // id blocks dep.id → dep.id waits for id
		}
	}
	return adj;
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
	const dependencies = computeDependencies(scopedRefs);
	const resolution = extractResolution(source, startLine, endLine);

	return { file: relPath, type: runeType, attributes, title, criteria, refs, scopedRefs, dependencies, knownSectionsPresent, resolution };
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
