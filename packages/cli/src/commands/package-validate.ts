import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';
import type { RunePackage, RunePackageEntry } from '@refrakt-md/types';
import { validateThemeConfig, type ValidationResult, type ValidationError, type ValidationWarning } from '@refrakt-md/transform';

export interface PackageValidateOptions {
	/** Path to the package directory (default: cwd) */
	packageDir?: string;
	/** Whether to output JSON */
	json?: boolean;
}

interface PackageValidationResult {
	valid: boolean;
	packageName: string;
	errors: ValidationError[];
	warnings: ValidationWarning[];
}

/**
 * Validate a rune package before publishing.
 *
 * Checks:
 * 1. package.json exists and has required fields
 * 2. Package exports a valid RunePackage object
 * 3. Each rune has a valid transform (Markdoc Schema)
 * 4. Fixture strings are non-empty if provided
 * 5. Attribute schemas are well-formed if provided
 * 6. Theme config (RuneConfig entries) validates if provided
 * 7. Fixture files exist for runes that declare them
 */
export async function packageValidateCommand(opts: PackageValidateOptions): Promise<void> {
	const packageDir = resolve(opts.packageDir ?? process.cwd());

	const result = await validatePackage(packageDir);

	if (opts.json) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		printValidationResult(result);
	}

	if (!result.valid) {
		process.exit(1);
	}
}

