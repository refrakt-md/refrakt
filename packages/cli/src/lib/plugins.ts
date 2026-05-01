/**
 * Plugin discovery for the refrakt CLI.
 *
 * `discoverPlugins()` enumerates installed plugin-bearing packages and loads
 * each one's `cli-plugin` export. Three consumers rely on this helper:
 *
 * 1. CLI dispatch (`packages/cli/src/bin.ts`) — replaces the lazy
 *    import-on-demand pattern with a single discovery call so namespace
 *    typos can produce "did you mean?" suggestions.
 * 2. `refrakt --help` and `refrakt plugins list` — listing what's installed.
 * 3. The MCP server (`@refrakt-md/mcp`) — turning each command into a tool.
 *
 * Resolution order (per ADR-010 + SPEC-043):
 * 1. If `refrakt.config.json`'s `plugins` field is set, that array is
 *    authoritative — no dependency scanning happens.
 * 2. Otherwise, the nearest `package.json` is scanned for `@refrakt-md/*`
 *    entries in `dependencies` + `devDependencies` (excluding meta packages
 *    that are not expected to ship a `cli-plugin`).
 *
 * The helper is side-effect-free: it does not execute commands, write to
 * disk, or cache results internally. Callers wrap with their own caching.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import type { CliPlugin, CliPluginCommand } from '@refrakt-md/types';
import { loadRefraktConfigWithRaw } from '@refrakt-md/transform/node';

const require_ = createRequire(import.meta.url);

/** A plugin discovered in the project's installed packages. */
export interface DiscoveredPlugin {
	/** The namespace this plugin claims (e.g. `plan`). */
	namespace: string;
	/** The npm package name (e.g. `@refrakt-md/plan`). */
	packageName: string;
	/** The package's installed version, read from its `package.json`. */
	packageVersion: string;
	/** Commands contributed by the plugin. */
	commands: CliPluginCommand[];
	/** Whether the plugin came from the explicit `config.plugins` list or
	 *  was discovered via dependency scanning. */
	source: 'config' | 'dependency-scan';
	/** Optional namespace-level description from the plugin export. */
	description?: string;
}

export interface DiscoverOptions {
	/** Working directory to start the search from. Defaults to `process.cwd()`. */
	cwd?: string;
	/** When true, write warnings to stderr for malformed plugins, duplicate
	 *  namespaces, etc. Defaults to true. */
	warn?: boolean;
}

/** Meta packages that ship in `@refrakt-md/*` but are not expected to
 *  contribute CLI commands. These are skipped during dependency scanning. */
const META_PACKAGES = new Set<string>([
	'@refrakt-md/cli',
	'@refrakt-md/types',
	'@refrakt-md/transform',
	'@refrakt-md/runes',
	'@refrakt-md/lumina',
	'@refrakt-md/svelte',
	'@refrakt-md/sveltekit',
	'@refrakt-md/behaviors',
	'@refrakt-md/content',
	'@refrakt-md/ai',
	'@refrakt-md/editor',
	'@refrakt-md/highlight',
	'@refrakt-md/html',
	'@refrakt-md/astro',
	'@refrakt-md/nuxt',
	'@refrakt-md/next',
	'@refrakt-md/eleventy',
	'@refrakt-md/react',
	'@refrakt-md/vue',
	'@refrakt-md/language-server',
]);

/** Discover installed plugins. */
export async function discoverPlugins(opts: DiscoverOptions = {}): Promise<DiscoveredPlugin[]> {
	const cwd = opts.cwd ?? process.cwd();
	const warn = opts.warn ?? true;

	const candidates = resolveCandidates(cwd);
	const seen = new Set<string>();
	const result: DiscoveredPlugin[] = [];

	for (const { packageName, source } of candidates) {
		if (seen.has(packageName)) continue;
		seen.add(packageName);

		const loaded = await loadPlugin(packageName, cwd, warn);
		if (!loaded) continue;

		const existing = result.find((p) => p.namespace === loaded.plugin.namespace);
		if (existing) {
			if (warn) {
				console.warn(
					`Warning: namespace "${loaded.plugin.namespace}" is provided by both ` +
						`${existing.packageName} and ${packageName}. Using the first one (${existing.packageName}).`,
				);
			}
			continue;
		}

		result.push({
			namespace: loaded.plugin.namespace,
			packageName,
			packageVersion: loaded.version,
			commands: loaded.plugin.commands,
			source,
			description: loaded.plugin.description,
		});
	}

	result.sort((a, b) => a.namespace.localeCompare(b.namespace));
	return result;
}

/** Return the list of `{ packageName, source }` candidates to attempt. */
function resolveCandidates(cwd: string): Array<{ packageName: string; source: 'config' | 'dependency-scan' }> {
	const configCandidates = candidatesFromConfig(cwd);
	if (configCandidates) return configCandidates;
	return candidatesFromPackageJson(cwd);
}

/** When `refrakt.config.json` declares `plugins`, return those names. */
function candidatesFromConfig(
	cwd: string,
): Array<{ packageName: string; source: 'config' }> | undefined {
	const configPath = resolve(cwd, 'refrakt.config.json');
	if (!existsSync(configPath)) return undefined;
	let raw: unknown;
	try {
		raw = loadRefraktConfigWithRaw(configPath).raw;
	} catch {
		return undefined;
	}
	const plugins = (raw as { plugins?: unknown }).plugins;
	if (!Array.isArray(plugins)) return undefined;
	const valid = plugins.filter((p): p is string => typeof p === 'string' && p.length > 0);
	if (valid.length === 0) return undefined;
	return valid.map((packageName) => ({ packageName, source: 'config' as const }));
}

