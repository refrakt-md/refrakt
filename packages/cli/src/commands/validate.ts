/**
 * `refrakt validate` — the site author's command (SPEC-135 D1 / WORK-578).
 *
 * Presentation only. The run itself lives in `validate-core.ts`, which returns
 * data and never exits, so the `refrakt.validate` MCP tool can call the same
 * code and return structured findings instead of parsing this output (D6).
 */

import { hasErrors, runValidation, type SiteResult } from './validate-core.js';

export interface ValidateOptions {
	site?: string;
	only?: 'content' | 'config';
	deep?: boolean;
	format?: 'text' | 'json';
	configPath?: string;
}

export async function validateCommand(opts: ValidateOptions): Promise<void> {
	const result = await runValidation({
		site: opts.site,
		only: opts.only,
		deep: opts.deep,
		configPath: opts.configPath,
	});

	if (result.error) {
		if (opts.format === 'json') {
			process.stdout.write(`${JSON.stringify({ error: result.error, sites: [] }, null, 2)}\n`);
		} else {
			process.stderr.write(`${result.error}\n`);
		}
		process.exit(1);
	}

	if (opts.format === 'json') {
		process.stdout.write(`${JSON.stringify({ sites: result.sites }, null, 2)}\n`);
		process.exit(hasErrors(result) ? 1 : 0);
	}

	let totalErrors = 0;
	let totalWarnings = 0;

	for (const r of result.sites) {
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
