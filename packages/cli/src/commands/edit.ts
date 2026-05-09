import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import type { SiteConfig } from '@refrakt-md/types';
import { resolveSite } from '@refrakt-md/transform/node';
import { loadRefraktConfigFile } from '../config-file.js';

export interface EditOptions {
	port?: number;
	contentDir?: string;
	devServer?: string;
	noOpen?: boolean;
}

export async function editCommand(options: EditOptions): Promise<void> {
	const cwd = process.cwd();

	// Load project config
	let contentDir = options.contentDir;
	let themeName: string | undefined;
	let configDir = cwd;
	let projectSite: SiteConfig | undefined;
	let projectConfigPath: string | undefined;

	if (!contentDir) {
		try {
			const { path: cfgPath, config } = loadRefraktConfigFile(cwd);
			projectConfigPath = cfgPath;
			configDir = dirname(cfgPath);
			// Use resolveSite so multi-site configs work too — picks the lone
			// site when there's exactly one, throws with available names when
			// multiple are declared and no --site flag is set.
			const { site } = resolveSite(config);
			contentDir = resolve(configDir, site.contentDir);
			themeName = site.theme;
			projectSite = site;
		} catch (err) {
			const message = (err as Error).message;
			if (/multiple sites/.test(message)) {
				console.error(`Error: ${message}`);
				console.error('Pass --content-dir to bypass site resolution, or pick a site explicitly.');
				process.exit(1);
			}
			console.error('Error: No refrakt.config.json found. Specify --content-dir or run from a refrakt.md project.');
			process.exit(1);
		}
	} else {
		contentDir = resolve(cwd, contentDir);
	}

	if (!existsSync(contentDir)) {
		console.error(`Error: Content directory not found: ${contentDir}`);
		process.exit(1);
	}

	// Resolve theme config, CSS, and Svelte entry
	let { themeConfig, themeCssPath, themeSveltePath } = await resolveTheme(themeName, configDir);

	// Merge project-level custom icons into the theme's global icon group
	if (projectSite?.icons && Object.keys(projectSite.icons).length > 0) {
		themeConfig = {
			...themeConfig,
			icons: {
				...themeConfig.icons,
				global: { ...themeConfig.icons.global, ...projectSite.icons },
			},
		};
	}

	// Merge project-level tint and background presets
	if (projectSite?.tints) {
		themeConfig = { ...themeConfig, tints: { ...themeConfig.tints, ...projectSite.tints } as any };
	}
	if (projectSite?.backgrounds) {
		themeConfig = { ...themeConfig, backgrounds: { ...themeConfig.backgrounds, ...projectSite.backgrounds } as any };
	}

	// Load plugins for editor palette + preview
	let extraTags: Record<string, import('@markdoc/markdoc').Schema> | undefined;
	let communityRuneEntries: Array<{
		name: string; aliases: string[]; description: string;
		selfClosing: boolean; category: string;
		attributes: Record<string, { type: string; required: boolean; values?: string[] }>;
		example?: string;
		contentModel?: object;
	}> | undefined;

	if (projectSite?.plugins?.length) {
		try {
			const { loadPlugin, mergePlugins, runes: coreRuneMap, schemaContentModels, serializeContentModel } = await import('@refrakt-md/runes');

			const loaded = await Promise.all(
				projectSite.plugins.map((name: string) => loadPlugin(name))
			);

			const merged = mergePlugins(
				loaded,
				new Set(Object.keys(coreRuneMap)),
				projectSite.runes?.prefer,
			);

			extraTags = merged.tags;

			// Merge community theme rune configs into themeConfig
			if (Object.keys(merged.themeRunes).length > 0) {
				themeConfig = {
					...themeConfig,
					runes: { ...themeConfig.runes, ...merged.themeRunes },
				};
			}

			// Merge community icons
			for (const [group, icons] of Object.entries(merged.themeIcons)) {
				themeConfig = {
					...themeConfig,
					icons: { ...themeConfig.icons, [group]: { ...(themeConfig.icons[group] ?? {}), ...icons } },
				};
			}

			// Build community rune entries for the editor palette
			communityRuneEntries = [];
			for (const [name, rune] of Object.entries(merged.runes)) {
				const srcPkg = loaded.find(p => p.runes[name]);
				const entry = srcPkg ? srcPkg.pkg.runes[name] : undefined;
				// Skip child-only runes — a fixture is how packages signal a top-level rune belongs in the palette
				if (entry && !entry.fixture) continue;

				const attrs: Record<string, { type: string; required: boolean; values?: string[] }> = {};
				if (rune.schema.attributes) {
					for (const [attrName, attr] of Object.entries(rune.schema.attributes)) {
						if ((attr as any).deprecated) continue;
						const typeName = typeof attr.type === 'function'
							? attr.type.name
							: Array.isArray(attr.type)
								? attr.type.map((t: unknown) => (t as { name?: string }).name ?? 'unknown').join(' | ')
								: 'String';
						attrs[attrName] = {
							type: typeName,
							required: attr.required ?? false,
							...(Array.isArray(attr.matches) ? { values: attr.matches.map(String) } : {}),
							...(attr.description ? { description: attr.description } : {}),
						};
					}
				}

				// Look up content model from WeakMap
				const rawModel = schemaContentModels.get(rune.schema);
				const contentModel = rawModel ? serializeContentModel(rawModel) : undefined;

				communityRuneEntries.push({
					name,
					aliases: rune.aliases ?? [],
					description: rune.description ?? '',
					selfClosing: rune.schema.selfClosing ?? false,
					category: srcPkg?.pkg.displayName ?? 'Community',
					attributes: attrs,
					example: merged.fixtures[name],
					contentModel,
				});
			}
		} catch (err) {
			console.warn('Warning: Could not load plugins:', (err as Error).message);
		}
	}

	// Resolve static assets directory (SvelteKit convention: {projectRoot}/static/)
	const staticPath = resolve(configDir, 'static');
	const staticDir = existsSync(staticPath) ? staticPath : undefined;

	// Start editor — dynamic import via variable-held module ID so tsc
	// does not require @refrakt-md/editor to be built at CLI build time.
	const editorModuleId: string = '@refrakt-md/editor';
	const { startEditor } = await import(editorModuleId);

	await startEditor({
		contentDir,
		port: options.port ?? 4800,
		themeConfig,
		themeCssPath,
		themeSveltePath,
		staticDir,
		devServer: options.devServer,
		open: !options.noOpen,
		configPath: projectConfigPath,
		routeRules: projectSite?.routeRules,
		pluginNames: projectSite?.plugins ?? [],
		extraTags,
		communityRunes: communityRuneEntries,
	});
}

