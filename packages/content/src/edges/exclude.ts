/**
 * Project-configured exclusions for the edge index (SPEC-136, WORK-596).
 *
 * **Nothing here is a default.** Every folder convention this repository
 * happens to use — `docs/migration/`, a `blog/` directory, a `CHANGELOG.md` at
 * the root — is this repository's, and a tool that bakes them in is a tool
 * built for one site. Both lists start empty and a project says what its own
 * structure means.
 *
 * The two lists are deliberately not one. See {@link StaleConfig}.
 */

import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { RefraktConfig, SiteConfig, StaleConfig } from '@refrakt-md/types';

/** Everything `refrakt stale` needs from a project's configuration. */
export interface StaleSettings {
	/** Content roots to scan, repo-root-relative POSIX. */
	contentDirs: string[];
	/** Referrer globs — see {@link StaleConfig.archival}. */
	archival: string[];
	/** Target globs — see {@link StaleConfig.generated}. */
	generated: string[];
}

/** Raised when the project's configuration cannot be read. Distinct from
 *  "read it, nothing to exclude": a missing config means we do not know where
 *  content lives, and guessing would measure the wrong tree. */
export class StaleConfigRefusal extends Error {}

function toPosix(path: string): string {
	return path.split(sep).join('/');
}

function repoRelative(path: string, repoRoot: string): string {
	const abs = isAbsolute(path) ? path : resolve(repoRoot, path);
	return toPosix(relative(repoRoot, abs)).replace(/\/$/, '');
}

/**
 * Translate one glob to a regular expression.
 *
 * The subset is the familiar one and nothing more: `*` within a path segment,
 * `**` across segments, `?` for a single character, and a trailing `/` naming a
 * directory and everything beneath it. No brace expansion, no negation — a
 * pattern language that can express "everything except" invites the exclusion
 * list to grow into a second content model.
 */
export function globToRegExp(glob: string): RegExp {
	const pattern = glob.endsWith('/') ? `${glob}**` : glob;
	let out = '';
	for (let i = 0; i < pattern.length; i++) {
		const ch = pattern[i];
		if (ch === '*') {
			if (pattern[i + 1] === '*') {
				i++;
				if (pattern[i + 1] === '/') {
					i++;
					// `**/` spans zero or more whole segments, so `a/**/b.md`
					// matches `a/b.md` as well as `a/c/d/b.md`.
					out += '(?:[^/]*/)*';
				} else {
					out += '.*';
				}
			} else {
				out += '[^/]*';
			}
		} else if (ch === '?') {
			out += '[^/]';
		} else if (/[.+^${}()|[\]\\]/.test(ch)) {
			out += `\\${ch}`;
		} else {
			out += ch;
		}
	}
	return new RegExp(`^${out}$`);
}

/** Compile a list of globs into a single predicate. An empty list matches
 *  nothing — never everything. */
export function globMatcher(globs: string[] | undefined): (path: string) => boolean {
	if (!globs || globs.length === 0) return () => false;
	const compiled = globs.map(globToRegExp);
	return (path: string) => compiled.some((re) => re.test(path));
}

/**
 * Read a project's `refrakt.config.json` for everything the staleness report
 * needs: where content lives, and what it must not measure.
 *
 * Content roots come from the sites the project declares, so a multi-site repo
 * is scanned whole and a repo that puts content somewhere unusual needs no flag.
 */
export function resolveStaleSettings(repoRoot: string): StaleSettings {
	const configPath = join(repoRoot, 'refrakt.config.json');
	if (!existsSync(configPath)) {
		throw new StaleConfigRefusal(
			`no refrakt.config.json in ${repoRoot} — refrakt stale reads it to learn where content lives`,
		);
	}

	let raw: RefraktConfig;
	try {
		raw = JSON.parse(readFileSync(configPath, 'utf8')) as RefraktConfig;
	} catch (err) {
		throw new StaleConfigRefusal(`could not parse ${configPath}: ${(err as Error).message}`);
	}

	// All three config shapes, read directly rather than through the
	// normalizer: this needs one field from each site and must not depend on
	// a plugin resolving or a theme existing.
	const sites: SiteConfig[] = [];
	if (raw.sites) sites.push(...Object.values(raw.sites));
	if (raw.site) sites.push(raw.site);
	if (raw.contentDir) sites.push({ contentDir: raw.contentDir } as SiteConfig);

	const contentDirs: string[] = [];
	for (const site of sites) {
		if (!site?.contentDir) continue;
		const dir = repoRelative(site.contentDir, repoRoot);
		if (dir && !dir.startsWith('..') && !contentDirs.includes(dir)) contentDirs.push(dir);
	}

	if (contentDirs.length === 0) {
		throw new StaleConfigRefusal(
			`${configPath} declares no site with a contentDir — nothing to scan`,
		);
	}

	const stale: StaleConfig = raw.stale ?? {};
	return {
		contentDirs,
		archival: stale.archival ?? [],
		generated: stale.generated ?? [],
	};
}
