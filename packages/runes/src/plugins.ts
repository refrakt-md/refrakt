import type { Schema } from '@markdoc/markdoc';
import type { Plugin, RuneExtension } from '@refrakt-md/types';
import type { RuneConfig, RuneProvenance } from '@refrakt-md/transform';
import { Rune, defineRune, runeTagMap } from './rune.js';

/** A loaded plugin with its parsed rune definitions */
export interface LoadedPlugin {
	/** The original plugin registration object */
	pkg: Plugin;
	/** The npm package name it was loaded from */
	npmName: string;
	/** Rune instances created from the plugin's entries */
	runes: Record<string, Rune>;
	/** Fixture strings for the inspect command (keyed by rune name) */
	fixtures: Record<string, string>;
	/** Plugin-declared file roots, resolved to absolute directory paths.
	 *  Keys are namespace names (the `<ns>` in `<ns>:filename` references);
	 *  values are absolute paths on disk. Empty when the plugin doesn't
	 *  declare any. */
	fileRoots: Record<string, string>;
}

/** Result of merging multiple plugins */
export interface MergedPluginResult {
	/** Plugin runes (collision-free, keyed by rune name) */
	runes: Record<string, Rune>;
	/** Markdoc tags map for plugin runes */
	tags: Record<string, Schema>;
	/** Theme config rune entries from all plugins */
	themeRunes: Record<string, RuneConfig>;
	/** Theme icon entries from all plugins */
	themeIcons: Record<string, Record<string, string>>;
	/** Theme background preset entries from all plugins */
	themeBackgrounds: Record<string, Record<string, unknown>>;
	/** Schema extensions for core runes (keyed by core rune name) */
	extensions: Record<string, RuneExtension>;
	/** Source plugin metadata */
	plugins: Plugin[];
	/** Source provenance for every resolved rune name */
	provenance: Record<string, RuneProvenance>;
	/** Fixture strings from plugins for the inspect command */
	fixtures: Record<string, string>;
	/** Merged plugin file roots — namespace → absolute directory path.
	 *  Plugin-vs-plugin collisions throw at merge time; user-config-vs-plugin
	 *  collisions are handled by the caller (user config wins). */
	fileRoots: Record<string, string>;
}

/** Reserved namespace names that cannot be used by user config or plugins. */
const RESERVED_FILE_ROOT_NAMESPACES = new Set(['site']);

/** Validate that a file-root namespace name is allowed. Throws on reserved
 *  values or invalid syntax (empty name). Used both at plugin merge time
 *  and at user-config-resolution time. */
export function assertFileRootNamespaceAllowed(namespace: string, source: string): void {
	if (namespace.length === 0) {
		throw new Error(`File-root namespace from ${source} is empty — namespaces must be non-empty strings.`);
	}
	if (RESERVED_FILE_ROOT_NAMESPACES.has(namespace)) {
		throw new Error(
			`File-root namespace "${namespace}" from ${source} is reserved. ` +
			`Pick a different namespace name.`
		);
	}
}

/**
 * Load a plugin by npm package name.
 *
 * Dynamically imports the package and extracts the Plugin export.
 * Creates Rune instances from each plugin entry using defineRune().
 */
