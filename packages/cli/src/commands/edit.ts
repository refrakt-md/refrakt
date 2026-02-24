import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
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

	if (!contentDir) {
		try {
			const { path: configPath, config } = loadRefraktConfigFile(cwd);
			configDir = dirname(configPath);
			contentDir = resolve(configDir, config.contentDir);
			themeName = config.theme;
		} catch {
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
	const { themeConfig, themeCssPath, themeSveltePath } = await resolveTheme(themeName, configDir);

	// Resolve static assets directory (SvelteKit convention: {projectRoot}/static/)
	const staticPath = resolve(configDir, 'static');
	const staticDir = existsSync(staticPath) ? staticPath : undefined;

	// Start editor
	const { startEditor } = await import('@refrakt-md/editor');

	await startEditor({
		contentDir,
		port: options.port ?? 4800,
		themeConfig,
		themeCssPath,
		themeSveltePath,
		staticDir,
		devServer: options.devServer,
		open: !options.noOpen,
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
	const { baseConfig } = await import('@refrakt-md/theme-base');

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
