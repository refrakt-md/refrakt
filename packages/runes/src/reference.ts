/**
 * Shared rune-reference infrastructure used by both the AI prompt builder
 * and the editor/CLI for serializing rune metadata. Lives in @refrakt-md/runes
 * so that callers (`refrakt write`, `refrakt edit`, `refrakt reference`) can
 * use it without pulling in the AI or editor packages.
 */

import type { Schema } from '@markdoc/markdoc';
import type { ContentModel, ContentFieldDefinition } from '@refrakt-md/types';
import { RUNE_EXAMPLES } from './examples.js';
import { UNIVERSAL_ATTRIBUTE_NAMES, lookupAttributePreset, schemaBasePresets } from './attribute-presets.js';
import { schemaContentModels } from './lib/index.js';

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
	schema: {
		attributes?: Record<string, {
			type?: unknown;
			required?: boolean;
			matches?: unknown;
			description?: string;
		}>;
	};
	/**
	 * Authoring hints — a short note that reads naturally to both humans browsing
	 * the reference and LLMs generating content. Rendered as a dedicated section
	 * in `describeRune` output and included in `refrakt write` prompts.
	 */
	authoringHints?: string;
	/** Pre-serialized content model; rendered into the reference output by `describeRune`. */
	contentModel?: SerializedContentModel;
	/** Named preset this rune inherits attributes from, if any (via `base:` in createContentModelSchema). */
	basePreset?: RuneBasePresetInfo;
	/** Example Markdoc snippet, falling back to `RUNE_EXAMPLES[name]` when omitted. */
	example?: string;
	/** Short source identifier (e.g. `"core"`, `"@refrakt-md/marketing"`) for grouping output. */
	package?: string;
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

	if (rune.authoringHints) {
		lines.push('Authoring notes:');
		lines.push(rune.authoringHints);
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

	if (rune.contentModel) {
		lines.push(renderContentModel(rune.contentModel));
	}

	const example = rune.example ?? RUNE_EXAMPLES[rune.name];
	if (example) {
		lines.push('Example:');
		lines.push('```markdoc');
		lines.push(example);
		lines.push('```');
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

// ---------------------------------------------------------------------------
// RuneInfo hydration
// ---------------------------------------------------------------------------

/**
 * Minimal structural shape of a Rune-like object that `hydrateRuneInfo` accepts.
 * Matches both the `Rune` class and loose objects like the ones produced by
 * `defineRune()`.
 */
export interface RuneLike {
	name: string;
	aliases: string[];
	description: string;
	schema: Schema;
	authoringHints?: string;
}

export interface HydrateOptions {
	/** Identifier for the source (e.g. `"core"`, `"@refrakt-md/marketing"`). */
	packageName?: string;
	/** Optional per-rune fixture string, overriding `RUNE_EXAMPLES[name]`. */
	example?: string;
}

/**
 * Hydrate a `Rune`-like object into a fully-populated `RuneInfo` for the
 * reference surface. Resolves the content model via the shared
 * `schemaContentModels` WeakMap and the base preset via
 * `schemaBasePresets` + `lookupAttributePreset`.
 */
export function hydrateRuneInfo(rune: RuneLike, options: HydrateOptions = {}): RuneInfo {
	const rawModel = schemaContentModels.get(rune.schema);
	const contentModel = rawModel ? serializeContentModel(rawModel) : undefined;

	const baseRecord = schemaBasePresets.get(rune.schema);
	const presetMeta = baseRecord ? lookupAttributePreset(baseRecord) : undefined;
	const basePreset: RuneBasePresetInfo | undefined = presetMeta
		? {
			name: presetMeta.name,
			description: presetMeta.description,
			attributes: Object.keys(baseRecord!),
		}
		: undefined;

	return {
		name: rune.name,
		aliases: rune.aliases,
		description: rune.description,
		schema: rune.schema as RuneInfo['schema'],
		authoringHints: rune.authoringHints,
		contentModel,
		basePreset,
		example: options.example,
		package: options.packageName,
	};
}

// ---------------------------------------------------------------------------
// Reference context + bulk hydration
// ---------------------------------------------------------------------------

/** Minimal source view for reference rendering — the merged rune set + metadata. */
export interface ReferenceContext {
	/** All Rune-like objects keyed by primary name. */
	runes: Record<string, RuneLike>;
	/** Package fixtures (keyed by rune name). Falls back to `RUNE_EXAMPLES[name]`. */
	fixtures: Record<string, string>;
	/** Per-rune source identifier (e.g. `"core"` or `"@refrakt-md/marketing"`). */
	source: Record<string, string>;
}

/** Hydrate every non-excluded rune in a context, sorted alphabetically by name. */
export function hydrateAllRuneInfos(ctx: ReferenceContext): RuneInfo[] {
	return Object.values(ctx.runes)
		.filter(rune => !EXCLUDED_RUNES.has(rune.name))
		.map(rune => hydrateRuneInfo(rune, {
			packageName: ctx.source[rune.name] ?? 'core',
			example: ctx.fixtures[rune.name] ?? RUNE_EXAMPLES[rune.name],
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

/** Hydrate a single rune by primary name or alias. Returns `undefined` if absent. */
export function hydrateRuneByName(ctx: ReferenceContext, name: string): RuneInfo | undefined {
	const direct = ctx.runes[name];
	if (direct) {
		return hydrateRuneInfo(direct, {
			packageName: ctx.source[name] ?? 'core',
			example: ctx.fixtures[name] ?? RUNE_EXAMPLES[name],
		});
	}
	for (const rune of Object.values(ctx.runes)) {
		if (rune.aliases.includes(name)) {
			return hydrateRuneInfo(rune, {
				packageName: ctx.source[rune.name] ?? 'core',
				example: ctx.fixtures[rune.name] ?? RUNE_EXAMPLES[rune.name],
			});
		}
	}
	return undefined;
}

// ---------------------------------------------------------------------------
// Serialized JSON shape
// ---------------------------------------------------------------------------

export interface SerializedAttribute {
	type: string;
	required: boolean;
	matches?: string[];
	description?: string;
}

export interface SerializedRune {
	name: string;
	package: string;
	aliases: string[];
	description: string;
	authoringHints?: string;
	attributes: {
		own: Record<string, SerializedAttribute>;
		base?: { name: string; description: string; attributes: Record<string, SerializedAttribute> };
		universal: string[];
	};
	contentModel?: SerializedContentModel;
	example?: string;
}

function toSerializedAttribute(attr: {
	type?: unknown;
	required?: boolean;
	matches?: unknown;
	description?: string;
}): SerializedAttribute {
	const matches = Array.isArray(attr.matches)
		? attr.matches.filter((m): m is string => typeof m === 'string')
		: undefined;
	return {
		type: attributeTypeName(attr.type),
		required: attr.required ?? false,
		...(matches && matches.length > 0 ? { matches } : {}),
		...(attr.description ? { description: attr.description } : {}),
	};
}

/** Serialize a hydrated RuneInfo into the stable JSON shape used by the reference command. */
export function serializeRune(info: RuneInfo, packageName?: string): SerializedRune {
	const attrs = info.schema.attributes ?? {};
	const presetAttrs = info.basePreset ? new Set(info.basePreset.attributes) : undefined;

	const own: Record<string, SerializedAttribute> = {};
	const baseAttrs: Record<string, SerializedAttribute> = {};
	const universal: string[] = [];

	for (const [attrName, attrDef] of Object.entries(attrs)) {
		if (HIDDEN_ATTRIBUTES.has(`${info.name}.${attrName}`)) continue;
		if (UNIVERSAL_ATTRIBUTE_NAMES.has(attrName)) {
			universal.push(attrName);
		} else if (presetAttrs?.has(attrName)) {
			baseAttrs[attrName] = toSerializedAttribute(attrDef);
		} else {
			own[attrName] = toSerializedAttribute(attrDef);
		}
	}

	return {
		name: info.name,
		package: packageName ?? info.package ?? 'core',
		aliases: info.aliases,
		description: info.description,
		...(info.authoringHints ? { authoringHints: info.authoringHints } : {}),
		attributes: {
			own,
			...(info.basePreset && Object.keys(baseAttrs).length > 0
				? {
					base: {
						name: info.basePreset.name,
						description: info.basePreset.description,
						attributes: baseAttrs,
					},
				}
				: {}),
			universal,
		},
		...(info.contentModel ? { contentModel: info.contentModel } : {}),
		...(info.example ? { example: info.example } : {}),
	};
}

// ---------------------------------------------------------------------------
// Grouping + full markdown render
// ---------------------------------------------------------------------------

export interface ReferenceGroup {
	/** Package short identifier (`"core"`, `"@refrakt-md/marketing"`, …). */
	packageName: string;
	/** Human-readable label used as the group heading in rendered output. */
	label: string;
	/** Sorted list of rune summaries. */
	runes: Array<{ name: string; description: string; aliases: string[] }>;
}

/** Group hydrated rune infos by source package, core first then alphabetical. */
export function groupReferenceInfos(infos: RuneInfo[]): ReferenceGroup[] {
	const labelOf = (pkg: string): string => pkg === 'core' ? '@refrakt-md/runes (core)' : pkg;
	const groups = new Map<string, ReferenceGroup>();
	for (const info of infos) {
		const pkg = info.package ?? 'core';
		let group = groups.get(pkg);
		if (!group) {
			group = { packageName: pkg, label: labelOf(pkg), runes: [] };
			groups.set(pkg, group);
		}
		group.runes.push({ name: info.name, description: info.description, aliases: info.aliases });
	}
	const sorted = Array.from(groups.values()).sort((a, b) => {
		if (a.packageName === 'core') return -1;
		if (b.packageName === 'core') return 1;
		return a.packageName.localeCompare(b.packageName);
	});
	for (const group of sorted) {
		group.runes.sort((a, b) => a.name.localeCompare(b.name));
	}
	return sorted;
}

function sectionSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export interface RenderReferenceOptions {
	/** Optional preamble inserted between the `# Available Runes` heading and the TOC. */
	preamble?: string;
}

/**
 * Render the full reference document as markdown. Pure — rerunning on the same
 * context produces byte-identical output, so callers can diff it against a
 * checked-in AGENTS.md to detect drift.
 */
export function renderReferenceMarkdown(ctx: ReferenceContext, options: RenderReferenceOptions = {}): string {
	const infos = hydrateAllRuneInfos(ctx);
	const groups = groupReferenceInfos(infos);

	const lines: string[] = [];
	lines.push('<!-- Generated by `refrakt reference dump` — do not edit by hand. -->');
	lines.push('<!-- Re-run when refrakt.config.json changes or packages upgrade. -->');
	lines.push('');
	lines.push('# Available Runes');
	lines.push('');

	if (options.preamble) {
		lines.push(options.preamble.trimEnd());
		lines.push('');
	} else {
		lines.push('This site has the following runes available. Authors and AI agents can use any of these tags inside `.md` content files.');
		lines.push('');
	}

	lines.push('## Table of Contents');
	lines.push('');
	lines.push('- [Universal Attributes](#universal-attributes)');
	lines.push('- [Attribute Presets](#attribute-presets)');
	for (const group of groups) {
		lines.push(`- [${group.label}](#${sectionSlug(group.label)})`);
		for (const rune of group.runes) {
			lines.push(`  - [${rune.name}](#${sectionSlug(rune.name)})`);
		}
	}
	lines.push('');

	lines.push('## Universal Attributes');
	lines.push('');
	lines.push('These attributes are available on every rune:');
	lines.push('');
	for (const attr of UNIVERSAL_ATTRIBUTE_NAMES) {
		lines.push(`- \`${attr}\``);
	}
	lines.push('');

	const presetUsage = new Map<string, { description: string; attributes: string[]; users: string[] }>();
	for (const info of infos) {
		if (!info.basePreset) continue;
		const existing = presetUsage.get(info.basePreset.name);
		if (existing) {
			existing.users.push(info.name);
		} else {
			presetUsage.set(info.basePreset.name, {
				description: info.basePreset.description,
				attributes: info.basePreset.attributes,
				users: [info.name],
			});
		}
	}

	lines.push('## Attribute Presets');
	lines.push('');
	if (presetUsage.size === 0) {
		lines.push('_No attribute presets are used by the runes in this project._');
		lines.push('');
	} else {
		lines.push('Runes opt into shared attribute sets via `base:`. Each preset is listed here once; per-rune sections below note which preset they inherit.');
		lines.push('');
		const sortedPresets = Array.from(presetUsage.entries()).sort(([a], [b]) => a.localeCompare(b));
		for (const [name, usage] of sortedPresets) {
			lines.push(`### ${name}`);
			lines.push('');
			lines.push(usage.description);
			lines.push('');
			lines.push(`Used by: ${usage.users.slice().sort().join(', ')}`);
			lines.push('');
			lines.push('Attributes:');
			for (const attr of usage.attributes) {
				lines.push(`  - ${attr}`);
			}
			lines.push('');
		}
	}

	for (const group of groups) {
		lines.push(`## ${group.label}`);
		lines.push('');
		for (const rune of group.runes) {
			const info = infos.find(i => i.name === rune.name);
			if (!info) continue;
			lines.push(describeRune(info));
			lines.push('');
		}
	}

	return lines.join('\n').trimEnd() + '\n';
}