export async function loadPlugin(npmPackageName: string): Promise<LoadedPlugin> {
	let mod: Record<string, unknown>;
	try {
		mod = await import(/* @vite-ignore */ npmPackageName);
	} catch (err) {
		throw new Error(
			`Failed to load plugin "${npmPackageName}": ${(err as Error).message}\n` +
			`Make sure the package is installed: npm install ${npmPackageName}`
		);
	}

	const pkg = findPluginExport(mod, npmPackageName);

	validatePlugin(pkg, npmPackageName);

	const runes: Record<string, Rune> = {};
	const fixtures: Record<string, string> = {};
	for (const [runeName, entry] of Object.entries(pkg.runes)) {
		runes[runeName] = defineRune({
			name: runeName,
			schema: entry.transform as Schema,
			description: entry.description ?? `Plugin rune from ${pkg.displayName ?? pkg.name}`,
			aliases: entry.aliases,
			seoType: entry.seoType,
			authoringHints: entry.authoringHints,
		});
		if (entry.fixture) {
			fixtures[runeName] = entry.fixture;
		}
	}

	const fileFixtures = await discoverPluginFixtures(npmPackageName);
	for (const [runeName, content] of Object.entries(fileFixtures)) {
		if (!fixtures[runeName]) {
			fixtures[runeName] = content;
		}
	}

	const fileRoots = await resolvePluginFileRoots(pkg, npmPackageName);

	return { pkg, npmName: npmPackageName, runes, fixtures, fileRoots };
}

/** Resolve a plugin's declared `fileRoots` to absolute on-disk paths.
 *
 *  Paths are interpreted relative to the plugin package's own directory
 *  (the dir containing the plugin's `package.json`). Throws if the package
 *  can't be located on disk (workspace-link cases where `require.resolve`
 *  fails) — fileRoots that can't be reached is a misconfig worth surfacing,
 *  not silently dropping like file fixtures. */
async function resolvePluginFileRoots(
	pkg: Plugin,
	npmPackageName: string,
): Promise<Record<string, string>> {
	const declared = pkg.fileRoots;
	if (!declared || Object.keys(declared).length === 0) return {};

	const { createRequire } = await import('node:module');
	const { dirname, resolve } = await import('node:path');

	let pkgDir: string;
	try {
		const require = createRequire(import.meta.url);
		pkgDir = dirname(require.resolve(`${npmPackageName}/package.json`));
	} catch (err) {
		throw new Error(
			`Plugin "${npmPackageName}" declares fileRoots but its package directory could not be located: ${(err as Error).message}`,
		);
	}

	const resolved: Record<string, string> = {};
	for (const [namespace, relativePath] of Object.entries(declared)) {
		assertFileRootNamespaceAllowed(namespace, `plugin "${npmPackageName}"`);
		if (typeof relativePath !== 'string' || relativePath.length === 0) {
			throw new Error(
				`Plugin "${npmPackageName}" fileRoots entry "${namespace}" has an invalid path. Expected a non-empty string relative to the plugin package directory.`,
			);
		}
		resolved[namespace] = resolve(pkgDir, relativePath);
	}
	return resolved;
}

/**
 * Merge multiple loaded plugins into a single result.
 *
 * Resolution rules:
 * 1. Single plugin providing a core rune name: plugin wins (official breakout path)
 * 2. Multiple plugins + core collision: resolved by `prefer` map, or throws
 * 3. `prefer` value `"__core__"` forces core to win for that rune
 * 4. Two plugins same name, no core: resolved by `prefer`, or throws
 */
