import { resolve, extname } from 'node:path';

/** File extensions recognized as sandbox example sources */
const SANDBOX_EXTENSIONS = new Set(['.html', '.css', '.js', '.svg', '.glsl-vert', '.glsl-frag']);

/**
 * Minimal structural type for a Vite dev server — captures only the surface
 * `setupContentHmr` touches. Avoids a hard `vite` dep on
 * `@refrakt-md/transform/node`; adapter packages cast the real
 * `ViteDevServer` to this shape at the call site.
 */
export interface MinimalViteDevServer {
	watcher: {
		add(path: string): void;
		on(event: 'change' | 'add' | 'unlink', handler: (file: string) => void): void;
	};
	moduleGraph: {
		getModulesByFile(file: string): Set<{ id: string | null }> | undefined;
		invalidateModule(mod: { id: string | null }): void;
	};
	ws: {
		send(payload: { type: 'full-reload' }): void;
	};
}

/**
 * Watch `.md` files in the content directory and trigger full page reloads
 * when they change, are added, or are deleted.
 *
 * When `examplesDir` is provided, also watches sandbox example files
 * (HTML, CSS, JS, SVG, GLSL) and triggers reloads on changes — Lumina's
 * sandbox runes pick up edits without restart.
 *
 * `onInvalidate` is called before each reload — adapters wire this to
 * `createRefraktLoader.invalidateSite()` (or equivalent) so the next SSR
 * pass rebuilds the site from disk rather than serving the cached version.
 *
 * Shared between SvelteKit, Astro, and Nuxt — all three run on Vite and use
 * the same watcher / module-graph / WebSocket API surface.
 */
export function setupContentHmr(
	server: MinimalViteDevServer,
	contentDir: string,
	examplesDir?: string,
	onInvalidate?: () => void,
): void {
	const absContentDir = resolve(contentDir);

	server.watcher.add(absContentDir);

	const reload = (file: string) => {
		if (!file.startsWith(absContentDir) || !file.endsWith('.md')) return;

		onInvalidate?.();

		for (const mod of server.moduleGraph.getModulesByFile(file) ?? []) {
			server.moduleGraph.invalidateModule(mod);
		}

		server.ws.send({ type: 'full-reload' });
	};

	server.watcher.on('change', reload);
	server.watcher.on('add', reload);
	server.watcher.on('unlink', reload);

	if (examplesDir) {
		const absExamplesDir = resolve(examplesDir);
		server.watcher.add(absExamplesDir);

		const reloadExample = (file: string) => {
			if (!file.startsWith(absExamplesDir)) return;
			const ext = extname(file);
			const isCompound = file.endsWith('.glsl-vert') || file.endsWith('.glsl-frag');
			if (!isCompound && !SANDBOX_EXTENSIONS.has(ext)) return;

			server.ws.send({ type: 'full-reload' });
		};

		server.watcher.on('change', reloadExample);
		server.watcher.on('add', reloadExample);
		server.watcher.on('unlink', reloadExample);
	}
}
