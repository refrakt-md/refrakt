/**
 * The `ProjectFiles` seam (SPEC-113).
 *
 * One synchronous interface for reading a project's files, rooted at the
 * project root, replacing the handful of ad-hoc `node:fs` seams at the
 * pipeline edges (sandbox example reads, snippet/expand/file-ref readers,
 * `fileRoots` scanning, the plan plugin's scan). Containment is part of the
 * interface contract — implementations reject absolute paths and any path
 * that escapes the root after normalization, so no consumer re-implements
 * path-safety.
 *
 * The interface type ({@link ProjectFiles}, {@link ProjectFilesAccess}) is
 * re-exported from the package root (`@refrakt-md/types`) as a type-only
 * export, keeping the main entry point free of `node:fs`. The providers in
 * this module — one of which ({@link fsProjectFiles}) wraps `node:fs` — are
 * reached via the `@refrakt-md/types/project-files` subpath so a browser
 * bundle that only imports the root never pulls in Node builtins.
 *
 * See ADR-025 for why {@link recordingProjectFiles} exists: centralizing I/O
 * through this one choke point is what makes per-page reads recordable, the
 * load-bearing prerequisite for future incremental rebuild.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Synchronous read access to the project's files, rooted at the project
 * root. Paths are normalized POSIX, project-root-relative keys — never
 * absolute, never containing `..` after normalization. Implementations treat
 * a containment violation (absolute path, traversal escape, symlink escape)
 * the same as an absent file: `read` returns `null`, `list` returns `[]`,
 * `exists` returns `false`.
 */
export interface ProjectFiles {
	/** File contents as UTF-8 text, or `null` if absent / not a file /
	 *  contained out. */
	read(path: string): string | null;
	/** Immediate child entry names (basenames, like `readdir`) directly under
	 *  the given directory key, or `[]` if absent / contained out. The empty
	 *  string lists the project root. */
	list(path: string): string[];
	/** Whether a file or directory exists at the key (and is contained). */
	exists(path: string): boolean;
}

/** A single access reported by {@link recordingProjectFiles}. The `key` is the
 *  caller-supplied path, verbatim — the recorder is a pure pass-through and
 *  does not normalize. */
export interface ProjectFilesAccess {
	op: 'read' | 'list' | 'exists';
	key: string;
}

/**
 * Normalize a caller-supplied path into a POSIX project-root-relative key, or
 * `null` if it is absolute or escapes the root after normalization.
 *
 * The shared containment primitive: both providers funnel every path through
 * this so the rules — absolute reject, `..`-escape reject — live in exactly
 * one place. Accepts either separator; emits forward slashes. The empty
 * string (and `.`) normalize to `''`, the project root.
 */
export function normalizeProjectKey(input: string): string | null {
	if (typeof input !== 'string') return null;
	// Absolute paths are never project-relative keys: POSIX root, Windows UNC
	// / backslash root, and drive-letter prefixes are all rejected.
	if (input.startsWith('/') || input.startsWith('\\')) return null;
	if (/^[A-Za-z]:/.test(input)) return null;

	const out: string[] = [];
	for (const segment of input.split(/[/\\]+/)) {
		if (segment === '' || segment === '.') continue;
		if (segment === '..') {
			// `..` at the root would escape — reject the whole key.
			if (out.length === 0) return null;
			out.pop();
			continue;
		}
		out.push(segment);
	}
	return out.join('/');
}

/**
 * The OSS/CLI default provider: reads through `node:fs`, anchored at
 * `rootDir`. Promotes the containment rules `read-file.ts` already implements
 * for snippets — absolute reject, traversal reject, and symlink-escape reject
 * via `realpath` — up to the provider, so every consumer inherits them.
 */
export function fsProjectFiles(rootDir: string): ProjectFiles {
	const root = path.resolve(rootDir);
	const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;

	/** Resolve a key to a contained absolute path, or `null` on any
	 *  containment violation (absolute, traversal, or symlink escape). */
	function resolve(input: string): string | null {
		const key = normalizeProjectKey(input);
		if (key === null) return null;
		const abs = key === '' ? root : path.resolve(root, key);
		// Defense in depth: the normalized key can't escape, but re-check the
		// resolved absolute path against the root anyway.
		if (abs !== root && !abs.startsWith(rootWithSep)) return null;
		// Symlink-escape check via realpath. Fail-open on ENOENT (the file
		// simply doesn't exist yet — read/exists below report that); fail-closed
		// on any other error.
		try {
			const real = fs.realpathSync(abs);
			if (real !== root && !real.startsWith(rootWithSep)) return null;
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== 'ENOENT') return null;
		}
		return abs;
	}

	return {
		read(input) {
			const abs = resolve(input);
			if (abs === null) return null;
			try {
				const stat = fs.statSync(abs);
				if (!stat.isFile()) return null;
				return fs.readFileSync(abs, 'utf-8');
			} catch {
				return null;
			}
		},
		list(input) {
			const abs = resolve(input);
			if (abs === null) return [];
			try {
				return fs.readdirSync(abs);
			} catch {
				return [];
			}
		},
		exists(input) {
			const abs = resolve(input);
			if (abs === null) return false;
			return fs.existsSync(abs);
		},
	};
}

/**
 * The hosted/editor provider: backed by a plain `Map` of normalized POSIX
 * keys to file contents. Traversal is structurally impossible — lookups are
 * dictionary keys, and the dictionary holds exactly one project — so the only
 * containment work is normalizing the *query* path (the map's own keys are
 * assumed already normalized, per the contract).
 *
 * Reads through to the live `files` map on every call, so a host may keep the
 * map resident and patch a single key between builds (warm instances —
 * SPEC-113 §4) without reconstructing the provider.
 */
export function memoryProjectFiles(files: Map<string, string>): ProjectFiles {
	return {
		read(input) {
			const key = normalizeProjectKey(input);
			if (key === null || key === '') return null;
			const value = files.get(key);
			return value === undefined ? null : value;
		},
		list(input) {
			const key = normalizeProjectKey(input);
			if (key === null) return [];
			const prefix = key === '' ? '' : key + '/';
			const names = new Set<string>();
			for (const mapKey of files.keys()) {
				if (prefix !== '' && !mapKey.startsWith(prefix)) continue;
				const rest = mapKey.slice(prefix.length);
				if (rest === '') continue;
				const slash = rest.indexOf('/');
				names.add(slash === -1 ? rest : rest.slice(0, slash));
			}
			return [...names];
		},
		exists(input) {
			const key = normalizeProjectKey(input);
			if (key === null) return false;
			if (key !== '' && files.has(key)) return true;
			// A directory key "exists" when any file sits under it.
			const prefix = key === '' ? '' : key + '/';
			for (const mapKey of files.keys()) {
				if (mapKey.startsWith(prefix)) return true;
			}
			return false;
		},
	};
}

/**
 * A thin wrapper that forwards every call to `inner` unchanged and reports
 * each access to `onRead`. Pure instrumentation — no behaviour change. This
 * is the per-page read-set capture point ADR-025 requires: with all I/O
 * funneled through `ProjectFiles`, wrapping it makes a page's dependency set
 * recordable for free.
 */
export function recordingProjectFiles(
	inner: ProjectFiles,
	onRead: (access: ProjectFilesAccess) => void,
): ProjectFiles {
	return {
		read(key) {
			onRead({ op: 'read', key });
			return inner.read(key);
		},
		list(key) {
			onRead({ op: 'list', key });
			return inner.list(key);
		},
		exists(key) {
			onRead({ op: 'exists', key });
			return inner.exists(key);
		},
	};
}
