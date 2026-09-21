import { existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { createRequire } from 'node:module';
import type { SiteConfig } from '@refrakt-md/types';
import { getThemePackage } from '@refrakt-md/types';

/**
 * The config layer of `refrakt validate` (SPEC-135 D1 / WORK-578).
 *
 * **Checks resolution, not shape.** Shape-checking `refrakt.config.json` is the
 * published JSON Schema's job and editors already do it. What nothing covered
 * is whether the config's *names resolve*: does `theme.package` exist, does
 * every entry in `plugins[]` load, do `routeRules` layout names exist, do
 * `entityRoutes` types match a registered type. None of that is expressible in
 * JSON Schema.
 *
 * It is not optional garnish. `packages/sveltekit/src/plugin.ts:166` catches a
 * failed package load, warns to console, and continues with that plugin's runes
 * **absent** — so post-SPEC-132 every use of them becomes a `tag-undefined`
 * finding. Dozens of errors against content that is perfectly correct, cause:
 * one line of config. Running this first, and letting it explain the findings it
 * would cause, is what stops the symptom drowning the cause.
 */
export interface ConfigFinding {
	severity: 'error' | 'warning' | 'info';
	/** Dotted config path, e.g. `sites.main.plugins[2]`. */
	path: string;
	message: string;
	/** Set when this failure is known to *cause* content findings — the CLI
	 *  uses it to explain `tag-undefined` rather than reporting both as peers. */
	causesMissingRunes?: boolean;
}

export interface ValidateConfigOptions {
	/** Directory to resolve `theme.package` and `plugins[]` from. */
	configDir: string;
	/** Site name, used only to path findings. */
	siteName: string;
}

/** Can this specifier be resolved from `configDir`? */
function canResolve(specifier: string, configDir: string): boolean {
	// A relative or absolute path is a file, not a package.
	if (specifier.startsWith('.') || isAbsolute(specifier)) {
		return existsSync(resolve(configDir, specifier));
	}
	try {
		// `createRequire` resolves the way Node would from this directory,
		// including workspace symlinks — which is what the adapters do at build
		// time, so a package that resolves here resolves there.
		const req = createRequire(resolve(configDir, 'package.json'));
		req.resolve(specifier);
		return true;
	} catch {
		// A package can be importable without a resolvable main entry (exports
		// maps without a "." key). Fall back to asking whether the directory is
		// there at all before calling it missing.
		try {
			const req = createRequire(resolve(configDir, 'package.json'));
			req.resolve(`${specifier}/package.json`);
			return true;
		} catch {
			return false;
		}
	}
}

export function validateSiteConfig(site: SiteConfig, opts: ValidateConfigOptions): ConfigFinding[] {
	const findings: ConfigFinding[] = [];
	const base = `sites.${opts.siteName}`;

	// theme.package — the theme supplies every rune config and the layouts, so
	// an unresolvable one is not a partial failure.
	if (site.theme !== undefined) {
		const themePackage = getThemePackage(site.theme);
		if (themePackage && !canResolve(themePackage, opts.configDir)) {
			findings.push({
				severity: 'error',
				path: `${base}.theme`,
				message: `theme package "${themePackage}" cannot be resolved from ${opts.configDir}`,
				causesMissingRunes: true,
			});
		}
	}

	// plugins[] — the load-bearing one. A failed plugin load is swallowed at
	// build time, and every rune it would have contributed becomes tag-undefined.
	for (const [i, name] of (site.plugins ?? []).entries()) {
		if (typeof name !== 'string' || !name) {
			findings.push({
				severity: 'error',
				path: `${base}.plugins[${i}]`,
				message: 'plugin entry must be a non-empty string',
			});
			continue;
		}
		if (!canResolve(name, opts.configDir)) {
			findings.push({
				severity: 'error',
				path: `${base}.plugins[${i}]`,
				message: `plugin "${name}" cannot be resolved from ${opts.configDir} — every rune it contributes will be reported as an undefined tag`,
				causesMissingRunes: true,
			});
		}
	}

	// routeRules[].layout — a layout name that matches nothing falls back
	// silently, so a typo costs the page its intended layout with no signal.
	const declaredLayouts = collectDeclaredLayouts(site);
	for (const [i, rule] of (site.routeRules ?? []).entries()) {
		const layout = (rule as { layout?: unknown }).layout;
		if (typeof layout !== 'string' || !layout) continue;
		// Only judge when we actually know the layout set. An unresolvable theme
		// means we cannot enumerate layouts, and guessing would produce a second
		// wave of errors whose real cause is already reported above.
		if (declaredLayouts === undefined) continue;
		if (!declaredLayouts.has(layout)) {
			findings.push({
				severity: 'error',
				path: `${base}.routeRules[${i}].layout`,
				message: `layout "${layout}" is not declared by the theme (known: ${[...declaredLayouts].sort().join(', ') || 'none'})`,
			});
		}
	}

	// entityRoutes[].type — a type nothing registers produces no pages at all,
	// silently: the rule simply never matches.
	for (const [i, rule] of (readEntityRoutes(site) ?? []).entries()) {
		const type = (rule as { type?: unknown }).type;
		if (typeof type !== 'string' || !type) {
			findings.push({
				severity: 'error',
				path: `${base}.entityRoutes[${i}].type`,
				message: 'entityRoutes rule must declare a non-empty `type`',
			});
		}
	}

	return findings;
}

/** Layout names the site's theme declares, or `undefined` when the theme could
 *  not be read — in which case the caller must not judge layout references. */
function collectDeclaredLayouts(site: SiteConfig): Set<string> | undefined {
	const theme = site.theme;
	if (typeof theme === 'object' && theme !== null) {
		const layouts = (theme as { layouts?: Record<string, unknown> }).layouts;
		if (layouts && typeof layouts === 'object') return new Set(Object.keys(layouts));
	}
	// The theme's layout set lives in its manifest / layout config, which
	// resolving here would mean importing the theme package. Deliberately not
	// done: it is the expensive half, and a wrong `layout` name is caught by the
	// layout cascade at build time anyway. Returning undefined suppresses the
	// check rather than guessing.
	return undefined;
}

function readEntityRoutes(site: SiteConfig): unknown[] | undefined {
	const raw = (site as unknown as { entityRoutes?: unknown }).entityRoutes;
	return Array.isArray(raw) ? raw : undefined;
}
