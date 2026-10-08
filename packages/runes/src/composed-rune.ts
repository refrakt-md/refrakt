/**
 * A composed rune from its definition — SPEC-145, delivered as SPEC-153 D11
 * describes: a `PluginRune` carrying a `template` and no `transform`.
 *
 * Loading definitions from a rune directory (`Plugin.runeDir`, `runes.dir`) is
 * SPEC-153's later steps. Here a definition is a string, and its name is
 * passed beside it — the name a file would have carried (SPEC-153 D9).
 */
import type { Schema } from '@markdoc/markdoc';
import type { PluginRune } from '@refrakt-md/types';
import type { RuneConfig } from '@refrakt-md/transform';
import { toKebabCase } from '@refrakt-md/transform';
import { createContentModelSchema, schemaTables } from './lib/index.js';
import {
	CompositionError,
	frontmatterKeyLine,
	checkCompositions,
	composedRuneConfig,
	composedTypeName,
	compositionFor,
	parseCompositionDefinition,
} from './lib/composition.js';
import type {
	CompositionCatalogEntry,
	CompositionDefinition,
	CompositionOutlineNode,
} from './lib/composition.js';
import { defineRune } from './rune.js';
import type { Rune } from './rune.js';

/** A composed rune, built from its definition. */
export interface ComposedRune {
	rune: Rune;
	/** The generated, block-less engine config (D2a). */
	config: RuneConfig;
	/** The key the engine finds `config` under. */
	typeName: string;
	definition: CompositionDefinition;
}

/**
 * Build a composed rune from a definition: frontmatter declaring its input, a
 * Markdoc body that is its output template. Every check SPEC-145 decides at
 * definition load or schema construction runs here, and a failure names the
 * rune and the thing it rejected.
 */
export function defineComposedRune(name: string, source: string): ComposedRune {
	const definition = parseCompositionDefinition(name, source);
	let schema: Schema;
	try {
		schema = createContentModelSchema({
			attributes: definition.attributes,
			contentModel: definition.contentModel,
			template: {
				rune: name,
				tag: definition.tag,
				...(definition.aliases ? { aliases: definition.aliases } : {}),
				body: definition.template,
				...(definition.blocks ? { blocks: Object.keys(definition.blocks) } : {}),
			},
			...(definition.schema ? { schema: definition.schema } : {}),
			...(definition.registers ? { registers: definition.registers } : {}),
			...(definition.provides ? { provides: definition.provides } : {}),
		});
	} catch (e) {
		throw locate(e as Error, name, definition);
	}

	const config = composedRuneConfig(definition);
	const typeName = composedTypeName(name);
	const info = compositionFor(schema)!;
	info.config = config;
	info.typeName = typeName;

	const rune = defineRune({
		name,
		schema,
		typeName,
		...(definition.aliases ? { aliases: definition.aliases } : {}),
		description: definition.description ?? `Composed rune "${name}"`,
	});
	return { rune, config, typeName, definition };
}

/**
 * A construction error, named for the rune and located in its source. A
 * template error is at the node it names; the schema table's and the
 * registration's own checks report a path inside their declaration, so they
 * are located at that key; anything else at the template's first line.
 */
function locate(e: Error, name: string, definition: CompositionDefinition): CompositionError {
	const message = e.message.startsWith(`Rune "${name}"`)
		? e.message
		: `Rune "${name}": ${e.message}`;
	const err = new CompositionError(message);
	err.stack = e.stack;
	const bodyLine = (e as CompositionError).bodyLine;
	if (typeof bodyLine === 'number') {
		err.line = definition.templateLine + bodyLine;
		return err;
	}
	const section = ['registers', 'schema', 'provides'].find((key) =>
		new RegExp(`\\b${key}\\b`).test(e.message),
	);
	const index = section ? frontmatterKeyLine(definition.frontmatter, [section]) : undefined;
	err.line = index !== undefined ? index + 2 : definition.templateLine;
	return err;
}

