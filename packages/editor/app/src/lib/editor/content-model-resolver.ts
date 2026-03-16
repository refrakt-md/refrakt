/**
 * Client-side content model resolver.
 *
 * Matches parsed ContentNodes (from parseContentTree) against a serialized
 * content model to determine which fields are filled and which are empty.
 */

import type { ContentNode } from './block-parser.js';
import type {
	SerializedContentModel,
	SerializedFieldDef,
	SerializedSequenceModel,
	SerializedDelimitedZone,
} from '../api/client.js';

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface ResolvedField {
	/** Field name from the content model */
	name: string;
	/** Expected node type pattern (e.g. 'paragraph', 'heading', 'list|fence') */
	match: string;
	/** Whether the field can be absent */
	optional: boolean;
	/** Whether the field consumes multiple consecutive matches */
	greedy: boolean;
	/** Whether content was matched to this field */
	filled: boolean;
	/** Matched content nodes (empty if unfilled) */
	nodes: ContentNode[];
	/** Human-readable description from field definition */
	description?: string;
	/** Markdoc template for inserting content */
	template?: string;
	/** If field emits child rune tags */
	emitTag?: string;
}

export interface ResolvedZone {
	name: string;
	fields: ResolvedField[];
}

export type ResolvedStructure =
	| { type: 'sequence'; fields: ResolvedField[] }
	| { type: 'delimited'; delimiter: string; zones: ResolvedZone[] }
	| { type: 'sections'; description: string }
	| { type: 'custom'; description: string };

// ---------------------------------------------------------------------------
// Node matching
// ---------------------------------------------------------------------------

/** Check if a ContentNode matches a field's match pattern */
function nodeMatchesType(node: ContentNode, match: string): boolean {
	if (match === 'any') return true;

	// Pipe-separated alternatives: 'list|fence'
	if (match.includes('|')) {
		return match.split('|').some(m => nodeMatchesType(node, m));
	}

	// heading:N
	if (match.startsWith('heading:')) {
		const level = parseInt(match.slice(8), 10);
		return node.type === 'heading' && node.headingLevel === level;
	}

	// list:ordered / list:unordered
	if (match === 'list:ordered') {
		return node.type === 'list' && node.listOrdered === true;
	}
	if (match === 'list:unordered') {
		return node.type === 'list' && node.listOrdered !== true;
	}

	// tag:NAME — ContentNodes use 'rune' type
	if (match.startsWith('tag:')) {
		const tagName = match.slice(4);
		return node.type === 'rune' && node.runeName === tagName;
	}

	// Simple type match (ContentNode types: rune, heading, paragraph, fence, list, quote, hr, image)
	// Map content model match names to ContentNode type names
	if (match === 'blockquote') return node.type === 'quote';

	return node.type === match;
}

// ---------------------------------------------------------------------------
// Sequence resolver
// ---------------------------------------------------------------------------

function resolveSequence(nodes: ContentNode[], fields: SerializedFieldDef[]): ResolvedField[] {
	const result: ResolvedField[] = [];
	let cursor = 0;

	for (const field of fields) {
		const resolved: ResolvedField = {
			name: field.name,
			match: field.match,
			optional: field.optional ?? false,
			greedy: field.greedy ?? false,
			filled: false,
			nodes: [],
			description: field.description,
			template: field.template,
			emitTag: field.emitTag,
		};

		if (field.greedy) {
			// Consume all consecutive matching nodes
			while (cursor < nodes.length && nodeMatchesType(nodes[cursor], field.match)) {
				resolved.nodes.push(nodes[cursor]);
				cursor++;
			}
			resolved.filled = resolved.nodes.length > 0;
		} else {
			// Match the next node if it fits
			if (cursor < nodes.length && nodeMatchesType(nodes[cursor], field.match)) {
				resolved.nodes.push(nodes[cursor]);
				resolved.filled = true;
				cursor++;
			}
		}

		result.push(resolved);
	}

	return result;
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a content tree against a serialized content model.
 * Returns a structure describing which fields are filled and which are empty.
 */
export function resolveContentStructure(
	nodes: ContentNode[],
	model: SerializedContentModel,
): ResolvedStructure {
	switch (model.type) {
		case 'sequence':
			return {
				type: 'sequence',
				fields: resolveSequence(nodes, model.fields),
			};

		case 'delimited': {
			// Split nodes at delimiter (hr) boundaries
			const zones: ResolvedZone[] = [];
			const chunks: ContentNode[][] = [[]];
			for (const node of nodes) {
				if (node.type === 'hr') {
					chunks.push([]);
				} else {
					chunks[chunks.length - 1].push(node);
				}
			}

			if (model.zones) {
				for (let i = 0; i < model.zones.length; i++) {
					const zone = model.zones[i];
					const chunk = chunks[i] ?? [];
					zones.push({
						name: zone.name,
						fields: resolveSequence(chunk, zone.fields),
					});
				}
			} else if (model.dynamicZones && model.zoneModel) {
				for (let i = 0; i < chunks.length; i++) {
					zones.push({
						name: `zone-${i + 1}`,
						fields: resolveSequence(chunks[i], model.zoneModel.fields),
					});
				}
			}

			return { type: 'delimited', delimiter: model.delimiter, zones };
		}

		case 'sections':
			return {
				type: 'sections',
				description: `Sections split by ${model.sectionHeading}${model.emitTag ? `, each emits ${model.emitTag}` : ''}`,
			};

		case 'custom':
			return { type: 'custom', description: model.description };
	}
}
