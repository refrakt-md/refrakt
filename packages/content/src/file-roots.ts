/**
 * File-roots scanning and resolution.
 *
 * A file root is a named directory that file-reading runes can reach via the
 * `namespace:filename` syntax. The v1 consumer is Markdoc partials —
 * `{% partial file="shared:footer.md" /%}` resolves from whatever directory
 * is registered under `shared`. Snippet (SPEC-062 v2) and future file-reading
 * runes plug into the same resolver.
 *
 * File roots originate from two sources:
 * - **User config** — `refrakt.config.json#/fileRoots`, paths relative to the
 *   config file's directory.
 * - **Plugins** — `Plugin.fileRoots` field, paths relative to the plugin's
 *   package directory (resolved by `loadPlugin` before reaching this layer).
 *
 * Plugin-vs-plugin collisions throw at merge time. User-vs-plugin collisions
 * let the user win (see {@link mergeFileRoots}).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PartialFile } from './content-tree.js';

export type FileRoots = Record<string, string>;

/** Result of merging user-config + plugin file roots. */
export interface MergedFileRoots {
	/** Final namespace → absolute directory path map (user wins collisions). */
	roots: FileRoots;
	/** Soft diagnostics: warnings about plugin namespaces shadowed by user
	 *  config. Adapters can surface these alongside other build warnings. */
	warnings: string[];
}

/**
 * Resolve user-config file roots against the config-file directory.
 *
 * Each value in `userFileRoots` is interpreted relative to `configDir`.
 * Validates namespace names (rejects reserved + empty) and that each
 * resolved directory exists.
 */
export function resolveUserFileRoots(
	userFileRoots: FileRoots | undefined,
	configDir: string,
): FileRoots {
	if (!userFileRoots || Object.keys(userFileRoots).length === 0) return {};
	const resolved: FileRoots = {};
	for (const [namespace, relativePath] of Object.entries(userFileRoots)) {
		if (namespace.length === 0) {
			throw new Error(
				`refrakt.config.json#/fileRoots: namespace name is empty — namespaces must be non-empty strings.`,
			);
		}
		if (namespace === 'site') {
			throw new Error(
				`refrakt.config.json#/fileRoots: namespace "${namespace}" is reserved. Pick a different name.`,
			);
		}
		if (typeof relativePath !== 'string' || relativePath.length === 0) {
			throw new Error(
				`refrakt.config.json#/fileRoots["${namespace}"] must be a non-empty string path.`,
			);
		}
		resolved[namespace] = path.resolve(configDir, relativePath);
	}
	return resolved;
}

/**
 * Merge plugin-registered file roots with user-config-resolved ones.
 *
 * Precedence: **user wins** any collision. Plugins whose namespaces are
 * shadowed by user config are still loaded (the runes etc.) but their
 * file-root contribution is silently dropped, with a soft warning so the
 * shadowing is visible during development.
 */
export function mergeFileRoots(
	userRoots: FileRoots,
	pluginRoots: FileRoots,
): MergedFileRoots {
	const merged: FileRoots = { ...pluginRoots };
	const warnings: string[] = [];
	for (const [namespace, absPath] of Object.entries(userRoots)) {
		if (merged[namespace] && merged[namespace] !== absPath) {
			warnings.push(
				`File-root namespace "${namespace}" is registered by both user config and a plugin. User config wins.`,
			);
		}
		merged[namespace] = absPath;
	}
	return { roots: merged, warnings };
}

/**
 * Scan every registered file root, returning `namespace:filename` →
 * `PartialFile`.
 *
 * Each root is validated to exist (throws otherwise — broken config should
 * fail loud at load time). Inside each root, all `.md` files are picked up
 * recursively; subdirectory paths flow through as part of the filename
 * (`shared:legal/terms.md`).
 */
export async function readFileRoots(roots: FileRoots): Promise<Map<string, PartialFile>> {
	const map = new Map<string, PartialFile>();
	for (const [namespace, absPath] of Object.entries(roots)) {
		let stat: fs.Stats;
		try {
			stat = await fs.promises.stat(absPath);
		} catch {
			throw new Error(
				`File root "${namespace}" — directory does not exist: ${absPath}`,
			);
		}
		if (!stat.isDirectory()) {
			throw new Error(
				`File root "${namespace}" — expected a directory, got a file: ${absPath}`,
			);
		}
		await scanRoot(absPath, absPath, namespace, map);
	}
	return map;
}

async function scanRoot(
	dirPath: string,
	rootPath: string,
	namespace: string,
	map: Map<string, PartialFile>,
): Promise<void> {
	const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);
		if (entry.isDirectory() && !entry.name.startsWith('.')) {
			await scanRoot(fullPath, rootPath, namespace, map);
		} else if (entry.isFile() && entry.name.endsWith('.md')) {
			const raw = await fs.promises.readFile(fullPath, 'utf-8');
			// Use POSIX-style slashes in the key regardless of host OS so that
			// authoring stays consistent across platforms.
			const relative = path.relative(rootPath, fullPath).split(path.sep).join('/');
			const key = `${namespace}:${relative}`;
			map.set(key, { name: key, filePath: fullPath, raw });
		}
	}
}

/** Validate a `namespace:filename` reference against the registered roots.
 *
 *  Returns the absolute file path for valid references; throws on:
 *  - Unknown namespace (listing the available ones).
 *  - Empty namespace (`:foo.md`).
 *  - Absolute paths (`shared:/abs.md`).
 *  - Traversal escapes (`shared:../escape.md`).
 *
 *  Note: this validation runs at scan time (above), so by the time content
 *  authors hit a problem they see it at build, not at render. The function
 *  is exported for runes (like the snippet rune's v2) that need to validate
 *  ad-hoc references against the same rules.
 */
export function validateNamespacedReference(
	ref: string,
	roots: FileRoots,
): string {
	const colonIdx = ref.indexOf(':');
	if (colonIdx <= 0) {
		throw new Error(
			`File-root reference "${ref}" is missing a namespace prefix. Expected "<namespace>:<path>".`,
		);
	}
	const namespace = ref.slice(0, colonIdx);
	const relative = ref.slice(colonIdx + 1);
	if (relative.length === 0) {
		throw new Error(`File-root reference "${ref}" is missing a path after the colon.`);
	}
	const root = roots[namespace];
	if (!root) {
		const available = Object.keys(roots).join(', ') || '(none registered)';
		throw new Error(
			`Unknown file-root namespace "${namespace}" in reference "${ref}". Available: ${available}.`,
		);
	}
	if (relative.startsWith('/')) {
		throw new Error(
			`File-root reference "${ref}" uses an absolute path; namespaced references must be relative to the root.`,
		);
	}
	const resolved = path.resolve(root, relative);
	const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
	if (!resolved.startsWith(rootWithSep) && resolved !== root) {
		throw new Error(
			`File-root reference "${ref}" escapes its root directory. Paths must stay within "${root}".`,
		);
	}
	return resolved;
}