/** Walk up from `cwd` to find candidate plugin packages, sourced from:
 *  1. The nearest `package.json`'s `dependencies` + `devDependencies`.
 *  2. The `node_modules/@refrakt-md/` directory (catches workspace-linked
 *     packages that aren't in package.json's deps — typical for monorepos
 *     and the refrakt repo itself).
 *  Both sources are unioned (deduplicated downstream by the seen set) so the
 *  scan finds plugins under both normal install and workspace setups. */
function candidatesFromPackageJson(
	cwd: string,
): Array<{ packageName: string; source: 'dependency-scan' }> {
	const names = new Set<string>();

	const pkgPath = findUp('package.json', cwd);
	if (pkgPath) {
		try {
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
				dependencies?: Record<string, string>;
				devDependencies?: Record<string, string>;
			};
			for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
				if (name.startsWith('@refrakt-md/') && !META_PACKAGES.has(name)) {
					names.add(name);
				}
			}
		} catch {
			// ignore unreadable package.json
		}
	}

	const nodeModulesDir = pkgPath
		? resolve(dirname(pkgPath), 'node_modules', '@refrakt-md')
		: undefined;
	if (nodeModulesDir && existsSync(nodeModulesDir)) {
		try {
			for (const entry of readdirSync(nodeModulesDir)) {
				const full = resolve(nodeModulesDir, entry);
				if (!safeIsDirectory(full)) continue;
				const name = `@refrakt-md/${entry}`;
				if (META_PACKAGES.has(name)) continue;
				names.add(name);
			}
		} catch {
			// ignore unreadable node_modules
		}
	}

	return [...names].map((packageName) => ({ packageName, source: 'dependency-scan' as const }));
}

function safeIsDirectory(path: string): boolean {
	try {
		return statSync(path).isDirectory();
	} catch {
		return false;
	}
}

/** Attempt to load a single plugin's `cli-plugin` export. Returns undefined
 *  when the export is missing (silently skipped) or malformed (warned). */
async function loadPlugin(
	packageName: string,
	cwd: string,
	warn: boolean,
): Promise<{ plugin: CliPlugin; version: string } | undefined> {
	const pluginEntry = `${packageName}/cli-plugin`;
	let mod: unknown;
	try {
		mod = await importFrom(pluginEntry, cwd);
	} catch {
		// Missing or unbuilt cli-plugin export — silently skip. Not every
		// `@refrakt-md/*` package ships CLI commands.
		return undefined;
	}

	const candidate = (mod as { default?: unknown }).default ?? mod;
	if (!isValidPlugin(candidate)) {
		if (warn) {
			console.warn(
				`Warning: ${packageName} exports an invalid cli-plugin (missing namespace or commands). Skipping.`,
			);
		}
		return undefined;
	}

	const version = readPackageVersion(packageName, cwd) ?? '0.0.0';
	return { plugin: candidate, version };
}

function isValidPlugin(candidate: unknown): candidate is CliPlugin {
	if (!candidate || typeof candidate !== 'object') return false;
	const obj = candidate as Record<string, unknown>;
	if (typeof obj.namespace !== 'string' || obj.namespace.length === 0) return false;
	if (!Array.isArray(obj.commands)) return false;
	for (const cmd of obj.commands) {
		if (!cmd || typeof cmd !== 'object') return false;
		const c = cmd as Record<string, unknown>;
		if (typeof c.name !== 'string' || c.name.length === 0) return false;
		if (typeof c.description !== 'string') return false;
		if (typeof c.handler !== 'function') return false;
	}
	return true;
}

function readPackageVersion(packageName: string, cwd: string): string | undefined {
	// Walk up from cwd looking at node_modules/<packageName>/package.json. We
	// avoid require.resolve('<pkg>/package.json') because modern packages with
	// an "exports" map block that subpath.
	for (const nm of modulePaths(cwd)) {
		const candidate = resolve(nm, packageName, 'package.json');
		if (!existsSync(candidate)) continue;
		try {
			const pkg = JSON.parse(readFileSync(candidate, 'utf-8')) as { version?: unknown };
			if (typeof pkg.version === 'string') return pkg.version;
		} catch {
			// keep searching
		}
	}
	return undefined;
}

/** Dynamic import that resolves relative to `cwd` rather than the CLI's own
 *  install location. Important for monorepo workspaces and globally-installed
 *  CLIs that need to load the project's local plugins. */
async function importFrom(specifier: string, cwd: string): Promise<unknown> {
	const localRequire = createRequire(resolve(cwd, '_'));
	const resolved = localRequire.resolve(specifier);
	return import(resolved);
}

function findUp(filename: string, start: string): string | undefined {
	let dir = resolve(start);
	while (true) {
		const candidate = resolve(dir, filename);
		if (existsSync(candidate)) return candidate;
		const parent = dirname(dir);
		if (parent === dir) return undefined;
		dir = parent;
	}
}

function modulePaths(cwd: string): string[] {
	const paths: string[] = [];
	let dir = resolve(cwd);
	while (true) {
		paths.push(resolve(dir, 'node_modules'));
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return paths;
}