export function mergePlugins(
	loaded: LoadedPlugin[],
	coreRuneNames: Set<string>,
	prefer?: Record<string, string>,
): MergedPluginResult {
	const ownership = new Map<string, Array<{ pkg: LoadedPlugin; rune: Rune }>>();

	for (const loadedPkg of loaded) {
		for (const [name, rune] of Object.entries(loadedPkg.runes)) {
			if (!ownership.has(name)) {
				ownership.set(name, []);
			}
			ownership.get(name)!.push({ pkg: loadedPkg, rune });
		}
	}

	const runes: Record<string, Rune> = {};
	const provenance: Record<string, RuneProvenance> = {};

	for (const [name, candidates] of ownership) {
		if (coreRuneNames.has(name)) {
			if (prefer?.[name] === '__core__') {
				continue;
			}

			if (candidates.length === 1) {
				const c = candidates[0];
				runes[name] = c.rune;
				provenance[name] = {
					qualifiedId: `${c.pkg.pkg.name}:${name}`,
					source: 'plugin',
					pluginName: c.pkg.pkg.name,
					origin: c.pkg.npmName,
				};
				continue;
			}

			const preferred = prefer?.[name];
			if (preferred) {
				const match = candidates.find(c => c.pkg.pkg.name === preferred);
				if (match) {
					runes[name] = match.rune;
					provenance[name] = {
						qualifiedId: `${match.pkg.pkg.name}:${name}`,
						source: 'plugin',
						pluginName: match.pkg.pkg.name,
						origin: match.pkg.npmName,
					};
					continue;
				}
				const available = [...candidates.map(c => c.pkg.pkg.name), '__core__'].join(', ');
				throw new Error(
					`Rune "${name}" preference "${preferred}" does not match any providing plugin.\n` +
					`Available: ${available}`
				);
			}

			const pkgNames = candidates.map(c => c.pkg.npmName).join(', ');
			const pkgShortNames = [...candidates.map(c => c.pkg.pkg.name), '__core__'].join(', ');
			throw new Error(
				`Rune name "${name}" is ambiguous: provided by ${pkgNames} and also a core rune.\n` +
				`  Resolve by adding to refrakt.config.json:\n` +
				`  "runes": { "prefer": { "${name}": "<plugin-name>" } }\n\n` +
				`  Use "__core__" to keep the core version.\n` +
				`  Available: ${pkgShortNames}`
			);
		}

		if (candidates.length === 1) {
			const c = candidates[0];
			runes[name] = c.rune;
			provenance[name] = {
				qualifiedId: `${c.pkg.pkg.name}:${name}`,
				source: 'plugin',
				pluginName: c.pkg.pkg.name,
				origin: c.pkg.npmName,
			};
		} else {
			const preferred = prefer?.[name];
			if (preferred) {
				const match = candidates.find(c => c.pkg.pkg.name === preferred);
				if (match) {
					runes[name] = match.rune;
					provenance[name] = {
						qualifiedId: `${match.pkg.pkg.name}:${name}`,
						source: 'plugin',
						pluginName: match.pkg.pkg.name,
						origin: match.pkg.npmName,
					};
				} else {
					const available = candidates.map(c => c.pkg.pkg.name).join(', ');
					throw new Error(
						`Rune "${name}" preference "${preferred}" does not match any providing plugin.\n` +
						`Available: ${available}`
					);
				}
			} else {
				const pkgNames = candidates.map(c => c.pkg.npmName).join(', ');
				const pkgShortNames = candidates.map(c => c.pkg.pkg.name).join(', ');
				throw new Error(
					`Rune name "${name}" is ambiguous.\n` +
					`  Found in: ${pkgNames}\n\n` +
					`  Resolve by adding to refrakt.config.json:\n` +
					`  "runes": { "prefer": { "${name}": "${candidates[0].pkg.pkg.name}" } }\n\n` +
					`  Available plugin names: ${pkgShortNames}`
				);
			}
		}
	}

	const tags = runeTagMap(runes);

	const themeRunes: Record<string, RuneConfig> = {};
	const themeIcons: Record<string, Record<string, string>> = {};
	const themeBackgrounds: Record<string, Record<string, unknown>> = {};

	for (const loadedPkg of loaded) {
		if (loadedPkg.pkg.theme?.runes) {
			for (const [key, value] of Object.entries(loadedPkg.pkg.theme.runes)) {
				themeRunes[key] = value as unknown as RuneConfig;
			}
		}
		if (loadedPkg.pkg.theme?.icons) {
			for (const [group, icons] of Object.entries(loadedPkg.pkg.theme.icons)) {
				themeIcons[group] = { ...themeIcons[group], ...icons };
			}
		}
		if (loadedPkg.pkg.theme?.backgrounds) {
			for (const [name, preset] of Object.entries(loadedPkg.pkg.theme.backgrounds)) {
				themeBackgrounds[name] = preset;
			}
		}
	}

	const extensions: Record<string, RuneExtension> = {};
	for (const loadedPkg of loaded) {
		if (loadedPkg.pkg.extends) {
			for (const [runeName, ext] of Object.entries(loadedPkg.pkg.extends)) {
				if (!extensions[runeName]) {
					extensions[runeName] = { schema: {} };
				}
				if (ext.schema) {
					extensions[runeName].schema = { ...extensions[runeName].schema, ...ext.schema };
				}
			}
		}
	}

	const fixtures: Record<string, string> = {};
	for (const name of Object.keys(runes)) {
		for (const loadedPkg of loaded) {
			if (loadedPkg.fixtures[name]) {
				fixtures[name] = loadedPkg.fixtures[name];
				break;
			}
		}
	}

	// Merge file roots across plugins. Plugin-vs-plugin collisions throw —
	// plugins should pick distinct namespace names. User-config wins over
	// plugin collisions, but that's handled outside this function.
	const fileRoots: Record<string, string> = {};
	const fileRootProvenance = new Map<string, string>();
	for (const loadedPkg of loaded) {
		for (const [namespace, absPath] of Object.entries(loadedPkg.fileRoots)) {
			if (fileRoots[namespace]) {
				const previous = fileRootProvenance.get(namespace);
				throw new Error(
					`Plugin file-root namespace "${namespace}" is registered by both "${previous}" and "${loadedPkg.npmName}". ` +
					`Plugins must pick distinct namespace names; resolve by renaming one of them.`,
				);
			}
			fileRoots[namespace] = absPath;
			fileRootProvenance.set(namespace, loadedPkg.npmName);
		}
	}

	return {
		runes,
		tags,
		themeRunes,
		themeIcons,
		themeBackgrounds,
		extensions,
		plugins: loaded.map(l => l.pkg),
		provenance,
		fixtures,
		fileRoots,
	};
}

