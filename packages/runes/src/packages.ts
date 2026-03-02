import type { Schema } from '@markdoc/markdoc';
import type { RunePackage, RuneExtension } from '@refrakt-md/types';
import type { RuneConfig } from '@refrakt-md/transform';
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
 * 1. Community runes that shadow core rune names are skipped (with warning)
 * 2. If two packages define the same rune name and no preference resolves it, throws
 * 3. Preferences in `prefer` map resolve collisions: rune name → package name
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

	for (const [name, candidates] of ownership) {
		// Skip if shadows a core rune
		if (coreRuneNames.has(name)) {
			const pkgNames = candidates.map(c => c.pkg.npmName).join(', ');
			console.warn(
				`[refrakt] Community rune "${name}" from ${pkgNames} shadows a core rune and will be skipped. ` +
				`Core runes always take priority.`
			);
			continue;
		}

		if (candidates.length === 1) {
			// No collision — use directly
			runes[name] = candidates[0].rune;
		} else {
			// Collision — check prefer
			const preferred = prefer?.[name];
			if (preferred) {
				const match = candidates.find(c => c.pkg.pkg.name === preferred);
				if (match) {
					runes[name] = match.rune;
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
