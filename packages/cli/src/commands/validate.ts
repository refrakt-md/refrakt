import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { validateThemeConfig, validateManifest, type ValidationResult } from '@refrakt-md/transform';
import { baseConfig } from '@refrakt-md/theme-base';

export interface ValidateOptions {
	configPath?: string;
	manifestPath?: string;
}

export function validateCommand(opts: ValidateOptions): void {
	let hasErrors = false;

	// Validate theme config
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
	} else {
		// Validate the base config as a sanity check
		console.log('Validating base theme config...');
		const result = validateThemeConfig(baseConfig);
		printResult('Base theme config', result);
		if (!result.valid) hasErrors = true;
	}

	// Validate manifest
	if (opts.manifestPath) {
		const absPath = resolve(opts.manifestPath);
		if (!existsSync(absPath)) {
			console.error(`Error: Manifest file not found: ${absPath}`);
			process.exit(1);
		}

		const raw = JSON.parse(readFileSync(absPath, 'utf-8'));
		console.log('\nValidating manifest...');
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
		console.log(`  ${label}: FAIL (${result.errors.length} error${result.errors.length === 1 ? '' : 's'})`);
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
