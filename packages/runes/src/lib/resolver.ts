/**
 * Content model resolver engine.
 *
 * Pure functions that resolve a rune's AST children against a declarative
 * content model, producing named fields without per-rune imperative code.
 */

import type { Node } from '@markdoc/markdoc';
import type {
	ContentModel,
	ContentFieldDefinition,
	DelimitedModel,
	SequenceModel,
	ResolvedContent,
} from '@refrakt-md/types';

// ---------------------------------------------------------------------------
// Pre-resolve extraction
// ---------------------------------------------------------------------------

export interface ResolveResult {
	/** Resolved content fields. */
	content: ResolvedContent;

	/** Extracted tint child tag (if present). */
	tintNode?: Node;

	/** Extracted bg child tag (if present). */
	bgNode?: Node;
}

/**
 * Extract special child tags (tint, bg) from children before resolving.
 * Returns the filtered children and extracted nodes.
 */
function extractSpecialTags(children: Node[]): {
	filtered: Node[];
	tintNode?: Node;
	bgNode?: Node;
} {
	let tintNode: Node | undefined;
	let bgNode: Node | undefined;

	const filtered = children.filter(n => {
		if (n.type === 'tag' && n.tag === 'tint') {
			tintNode = n;
			return false;
		}
		if (n.type === 'tag' && n.tag === 'bg') {
			bgNode = n;
			return false;
		}
		return true;
	});

	return { filtered, tintNode, bgNode };
}

// ---------------------------------------------------------------------------
// Type matching
// ---------------------------------------------------------------------------

/**
 * Check whether an AST node matches a field's `match` string.
 *
 * Supported match values:
 *   - `'paragraph'`, `'heading'`, `'image'`, `'blockquote'`, `'fence'`,
 *     `'hr'`, `'list'` — match on `node.type`
 *   - `'heading:N'` — heading with a specific level
 *   - `'list:ordered'` / `'list:unordered'` — list with a specific ordering
 *   - `'tag:NAME'` — a child rune tag with a specific tag name
 *   - `'any'` — matches any node
 */
export function matchesType(node: Node, match: string): boolean {
	if (match === 'any') return true;

	// Pipe-separated alternatives: 'list|fence' matches either
	if (match.includes('|')) {
		return match.split('|').some(m => matchesType(node, m));
	}

	// heading:N
	if (match.startsWith('heading:')) {
		const level = parseInt(match.slice(8), 10);
		return node.type === 'heading' && node.attributes?.level === level;
	}

	// list:ordered / list:unordered
	if (match === 'list:ordered') {
		return node.type === 'list' && node.attributes?.ordered === true;
	}
	if (match === 'list:unordered') {
		return node.type === 'list' && node.attributes?.ordered !== true;
	}

	// tag:NAME
	if (match.startsWith('tag:')) {
		const tagName = match.slice(4);
		return node.type === 'tag' && (node as any).tag === tagName;
	}

	// Simple type match
	return node.type === match;
}

// ---------------------------------------------------------------------------
// Sequence resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a sequence model: walk children in order, matching each against
 * the next field in the model.
 *
 * - Optional fields are skipped when the next child doesn't match.
 * - Greedy fields consume all consecutive matching nodes into an array.
 */
export function resolveSequence(
	children: Node[],
	fields: ContentFieldDefinition[],
): ResolvedContent {
	const result: ResolvedContent = {};
	let childIndex = 0;

	for (const field of fields) {
		if (childIndex >= children.length) {
			continue;
		}

		const child = children[childIndex];

		if (matchesType(child, field.match)) {
			if (field.greedy) {
				const collected: Node[] = [];
				while (
					childIndex < children.length &&
					matchesType(children[childIndex], field.match)
				) {
					collected.push(children[childIndex]);
					childIndex++;
				}
				result[field.name] = collected;
			} else {
				result[field.name] = child;
				childIndex++;
			}
		} else if (!field.optional) {
			// Required field didn't match — skip the child and move on
			childIndex++;
		}
		// If optional and doesn't match, just skip the field (don't advance child)
	}

	return result;
}

// ---------------------------------------------------------------------------
// Delimited resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a delimited model: split children by delimiter nodes, then
 * resolve each zone's content.
 */
export function resolveDelimited(
	children: Node[],
	model: DelimitedModel,
): ResolvedContent {
	// Split children into groups at each delimiter
	const groups: Node[][] = [[]];

	for (const child of children) {
		if (matchesType(child, model.delimiter)) {
			groups.push([]);
		} else {
			groups[groups.length - 1].push(child);
		}
	}

	if (model.dynamicZones && model.zoneModel) {
		return {
			zones: groups.map(group => resolve(group, model.zoneModel!)),
		};
	}

	// Named zones: each group maps to a declared zone by index
	const result: ResolvedContent = {};
	if (model.zones) {
		for (let i = 0; i < model.zones.length; i++) {
			const zone = model.zones[i];
			const group = i < groups.length ? groups[i] : [];
			result[zone.name] = resolveSequence(group, zone.fields);
		}
	}

	return result;
}

// ---------------------------------------------------------------------------
// Top-level resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a content model against AST children.
 * Dispatches to the pattern-specific resolver based on `model.type`.
 */
export function resolve(
	children: Node[],
	model: ContentModel,
): ResolvedContent {
	switch (model.type) {
		case 'sequence':
			return resolveSequence(children, (model as SequenceModel).fields);
		case 'delimited':
			return resolveDelimited(children, model as DelimitedModel);
		default:
			return {};
	}
}

/**
 * Full resolution entry point: extracts special tags (tint, bg), then
 * resolves the content model.
 */
export function resolveContentModel(
	children: Node[],
	model: ContentModel,
): ResolveResult {
	const { filtered, tintNode, bgNode } = extractSpecialTags(children);
	const content = resolve(filtered, model);
	return { content, tintNode, bgNode };
}