/**
 * Apply config-level aliases to a resolved rune/tag set.
 *
 * Each alias creates a new tag entry pointing to the aliased rune's schema.
 * Aliases cannot shadow existing rune names (throws on collision).
 * This is separate from schema-level aliases (baked into defineRune/runeTagMap).
 */
export function applyAliases(
	runes: Record<string, Rune>,
	tags: Record<string, Schema>,
	aliases: Record<string, string>,
	provenance: Record<string, RuneProvenance>,
): { tags: Record<string, Schema>; provenance: Record<string, RuneProvenance> } {
	const newTags = { ...tags };
	const newProvenance = { ...provenance };

	for (const [alias, canonical] of Object.entries(aliases)) {
		if (runes[alias] || tags[alias]) {
			throw new Error(
				`Alias "${alias}" conflicts with an existing rune or tag name. ` +
				`Remove the alias or rename the rune.`
			);
		}
		const target = runes[canonical];
		if (!target) {
			throw new Error(
				`Alias "${alias}" targets rune "${canonical}" which does not exist. ` +
				`Check the rune name in runes.aliases.`
			);
		}
		newTags[alias] = target.schema;
		if (provenance[canonical]) {
			newProvenance[alias] = {
				...provenance[canonical],
				qualifiedId: `alias:${alias}->${provenance[canonical].qualifiedId}`,
			};
		}
	}

	return { tags: newTags, provenance: newProvenance };
}

/**
 * Load local rune definitions from project-relative module paths.
 *
 * Each entry maps a rune name to a module path that exports a rune entry.
 * Local runes have the highest priority in the resolution order.
 */
