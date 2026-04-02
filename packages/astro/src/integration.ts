import { resolve, extname } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import type { AstroIntegration } from 'astro';
import type { RefraktConfig, RunePackage, PipelineWarning } from '@refrakt-md/types';
import type { Schema } from '@markdoc/markdoc';
import type { RefraktAstroOptions } from './types.js';

const CORE_NO_EXTERNAL = [
	'@markdoc/markdoc',
	'@refrakt-md/runes',
	'@refrakt-md/content',
	'@refrakt-md/types',
	'@refrakt-md/transform',
	'@refrakt-md/astro',
];

/** File extensions recognized as sandbox example sources */
const SANDBOX_EXTENSIONS = new Set(['.html', '.css', '.js', '.svg', '.glsl-vert', '.glsl-frag']);

function loadRefraktConfig(configPath: string): RefraktConfig {
	const absPath = resolve(configPath);
	if (!existsSync(absPath)) {
		throw new Error(
			`refrakt.config.json not found at ${absPath}. ` +
			`Create one with at minimum: { "contentDir": "./content", "theme": "<package-name>", "target": "astro" }`
		);
	}
	return JSON.parse(readFileSync(absPath, 'utf-8'));
}

/**
 * Astro integration for refrakt.
 *
 * Reads `refrakt.config.json`, injects Lumina CSS, configures SSR noExternal,
 * and sets up content HMR in dev mode.
 */
export function refrakt(options: RefraktAstroOptions = {}): AstroIntegration {
	const configPath = options.configPath ?? './refrakt.config.json';

	return {
		name: '@refrakt-md/astro',
		hooks: {
			'astro:config:setup'({ config, updateConfig, addWatchFile }) {
				const refraktConfig = loadRefraktConfig(configPath);

				const themeAdapter = `${refraktConfig.theme}/astro`;
				const noExternal = [
					...CORE_NO_EXTERNAL,
					refraktConfig.theme,
					themeAdapter,
					...(refraktConfig.packages ?? []),
				];

				// Inject Lumina CSS — the theme's default export is its CSS entry point
				updateConfig({
					vite: {
						ssr: {
							noExternal,
							optimizeDeps: {
								include: ['@markdoc/markdoc'],
							},
						},
					},
				});

				// Watch content directory for changes in dev mode
				const contentDir = resolve(config.root.pathname, refraktConfig.contentDir);
				addWatchFile(contentDir);
			},
		},
	};
}
