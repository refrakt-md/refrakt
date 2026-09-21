import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
	validateThemeConfig,
	validateManifest,
	type ValidationResult,
} from '@refrakt-md/transform';

/**
 * `refrakt theme validate` — the theme-authoring checks (SPEC-135 D12 /
 * WORK-579).
 *
 * These moved off the bare `refrakt validate`, which now belongs to site
 * authors. Three artifacts share the word "config" and only one of them is the
 * site author's:
 *
 * | Artifact | Who writes it | Checked by |
 * |---|---|---|
 * | `refrakt.config.json` | site author | the published JSON Schema, and `refrakt config validate` |
 * | `ThemeConfig` (`prefix`, rune configs) | theme author | `validateThemeConfig` — here |
 * | Theme manifest | theme author | `validateManifest` — here |
 *
 * The `theme` group already holds `install`, `info` and `list`, so this slots
 * in beside them rather than inventing a noun.
 */
export interface ThemeValidateOptions {
	configPath?: string;
	manifestPath?: string;
}

export function themeValidateCommand(opts: ThemeValidateOptions): void {
	let hasErrors = false;

	// A validation command must never report success on nothing (SPEC-135 D2).
	// The old behaviour here was the defect that rule was written for: handed no
	// arguments, it validated refrakt's own `baseConfig` and printed a
	// checkmark — a self-test of the library, reported as though it were a check
	// of the user's work.
	if (!opts.configPath && !opts.manifestPath) {
		console.error('Nothing to validate.');
		console.error('');
		console.error('  refrakt theme validate --config <path>     a ThemeConfig JSON file');
		console.error('  refrakt theme validate --manifest <path>   a theme manifest');
		console.error('');
		console.error('To validate a site’s content and config, use `refrakt validate`.');
		process.exit(1);
	}

	if (opts.configPath) {
		const absPath = resolve(opts.configPath);
		if (!existsSync(absPath)) {
			console.error(`Error: Config file not found: ${absPath}`);
			process.exit(1);
		}

		// For now, only JSON configs are supported via CLI.
		// TypeScript configs require dynamic import which needs the module to be built.
		const raw = JSON.parse(readFileSync(absPath, 'utf-8'));
		console.log('Validating theme config...');
		const result = validateThemeConfig(raw);
		printResult('Theme config', result);
		if (!result.valid) hasErrors = true;
	}

	if (opts.manifestPath) {
		const absPath = resolve(opts.manifestPath);
		if (!existsSync(absPath)) {
			console.error(`Error: Manifest file not found: ${absPath}`);
			process.exit(1);
		}

		const raw = JSON.parse(readFileSync(absPath, 'utf-8'));
		console.log(`${opts.configPath ? '\n' : ''}Validating manifest...`);
		const result = validateManifest(raw);
		printResult('Manifest', result);
		if (!result.valid) hasErrors = true;
	}

	if (hasErrors) {
		process.exit(1);
	}
}

function printResult(label: string, result: ValidationResult): void {
	if (result.valid && result.warnings.length === 0) {
		console.log(`  ${label}: OK`);
		return;
	}

	if (result.errors.length > 0) {
		console.log(
			`  ${label}: FAIL (${result.errors.length} error${result.errors.length === 1 ? '' : 's'})`,
		);
		for (const err of result.errors) {
			console.log(`    ERROR ${err.path}: ${err.message}`);
		}
	} else {
		console.log(`  ${label}: OK`);
	}

	if (result.warnings.length > 0) {
		console.log(`  ${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}:`);
		for (const warn of result.warnings) {
			console.log(`    WARN ${warn.path}: ${warn.message}`);
		}
	}
}
