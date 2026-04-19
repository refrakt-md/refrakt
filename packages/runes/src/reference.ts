/**
 * Shared rune-reference infrastructure used by both the AI prompt builder
 * and the editor/CLI for serializing rune metadata. Lives in @refrakt-md/runes
 * so that callers (`refrakt write`, `refrakt edit`, `refrakt reference`) can
 * use it without pulling in the AI or editor packages.
 */

import type { ContentModel, ContentFieldDefinition } from '@refrakt-md/types';
import { RUNE_EXAMPLES } from './examples.js';
import { UNIVERSAL_ATTRIBUTE_NAMES } from './attribute-presets.js';

// ---------------------------------------------------------------------------
// Rune info shape
// ---------------------------------------------------------------------------

/**
 * Information about an attribute preset inherited by a rune — the set of
 * attribute names contributed by the preset, plus metadata for display.
 */
export interface RuneBasePresetInfo {
	/** Short, human-readable preset name (matches `AttributePresetMetadata.name`). */
	name: string;
	/** One-sentence description of the preset. */
	description: string;
	/** Names of the attributes contributed by this preset. */
	attributes: string[];
}

/**
 * Rune metadata interface — structurally compatible with Rune from @refrakt-md/runes
 * without requiring a runtime dependency on the full Rune class.
 */
export interface RuneInfo {
	name: string;
	aliases: string[];
	description: string;
	/**
	 * Legacy mapping from Markdown primitive to its reinterpretation in this rune.
	 * Superseded by `contentModel`; kept for backwards compatibility and as a
	 * fallback when `contentModel` isn't populated. Will be removed in WORK-154.
	 */
	reinterprets?: Record<string, string>;
	schema: {
		attributes?: Record<string, {
			type?: unknown;
			required?: boolean;
			matches?: unknown;
			description?: string;
		}>;
	};
	/** AI prompt extension from community/official packages — additional context appended after description */
	prompt?: string;
	/** Optional pre-serialized content model. When present, `describeRune` renders it instead of falling back to `reinterprets`. */
	contentModel?: SerializedContentModel;
	/** Named preset this rune inherits attributes from, if any (via `base:` in createContentModelSchema). */
	basePreset?: RuneBasePresetInfo;
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

// ---------------------------------------------------------------------------
// Serialized content model types (JSON-safe projection of ContentModel)
// ---------------------------------------------------------------------------

export interface SerializedContentField {
	name: string;
	match: string;
	optional?: boolean;
	greedy?: boolean;
	template?: string;
	description?: string;
	emitTag?: string;
}

export interface SerializedSequenceModel {
	type: 'sequence';
	fields: SerializedContentField[];
}

export interface SerializedHeadingExtractField {
	name: string;
	/** Regex source, or the literal string `'remainder'`. */
	pattern: string;
	optional?: boolean;
}

export interface SerializedKnownSection {
	alias?: string[];
	/** Whether this section has a specific model override (the actual model is not serialized). */
	hasModel: boolean;
}

export interface SerializedSectionsModel {
	type: 'sections';
	sectionHeading: string;
	fields?: SerializedContentField[];
	sectionModel?: SerializedContentModel;
	emitTag?: string;
	headingExtract?: { fields: SerializedHeadingExtractField[] };
	knownSections?: Record<string, SerializedKnownSection>;
	implicitSection?: { attributes?: Record<string, string> };
}

export interface SerializedDelimitedZone {
	name: string;
	type: 'sequence';
	fields: SerializedContentField[];
}

export interface SerializedDelimitedModel {
	type: 'delimited';
	delimiter: string;
	zones?: SerializedDelimitedZone[];
	dynamicZones?: boolean;
	zoneModel?: SerializedSequenceModel;
}

export interface SerializedCustomModel {
	type: 'custom';
	description: string;
}

export type SerializedContentModel =
	| SerializedSequenceModel
	| SerializedSectionsModel
	| SerializedDelimitedModel
	| SerializedCustomModel;

// ---------------------------------------------------------------------------
// Rune markdown rendering
// ---------------------------------------------------------------------------

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
			const preset = rune.basePreset;
			const presetSet = preset ? new Set(preset.attributes) : undefined;

