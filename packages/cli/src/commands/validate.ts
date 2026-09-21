import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { SiteConfig } from '@refrakt-md/types';
import { normalizeRefraktConfig } from '@refrakt-md/transform/node';
import { validateSiteConfig, type ConfigFinding } from './validate-config.js';

/**
 * `refrakt validate` — the site author's command (SPEC-135 D1 / WORK-578).
 *
 * Validates the project's own sites: config resolution first, then content, for
 * every site in `refrakt.config.json`. It used to validate `baseConfig` —
 * refrakt's built-in theme config — which in a user's project is a self-test of
 * the library reported as though it were a check of their work.
 */
export interface ValidateOptions {
	site?: string;
	only?: 'content' | 'config';
	deep?: boolean;
	format?: 'text' | 'json';
	configPath?: string;
}

interface SiteResult {
	site: string;
	config: ConfigFinding[];
	content: {
		file: string;
		url: string;
		line?: number;
		severity: 'error' | 'warning' | 'info';
		id?: string;
		message: string;
	}[];
	/** Set when the config layer found a failure that makes content findings
	 *  untrustworthy, so the report can say so instead of listing both as peers. */
	contentSuppressed?: string;
}

export async function validateCommand(opts: ValidateOptions): Promise<void> {
	const configPath = resolve(opts.configPath ?? './refrakt.config.json');

	// D2 — a validation command must never report success on nothing. Standing
	// in a directory with no config should say exactly that, not print a
	// checkmark, and not exit 0 into a CI job that reads it as green.
	if (!existsSync(configPath)) {
		fail(opts, `No refrakt.config.json found at ${configPath}. Nothing to validate.`);
		return;
	}

	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(configPath, 'utf-8'));
	} catch (err) {
		fail(opts, `Could not parse ${configPath}: ${(err as Error).message}`);
		return;
	}

	const configDir = dirname(configPath);
	let sites: Record<string, SiteConfig>;
	try {
		sites = normalizeRefraktConfig(raw, { configDir }).sites;
	} catch (err) {
		fail(opts, `${configPath} is not a valid refrakt config: ${(err as Error).message}`);
		return;
	}

	const names = opts.site ? [opts.site] : Object.keys(sites);
	if (opts.site && !sites[opts.site]) {
		fail(
			opts,
			`No site "${opts.site}" in ${configPath}. Declared: ${Object.keys(sites).join(', ') || 'none'}`,
		);
		return;
	}
	if (names.length === 0) {
		fail(opts, `${configPath} declares no sites. Nothing to validate.`);
		return;
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

		if (opts.only !== 'config') {
			// Always compute the resolution findings, even under `--only content`,
			// so the suppression rule below can still explain itself. They are
			// just not reported.
			const resolution =
				opts.only === 'content'
					? validateSiteConfig(site, { configDir, siteName: name })
					: result.config;
			const breaking = resolution.filter((f) => f.causesMissingRunes);

			if (breaking.length > 0) {
				// Suppress rather than report both as peers (D1). Running content
				// validation here produces dozens of `tag-undefined` errors against
				// correct content whose real cause is one line of config — the
				// symptom drowning the cause.
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
				result.content = await loader.validateSite({ deep: opts.deep });
			}
		}

		results.push(result);
	}

	report(opts, results);
}

/** Error severity in either layer fails the command. Warnings never do, and
 *  there is no `--strict` — `site/` carries 35 warnings, and a gate that goes
 *  red on day one is a gate someone turns off (SPEC-135 D3). */
function hasErrors(results: SiteResult[]): boolean {
	return results.some(
		(r) =>
			r.config.some((f) => f.severity === 'error') || r.content.some((f) => f.severity === 'error'),
	);
}

function report(opts: ValidateOptions, results: SiteResult[]): void {
	if (opts.format === 'json') {
		process.stdout.write(`${JSON.stringify({ sites: results }, null, 2)}\n`);
		process.exit(hasErrors(results) ? 1 : 0);
	}

	let totalErrors = 0;
	let totalWarnings = 0;

	for (const r of results) {
		process.stdout.write(`\n${r.site}\n`);

		if (opts.only !== 'content') {
			if (r.config.length === 0) {
				process.stdout.write('  config: OK\n');
			} else {
				for (const f of r.config) {
					process.stdout.write(`  ${icon(f.severity)} ${f.path}: ${f.message}\n`);
				}
			}
		}

		if (opts.only !== 'config') {
			if (r.contentSuppressed) {
				process.stdout.write(`  content: ${r.contentSuppressed}\n`);
			} else if (r.content.length === 0) {
				process.stdout.write('  content: OK\n');
			} else {
				for (const f of r.content) {
					const at = f.line ? `:${f.line}` : '';
					process.stdout.write(`  ${icon(f.severity)} ${f.file}${at}  ${f.message}\n`);
				}
			}
		}

		totalErrors += count(r, 'error');
		totalWarnings += count(r, 'warning');
	}

	const status = totalErrors > 0 ? '✗' : '✓';
	process.stdout.write(
		`\n  ${status}  ${totalErrors} error${totalErrors === 1 ? '' : 's'}, ` +
			`${totalWarnings} warning${totalWarnings === 1 ? '' : 's'}\n\n`,
	);
	process.exit(totalErrors > 0 ? 1 : 0);
}

function count(r: SiteResult, severity: 'error' | 'warning'): number {
	return (
		r.config.filter((f) => f.severity === severity).length +
		r.content.filter((f) => f.severity === severity).length
	);
}

function icon(severity: 'error' | 'warning' | 'info'): string {
	return severity === 'error' ? '✗ error  ' : severity === 'warning' ? '⚠ warn   ' : 'ℹ info   ';
}

/** Report a whole-run failure — no config, unparseable config, unknown site.
 *  Always non-zero: this is the "validated nothing" case D2 exists for. */
function fail(opts: ValidateOptions, message: string): void {
	if (opts.format === 'json') {
		process.stdout.write(`${JSON.stringify({ error: message, sites: [] }, null, 2)}\n`);
	} else {
		process.stderr.write(`${message}\n`);
	}
	process.exit(1);
}