async function validatePackage(packageDir: string): Promise<PackageValidationResult> {
	const errors: ValidationError[] = [];
	const warnings: ValidationWarning[] = [];

	// Step 1: Check package.json
	const pkgJsonPath = join(packageDir, 'package.json');
	if (!existsSync(pkgJsonPath)) {
		errors.push({ path: 'package.json', message: 'File not found' });
		return { valid: false, packageName: '<unknown>', errors, warnings };
	}

	let pkgJson: Record<string, unknown>;
	try {
		pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
	} catch (err) {
		errors.push({ path: 'package.json', message: `Invalid JSON: ${(err as Error).message}` });
		return { valid: false, packageName: '<unknown>', errors, warnings };
	}

	const npmName = typeof pkgJson.name === 'string' ? pkgJson.name : '<unknown>';

	if (!pkgJson.name || typeof pkgJson.name !== 'string') {
		errors.push({ path: 'package.json.name', message: 'Required and must be a non-empty string' });
	}
	if (!pkgJson.version || typeof pkgJson.version !== 'string') {
		errors.push({ path: 'package.json.version', message: 'Required and must be a non-empty string' });
	}

	// Check main/exports entry point
	const mainEntry = pkgJson.main ?? (pkgJson.exports as Record<string, unknown>)?.['.' as keyof typeof pkgJson.exports];
	if (!mainEntry) {
		warnings.push({ path: 'package.json', message: 'No "main" or "exports" entry point defined' });
	}

	// Step 2: Try to load the package module
	let pkg: RunePackage | null = null;
	const entryPoints = [
		join(packageDir, 'dist', 'index.js'),
		join(packageDir, 'src', 'index.ts'),
		join(packageDir, 'src', 'index.js'),
		join(packageDir, 'index.js'),
	];

	for (const entry of entryPoints) {
		if (existsSync(entry)) {
			try {
				const mod = await import(entry);
				pkg = findRunePackageExport(mod);
				break;
			} catch (err) {
				// Try next entry point
				warnings.push({ path: relative(packageDir, entry), message: `Import failed: ${(err as Error).message}` });
			}
		}
	}

	if (!pkg) {
		errors.push({ path: 'exports', message: 'Could not find a valid RunePackage export. Build the package first (npm run build) or ensure src/index.ts exports a RunePackage object.' });
		return { valid: false, packageName: npmName, errors, warnings };
	}

	// Step 3: Validate RunePackage structure
	if (!pkg.name || typeof pkg.name !== 'string') {
		errors.push({ path: 'RunePackage.name', message: 'Required and must be a non-empty string' });
	}
	if (!pkg.version || typeof pkg.version !== 'string') {
		errors.push({ path: 'RunePackage.version', message: 'Required and must be a non-empty string' });
	}
	if (!pkg.runes || typeof pkg.runes !== 'object' || Object.keys(pkg.runes).length === 0) {
		errors.push({ path: 'RunePackage.runes', message: 'Must define at least one rune' });
		return { valid: false, packageName: npmName, errors, warnings };
	}

	// Step 4: Validate each rune entry
	for (const [runeName, entry] of Object.entries(pkg.runes)) {
		validateRuneEntry(runeName, entry, errors, warnings);
	}

	// Step 5: Validate theme config if provided
	if (pkg.theme?.runes) {
		for (const [typeofName, config] of Object.entries(pkg.theme.runes)) {
			if (typeof config !== 'object' || config === null) {
				errors.push({ path: `theme.runes.${typeofName}`, message: 'Must be a RuneConfig object' });
				continue;
			}
			const rc = config as Record<string, unknown>;
			if (!rc.block || typeof rc.block !== 'string') {
				errors.push({ path: `theme.runes.${typeofName}.block`, message: 'Required and must be a non-empty string' });
			}
		}
	}

	// Step 6: Validate icons if provided
	if (pkg.theme?.icons) {
		for (const [group, variants] of Object.entries(pkg.theme.icons)) {
			if (typeof variants !== 'object' || variants === null) {
				errors.push({ path: `theme.icons.${group}`, message: 'Must be an object mapping variant names to SVG strings' });
			} else {
				for (const [variant, svg] of Object.entries(variants)) {
					if (typeof svg !== 'string') {
						errors.push({ path: `theme.icons.${group}.${variant}`, message: 'Must be an SVG string' });
					}
				}
			}
		}
	}

	// Step 7: Validate extensions if provided
	if (pkg.extends) {
		for (const [runeName, ext] of Object.entries(pkg.extends)) {
			if (ext.schema) {
				for (const [attrName, attrDef] of Object.entries(ext.schema)) {
					validatePackageAttribute(attrName, attrDef, `extends.${runeName}.schema`, errors);
				}
			}
		}
	}

	// Step 8: Check fixture coverage
	const runesWithFixtures = Object.entries(pkg.runes)
		.filter(([, entry]) => entry.fixture)
		.map(([name]) => name);
	const runesWithoutFixtures = Object.entries(pkg.runes)
		.filter(([, entry]) => !entry.fixture && !isChildRune(entry))
		.map(([name]) => name);

	if (runesWithoutFixtures.length > 0) {
		warnings.push({
			path: 'fixtures',
			message: `${runesWithoutFixtures.length} non-child rune(s) without fixtures: ${runesWithoutFixtures.join(', ')}. Fixtures improve the inspect command experience.`,
		});
	}

	// Step 9: Check for descriptions (helpful for AI integration)
	const runesWithoutDescription = Object.entries(pkg.runes)
		.filter(([, entry]) => !entry.description && !isChildRune(entry))
		.map(([name]) => name);
	if (runesWithoutDescription.length > 0) {
		warnings.push({
			path: 'descriptions',
			message: `${runesWithoutDescription.length} rune(s) without descriptions: ${runesWithoutDescription.join(', ')}. Descriptions improve AI prompt generation.`,
		});
	}

	return { valid: errors.length === 0, packageName: npmName, errors, warnings };
}

