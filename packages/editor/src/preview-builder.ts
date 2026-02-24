import { resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

export interface PreviewBuildResult {
	/** Directory containing the built preview runtime files */
	outputDir: string;
	/** Whether the build succeeded */
	success: boolean;
}

/**
 * Build the preview runtime — a small Svelte app that includes the user's
 * theme (layouts, components, CSS) — using Vite's programmatic API.
 *
 * The built output is cached by theme path hash so repeat sessions are instant.
 * If Vite or @sveltejs/vite-plugin-svelte aren't available (e.g. non-SvelteKit
 * project), returns { success: false } and the editor falls back to HTML preview.
 */
export async function buildPreviewRuntime(
	themeSveltePath: string,
): Promise<PreviewBuildResult> {
	const cacheDir = resolve(import.meta.dirname, '..', '.preview-cache');
	const hash = createHash('md5').update(themeSveltePath).digest('hex').slice(0, 8);
	const outputDir = resolve(cacheDir, hash);

	// Skip rebuild if cache exists
	if (existsSync(resolve(outputDir, 'index.html'))) {
		return { outputDir, success: true };
	}

	try {
		// Dynamic imports — these may not be installed at runtime
		const { build } = await import('vite');
		const { svelte } = await import('@sveltejs/vite-plugin-svelte');

		const runtimeDir = resolve(import.meta.dirname, '..', 'preview-runtime');

		if (!existsSync(resolve(runtimeDir, 'index.html'))) {
			console.warn('Preview runtime source files not found');
			return { outputDir: '', success: false };
		}

		mkdirSync(outputDir, { recursive: true });

		await build({
			root: runtimeDir,
			base: '/preview/',
			plugins: [
				svelte({ compilerOptions: { css: 'injected' } }),
				refraktThemePlugin(themeSveltePath),
			],
			build: {
				outDir: outputDir,
				emptyOutDir: true,
				rollupOptions: {
					input: resolve(runtimeDir, 'index.html'),
				},
			},
			resolve: {
				dedupe: ['svelte', '@refrakt-md/svelte', '@refrakt-md/behaviors'],
				alias: {
					'$app/state': resolve(runtimeDir, 'app-state-shim.svelte.ts'),
				},
			},
			logLevel: 'warn',
		});

		return { outputDir, success: true };
	} catch (err) {
		console.warn('Preview runtime build failed (falling back to HTML preview):', (err as Error).message);
		return { outputDir: '', success: false };
	}
}

/**
 * Vite plugin that provides the user's theme via `virtual:refrakt-theme`.
 * The preview runtime App.svelte imports from this virtual module.
 */
function refraktThemePlugin(themeSveltePath: string) {
	const virtualId = 'virtual:refrakt-theme';
	const resolvedVirtualId = '\0' + virtualId;

	return {
		name: 'refrakt-preview-theme',
		resolveId(id: string) {
			if (id === virtualId) return resolvedVirtualId;
		},
		load(id: string) {
			if (id === resolvedVirtualId) {
				// Re-export the theme from the user's theme package
				return `export { theme } from '${themeSveltePath}';`;
			}
		},
	};
}
