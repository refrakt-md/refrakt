import type { Rune } from '@refrakt-md/runes';
import type { ThemeConfig } from '@refrakt-md/transform';

import { extractComponentInterface, fromKebabCase, isTag } from '@refrakt-md/transform';
import type { SerializedTag } from '@refrakt-md/types';
import { getFixture } from '../lib/fixtures.js';
import { discoverVariants } from '../lib/variants.js';
import {
	parseCssFile,
	auditSelectors,
	collectAllSelectors,
	type CssSelectorMatch,
	type AuditResult,
} from '../lib/css-audit.js';
import { resolveCssDir, readCssForBlock, readAllCss } from '../lib/css-resolve.js';
import {
	formatConfig,
	formatSelectors,
	formatInput,
	formatHtml,
	formatRuneList,
	buildJsonOutput,
	formatAuditResult,
	formatAuditSummary,
	buildAuditJson,
	formatMetaAuditResult,
	buildMetaAuditJson,
	formatDimensionAuditResult,
	buildDimensionAuditJson,
	heading,
} from '../lib/format.js';
import { collectMetadata, checkMetaCss, type MetaAuditResult } from '../lib/meta-audit.js';
import { collectDimensions, checkDimensionCss, type DimensionAuditResult } from '../lib/dimension-audit.js';

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
	/** Fixture strings from community packages (keyed by rune name) */
	packageFixtures?: Record<string, string>;
}

export interface InspectOptions {
	runeName?: string;
	list: boolean;
	json: boolean;
	audit: boolean;
	auditMeta: boolean;
	auditDimensions: boolean;
	all: boolean;
	showInterface: boolean;
	theme: string;
	items: number;
	cssDir?: string;
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

	// Resolve theme config
	const config = await resolveTheme(options.theme, baseConfig);

	// --audit-meta: metadata dimension audit
	if (options.auditMeta) {
		return runMetaAudit(config, options);
	}

	// --audit-dimensions: universal theming dimension audit
	if (options.auditDimensions) {
		return runDimensionAudit(config, options);
	}

	// --all --audit: full-theme audit
	if (options.all && options.audit) {
		return runFullAudit(config, runes, options, deps);
	}