interface ResolvedTheme {
	themeConfig: import('@refrakt-md/transform').ThemeConfig;
	themeCssPath?: string;
	themeSveltePath?: string;
}

async function resolveTheme(
	themeName: string | undefined,
	configDir: string,
): Promise<ResolvedTheme> {
	// Always use baseConfig as the foundation
	const { baseConfig } = await import('@refrakt-md/runes');

	if (!themeName) {
		return { themeConfig: baseConfig };
	}

	// Try to resolve theme package
	try {
		const themePkgDir = findThemePackage(themeName, configDir);
		if (!themePkgDir) {
			console.warn(`Warning: Theme "${themeName}" not found, using base config`);
			return { themeConfig: baseConfig };
		}

		// Try to load theme's config (transform export)
		let themeConfig = baseConfig;
		try {
			const transformModule = await import(resolve(themePkgDir, 'dist', 'config.js'));
			if (transformModule.luminaConfig) {
				themeConfig = transformModule.luminaConfig;
			} else if (transformModule.default) {
				themeConfig = transformModule.default;
			}
		} catch {
			// Theme may not export a config — use baseConfig
		}

		// Look for CSS entry point
		const cssPath = resolve(themePkgDir, 'index.css');
		const themeCssPath = existsSync(cssPath) ? cssPath : undefined;

		// Look for Svelte entry point (for preview runtime)
		let themeSveltePath: string | undefined;
		const svelteEntry = resolve(themePkgDir, 'svelte', 'index.ts');
		if (existsSync(svelteEntry)) {
			themeSveltePath = svelteEntry;
		}

		return { themeConfig, themeCssPath, themeSveltePath };
	} catch {
		console.warn(`Warning: Could not resolve theme "${themeName}", using base config`);
		return { themeConfig: baseConfig };
	}
}

/** Find a theme package directory by checking local path, then walking up node_modules */
function findThemePackage(themeName: string, startDir: string): string | null {
	// Check if theme is a local path
	const localPath = resolve(startDir, themeName);
	if (existsSync(localPath) && existsSync(resolve(localPath, 'package.json'))) {
		return localPath;
	}

	// Walk up directories looking for node_modules/{themeName}
	let dir = startDir;
	while (true) {
		const candidate = resolve(dir, 'node_modules', themeName);
		if (existsSync(resolve(candidate, 'package.json'))) {
			return candidate;
		}
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}

	return null;
}
