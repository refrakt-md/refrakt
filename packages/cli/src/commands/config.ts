/**
 * `refrakt config <subcommand>` — utilities for managing refrakt.config.json.
 *
 * Initially supports `migrate` for moving between the three valid input shapes
 * (flat / singular `site` / plural `sites`) defined in ADR-010.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RefraktConfig } from '@refrakt-md/types';
import { discoverPlugins } from '../lib/plugins.js';

const SITE_FIELDS = [
	'contentDir',
	'theme',
	'target',
	'overrides',
	'routeRules',
	'highlight',
	'icons',
	'packages',
	'tints',
	'backgrounds',
	'sandbox',
	'baseUrl',
	'siteName',
	'defaultImage',
	'logo',
	'runes',
] as const;

export async function runConfigCommand(args: string[]): Promise<void> {
	const sub = args[0];
	if (!sub || sub === '--help' || sub === '-h') {
		printConfigUsage();
		process.exit(sub ? 0 : 1);
	}

	if (sub === 'migrate') {
		await runConfigMigrate(args.slice(1));
		return;
	}

	console.error(`Error: Unknown config subcommand "${sub}"\n`);
	printConfigUsage();
	process.exit(1);
}

interface MigrateOptions {
	apply: boolean;
	to: 'nested' | 'multi-site';
	name?: string;
	configPath: string;
}

async function runConfigMigrate(args: string[]): Promise<void> {
	const opts = parseMigrateArgs(args);
	if (!existsSync(opts.configPath)) {
		console.error(`Error: ${opts.configPath} not found.`);
		process.exit(1);
	}

	const original = readFileSync(opts.configPath, 'utf-8');
	let raw: RefraktConfig;
	try {
		raw = JSON.parse(original) as RefraktConfig;
	} catch (err) {
		console.error(`Error: Could not parse ${opts.configPath}: ${(err as Error).message}`);
		process.exit(1);
	}

	if (raw.site !== undefined && raw.sites !== undefined) {
		console.error(
			'Error: refrakt.config.json declares both "site" and "sites". Resolve the conflict before migrating.',
		);
		process.exit(1);
	}

	let migrated = migrate(raw, opts);

	// On flat → nested migration, populate `plugins` from installed packages
	// if absent. Gives users a working config plugin list immediately without
	// having to remember to declare each plugin manually.
	if (opts.to === 'nested' && migrated.plugins === undefined) {
		try {
			const discovered = await discoverPlugins({ cwd: process.cwd(), warn: false });
			if (discovered.length > 0) {
				migrated = { ...migrated, plugins: discovered.map((p) => p.packageName) };
			}
		} catch {
			// Discovery failure is non-blocking — the migration still applies.
		}
	}

	const wasIdempotent = JSON.stringify(migrated) === JSON.stringify(raw);

	if (wasIdempotent) {
		console.log(`No changes needed — ${opts.configPath} is already in the requested shape.`);
		return;
	}

	const indent = detectIndent(original);
	const newText = JSON.stringify(migrated, null, indent) + '\n';

	if (opts.apply) {
		writeFileSync(opts.configPath, newText);
		console.log(`Updated ${opts.configPath}`);
		return;
	}

	// Dry run — print a unified-style diff.
	console.log(formatDiff(original, newText, opts.configPath));
	console.log('\n(Dry run — pass --apply to write changes.)');
}

/** Apply the requested migration to the raw config. */
function migrate(raw: RefraktConfig, opts: MigrateOptions): RefraktConfig {
	if (opts.to === 'nested') {
		return migrateFlatToNested(raw);
	}
	if (opts.to === 'multi-site') {
		return migrateSingularToMultiSite(raw, opts.name!);
	}
	return raw;
}

/** Flat shape (top-level contentDir, theme, target, …) → singular `site`. */
function migrateFlatToNested(raw: RefraktConfig): RefraktConfig {
	if (raw.site !== undefined || raw.sites !== undefined) {
		// Already nested — nothing to migrate.
		return raw;
	}

	const siteFields: Record<string, unknown> = {};
	const rest: Record<string, unknown> = {};
	const rawAsRecord = raw as unknown as Record<string, unknown>;
	for (const [key, value] of Object.entries(rawAsRecord)) {
		if ((SITE_FIELDS as readonly string[]).includes(key)) {
			siteFields[key] = value;
		} else {
			rest[key] = value;
		}
	}

	if (Object.keys(siteFields).length === 0) {
		return raw;
	}

	// Promote to singular `site`. Preserve `plugins`, `plan`, and any other
	// project-level fields.
	const result: Record<string, unknown> = { ...rest, site: siteFields };
	return result as unknown as RefraktConfig;
}

