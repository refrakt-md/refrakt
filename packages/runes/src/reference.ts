/**
 * Shared rune-reference infrastructure used by both the AI prompt builder
 * and the editor/CLI for serializing rune metadata. Lives in @refrakt-md/runes
 * so that callers (`refrakt write`, `refrakt edit`, `refrakt reference`) can
 * use it without pulling in the AI or editor packages.
 */

import type { ContentModel, ContentFieldDefinition } from '@refrakt-md/types';
import { RUNE_EXAMPLES } from './examples.js';

/**
 * Rune metadata interface — structurally compatible with Rune from @refrakt-md/runes
 * without requiring a runtime dependency on the full Rune class.
 */
export interface RuneInfo {
	name: string;
	aliases: string[];
	description: string;
	reinterprets: Record<string, string>;
	schema: {
		attributes?: Record<string, {
			type?: unknown;
			required?: boolean;
			matches?: unknown;
		}>;
	};
	/** AI prompt extension from community/official packages — additional context appended after description */
	prompt?: string;
}

/** Runes that are internal or child-only — excluded from generated reference docs */
export const EXCLUDED_RUNES = new Set([
	'error',
	'tab',
	'accordion-item',
	'budget-category',
	'budget-line-item',
	'conversation-message',
	'reveal-step',
	'note',
	'form-field',
]);

/** Attributes hidden from generated reference docs (rune.attribute format) */
export const HIDDEN_ATTRIBUTES = new Set([
	'feature.split',
]);

function attributeTypeName(type: unknown): string {
	if (type === String) return 'string';
	if (type === Number) return 'number';
	if (type === Boolean) return 'boolean';
	if (type === Array) return 'array';
	if (typeof type === 'function' && (type as { name?: string }).name) {
		return (type as { name: string }).name;
	}
	return 'unknown';
}

function describeAttribute(
	name: string,
	attr: { type?: unknown; required?: boolean; matches?: unknown },
): string {
	const parts: string[] = [`  - ${name}: `];

	if (Array.isArray(attr.matches) && attr.matches.length > 0) {
		const values = attr.matches
			.filter((m: unknown): m is string => typeof m === 'string')
			.map((v: string) => `"${v}"`)
			.join(' | ');
		parts.push(values);
	} else {
		parts.push(attributeTypeName(attr.type));
	}

	parts.push(attr.required ? ' (required)' : ' (optional)');

	return parts.join('');
}

/**
 * Render a single rune's reference as a markdown block. Used by both the
 * AI prompt builder and the `refrakt reference` CLI.
 */
export function describeRune(rune: RuneInfo): string {
	const lines: string[] = [];

	lines.push(`### ${rune.name}`);
	if (rune.description) {
		lines.push(rune.description);
	}
	if (rune.aliases.length > 0) {
		lines.push(`Aliases: ${rune.aliases.join(', ')}`);
	}

	if (rune.prompt) {
		lines.push(rune.prompt);
	}

	const attrs = rune.schema.attributes;
	if (attrs && Object.keys(attrs).length > 0) {
		const entries = Object.entries(attrs).filter(
			([name]) => !HIDDEN_ATTRIBUTES.has(`${rune.name}.${name}`),
		);
		if (entries.length > 0) {
			lines.push('Attributes:');
			for (const [attrName, attrDef] of entries) {
				lines.push(describeAttribute(attrName, attrDef));
			}
		}
	}

	const reinterprets = Object.entries(rune.reinterprets);
	if (reinterprets.length > 0) {
		lines.push('Content interpretation:');
		for (const [element, meaning] of reinterprets) {
			lines.push(`  - ${element} → ${meaning}`);
		}
	}

	const example = RUNE_EXAMPLES[rune.name];
	if (example) {
		lines.push('Example:');
		lines.push(example);
	}

	return lines.join('\n');
}

/**
 * Serialize a content model for JSON transport.
 * Strips non-serializable fields (functions in `custom` models, RegExp in headingExtract).
 * For function-based conditional models, evaluates with empty attrs to get the default.
 */
export function serializeContentModel(
	model: ContentModel | ((attrs: Record<string, any>) => ContentModel),
): object | undefined {
	const resolved = typeof model === 'function' ? model({}) : model;
	return stripContentModel(resolved);
}

export function stripContentModel(model: ContentModel): object | undefined {
	if ('when' in model) {
		// Conditional model — serialize the default branch
		return stripContentModel(model.default);
	}
	if (model.type === 'custom') {
		return { type: 'custom', description: model.description };
	}
	if (model.type === 'sequence') {
		return { type: 'sequence', fields: model.fields.map(stripField) };
	}
	if (model.type === 'delimited') {
		return {
			type: 'delimited',
			delimiter: model.delimiter,
			zones: model.zones?.map(z => ({
				name: z.name,
				type: 'sequence' as const,
				fields: z.fields.map(stripField),
			})),
			dynamicZones: model.dynamicZones,
			zoneModel: model.zoneModel ? { type: 'sequence' as const, fields: model.zoneModel.fields.map(stripField) } : undefined,
		};
	}
	if (model.type === 'sections') {
		return {
			type: 'sections',
			sectionHeading: model.sectionHeading,
			fields: model.fields?.map(stripField),
			sectionModel: stripContentModel(model.sectionModel),
			emitTag: model.emitTag,
		};
	}
	return undefined;
}

function stripField(f: ContentFieldDefinition): object {
	return {
		name: f.name,
		match: f.match,
		optional: f.optional,
		greedy: f.greedy,
		template: f.template,
		description: f.description,
		emitTag: f.emitTag,
	};
}
