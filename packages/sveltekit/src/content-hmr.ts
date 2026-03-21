import { resolve, extname } from 'node:path';
import type { ViteDevServer } from 'vite';

/** File extensions recognized as sandbox example sources */
const SANDBOX_EXTENSIONS = new Set(['.html', '.css', '.js', '.svg', '.glsl-vert', '.glsl-frag']);

/**
 * Watch .md files in the content directory and trigger full page reloads
 * when they change, are added, or are deleted.
 *
 * When `examplesDir` is provided, also watches sandbox example files
 * and triggers reloads when they change.
 */
export function setupContentHmr(server: ViteDevServer, contentDir: string, examplesDir?: string): void {
	const absContentDir = resolve(contentDir);

	server.watcher.add(absContentDir);

	const reload = (file: string) => {
		if (!file.startsWith(absContentDir) || !file.endsWith('.md')) return;

		for (const mod of server.moduleGraph.getModulesByFile(file) ?? []) {
			server.moduleGraph.invalidateModule(mod);
		}

		server.ws.send({ type: 'full-reload' });
	};

	server.watcher.on('change', reload);
	server.watcher.on('add', reload);
	server.watcher.on('unlink', reload);

	// Watch sandbox examples directory for external source file changes
	if (examplesDir) {
		const absExamplesDir = resolve(examplesDir);
		server.watcher.add(absExamplesDir);

		const reloadExample = (file: string) => {
			if (!file.startsWith(absExamplesDir)) return;
			const ext = extname(file);
			// Handle compound extensions like .glsl-vert
			const isCompound = file.endsWith('.glsl-vert') || file.endsWith('.glsl-frag');
			if (!isCompound && !SANDBOX_EXTENSIONS.has(ext)) return;

			server.ws.send({ type: 'full-reload' });
		};

		server.watcher.on('change', reloadExample);
		server.watcher.on('add', reloadExample);
		server.watcher.on('unlink', reloadExample);
	}
}
