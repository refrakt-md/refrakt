import { resolve } from 'node:path';
import type { ViteDevServer } from 'vite';

/**
 * Watch .md files in the content directory and trigger full page reloads
 * when they change, are added, or are deleted.
 */
export function setupContentHmr(server: ViteDevServer, contentDir: string): void {
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
}
