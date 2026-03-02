import type { Schema } from '@markdoc/markdoc';
import type { RunePackage, RuneExtension } from '@refrakt-md/types';
import type { RuneConfig, RuneProvenance } from '@refrakt-md/transform';
import { Rune, defineRune, runeTagMap } from './rune.js';

/** A loaded community package with its parsed rune definitions */
export interface LoadedPackage {
	/** The original package registration object */
	pkg: RunePackage;
	/** The npm package name it was loaded from */
	npmName: string;
	/** Rune instances created from the package's entries */
	runes: Record<string, Rune>;
}

/** Result of merging multiple community packages */
export interface MergedPackageResult {
	/** Community runes (collision-free, keyed by rune name) */
	runes: Record<string, Rune>;
	/** Markdoc tags map for community runes */
	tags: Record<string, Schema>;
	/** Theme config rune entries from all packages */
	themeRunes: Record<string, RuneConfig>;
	/** Theme icon entries from all packages */
	themeIcons: Record<string, Record<string, string>>;
	/** Schema extensions for core runes (keyed by core rune name) */
	extensions: Record<string, RuneExtension>;
	/** Source package metadata */
	packages: RunePackage[];
	/** Source provenance for every resolved rune name */
	provenance: Record<string, RuneProvenance>;
}

/**
 * Load a community rune package by npm package name.
 *
 * Dynamically imports the package and extracts the RunePackage export.
 * Creates Rune instances from each package entry using defineRune().
 */
export async function loadRunePackage(npmPackageName: string): Promise<LoadedPackage> {
	let mod: Record<string, unknown>;
	try {
		mod = await import(npmPackageName);
	} catch (err) {
		throw new Error(
			`Failed to load community rune package "${npmPackageName}": ${(err as Error).message}\n` +
			`Make sure the package is installed: npm install ${npmPackageName}`
		);
	}

	// Find the RunePackage export — check default, then named exports
	const pkg = findRunePackageExport(mod, npmPackageName);

	// Validate required fields
	validateRunePackage(pkg, npmPackageName);

	// Create Rune instances from package entries
	const runes: Record<string, Rune> = {};
	for (const [runeName, entry] of Object.entries(pkg.runes)) {
		runes[runeName] = defineRune({
			name: runeName,
			schema: entry.transform as Schema,
			description: `Community rune from ${pkg.displayName ?? pkg.name}`,
		});
	}

	return { pkg, npmName: npmPackageName, runes };
}

/**
 * Merge multiple loaded community packages into a single result.
 *
 * Resolution rules:
 * 1. Single package providing a core rune name: package wins (official breakout path)
 * 2. Multiple packages + core collision: resolved by `prefer` map, or throws
 * 3. `prefer` value `"__core__"` forces core to win for that rune
 * 4. Two packages same name, no core: resolved by `prefer`, or throws
 */