const composedEntries = new WeakMap<object, Map<string, ComposedRune>>();

/**
 * The composed rune a plugin's `template` entry defines, built once per entry.
 * `loadPlugin`, the registration pipeline and tooling all ask for it, and all
 * have to see the same schema: the side tables are keyed by it.
 */
export function composedPluginRune(name: string, entry: PluginRune): ComposedRune {
	let byName = composedEntries.get(entry);
	if (!byName) {
		byName = new Map();
		composedEntries.set(entry, byName);
	}
	let built = byName.get(name);
	if (!built) {
		if (typeof entry.template !== 'string') {
			throw new Error(`Rune "${name}" carries no composition template.`);
		}
		built = defineComposedRune(name, entry.template);
		byName.set(name, built);
	}
	return built;
}

/** The Markdoc schema a plugin rune entry renders with — its `transform`, or
 *  the one its composition template compiles to. */
export function pluginRuneSchema(name: string, entry: PluginRune): Schema | undefined {
	if (entry.transform) return entry.transform as Schema;
	if (entry.template !== undefined) return composedPluginRune(name, entry).rune.schema;
	return undefined;
}

// ---------------------------------------------------------------------------
// The catalog-wide checks
// ---------------------------------------------------------------------------

let coreCatalog: { runes: Record<string, Rune>; configs: Record<string, RuneConfig> } | undefined;

/** Called once by the package entry, so the catalog check can see core runes
 *  without this module importing the entry (which imports it). */
export function registerCoreCatalog(
	runes: Record<string, Rune>,
	configs: Record<string, RuneConfig>,
): void {
	coreCatalog = { runes, configs };
}

/** The core runes, as registered by the package entry; empty before it runs. */
export function coreCatalogRunes(): Record<string, Rune> {
	return coreCatalog?.runes ?? {};
}

/**
 * Run the composition checks that need every rune in hand — cycles, D9's peer
 * types, D12's required parents — over the core catalog plus the given runes.
 * `mergePlugins` calls it with the merged plugin runes and their configs, so a
 * bad composition fails site assembly, before any page renders.
 */
export function checkComposedCatalog(
	runes: Record<string, Rune>,
	configs: Record<string, RuneConfig>,
): void {
	const allRunes: Record<string, Rune> = { ...coreCatalog?.runes, ...runes };
	if (!Object.values(allRunes).some((r) => compositionFor(r.schema))) return;
	const byKebab = new Map<string, RuneConfig>();
	for (const [key, cfg] of Object.entries({ ...coreCatalog?.configs, ...configs })) {
		byKebab.set(toKebabCase(key), cfg);
	}
	const catalog: Record<string, CompositionCatalogEntry> = {};
	for (const [name, rune] of Object.entries(allRunes)) {
		const config = (rune.typeName && byKebab.get(toKebabCase(rune.typeName))) || byKebab.get(name);
		catalog[name] = {
			schema: rune.schema,
			...(rune.typeName ? { dataRune: toKebabCase(rune.typeName) } : {}),
			...(rune.seoType ? { seoType: rune.seoType } : {}),
			aliases: rune.aliases,
			...(config?.requiresParent ? { requiresParent: config.requiresParent } : {}),
		};
	}
	checkCompositions(catalog, (schema) => schemaTables.get(schema));
}

/** One composed rune as `contracts` records it (D6, D10c). */
export interface CompositionContract {
	slots: string[];
	outline: CompositionOutlineNode[];
}

/** The compositions in a rune catalog, keyed by `data-rune`, for `contracts`. */
export function collectCompositions(
	runes: Record<string, { name: string; schema?: Schema }>,
): Record<string, CompositionContract> {
	const out: Record<string, CompositionContract> = {};
	for (const rune of Object.values(runes)) {
		const info = compositionFor(rune.schema);
		if (info) out[info.rune] = { slots: [...info.slots], outline: info.outline };
	}
	return out;
}