function validateRuneEntry(
	runeName: string,
	entry: RunePackageEntry,
	errors: ValidationError[],
	warnings: ValidationWarning[],
): void {
	const prefix = `runes.${runeName}`;

	// transform is required
	if (!entry.transform || typeof entry.transform !== 'object') {
		errors.push({ path: `${prefix}.transform`, message: 'Required and must be a Markdoc Schema object' });
	}

	// fixture validation
	if (entry.fixture !== undefined) {
		if (typeof entry.fixture !== 'string') {
			errors.push({ path: `${prefix}.fixture`, message: 'Must be a string' });
		} else if (entry.fixture.trim().length === 0) {
			errors.push({ path: `${prefix}.fixture`, message: 'Must be non-empty' });
		} else {
			// Check that fixture uses the rune's tag name
			const tagPattern = new RegExp(`\\{%\\s*${escapeRegex(runeName)}[\\s%]`);
			if (!tagPattern.test(entry.fixture)) {
				warnings.push({ path: `${prefix}.fixture`, message: `Fixture does not appear to use the {% ${runeName} %} tag` });
			}
		}
	}

	// authoringHints validation
	if (entry.authoringHints !== undefined) {
		if (typeof entry.authoringHints !== 'string') {
			errors.push({ path: `${prefix}.authoringHints`, message: 'Must be a string' });
		} else if (entry.authoringHints.trim().length === 0) {
			warnings.push({ path: `${prefix}.authoringHints`, message: 'Empty authoringHints string — remove or add content' });
		}
	}

	// schema validation
	if (entry.schema) {
		for (const [attrName, attrDef] of Object.entries(entry.schema)) {
			validatePackageAttribute(attrName, attrDef, `${prefix}.schema`, errors);
		}
	}

	// aliases validation
	if (entry.aliases) {
		if (!Array.isArray(entry.aliases)) {
			errors.push({ path: `${prefix}.aliases`, message: 'Must be an array of strings' });
		} else {
			for (const alias of entry.aliases) {
				if (typeof alias !== 'string' || !alias) {
					errors.push({ path: `${prefix}.aliases`, message: 'Each alias must be a non-empty string' });
				}
			}
		}
	}

	// description
	if (entry.description !== undefined && typeof entry.description !== 'string') {
		errors.push({ path: `${prefix}.description`, message: 'Must be a string' });
	}
}

function validatePackageAttribute(
	attrName: string,
	attrDef: unknown,
	parentPath: string,
	errors: ValidationError[],
): void {
	const path = `${parentPath}.${attrName}`;

	if (typeof attrDef !== 'object' || attrDef === null) {
		errors.push({ path, message: 'Must be an object' });
		return;
	}

	const attr = attrDef as Record<string, unknown>;

	if (attr.type !== undefined) {
		const validTypes = ['string', 'number', 'boolean'];
		if (!validTypes.includes(attr.type as string)) {
			errors.push({ path: `${path}.type`, message: `Must be one of: ${validTypes.join(', ')}` });
		}
	}

	if (attr.matches !== undefined) {
		if (!Array.isArray(attr.matches)) {
			errors.push({ path: `${path}.matches`, message: 'Must be an array' });
		}
	}
}

/** Check if a rune entry is likely a child/internal rune (no need for fixture) */
function isChildRune(entry: RunePackageEntry): boolean {
	// Heuristic: child runes typically have no description or a brief one,
	// and their transform schema has a parent relationship
	if (!entry.transform || typeof entry.transform !== 'object') return false;
	const schema = entry.transform as Record<string, unknown>;
	return schema.selfClosing === true || schema.inline === true;
}

function findRunePackageExport(mod: Record<string, unknown>): RunePackage | null {
	// Check default export
	if (mod.default && isRunePackage(mod.default)) {
		return mod.default as RunePackage;
	}

	// Check named exports
	for (const value of Object.values(mod)) {
		if (isRunePackage(value)) {
			return value as RunePackage;
		}
	}

	return null;
}

function isRunePackage(value: unknown): value is RunePackage {
	if (typeof value !== 'object' || value === null) return false;
	const obj = value as Record<string, unknown>;
	return typeof obj.name === 'string' && typeof obj.version === 'string' && typeof obj.runes === 'object' && obj.runes !== null;
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function printValidationResult(result: PackageValidationResult): void {
	console.log(`Validating rune package: ${result.packageName}\n`);

	if (result.valid && result.warnings.length === 0) {
		console.log('  Package: OK');
		console.log('\nAll checks passed.');
		return;
	}

	if (result.errors.length > 0) {
		console.log(`  FAIL — ${result.errors.length} error${result.errors.length === 1 ? '' : 's'}`);
		for (const err of result.errors) {
			console.log(`    ERROR ${err.path}: ${err.message}`);
		}
	} else {
		console.log('  Package: OK');
	}

	if (result.warnings.length > 0) {
		console.log(`\n  ${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}:`);
		for (const warn of result.warnings) {
			console.log(`    WARN ${warn.path}: ${warn.message}`);
		}
	}

	if (result.valid) {
		console.log('\nPackage is valid (with warnings).');
	} else {
		console.log('\nPackage validation failed.');
	}
}