export function mergePackages(
	loaded: LoadedPackage[],
	coreRuneNames: Set<string>,
	prefer?: Record<string, string>,
): MergedPackageResult {
	// Build ownership map: rune name → [{ package, rune }]
	const ownership = new Map<string, Array<{ pkg: LoadedPackage; rune: Rune }>>();

	for (const loadedPkg of loaded) {
		for (const [name, rune] of Object.entries(loadedPkg.runes)) {
			if (!ownership.has(name)) {
				ownership.set(name, []);
			}
			ownership.get(name)!.push({ pkg: loadedPkg, rune });
		}
	}

	// Resolve names
	const runes: Record<string, Rune> = {};
	const provenance: Record<string, RuneProvenance> = {};

	for (const [name, candidates] of ownership) {
		if (coreRuneNames.has(name)) {
			// Explicit core preference — skip all packages for this rune
			if (prefer?.[name] === '__core__') {
				continue;
			}

			if (candidates.length === 1) {
				// Single package override — allowed (official breakout path)
				const c = candidates[0];
				runes[name] = c.rune;
				provenance[name] = {
					qualifiedId: `${c.pkg.pkg.name}:${name}`,
					source: 'package',
					packageName: c.pkg.pkg.name,
					origin: c.pkg.npmName,
				};
				continue;
			}

			// Multiple packages + core collision: check prefer
			const preferred = prefer?.[name];
			if (preferred) {
				const match = candidates.find(c => c.pkg.pkg.name === preferred);
				if (match) {
					runes[name] = match.rune;
					provenance[name] = {
						qualifiedId: `${match.pkg.pkg.name}:${name}`,
						source: 'package',
						packageName: match.pkg.pkg.name,
						origin: match.pkg.npmName,
					};
					continue;
				}
				const available = [...candidates.map(c => c.pkg.pkg.name), '__core__'].join(', ');
				throw new Error(
					`Rune "${name}" preference "${preferred}" does not match any providing package.\n` +
					`Available: ${available}`
				);
			}

			// Unresolved multi-package + core collision
			const pkgNames = candidates.map(c => c.pkg.npmName).join(', ');
			const pkgShortNames = [...candidates.map(c => c.pkg.pkg.name), '__core__'].join(', ');
			throw new Error(
				`Rune name "${name}" is ambiguous: provided by ${pkgNames} and also a core rune.\n` +
				`  Resolve by adding to refrakt.config.json:\n` +
				`  "runes": { "prefer": { "${name}": "<package-name>" } }\n\n` +
				`  Use "__core__" to keep the core version.\n` +
				`  Available: ${pkgShortNames}`
			);
		}

		if (candidates.length === 1) {
			// No collision — use directly
			const c = candidates[0];
			runes[name] = c.rune;
			provenance[name] = {
				qualifiedId: `${c.pkg.pkg.name}:${name}`,
				source: 'package',
				packageName: c.pkg.pkg.name,
				origin: c.pkg.npmName,
			};
		} else {
			// Collision between packages (no core involvement)
			const preferred = prefer?.[name];
			if (preferred) {
				const match = candidates.find(c => c.pkg.pkg.name === preferred);
				if (match) {
					runes[name] = match.rune;
					provenance[name] = {
						qualifiedId: `${match.pkg.pkg.name}:${name}`,
						source: 'package',
						packageName: match.pkg.pkg.name,
						origin: match.pkg.npmName,
					};
				} else {
					const available = candidates.map(c => c.pkg.pkg.name).join(', ');
					throw new Error(
						`Rune "${name}" preference "${preferred}" does not match any providing package.\n` +
						`Available: ${available}`
					);
				}
			} else {
				// Unresolved collision — fail with clear instructions
				const pkgNames = candidates.map(c => c.pkg.npmName).join(', ');
				const pkgShortNames = candidates.map(c => c.pkg.pkg.name).join(', ');
				throw new Error(
					`Rune name "${name}" is ambiguous.\n` +
					`  Found in: ${pkgNames}\n\n` +
					`  Resolve by adding to refrakt.config.json:\n` +
					`  "runes": { "prefer": { "${name}": "${candidates[0].pkg.pkg.name}" } }\n\n` +
					`  Available package names: ${pkgShortNames}`
				);
			}
		}
	}

	// Build tags map from resolved runes
	const tags = runeTagMap(runes);

	// Collect theme config entries
	const themeRunes: Record<string, RuneConfig> = {};
	const themeIcons: Record<string, Record<string, string>> = {};

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
	}

	// Collect extensions
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

	return {
		runes,
		tags,
		themeRunes,
		themeIcons,
		extensions,
		packages: loaded.map(l => l.pkg),
		provenance,
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
): Promise<LoadedPackage> {
	const runes: Record<string, Rune> = {};

	const { resolve } = await import('node:path');

	for (const [name, modulePath] of Object.entries(localConfig)) {
		const absPath = resolve(projectRoot, modulePath);
		let mod: Record<string, unknown>;
		try {
			mod = await import(absPath);
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
	};
}

/** Find the RunePackage export from a dynamically imported module */
function findRunePackageExport(mod: Record<string, unknown>, npmName: string): RunePackage {
	// Check default export
	if (mod.default && isRunePackage(mod.default)) {
		return mod.default as RunePackage;
	}

	// Check named exports
	for (const value of Object.values(mod)) {
		if (isRunePackage(value)) {
			return value as RunePackage;
		}
	}

	throw new Error(
		`Package "${npmName}" does not export a valid RunePackage object.\n` +
		`Expected an export with { name: string, version: string, runes: { ... } }`
	);
}

/** Type guard for RunePackage shape */
function isRunePackage(value: unknown): value is RunePackage {
	if (typeof value !== 'object' || value === null) return false;
	const obj = value as Record<string, unknown>;
	return typeof obj.name === 'string' && typeof obj.version === 'string' && typeof obj.runes === 'object' && obj.runes !== null;
}

/** Validate a loaded RunePackage has required fields */
function validateRunePackage(pkg: RunePackage, npmName: string): void {
	if (!pkg.name) {
		throw new Error(`Package "${npmName}" has an empty name field`);
	}
	if (!pkg.version) {
		throw new Error(`Package "${npmName}" has an empty version field`);
	}
	if (!pkg.runes || Object.keys(pkg.runes).length === 0) {
		throw new Error(`Package "${npmName}" defines no runes`);
	}

	for (const [name, entry] of Object.entries(pkg.runes)) {
		if (!entry.transform || typeof entry.transform !== 'object') {
			throw new Error(
				`Package "${npmName}" rune "${name}" has an invalid transform. ` +
				`Expected a Markdoc Schema object (created via createSchema()).`
			);
		}
	}
}
