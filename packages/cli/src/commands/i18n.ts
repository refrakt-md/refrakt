import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { extractI18nKeys, checkI18nBundle } from '@refrakt-md/transform';
import type { ThemeConfig } from '@refrakt-md/transform';
import { baseConfig } from '@refrakt-md/runes';

export interface I18nExtractOptions {
	/** Write the extracted dictionary to this file (default: stdout). */
	output?: string;
	/** `--check` mode: compare against an existing bundle instead of writing. */
	check?: boolean;
	/** Locale bundle(s) to score coverage against in `--check` mode.
	 *  Each entry is a path to a `<locale>.json` translation file. */
	locales?: string[];
	/** Fully assembled theme config (core + plugins). Falls back to baseConfig. */
	config?: ThemeConfig;
}

/** Derive a display locale name from a bundle path (`.../de.json` → `de`). */
function localeNameFromPath(path: string): string {
	const base = path.split(/[\\/]/).pop() ?? path;
	return base.replace(/\.json$/i, '');
}

function readBundle(path: string): Record<string, unknown> {
	const target = resolve(path);
	if (!existsSync(target)) {
		console.error(`Error: locale bundle "${target}" does not exist.`);
		process.exit(1);
	}
	try {
		const parsed = JSON.parse(readFileSync(target, 'utf-8'));
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			console.error(`Error: locale bundle "${target}" is not a JSON object.`);
			process.exit(1);
		}
		return parsed as Record<string, unknown>;
	} catch (err) {
		console.error(`Error: could not parse "${target}": ${(err as Error).message}`);
		process.exit(1);
	}
}

/**
 * `refrakt i18n extract` — emit every derivable framework i18n key with its
 * English default as a JSON dictionary (Decision D1/D3). `--check` compares
 * one or more locale bundles against the derived key set and reports drift +
 * per-locale coverage, failing (non-zero exit) on missing or orphaned keys.
 */
export function i18nExtractCommand(opts: I18nExtractOptions): void {
	const extracted = extractI18nKeys(opts.config ?? baseConfig);
	const json = JSON.stringify(extracted, null, '\t') + '\n';
	const keyCount = Object.keys(extracted).length;

	if (opts.check) {
		const bundles = opts.locales ?? [];
		if (bundles.length === 0) {
			console.error('Error: --check requires at least one --locale <path> to score against.');
			process.exit(1);
		}
		let failed = false;
		for (const path of bundles) {
			const name = localeNameFromPath(path);
			const result = checkI18nBundle(extracted, readBundle(path));
			const pct = Math.round(result.coverage * 100);
			console.log(`${name}: ${pct}% (${result.total - result.missing.length}/${result.total})`);
			if (result.missing.length > 0) {
				failed = true;
				console.error(`  missing ${result.missing.length} key(s):`);
				for (const k of result.missing) console.error(`    - ${k}`);
			}
			if (result.orphaned.length > 0) {
				failed = true;
				console.error(`  orphaned ${result.orphaned.length} key(s) (no longer derivable):`);
				for (const k of result.orphaned) console.error(`    - ${k}`);
			}
		}
		if (failed) {
			console.error('\nFAIL: locale bundle(s) are out of sync with the derived key set.');
			process.exit(1);
		}
		console.log('\nOK: all bundles complete.');
		return;
	}

	if (opts.output) {
		const target = resolve(opts.output);
		const dir = dirname(target);
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		writeFileSync(target, json);
		console.log(`Written ${target} (${keyCount} keys)`);
	} else {
		process.stdout.write(json);
	}
}