			const own: [string, typeof entries[number][1]][] = [];
			const fromPreset: [string, typeof entries[number][1]][] = [];
			const universal: [string, typeof entries[number][1]][] = [];

			for (const entry of entries) {
				const [attrName] = entry;
				if (UNIVERSAL_ATTRIBUTE_NAMES.has(attrName)) {
					universal.push(entry);
				} else if (presetSet?.has(attrName)) {
					fromPreset.push(entry);
				} else {
					own.push(entry);
				}
			}

			if (own.length > 0) {
				lines.push('Attributes:');
				for (const [attrName, attrDef] of own) {
					lines.push(describeAttribute(attrName, attrDef));
				}
			}

			if (preset && fromPreset.length > 0) {
				lines.push(`Inherited from the \`${preset.name}\` preset — ${preset.description}`);
				for (const [attrName, attrDef] of fromPreset) {
					lines.push(describeAttribute(attrName, attrDef));
				}
			}

			if (universal.length > 0) {
				const names = Array.from(UNIVERSAL_ATTRIBUTE_NAMES).join(', ');
				lines.push(`Universal attributes (available on every rune): ${names}.`);
			}
		}
	}

	// Content model — prefer structured rendering over the legacy reinterprets map.
	if (rune.contentModel) {
		lines.push(renderContentModel(rune.contentModel));
	} else if (rune.reinterprets) {
		const reinterprets = Object.entries(rune.reinterprets);
		if (reinterprets.length > 0) {
			lines.push('Content interpretation:');
			for (const [element, meaning] of reinterprets) {
				lines.push(`  - ${element} → ${meaning}`);
			}
		}
	}

	const example = RUNE_EXAMPLES[rune.name];
	if (example) {
		lines.push('Example:');
		lines.push(example);
	}

	return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Content model serialization
// ---------------------------------------------------------------------------

/**
 * Serialize a content model for JSON transport.
 * Strips non-serializable fields (functions in `custom` models, RegExp in headingExtract).
 * For function-based conditional models, evaluates with empty attrs to get the default.
 */
export function serializeContentModel(
	model: ContentModel | ((attrs: Record<string, any>) => ContentModel),
): SerializedContentModel | undefined {
	const resolved = typeof model === 'function' ? model({}) : model;
	return stripContentModel(resolved);
}

export function stripContentModel(model: ContentModel): SerializedContentModel | undefined {
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
		const nestedSectionModel = stripContentModel(model.sectionModel);
		return {
			type: 'sections',
			sectionHeading: model.sectionHeading,
			fields: model.fields?.map(stripField),
			sectionModel: nestedSectionModel,
			emitTag: model.emitTag,
			headingExtract: model.headingExtract
				? {
					fields: model.headingExtract.fields.map(f => ({
						name: f.name,
						pattern: f.pattern === 'remainder' ? 'remainder' : f.pattern.source,
						optional: f.optional,
					})),
				}
				: undefined,
			knownSections: model.knownSections
				? Object.fromEntries(
					Object.entries(model.knownSections).map(([name, def]) => [name, {
						alias: def.alias,
						hasModel: def.model != null,
					}]),
				)
				: undefined,
			implicitSection: model.implicitSection,
		};
	}
	return undefined;
}

