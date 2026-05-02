/**
 * Auto-detection for the MCP server.
 *
 * Inspects the working directory once at startup to figure out which
 * tool groups should be exposed:
 * - `plan` context: a `plan/` directory exists.
 * - `site` context: `refrakt.config.json` declares one or more sites.
 *
 * Both can be active in the same project. Neither being active leaves the
 * server with diagnostic-only tools.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadRefraktConfigWithRaw } from '@refrakt-md/transform/node';
import { discoverPlugins, type DiscoveredPlugin } from '@refrakt-md/cli/lib/plugins.js';

export interface DetectedPlanContext {
	dir: string;
	fileCount: number;
}

export interface DetectedSiteContext {
	configPath: string;
	sites: string[];
	plugins: string[];
}

export interface DetectionResult {
	cwd: string;
	plan: DetectedPlanContext | null;
	site: DetectedSiteContext | null;
	plugins: DiscoveredPlugin[];
	configSource: 'config-file' | 'autodetect';
}

export async function detect(cwd: string = process.cwd()): Promise<DetectionResult> {
	const result: DetectionResult = {
		cwd,
		plan: null,
		site: null,
		plugins: [],
		configSource: 'autodetect',
	};

	const configPath = resolve(cwd, 'refrakt.config.json');
	if (existsSync(configPath)) {
		try {
			const { normalized } = loadRefraktConfigWithRaw(configPath);
			result.configSource = 'config-file';
			const siteNames = Object.keys(normalized.sites);
			if (siteNames.length > 0) {
				result.site = {
					configPath,
					sites: siteNames,
					plugins: normalized.plugins ?? [],
				};
			}
			if (normalized.plan?.dir) {
				const planDir = resolve(cwd, normalized.plan.dir);
				result.plan = describePlanDir(planDir);
			}
		} catch {
			// Malformed config — fall through to autodetect
		}
	}

	// Autodetect plan/ if not declared in config
	if (!result.plan) {
		const planDir = resolve(cwd, 'plan');
		if (existsSync(planDir) && safeIsDirectory(planDir)) {
			result.plan = describePlanDir(planDir);
		}
	}

	try {
		result.plugins = await discoverPlugins({ cwd, warn: false });
	} catch {
		// Discovery failures are non-fatal
	}

	return result;
}

function describePlanDir(dir: string): DetectedPlanContext {
	let fileCount = 0;
	const stack = [dir];
	while (stack.length > 0) {
		const current = stack.pop()!;
		if (!existsSync(current) || !safeIsDirectory(current)) continue;
		try {
			for (const entry of readdirSync(current)) {
				const full = resolve(current, entry);
				if (safeIsDirectory(full)) {
					stack.push(full);
				} else if (entry.endsWith('.md')) {
					fileCount++;
				}
			}
		} catch {
			// keep counting what we can
		}
	}
	return { dir, fileCount };
}

function safeIsDirectory(path: string): boolean {
	try {
		return statSync(path).isDirectory();
	} catch {
		return false;
	}
}
