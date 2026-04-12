/**
 * Content model resolver engine.
 *
 * Pure functions that resolve a rune's AST children against a declarative
 * content model, producing named fields without per-rune imperative code.
 */

import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
const { Ast } = Markdoc;
import type {
	ContentModel,
	ContentFieldDefinition,
	DelimitedModel,
	SequenceModel,
	SectionsModel,
	CustomModel,
	ConditionalContentModel,
	ContentModelCondition,
	ItemModel,
	ItemFieldDefinition,
	HeadingExtract,
	KnownSectionDefinition,
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

			// If this list field has an itemModel, extract structured data
			if (field.itemModel) {
				if ((field as any).emitTag) {
					// listToTags: convert list items to emitted tag nodes
					const listNodes = field.greedy
						? result[field.name] as Node[]
						: [result[field.name] as Node];
					const tagNodes: Node[] = [];
					for (const listNode of listNodes) {
						if (!listNode || (listNode as any).type !== 'list') continue;
						const items = resolveListItems(listNode, field.itemModel);
						const listItems = (listNode as Node).children ?? [];
						for (let i = 0; i < items.length; i++) {
							const attrs: Record<string, any> = {};
							const emitAttrs = (field as any).emitAttributes as Record<string, string> | undefined;
							if (emitAttrs) {
								for (const [key, ref] of Object.entries(emitAttrs)) {
									if (ref.startsWith('$')) {
										// Support fallback: '$a|$b' tries a, then b
										const parts = ref.slice(1).split('|');
										attrs[key] = parts
											.map(p => items[i][p.trim()])
											.find(v => v != null && v !== '') ?? '';
									} else {
										attrs[key] = ref;
									}
								}
							}
							// Forward list item children after the first (inline) child as tag body
							const itemChildren = listItems[i]?.children?.slice(1) ?? [];
							tagNodes.push(new Ast.Node('tag', attrs, itemChildren, (field as any).emitTag));
						}
					}
					result[field.name] = tagNodes;
				} else {
					const node = result[field.name];
					if (node && typeof node === 'object' && 'type' in (node as any)) {
						result[`${field.name}Data`] = resolveListItems(node as Node, field.itemModel);
					}
				}
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
// Sections resolver
// ---------------------------------------------------------------------------

/** Extract plain text from a heading AST node by walking its children. */
function extractHeadingText(headingNode: Node): string {
	const texts: string[] = [];
	for (const child of headingNode.walk()) {
		if (child.type === 'text' && child.attributes?.content) {
			texts.push(child.attributes.content);
		}
	}
	return texts.join(' ');
}

/**
 * Apply heading extract patterns to heading text, producing named fields.
 * Each field's regex is applied in order; 'remainder' captures what's left.
 */
function applyHeadingExtract(
	text: string,
	extract: HeadingExtract,
): Record<string, string> {
	const result: Record<string, string> = {};
	let remaining = text;

	for (const field of extract.fields) {
		if (field.pattern === 'remainder') {
			result[field.name] = remaining.trim();
			remaining = '';
		} else {
			const match = remaining.match(field.pattern);
			if (match) {
				result[field.name] = (match[1] || match[0]).trim();
				remaining = remaining.slice(match[0].length);
			} else if (!field.optional) {
				result[field.name] = remaining.trim();
			}
		}
	}

	return result;
}

/**
 * Match a section heading against knownSections definitions.
 * Matching is case-insensitive against canonical names and aliases.
 * Returns the canonical name and definition, or undefined if no match.
 */
function matchKnownSection(
	headingText: string,
	knownSections: Record<string, KnownSectionDefinition>,
): { canonicalName: string; definition: KnownSectionDefinition } | undefined {
	const normalized = headingText.toLowerCase().trim();

	for (const [canonicalName, definition] of Object.entries(knownSections)) {
		if (canonicalName.toLowerCase() === normalized) {
			return { canonicalName, definition };
		}
		if (definition.alias) {
			for (const alias of definition.alias) {
				if (alias.toLowerCase() === normalized) {
					return { canonicalName, definition };
				}
			}
		}
	}

	return undefined;
}

/**
 * Resolve a sections model: split children at heading boundaries,
 * optionally extracting heading data and emitting child rune tags.
 *
 * - Preamble (content before first section heading) is resolved via `fields`.
 * - When `emitTag` is set, sections become AST tag nodes for child rune processing.
 * - When `emitTag` is absent, sections are resolved objects with heading info + body.
 */
export function resolveSections(
	children: Node[],
	model: SectionsModel,
): ResolvedContent {
	// 1. Determine heading level
	const headingSpec = model.sectionHeading;
	let level: number | undefined;

	if (headingSpec.includes(':')) {
		level = parseInt(headingSpec.split(':')[1], 10);
	} else {
		// Auto-detect heading level with preamble-aware heuristic:
		// If the first heading is shallower than the second, and there are 2+
		// headings at the deeper level, use the deeper level as the section
		// boundary. The shallower first heading becomes preamble content.
		const headings = children.filter(n => n.type === 'heading');
		if (headings.length >= 2) {
			const firstLevel = headings[0].attributes?.level;
			const secondLevel = headings[1].attributes?.level;
			if (firstLevel !== undefined && secondLevel !== undefined && secondLevel > firstLevel) {
				const countAtSecondLevel = headings.filter(
					h => h.attributes?.level === secondLevel,
				).length;
				level = countAtSecondLevel >= 2 ? secondLevel : firstLevel;
			} else {
				level = firstLevel;
			}
		} else {
			level = headings[0]?.attributes?.level;
		}
	}

	if (level === undefined) {
		// No headings found
		if (model.implicitSection && model.emitTag) {
			// Wrap all children in a single emitted tag
			const preamble = model.fields
				? resolveSequence([], model.fields)
				: {};
			const tagNode = new Ast.Node(
				'tag',
				{ ...(model.implicitSection.attributes ?? {}) },
				children,
				model.emitTag,
			);
			return { ...preamble, sections: [tagNode] };
		}

		const preamble = model.fields
			? resolveSequence(children, model.fields)
			: {};
		return { ...preamble, sections: [] };
	}

	// 2. Split at section-level headings
	const preambleNodes: Node[] = [];
	const rawSections: { headingNode: Node; body: Node[] }[] = [];
	let current: { headingNode: Node; body: Node[] } | null = null;

	for (const child of children) {
		if (child.type === 'heading' && child.attributes?.level === level) {
			if (current) rawSections.push(current);
			current = { headingNode: child, body: [] };
		} else if (current) {
			current.body.push(child);
		} else {
			preambleNodes.push(child);
		}
	}
	if (current) rawSections.push(current);

	// implicitSection: if no sections found, wrap all children in a single emitted tag
	if (rawSections.length === 0 && model.implicitSection && model.emitTag) {
		const preamble = model.fields
			? resolveSequence([], model.fields)
			: {};
		const tagNode = new Ast.Node(
			'tag',
			{ ...(model.implicitSection.attributes ?? {}) },
			children,
			model.emitTag,
		);
		return { ...preamble, sections: [tagNode] };
	}

	// 3. Resolve preamble fields
	const preamble = model.fields
		? resolveSequence(preambleNodes, model.fields)
		: {};

	// 4. Process each section
	if (model.emitTag) {
		// emitTag: convert sections to AST tag nodes
		const tagNodes = rawSections.map(section => {
			const headingText = extractHeadingText(section.headingNode);
			const extracted = model.headingExtract
				? applyHeadingExtract(headingText, model.headingExtract)
				: {};

			const attrs: Record<string, any> = {};
			if (model.emitAttributes) {
				for (const [key, ref] of Object.entries(model.emitAttributes)) {
					if (ref === '$heading') {
						attrs[key] = headingText;
					} else if (ref.startsWith('$')) {
						attrs[key] = extracted[ref.slice(1)] ?? '';
					} else {
						attrs[key] = ref;
					}
				}
			}

			return new Ast.Node('tag', attrs, section.body, model.emitTag!);
		});

		return { ...preamble, sections: tagNodes };
	}

	// No emitTag: return resolved section data
	const resolvedSections = rawSections.map(section => {
		const headingText = extractHeadingText(section.headingNode);
		const extracted = model.headingExtract
			? applyHeadingExtract(headingText, model.headingExtract)
			: {};

		// Resolve knownSections: match heading against canonical names and aliases
		const knownMatch = model.knownSections
			? matchKnownSection(headingText, model.knownSections)
			: undefined;
		const sectionModel = knownMatch?.definition.model ?? model.sectionModel;
		const bodyResolved = resolve(section.body, sectionModel);

		return {
			$heading: headingText,
			$headingNode: section.headingNode,
			...(knownMatch ? { $canonicalName: knownMatch.canonicalName } : {}),
			...Object.fromEntries(
				Object.entries(extracted).map(([k, v]) => [`$${k}`, v]),
			),
			...bodyResolved,
		};
	});

	return { ...preamble, sections: resolvedSections };
}

// ---------------------------------------------------------------------------
// Conditional evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a content model condition against children and attributes.
 */
export function evaluateCondition(
	condition: ContentModelCondition,
	children: Node[],
	attributes: Record<string, unknown>,
): boolean {
	if ('hasChild' in condition) {
		return children.some(c => matchesType(c, condition.hasChild));
	}
	if ('in' in condition) {
		const value = String(attributes[condition.attribute] ?? '');
		return condition.in.includes(value);
	}
	if ('exists' in condition) {
		return attributes[condition.attribute] != null && attributes[condition.attribute] !== '';
	}
	return false;
}

/**
 * Check whether a content model is conditional (has `when` branches).
 */
function isConditional(model: ContentModel): model is ConditionalContentModel {
	return 'when' in model && Array.isArray((model as ConditionalContentModel).when);
}

// ---------------------------------------------------------------------------
// Inline item model resolver
// ---------------------------------------------------------------------------

/** Extract plain text from an AST node by walking its children. */
function extractNodeText(n: Node): string {
	if (n.type === 'text') return n.attributes?.content ?? '';
	const texts: string[] = [];
	for (const child of n.walk()) {
		if (child.type === 'text' && child.attributes?.content) {
			texts.push(child.attributes.content);
		}
	}
	return texts.join('');
}

/**
 * Find an inline match within a node, handling link-wrapping-strong patterns.
 * E.g., `[**Name**](/url)` — a link wrapping bold text.
 */
function findInlineMatch(n: Node, matchType: string): Node | null {
	if (n.type === matchType) return n;

	// Check inside links for nested inline types
	if (n.type === 'link' && matchType !== 'link') {
		for (const child of n.children ?? []) {
			if (child.type === matchType) return child;
		}
	}

	// Check inside strong/em for nested types
	if ((n.type === 'strong' || n.type === 'em') && matchType !== n.type) {
		for (const child of n.children ?? []) {
			if (child.type === matchType) return child;
		}
	}

	return null;
}

/**
 * Resolve structured data from list item inline content.
 *
 * Two-phase extraction:
 * 1. Match typed inline nodes (strong, em, link, image, code)
 * 2. Collect remaining text, run regex pattern fields
 */
export function resolveListItems(
	listNode: Node,
	itemModel: ItemModel,
): Record<string, unknown>[] {
	const listItems = listNode.children ?? [];

	return listItems.map(listItem => {
		const result: Record<string, unknown> = {};
		// Flatten `inline` wrapper nodes — Markdoc wraps inline content in
		// an `inline` node (item > inline > [strong, text, em, ...]).
		// Block-level children (paragraph, list) remain at the item level.
		const inlineChildren: Node[] = [];
		for (const child of listItem.children ?? []) {
			if (child.type === 'inline') {
				inlineChildren.push(...(child.children ?? []));
			} else {
				inlineChildren.push(child);
			}
		}
		const consumed = new Set<number>();

		// Phase 1: Match typed inline nodes
		// Soft-consumed: a child inside a wrapper was matched (e.g., strong
		// inside a link). The wrapper is still available for a direct match.
		const softConsumed = new Set<number>();

		for (const field of itemModel.fields) {
			if (field.match === 'text') continue; // handle in phase 2

			// Nested list (cue points, sub-items)
			if (field.match === 'list') {
				const idx = inlineChildren.findIndex((c, i) =>
					!consumed.has(i) && (c.type === 'list'));
				if (idx >= 0) {
					consumed.add(idx);
					result[field.name] = field.itemModel
						? resolveListItems(inlineChildren[idx], field.itemModel)
						: inlineChildren[idx];
				}
				continue;
			}

			// Block-level children (paragraphs under list items)
			if (field.match === 'paragraph' && field.greedy) {
				const paragraphs: Node[] = [];
				inlineChildren.forEach((c, i) => {
					if (!consumed.has(i) && c.type === 'paragraph') {
						consumed.add(i);
						paragraphs.push(c);
					}
				});
				if (paragraphs.length > 0) result[field.name] = paragraphs;
				continue;
			}

			// Inline node matching (strong, em, link, image, code)
			for (let i = 0; i < inlineChildren.length; i++) {
				// Skip hard-consumed; allow soft-consumed for direct matches
				if (consumed.has(i)) continue;
				if (softConsumed.has(i) && field.match !== inlineChildren[i].type) continue;
				const child = inlineChildren[i];

				const matched = findInlineMatch(child, field.match);
				if (matched) {
					if (matched === child) {
						// Direct match → hard consume
						consumed.add(i);
					} else {
						// Child-inside-wrapper → soft consume
						softConsumed.add(i);
					}
					if (field.extract) {
						// For extract, get the attribute from the wrapper (e.g., href from link)
						const source = child.attributes?.[field.extract] != null ? child : matched;
						result[field.name] = source.attributes?.[field.extract];
					} else {
						result[field.name] = extractNodeText(matched);
					}
					break;
				}
			}
		}

		// Merge soft-consumed into consumed for text collection
		for (const idx of softConsumed) consumed.add(idx);

		// Phase 2: Collect remaining text, run pattern fields
		const textFields = itemModel.fields.filter(f => f.match === 'text');
		if (textFields.length > 0) {
			const remainingText = inlineChildren
				.filter((_, i) => !consumed.has(i))
				.filter(c => c.type === 'text' || c.type === 'softbreak')
				.map(c => c.attributes?.content ?? '')
				.join('')
				.trim();

			let textToProcess = remainingText;

			for (const field of textFields) {
				if (field.pattern === 'remainder') {
					const trimmed = textToProcess.trim();
					if (trimmed || !field.optional) {
						result[field.name] = trimmed;
					}
				} else if (field.pattern instanceof RegExp) {
					const match = textToProcess.match(field.pattern);
					if (match) {
						result[field.name] = match[1] ?? match[0];
						textToProcess = textToProcess.replace(field.pattern, '');
					}
				}
			}
		}

		return result;
	});
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
	attributes?: Record<string, unknown>,
): ResolvedContent {
	// Handle conditional models
	if (isConditional(model)) {
		for (const branch of model.when) {
			if (evaluateCondition(branch.condition, children, attributes ?? {})) {
				return resolve(children, branch.model, attributes);
			}
		}
		return resolve(children, model.default, attributes);
	}

	switch (model.type) {
		case 'sequence':
			return resolveSequence(children, (model as SequenceModel).fields);
		case 'sections':
			return resolveSections(children, model as SectionsModel);
		case 'delimited':
			return resolveDelimited(children, model as DelimitedModel);
		case 'custom':
			return { children: (model as CustomModel).processChildren(children, attributes ?? {}) };
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
	attributes?: Record<string, unknown>,
): ResolveResult {
	const { filtered, tintNode, bgNode } = extractSpecialTags(children);
	const content = resolve(filtered, model, attributes);
	return { content, tintNode, bgNode };
}