function stripField(f: ContentFieldDefinition): SerializedContentField {
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

// ---------------------------------------------------------------------------
// Content model rendering
// ---------------------------------------------------------------------------

/**
 * Render a serialized content model to agent-readable markdown. The output
 * describes the rune's input shape so a coding agent can author content
 * with the right children in the right order.
 *
 * Output is stable: rerunning on the same serialized model produces
 * byte-identical output.
 */
export function renderContentModel(model: SerializedContentModel): string {
	switch (model.type) {
		case 'custom': return renderCustomModel(model);
		case 'sequence': return renderSequenceModel(model);
		case 'sections': return renderSectionsModel(model);
		case 'delimited': return renderDelimitedModel(model);
	}
}

function renderCustomModel(model: SerializedCustomModel): string {
	return `Content structure:\n${model.description}`;
}

function renderSequenceModel(model: SerializedSequenceModel): string {
	const fieldLines = model.fields.map(f => `  - ${renderField(f)}`);
	return ['Content:', ...fieldLines].join('\n');
}

function renderSectionsModel(model: SerializedSectionsModel): string {
	const lines: string[] = [];
	lines.push(`Content is split into sections by ${formatMatch(model.sectionHeading)} elements. Each section becomes one named block.`);

	if (model.fields && model.fields.length > 0) {
		lines.push('Preamble (before first section):');
		for (const field of model.fields) {
			lines.push(`  - ${renderField(field)}`);
		}
	}

	lines.push(`Section body: ${describeInner(model.sectionModel)}`);

	if (model.headingExtract) {
		const parts = model.headingExtract.fields.map(f => {
			const shape = f.pattern === 'remainder' ? 'remaining text' : `pattern \`${f.pattern}\``;
			const optional = f.optional ? ', optional' : '';
			return `\`${f.name}\` (${shape}${optional})`;
		});
		lines.push(`Heading parsing: each section heading is parsed into ${parts.join(' and ')}.`);
	}

	if (model.knownSections && Object.keys(model.knownSections).length > 0) {
		const parts = Object.entries(model.knownSections).map(([name, def]) => {
			const aliases = def.alias && def.alias.length > 0 ? ` (aliases: ${def.alias.join(', ')})` : '';
			return `\`${name}\`${aliases}`;
		});
		lines.push(`Known sections: ${parts.join(', ')}.`);
	}

	return lines.join('\n');
}

function renderDelimitedModel(model: SerializedDelimitedModel): string {
	const lines: string[] = [];
	const delimiter = model.delimiter === 'hr' ? '`---`' : `\`${model.delimiter}\``;
	lines.push(`Content is split by ${delimiter} into zones.`);

	if (model.zones && model.zones.length > 0) {
		for (const zone of model.zones) {
			lines.push(`Zone "${zone.name}":`);
			for (const field of zone.fields) {
				lines.push(`  - ${renderField(field)}`);
			}
		}
	}

	if (model.dynamicZones && model.zoneModel) {
		lines.push('Each zone between delimiters contains:');
		for (const field of model.zoneModel.fields) {
			lines.push(`  - ${renderField(field)}`);
		}
	}

	return lines.join('\n');
}

function renderField(field: SerializedContentField): string {
	const required = field.optional ? 'optional' : 'required';
	const repeat = field.greedy ? ', repeatable' : '';
	const match = formatMatch(field.match);
	const desc = field.description ? ` — ${field.description}` : '';
	return `\`${field.name}\` (${required}${repeat} ${match})${desc}`;
}

function formatMatch(match: string): string {
	if (match === 'any') return 'any block';
	if (match.startsWith('tag:')) return `\`${match.slice(4)}\` tag`;
	if (match.startsWith('heading:')) return `level-${match.slice(8)} heading`;
	if (match.startsWith('list:')) return `${match.slice(5)} list`;
	if (match.includes('|')) {
		return match.split('|').map(formatMatch).join(' or ');
	}
	return match;
}

function describeInner(model: SerializedContentModel | undefined): string {
	if (!model) return 'any content';
	if (model.type === 'sequence') {
		if (model.fields.length === 1 && model.fields[0].match === 'any' && model.fields[0].greedy) {
			return 'any blocks';
		}
		const parts = model.fields.map(f => formatMatch(f.match));
		return parts.join(', ');
	}
	if (model.type === 'sections') return `nested sections split by ${formatMatch(model.sectionHeading)}`;
	if (model.type === 'delimited') return `zones split by \`${model.delimiter}\``;
	if (model.type === 'custom') return model.description;
	return 'any content';
}
