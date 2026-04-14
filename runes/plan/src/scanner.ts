import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve } from 'path';
import { getGitTimestamps } from '@refrakt-md/content';
import type { PlanEntity, ScanCache, ScanOptions } from './types.js';
import { parseFileContent } from './scanner-core.js';

// Re-export pure functions from scanner-core for backwards compatibility
export { parseFileContent, scanPlanSources } from './scanner-core.js';

const CACHE_FILENAME = '.plan-cache.json';

/** Recursively collect all .md file paths under a directory */
function collectMdFiles(dir: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			files.push(...collectMdFiles(full));
		} else if (entry.endsWith('.md')) {
			files.push(full);
		}
	}
	return files;
}

/** Parse a single file from disk and return PlanEntity if it contains a plan rune, or null */
export function parseFile(filePath: string, relPath: string): PlanEntity | null {
	const source = readFileSync(filePath, 'utf8');
	return parseFileContent(source, relPath);
}

/** Read the cache file, returning an empty cache if it doesn't exist or is invalid */
function readCache(dir: string): ScanCache {
	const cachePath = join(dir, CACHE_FILENAME);
	if (!existsSync(cachePath)) return {};
	try {
		return JSON.parse(readFileSync(cachePath, 'utf8'));
	} catch {
		return {};
	}
}

/** Write the cache file */
function writeCache(dir: string, cache: ScanCache): void {
	writeFileSync(join(dir, CACHE_FILENAME), JSON.stringify(cache, null, '\t') + '\n');
}

/**
 * Adapter: convert the shared git timestamp utility output to the legacy
 * Map<absolutePath, milliseconds> format used by the scanner.
 */
function getGitMtimes(dir: string): Map<string, number> {
	const timestamps = getGitTimestamps(dir);
	const mtimes = new Map<string, number>();
	for (const [relPath, ts] of timestamps) {
		if (ts.modified) {
			const absPath = resolve(dir, relPath);
			// Convert ISO date string back to ms for compatibility
			mtimes.set(absPath, new Date(ts.modified + 'T00:00:00Z').getTime());
		}
	}
	return mtimes;
}

/**
 * Scan a directory recursively for .md files containing plan runes.
 * Returns typed PlanEntity objects for each discovered entity.
 */
export function scanPlanFiles(dir: string, options: ScanOptions = {}): PlanEntity[] {
	const files = collectMdFiles(dir);
	const useCache = options.cache === true;
	const cache = useCache ? readCache(dir) : {};
	const newCache: ScanCache = {};
	const entities: PlanEntity[] = [];

	// Prefer git commit dates over filesystem mtime (git doesn't preserve file mtimes)
	const gitMtimes = getGitMtimes(dir);

	for (const filePath of files) {
		const relPath = relative(dir, filePath);
		const stat = statSync(filePath);
		const cached = cache[relPath];

		// Use git commit date when available, fall back to stat mtime
		const mtime = gitMtimes.get(resolve(dir, relPath)) ?? stat.mtimeMs;

		// Check cache validity (still keyed on stat mtime for content freshness)
		if (useCache && cached && cached.mtime === stat.mtimeMs && cached.size === stat.size) {
			cached.entity.mtime = mtime;
			entities.push(cached.entity);
			newCache[relPath] = cached;
			continue;
		}

		const source = readFileSync(filePath, 'utf8');
		const entity = parseFileContent(source, relPath);
		if (entity) {
			entity.mtime = mtime;
			entities.push(entity);
			if (useCache) {
				newCache[relPath] = { mtime: stat.mtimeMs, size: stat.size, entity };
			}
		}
	}

	if (useCache) {
		writeCache(dir, newCache);
	}

	return entities;
}
