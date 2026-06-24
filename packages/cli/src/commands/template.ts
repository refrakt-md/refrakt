/** `refrakt template install` — add a full-site template as a NEW site in an
 *  existing project (SPEC-110 §4 kind:"site"). The greenfield path is
 *  `create-refrakt --template`; this is the add-to-existing-project surface.
 *
 *  v1 resolves a **local directory** template (the directly-readable, portable
 *  case). Tarball/registry templates are scaffold-copied artifacts — fetch them
 *  with `create-refrakt` for now. */

import { existsSync, readFileSync, mkdirSync, cpSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { execSync } from 'node:child_process';
import type { RefraktConfig, SiteConfig } from '@refrakt-md/types';
import { loadRefraktConfigFile, writeRefraktConfigFile, detectPackageManager } from '../config-file.js';
import {
	resolveTargetSite,
	createSite,
	getProjectRefraktVersion,
	validateCompat,
} from './install.js';

export interface TemplateInstallOptions {
	source: string;
	site?: string;
}

interface TemplateManifestLite {
	kind?: string;
	refrakt?: string;
	site?: Partial<SiteConfig> & Record<string, unknown>;
}

/** Compose a template into a new site of `raw` and return the dependency names
 *  to install. Pure w.r.t. the package manager (caller installs). Copies the
 *  template's content/sandboxes into the new site's derived destinations. */
export function applyTemplateSite(
	raw: RefraktConfig,
	templateDir: string,
	siteKey: string,
	projectRoot: string,
): { deps: string[] } {
	const manifest = JSON.parse(readFileSync(resolve(templateDir, 'template.json'), 'utf-8')) as TemplateManifestLite;
	if (manifest.kind && manifest.kind !== 'site') {
		throw new Error(`template has kind "${manifest.kind}" — only "site" templates are supported`);
	}
	const tsite = manifest.site ?? {};

	// Destinations: a new non-default site lives under sites/<key>/.
	const base = siteKey === 'default' ? '.' : `sites/${siteKey}`;
	const contentDir = `${base}/content`;
	cpSync(resolve(templateDir, 'content'), resolve(projectRoot, contentDir), { recursive: true });

	const site = { contentDir, theme: tsite.theme ?? '@refrakt-md/lumina' } as unknown as SiteConfig;
	const siteRec = site as unknown as Record<string, unknown>;
	const tsiteRec = tsite as Record<string, unknown>;
	for (const key of ['plugins', 'routeRules', 'entityRoutes', 'assets', 'backgrounds', 'overrides', 'tints', 'highlight', 'target'] as const) {
		if (tsiteRec[key] !== undefined) siteRec[key] = tsiteRec[key];
	}
	if (existsSync(resolve(templateDir, 'sandboxes'))) {
		const sandboxDir = `${base}/sandboxes`;
		cpSync(resolve(templateDir, 'sandboxes'), resolve(projectRoot, sandboxDir), { recursive: true });
		site.sandbox = { dir: sandboxDir };
	}

	createSite(raw, siteKey, site);

	const deps: string[] = [...(tsite.plugins ?? [])];
	const themePkg = typeof tsite.theme === 'string' ? tsite.theme : (tsite.theme as { package?: string } | undefined)?.package;
	if (themePkg) deps.push(themePkg);
	return { deps };
}

export async function templateInstallCommand(options: TemplateInstallOptions): Promise<void> {
	const { source, site: siteFlag } = options;
	const cwd = process.cwd();

	const dir = isAbsolute(source) ? source : resolve(cwd, source);
	if (!existsSync(resolve(dir, 'template.json'))) {
		console.error(`Error: "${source}" is not a template directory (no template.json).`);
		console.error('For a published/bundled template, scaffold with: create-refrakt <name> --template <source>');
		process.exit(1);
	}

	let configData;
	try {
		configData = loadRefraktConfigFile(cwd);
	} catch {
		console.error('Error: No refrakt.config.json found in the current directory.');
		process.exit(1);
	}

	// Full-site templates create a NEW site; the key must not collide.
	const selection = resolveTargetSite(configData.raw, siteFlag, 'new');
	if (!selection.key) {
		console.error(`Error: ${selection.error}.`);
		if (selection.candidates?.length) console.error(`Existing sites: ${selection.candidates.join(', ')}`);
		process.exit(1);
	}

	// Compat (ADR-023).
	const manifest = JSON.parse(readFileSync(resolve(dir, 'template.json'), 'utf-8')) as TemplateManifestLite;
	const compat = validateCompat(manifest.refrakt, getProjectRefraktVersion(cwd));
	for (const w of compat.warnings) console.log(`  ⚠ ${w}`);
	if (compat.errors.length) {
		for (const e of compat.errors) console.error(`  ✗ ${e}`);
		process.exit(1);
	}

	const { deps } = applyTemplateSite(configData.raw, dir, selection.key, cwd);
	writeRefraktConfigFile(configData.path, configData.raw);

	// Pin + install the derived dependencies (theme + plugins).
	if (deps.length) {
		const pm = detectPackageManager(cwd);
		const cmd = pm.installCmd(deps.join(' '));
		console.log(`Installing template dependencies with ${pm.name}...`);
		try {
			execSync(cmd, { cwd, stdio: 'inherit' });
		} catch {
			console.error(`\nWarning: failed to install ${deps.join(', ')} — run "${cmd}" manually.`);
		}
	}

	console.log('');
	console.log(`Template installed as site "${selection.key}".`);
	console.log(`  content → ${(configData.raw.sites?.[selection.key]?.contentDir) ?? `sites/${selection.key}/content`}`);
}