export async function loadLocalRunes(
	localConfig: Record<string, string>,
	projectRoot: string,
): Promise<LoadedPlugin> {
	const runes: Record<string, Rune> = {};

	const { resolve } = await import('node:path');

	for (const [name, modulePath] of Object.entries(localConfig)) {
		const absPath = resolve(projectRoot, modulePath);
		let mod: Record<string, unknown>;
		try {
			mod = await import(/* @vite-ignore */ absPath);
		} catch (err) {
			throw new Error(
				`Failed to load local rune "${name}" from "${modulePath}": ${(err as Error).message}`
			);
		}

		const entry = (mod.default ?? mod) as { transform?: Record<string, unknown> };

		if (!entry.transform || typeof entry.transform !== 'object') {
			throw new Error(
				`Local rune "${name}" at "${modulePath}" must export a transform (Markdoc Schema).`
			);
		}

		runes[name] = defineRune({
			name,
			schema: entry.transform as Schema,
			description: `Local rune from ${modulePath}`,
		});
	}

	return {
		pkg: {
			name: '__local__',
			version: '0.0.0',
			runes: Object.fromEntries(
				Object.entries(runes).map(([k]) => [k, { transform: {} }])
			),
		},
		npmName: '__local__',
		runes,
		fixtures: {},
		fileRoots: {},
	};
}

/**
 * Discover file-based fixtures from an installed plugin's fixtures/ directory.
 *
 * Looks for .md files in the package's fixtures/ directory. Each file's name
 * (without extension) becomes the fixture key (rune name).
 *
 * Returns a map of rune name → fixture content string.
 */
export async function discoverPluginFixtures(npmPackageName: string): Promise<Record<string, string>> {
	const fixtures: Record<string, string> = {};

	try {
		const { createRequire } = await import('node:module');
		const { existsSync, readFileSync, readdirSync } = await import('node:fs');
		const { dirname, join } = await import('node:path');

		const require = createRequire(import.meta.url);
		const pkgJsonPath = require.resolve(`${npmPackageName}/package.json`);
		const pkgDir = dirname(pkgJsonPath);
		const fixturesDir = join(pkgDir, 'fixtures');

		if (!existsSync(fixturesDir)) {
			return fixtures;
		}

		const files = readdirSync(fixturesDir);
		for (const file of files) {
			if (!file.endsWith('.md')) continue;
			const runeName = file.slice(0, -3);
			const content = readFileSync(join(fixturesDir, file), 'utf-8');
			if (content.trim()) {
				fixtures[runeName] = content;
			}
		}
	} catch {
		// Plugin not resolvable via require (e.g., workspace link) — skip file fixtures
	}

	return fixtures;
}

/** Find the Plugin export from a dynamically imported module */
function findPluginExport(mod: Record<string, unknown>, npmName: string): Plugin {
	if (mod.default && isPlugin(mod.default)) {
		return mod.default as Plugin;
	}

	for (const value of Object.values(mod)) {
		if (isPlugin(value)) {
			return value as Plugin;
		}
	}

	throw new Error(
		`Package "${npmName}" does not export a valid Plugin object.\n` +
		`Expected an export with { name: string, version: string, runes: { ... } }`
	);
}

/** Type guard for Plugin shape */
function isPlugin(value: unknown): value is Plugin {
	if (typeof value !== 'object' || value === null) return false;
	const obj = value as Record<string, unknown>;
	return typeof obj.name === 'string' && typeof obj.version === 'string' && typeof obj.runes === 'object' && obj.runes !== null;
}

/** Validate a loaded Plugin has required fields */
function validatePlugin(pkg: Plugin, npmName: string): void {
	if (!pkg.name) {
		throw new Error(`Plugin "${npmName}" has an empty name field`);
	}
	if (!pkg.version) {
		throw new Error(`Plugin "${npmName}" has an empty version field`);
	}
	if (!pkg.runes || Object.keys(pkg.runes).length === 0) {
		throw new Error(`Plugin "${npmName}" defines no runes`);
	}

	for (const [name, entry] of Object.entries(pkg.runes)) {
		if (!entry.transform || typeof entry.transform !== 'object') {
			throw new Error(
				`Plugin "${npmName}" rune "${name}" has an invalid transform. ` +
				`Expected a Markdoc Schema object (created via createContentModelSchema()).`
			);
		}
	}
}
