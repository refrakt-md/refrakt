/**
 * The validation run itself — shared by `refrakt validate` and the
 * `refrakt.validate` MCP tool (SPEC-135 D6 / WORK-581).
 *
 * Returns data. It never prints and never calls `process.exit`, so the CLI can
 * format and gate while MCP returns structured findings from the same code.
 * The alternative — an MCP tool that shells out to the CLI and parses its
 * output — would be a worse CLI, and would put a second copy of the layering
 * rules somewhere they could drift.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { SiteConfig } from '@refrakt-md/types';
import { normalizeRefraktConfig } from '@refrakt-md/transform/node';
import { validateSiteConfig, type ConfigFinding } from './validate-config.js';

export interface ValidateRunOptions {
	/** Restrict to one site. Omitted means every site in the config. */
	site?: string;
	/** Narrow to one layer. Both run when omitted. */
	only?: 'content' | 'config';
	/** Run the cross-page tier — a full pipeline run (SPEC-135 D3). */
	deep?: boolean;
	/** Path to `refrakt.config.json`. Default: `<cwd>/refrakt.config.json`. */
	configPath?: string;
	/** Directory to resolve a relative `configPath` against. Default: `cwd`. */
	cwd?: string;
}

export interface ContentFindingOut {
	/** Relative to the content root — or, for a rune definition
	 *  (`rune-definition-invalid`), to the project root: `runes/<rune>.md`. */
	file: string;
	url: string;
	line?: number;
	severity: 'error' | 'warning' | 'info';
	id?: string;
	message: string;
}

export interface SiteResult {
	site: string;
	config: ConfigFinding[];
	content: ContentFindingOut[];
	/** Set when the config layer found a failure that makes content findings
	 *  untrustworthy, so a report can say so rather than listing both as peers. */
	contentSuppressed?: string;
}

export interface ValidateRunResult {
	/** Whole-run failure — no config, unparseable config, unknown site. When
	 *  set, `sites` is empty and the run validated nothing (D2). */
	error?: string;
	sites: SiteResult[];
	/** Path the run resolved its config from, for a caller that wants to say so. */
	configPath: string;
}

/** True when anything in the run is at error severity. The gate (D4). */
export function hasErrors(result: ValidateRunResult): boolean {
	if (result.error) return true;
	return result.sites.some(
		(r) =>
			r.config.some((f) => f.severity === 'error') || r.content.some((f) => f.severity === 'error'),
	);
}

/** Every definition in the site's `runes.dir` that does not build, as findings
 *  located at the definition's file and line. */
async function checkProjectRuneDefinitions(
	site: SiteConfig,
	configDir: string,
): Promise<ContentFindingOut[]> {
	const { checkProjectRunes } = await import('@refrakt-md/runes');
	const { fsProjectFiles } = await import('@refrakt-md/types/project-files');
	const { findings } = checkProjectRunes(fsProjectFiles(configDir), site.runes?.dir);
	return findings.map((f) => ({
		file: f.file,
		url: '',
		line: f.line,
		severity: 'error' as const,
		id: 'rune-definition-invalid',
		message: f.message,
	}));
}

export async function runValidation(opts: ValidateRunOptions = {}): Promise<ValidateRunResult> {
	const cwd = opts.cwd ?? process.cwd();
	const configPath = resolve(cwd, opts.configPath ?? 'refrakt.config.json');

	// D2 — a validation command must never report success on nothing. Each of
	// these returns an error rather than an empty pass, so a caller cannot read
	// "validated nothing" as green.
	if (!existsSync(configPath)) {
		return {
			error: `No refrakt.config.json found at ${configPath}. Nothing to validate.`,
			sites: [],
			configPath,
		};
	}

	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(configPath, 'utf-8'));
	} catch (err) {
		return {
			error: `Could not parse ${configPath}: ${(err as Error).message}`,
			sites: [],
			configPath,
		};
	}

	const configDir = dirname(configPath);
	let sites: Record<string, SiteConfig>;
	try {
		sites = normalizeRefraktConfig(raw, { configDir }).sites;
	} catch (err) {
		return {
			error: `${configPath} is not a valid refrakt config: ${(err as Error).message}`,
			sites: [],
			configPath,
		};
	}

	if (opts.site && !sites[opts.site]) {
		return {
			error: `No site "${opts.site}" in ${configPath}. Declared: ${Object.keys(sites).join(', ') || 'none'}`,
			sites: [],
			configPath,
		};
	}

	const names = opts.site ? [opts.site] : Object.keys(sites);
	if (names.length === 0) {
		return {
			error: `${configPath} declares no sites. Nothing to validate.`,
			sites: [],
			configPath,
		};
	}

	const results: SiteResult[] = [];

	for (const name of names) {
		const site = sites[name]!;
		const result: SiteResult = { site: name, config: [], content: [] };

		// D1 — config resolution runs FIRST, because its failures cause content
		// findings. A plugin that fails to load takes its runes with it, and
		// every use of them becomes `tag-undefined`.
		if (opts.only !== 'content') {
			result.config = validateSiteConfig(site, { configDir, siteName: name });
		}

		// SPEC-153 — the project's own rune definitions are checked before its
		// content, because a definition that does not build takes its rune with
		// it: every page using it would report `tag-undefined`. Each finding
		// names the definition's file and line (WORK-634).
		const runeFindings =
			opts.only === 'config' ? [] : await checkProjectRuneDefinitions(site, configDir);
		result.content.push(...runeFindings);

		if (opts.only !== 'config' && runeFindings.length > 0) {
			result.contentSuppressed =
				`skipped: ${runeFindings.length} rune ${runeFindings.length === 1 ? 'definition does' : 'definitions do'} not build, ` +
				`so every page using ${runeFindings.length === 1 ? 'it' : 'them'} would report an undefined tag. Fix the definitions above first.`;
		} else if (opts.only !== 'config') {
			// Computed even under `--only content`, so the suppression rule can
			// still explain itself. Just not reported.
			const resolution =
				opts.only === 'content'
					? validateSiteConfig(site, { configDir, siteName: name })
					: result.config;
			const breaking = resolution.filter((f) => f.causesMissingRunes);

			if (breaking.length > 0) {
				// Suppress rather than report both as peers (D1). Validating here
				// produces dozens of `tag-undefined` errors against correct content
				// whose real cause is one line of config — the symptom drowning the
				// cause.
				result.contentSuppressed =
					`skipped: ${breaking.length} unresolved ${breaking.length === 1 ? 'dependency' : 'dependencies'} ` +
					`would report every affected rune as an undefined tag. Fix the config findings above first.`;
			} else {
				const { createRefraktLoader } = await import('@refrakt-md/content');
				const loader = createRefraktLoader({
					configPath,
					site: name,
					// The build summary is not this command's output. Findings are.
					reporter: () => {},
				});
				try {
					result.content.push(...(await loader.validateSite({ deep: opts.deep })));
				} catch (err) {
					// Site assembly itself failed — a rune name collision (SPEC-153
					// D8), a composition check across the catalog. A finding, not a
					// crash: validation reports problems rather than stopping at one.
					result.content.push({
						file: '',
						url: '',
						severity: 'error',
						id: 'site-assembly-failed',
						message: (err as Error).message,
					});
				}
			}
		}

		results.push(result);
	}

	return { sites: results, configPath };
}