	// --all without --audit: not supported yet
	if (options.all) {
		throw new Error('--all currently requires --audit. Use --list to see available runes.');
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

	// --audit mode for a single rune
	if (options.audit) {
		return runSingleAudit(rune, config, options, deps);
	}

	// --interface mode: show component override interface
	if (options.showInterface) {
		return showComponentInterface(rune, config, options, deps);
	}

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

/** Run audit for a single rune */
function runSingleAudit(
	rune: Rune,
	config: ThemeConfig,
	options: InspectOptions,
	deps: InspectDeps,
): void {
	const cssDir = resolveCssDir(options.cssDir);
	if (!cssDir) {
		throw new Error('No CSS directory found. Use --css <dir> to specify the path to rune CSS files.');
	}

	const runeTypeof = rune.typeName;
	const runeConfig = runeTypeof ? config.runes[runeTypeof] : undefined;
	if (!runeConfig) {
		throw new Error(`No engine config found for rune "${rune.name}". It may be a component-only rune without identity transform config.`);
	}

	// Read CSS for this block
	const cssFile = readCssForBlock(cssDir, runeConfig.block);
	const cssMatches: CssSelectorMatch[] = cssFile
		? parseCssFile(cssFile.content, cssFile.path)
		: [];

	// Collect all possible selectors across variants
	const schemaVariants = discoverVariants(rune.schema);
	const allSelectors = collectAllSelectors(
		rune.name,
		runeConfig.block,
		config.prefix,
		schemaVariants,
		runeConfig.contextModifiers,
		runeConfig.staticModifiers,
		(flags) => {
			const { tree } = runPipeline(rune, config, flags, deps);
			return deps.extractSelectors(tree, config.prefix);
		},
	);

	const result = auditSelectors(rune.name, allSelectors, cssMatches);

	if (options.json) {
		console.log(JSON.stringify(buildAuditJson([result], options.theme), null, 2));
	} else {
		console.log(formatAuditResult(result, options.theme));
	}
}

/** Run audit for all runes in the theme */
function runFullAudit(
	config: ThemeConfig,
	runes: Record<string, Rune>,
	options: InspectOptions,
	deps: InspectDeps,
): void {
	const cssDir = resolveCssDir(options.cssDir);
	if (!cssDir) {
		throw new Error('No CSS directory found. Use --css <dir> to specify the path to rune CSS files.');
	}

	// Parse all CSS files upfront
	const cssFiles = readAllCss(cssDir);
	const allCssMatches: CssSelectorMatch[] = [];
	for (const file of cssFiles) {
		allCssMatches.push(...parseCssFile(file.content, file.path));
	}

	const results: AuditResult[] = [];

	// Iterate over all runes that have engine config
	for (const rune of Object.values(runes)) {
		const runeTypeof = rune.typeName;
		const runeConfig = runeTypeof ? config.runes[runeTypeof] : undefined;
		if (!runeConfig) continue; // Skip runes without identity transform config

		const schemaVariants = discoverVariants(rune.schema);

		let allSelectors: string[];
		try {
			allSelectors = collectAllSelectors(
				rune.name,
				runeConfig.block,
				config.prefix,
				schemaVariants,
				runeConfig.contextModifiers,
				runeConfig.staticModifiers,
				(flags) => {
					const { tree } = runPipeline(rune, config, flags, deps);
					return deps.extractSelectors(tree, config.prefix);
				},
			);
		} catch {
			// Skip runes whose fixtures fail to transform
			continue;
		}

		// Filter CSS matches to only those relevant to this rune's block
		const blockPrefix = `.${config.prefix}-${runeConfig.block}`;
		const relevantCss = allCssMatches.filter(m =>
			m.selector.startsWith(blockPrefix) || m.selector.startsWith('[data-')
		);

		results.push(auditSelectors(rune.name, allSelectors, relevantCss));
	}

	// Sort results: complete first, then partial, then not-started, alphabetically within each group
	results.sort((a, b) => {
		const order = { 'complete': 0, 'partial': 1, 'not-started': 2 };
		const statusDiff = order[a.status] - order[b.status];
		if (statusDiff !== 0) return statusDiff;
		return a.rune.localeCompare(b.rune);
	});

	if (options.json) {
		console.log(JSON.stringify(buildAuditJson(results, options.theme), null, 2));
	} else {
		console.log(formatAuditSummary(results, options.theme));
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
	const runeTypeof = rune.typeName;
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
	const runeTypeof = rune.typeName;

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
	const source = deps.packageFixtures?.[rune.name] ?? getFixture(rune.name, flags);
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
			frontmatter: {},
			page: { url: '/inspect.md', filePath: 'inspect.md', draft: false },
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

/** Run metadata dimension audit across all rune configs */
function runMetaAudit(
	config: ThemeConfig,
	options: InspectOptions,
): void {
	const metadata = collectMetadata(config);
	const cssDir = resolveCssDir(options.cssDir);
	const cssResult = cssDir ? checkMetaCss(cssDir) : undefined;

	const result: MetaAuditResult = { ...metadata, css: cssResult };

	if (options.json) {
		console.log(JSON.stringify(buildMetaAuditJson(result), null, 2));
	} else {
		console.log(formatMetaAuditResult(result));
	}
}

/** Run universal theming dimension audit across all rune configs */
function runDimensionAudit(
	config: ThemeConfig,
	options: InspectOptions,
): void {
	const dimensions = collectDimensions(config);
	const cssDir = resolveCssDir(options.cssDir);
	const cssResult = cssDir ? checkDimensionCss(cssDir) : undefined;

	// Determine unassigned runes: runes with dimensions but no surface in CSS
	const allRuneBlocks = new Set(Object.values(config.runes).map(r => r.block));
	const assignedBlocks = new Set(cssResult?.surfaces.flatMap(g => g.runes) ?? []);
	const unassignedRunes = [...allRuneBlocks].filter(b => !assignedBlocks.has(b)).sort();

	const result: DimensionAuditResult = {
		...dimensions,
		surfaces: cssResult?.surfaces ?? [],
		unassignedRunes,
		css: cssResult?.css,
	};

	if (options.json) {
		console.log(JSON.stringify(buildDimensionAuditJson(result), null, 2));
	} else {
		console.log(formatDimensionAuditResult(result));
	}
}

/** Show the component override interface for a rune (ADR-008) */
function showComponentInterface(
	rune: Rune,
	config: ThemeConfig,
	options: InspectOptions,
	deps: InspectDeps,
): void {
	// Run the pipeline to get the serialized (pre-identity-transform) tree
	const source = deps.packageFixtures?.[rune.name] ?? getFixture(rune.name, options.flags);
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
			frontmatter: {},
			page: { url: '/inspect.md', filePath: 'inspect.md', draft: false },
		},
	});

	const serialized = deps.serializeTree(transformed) as any;

	// Find the rune's root tag in the serialized tree.
	// The data-rune attribute may differ from the CLI rune name (e.g., tabs → tab-group),
	// so search for any tag with a data-rune attribute first.
	const runeTag = findRuneTag(serialized, rune.name) ?? findFirstRuneTag(serialized);
	if (!runeTag) {
		throw new Error(`Could not find rune "${rune.name}" in the serialized output.`);
	}

	const iface = extractComponentInterface(runeTag as SerializedTag);

	// Get schema attribute types for richer type info
	const schema = rune.schema;
	const attrTypes: Record<string, string> = {};
	if (schema?.attributes) {
		for (const [key, def] of Object.entries(schema.attributes)) {
			if (def.matches && Array.isArray(def.matches)) {
				attrTypes[key] = (def.matches as string[]).map((v: string) => `'${v}'`).join(' | ');
			} else if (def.type === String) {
				attrTypes[key] = 'string';
			} else if (def.type === Number) {
				attrTypes[key] = 'string'; // meta content is always string
			} else if (def.type === Boolean) {
				attrTypes[key] = 'string';
			} else {
				attrTypes[key] = 'string';
			}
		}
	}

	if (options.json) {
		const result = {
			rune: rune.name,
			typeName: rune.typeName,
			properties: Object.entries(iface.properties).map(([name, value]) => ({
				name,
				type: attrTypes[name] ?? 'string',
				example: value || undefined,
			})),
			slots: Object.entries(iface.refs).map(([name, tags]) => ({
				name,
				elements: tags.length,
			})),
			hasAnonymousContent: iface.children.length > 0,
		};
		console.log(JSON.stringify(result, null, 2));
	} else {
		console.log(heading('Component Interface'));
		console.log(`  Rune: ${rune.name}${rune.typeName ? ` (${rune.typeName})` : ''}\n`);

		const propEntries = Object.entries(iface.properties);
		if (propEntries.length > 0) {
			console.log(heading('Properties (scalar props)'));
			for (const [name, value] of propEntries) {
				const type = attrTypes[name] ?? 'string';
				const example = value ? ` = "${value}"` : '';
				console.log(`  ${name}: ${type}${example}`);
			}
			console.log('');
		}

		const refEntries = Object.entries(iface.refs);
		if (refEntries.length > 0) {
			console.log(heading('Slots (named renderables)'));
			for (const [name, tags] of refEntries) {
				const tagNames = tags.map(t => t.name).join(', ');
				console.log(`  ${name}: Snippet  (${tagNames})`);
			}
			console.log('');
		}

		if (iface.children.length > 0) {
			console.log(heading('Default Slot'));
			console.log(`  children: Snippet  (${iface.children.length} node(s))`);
			console.log('');
		}

		// Show usage example
		console.log(heading('Svelte 5 Usage'));
		const props = [
			...propEntries.map(([n]) => n),
			...refEntries.map(([n]) => n),
			...(iface.children.length > 0 ? ['children'] : []),
			'tag',
		];
		console.log(`  let { ${props.join(', ')} }: ${rune.typeName ?? 'Props'}<Snippet> = $props();`);
		console.log('');
	}
}

/** Recursively find the rune root tag by data-rune attribute */
function findRuneTag(node: any, runeName: string): any {
	if (!node) return undefined;
	if (Array.isArray(node)) {
		for (const child of node) {
			const found = findRuneTag(child, runeName);
			if (found) return found;
		}
		return undefined;
	}
	if (typeof node === 'object' && node.$$mdtype === 'Tag') {
		if (node.attributes?.['data-rune'] === runeName) return node;
		if (node.children) {
			for (const child of node.children) {
				const found = findRuneTag(child, runeName);
				if (found) return found;
			}
		}
	}
	return undefined;
}

/** Find the first tag with any data-rune attribute (fallback when name doesn't match) */
function findFirstRuneTag(node: any): any {
	if (!node) return undefined;
	if (Array.isArray(node)) {
		for (const child of node) {
			const found = findFirstRuneTag(child);
			if (found) return found;
		}
		return undefined;
	}
	if (typeof node === 'object' && node.$$mdtype === 'Tag') {
		if (node.attributes?.['data-rune']) return node;
		if (node.children) {
			for (const child of node.children) {
				const found = findFirstRuneTag(child);
				if (found) return found;
			}
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
async function resolveTheme(theme: string, baseConfig: ThemeConfig): Promise<ThemeConfig> {
	if (theme === 'base') return baseConfig;

	// Try dynamic import — works for package names (e.g., '@refrakt-md/lumina')
	// and file paths (e.g., './src/config.ts')
	const importPath = theme.startsWith('.') || theme.startsWith('/')
		? (await import('node:path')).resolve(theme)
		: theme + '/transform';

	try {
		const mod = await import(importPath);
		// Look for common export names
		const config = mod.themeConfig ?? mod.config ?? mod.default;
		if (config && typeof config === 'object' && config.runes && config.prefix) {
			return config as ThemeConfig;
		}
		console.error(`Warning: "${importPath}" does not export a valid ThemeConfig, using base config.\n`);
		return baseConfig;
	} catch (err) {
		console.error(`Warning: Could not load theme "${theme}" (${importPath}): ${(err as Error).message}\n`);
		console.error(`Falling back to base config.\n`);
		return baseConfig;
	}
}
