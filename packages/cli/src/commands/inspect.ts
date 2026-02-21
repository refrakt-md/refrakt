import type { Rune } from '@refrakt-md/runes';
import type { ThemeConfig } from '@refrakt-md/transform';

import { getFixture } from '../lib/fixtures.js';
import { discoverVariants } from '../lib/variants.js';
import {
	formatConfig,
	formatSelectors,
	formatInput,
	formatHtml,
	formatRuneList,
	buildJsonOutput,
	heading,
} from '../lib/format.js';

/** Dependencies injected at runtime via dynamic imports */
export interface InspectDeps {
	Markdoc: { parse: (source: string) => any; transform: (ast: any, config: any) => any };
	runes: Record<string, Rune>;
	tags: Record<string, any>;
	nodes: Record<string, any>;
	serializeTree: (tree: any) => unknown;
	extractHeadings: (ast: any) => any[];
	createTransform: (config: ThemeConfig) => (tree: any) => any;
	renderToHtml: (node: any, options?: { pretty?: boolean }) => string;
	extractSelectors: (node: any, prefix: string) => string[];
	baseConfig: ThemeConfig;
}

export interface InspectOptions {
	runeName?: string;
	list: boolean;
	json: boolean;
	theme: string;
	items: number;
	flags: Record<string, string>;
}

export async function inspectCommand(
	options: InspectOptions,
	deps: InspectDeps,
): Promise<void> {
	const {
		runes,
		baseConfig,
	} = deps;

	// --list mode: show all available runes
	if (options.list) {
		return listRunes(runes, options.json);
	}

	if (!options.runeName) {
		throw new Error('Missing rune name. Use --list to see available runes.\n\nUsage: refrakt inspect <rune> [options]');
	}

	// Resolve the rune by name or alias
	const rune = findRune(options.runeName, runes);
	if (!rune) {
		const available = Object.values(runes)
			.map(r => `  ${r.name}${r.aliases.length > 0 ? ` (${r.aliases.join(', ')})` : ''}`)
			.join('\n');
		throw new Error(`Unknown rune "${options.runeName}"\n\nAvailable runes:\n${available}`);
	}

	// Resolve theme config
	const config = resolveTheme(options.theme, baseConfig);

	// Check for variant expansion (e.g., --type=all)
	const schemaVariants = discoverVariants(rune.schema);
	const expandAttr = findExpandAttr(options.flags, schemaVariants);

	if (expandAttr) {
		// Expand all variants for this attribute
		const values = schemaVariants[expandAttr];
		if (options.json) {
			const results = [];
			for (const value of values) {
				const overrides = { ...options.flags, [expandAttr]: value };
				results.push(inspectSingle(rune, config, overrides, deps));
			}
			console.log(JSON.stringify(results, null, 2));
		} else {
			for (const value of values) {
				console.log(heading(`Variant: ${expandAttr}=${value}`));
				const overrides = { ...options.flags, [expandAttr]: value };
				outputFormatted(rune, config, overrides, deps);
				console.log('');
			}
		}
	} else {
		// Single variant
		if (options.json) {
			const result = inspectSingle(rune, config, options.flags, deps);
			console.log(JSON.stringify(result, null, 2));
		} else {
			outputFormatted(rune, config, options.flags, deps);
		}
	}
}

/** Run the full pipeline for a single rune variant and return structured data */
function inspectSingle(
	rune: Rune,
	config: ThemeConfig,
	flags: Record<string, string>,
	deps: InspectDeps,
) {
	const { tree, source } = runPipeline(rune, config, flags, deps);
	const html = deps.renderToHtml(tree, { pretty: true });
	const selectors = deps.extractSelectors(tree, config.prefix);
	const runeTypeof = rune.type?.name;
	const runeConfig = runeTypeof ? config.runes[runeTypeof] : undefined;

	return buildJsonOutput({
		rune: rune.name,
		theme: 'base',
		input: source,
		config: runeConfig,
		html,
		selectors,
	});
}

/** Run the full pipeline and output formatted text */
function outputFormatted(
	rune: Rune,
	config: ThemeConfig,
	flags: Record<string, string>,
	deps: InspectDeps,
): void {
	const { tree, source } = runPipeline(rune, config, flags, deps);
	const html = deps.renderToHtml(tree, { pretty: true });
	const selectors = deps.extractSelectors(tree, config.prefix);
	const runeTypeof = rune.type?.name;

	console.log(heading('Input'));
	console.log(formatInput(source));

	if (runeTypeof) {
		console.log(heading('Config Applied'));
		console.log(formatConfig(runeTypeof, config));
	}

	console.log(heading('Output HTML'));
	console.log(formatHtml(html));

	console.log(heading('Selectors'));
	console.log(formatSelectors(selectors));
}

/** Run the Markdoc parse → transform → serialize → identity transform pipeline */
function runPipeline(
	rune: Rune,
	config: ThemeConfig,
	flags: Record<string, string>,
	deps: InspectDeps,
): { tree: any; source: string } {
	const source = getFixture(rune.name, flags);
	const ast = deps.Markdoc.parse(source);
	const headings = deps.extractHeadings(ast);

	const transformed = deps.Markdoc.transform(ast, {
		tags: deps.tags,
		nodes: deps.nodes,
		variables: {
			generatedIds: new Set<string>(),
			path: '/inspect.md',
			headings,
			__source: source,
		},
	});

	const serialized = deps.serializeTree(transformed);
	const identityTransform = deps.createTransform(config);
	const tree = identityTransform(serialized);

	return { tree, source };
}

/** List all available runes */
function listRunes(runes: Record<string, Rune>, json: boolean): void {
	const list = Object.values(runes).map(rune => ({
		name: rune.name,
		aliases: rune.aliases,
		description: rune.description,
		variants: discoverVariants(rune.schema),
	}));

	if (json) {
		console.log(JSON.stringify(list, null, 2));
	} else {
		console.log(heading('Available Runes'));
		console.log('');
		console.log(formatRuneList(list));
	}
}

/** Find a rune by name or alias */
function findRune(name: string, runes: Record<string, Rune>): Rune | undefined {
	// Direct match on rune key
	if (runes[name]) return runes[name];

	// Search by name or alias
	for (const rune of Object.values(runes)) {
		if (rune.name === name || rune.aliases.includes(name)) {
			return rune;
		}
	}

	return undefined;
}

/** Check if any flag has value "all" and corresponds to a known variant */
function findExpandAttr(flags: Record<string, string>, variants: Record<string, string[]>): string | null {
	for (const [key, value] of Object.entries(flags)) {
		if (value === 'all' && variants[key]) {
			return key;
		}
	}
	return null;
}

/** Resolve a theme name to a ThemeConfig */
function resolveTheme(theme: string, baseConfig: ThemeConfig): ThemeConfig {
	// For Phase 1, only base config is supported
	if (theme === 'base') return baseConfig;

	// TODO: Phase 2 — resolve named themes by importing from @refrakt-md/<name>
	// or loading from a local refrakt.config.ts
	console.error(`Warning: Theme "${theme}" not found, using base config.\n`);
	return baseConfig;
}