/** Singular `site` → plural `sites: { [name]: site }`. */
function migrateSingularToMultiSite(raw: RefraktConfig, name: string): RefraktConfig {
	if (raw.sites !== undefined) {
		// Already multi-site — nothing to migrate.
		return raw;
	}
	if (raw.site === undefined) {
		console.error(
			`Error: refrakt.config.json has no "site" section to promote. Run --to=nested first if your config is in flat shape.`,
		);
		process.exit(1);
	}

	const { site, ...rest } = raw as RefraktConfig & { site: unknown };
	const result: Record<string, unknown> = { ...rest, sites: { [name]: site } };
	return result as unknown as RefraktConfig;
}

function parseMigrateArgs(args: string[]): MigrateOptions {
	let apply = false;
	let to: 'nested' | 'multi-site' = 'nested';
	let name: string | undefined;
	let configPath = resolve(process.cwd(), 'refrakt.config.json');

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]!;
		if (arg === '--apply') {
			apply = true;
		} else if (arg === '--to') {
			const next = args[++i];
			if (next !== 'nested' && next !== 'multi-site') {
				console.error(`Error: --to must be "nested" or "multi-site"`);
				process.exit(1);
			}
			to = next;
		} else if (arg === '--name') {
			name = args[++i];
			if (!name) {
				console.error('Error: --name requires a value');
				process.exit(1);
			}
		} else if (arg === '--config') {
			const next = args[++i];
			if (!next) {
				console.error('Error: --config requires a path');
				process.exit(1);
			}
			configPath = resolve(process.cwd(), next);
		} else if (arg === '--help' || arg === '-h') {
			printConfigUsage();
			process.exit(0);
		} else {
			console.error(`Error: Unknown migrate option "${arg}"`);
			process.exit(1);
		}
	}

	if (to === 'multi-site' && !name) {
		console.error('Error: --to multi-site requires --name <site-name>');
		process.exit(1);
	}

	return { apply, to, name, configPath };
}

function printConfigUsage(): void {
	console.log(`
Usage: refrakt config <subcommand> [options]

Subcommands:
  migrate              Rewrite refrakt.config.json to a different shape

Migrate Options:
  --to <shape>         "nested" (flat → singular site) or "multi-site" (singular → sites)
                       Default: nested
  --name <name>        Required for --to multi-site; the key for the site under "sites"
  --apply              Write changes to disk (default: dry-run prints a diff)
  --config <path>      Path to refrakt.config.json (default: ./refrakt.config.json)

Examples:
  refrakt config migrate                                # Preview flat → singular
  refrakt config migrate --apply                        # Write the migration
  refrakt config migrate --to multi-site --name main --apply
`);
}

function detectIndent(text: string): string | number {
	const lines = text.split('\n').slice(0, 20);
	for (const line of lines) {
		if (line.startsWith('\t')) return '\t';
		const match = line.match(/^( +)\S/);
		if (match) return match[1]!.length;
	}
	return '\t';
}

/** Tiny line-based diff renderer — fine for short JSON files where the visual
 *  goal is "I can see what changed." Not a real diff implementation. */
function formatDiff(before: string, after: string, label: string): string {
	const beforeLines = before.split('\n');
	const afterLines = after.split('\n');
	const lines: string[] = [`--- ${label}`, `+++ ${label}`];
	const max = Math.max(beforeLines.length, afterLines.length);
	for (let i = 0; i < max; i++) {
		const b = beforeLines[i];
		const a = afterLines[i];
		if (b === a) {
			if (b !== undefined) lines.push(`  ${b}`);
		} else {
			if (b !== undefined) lines.push(`- ${b}`);
			if (a !== undefined) lines.push(`+ ${a}`);
		}
	}
	return lines.join('\n');
}

